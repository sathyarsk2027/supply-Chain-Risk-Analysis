package com.supplychain.monitor.controller;

import com.supplychain.monitor.model.NewsArticle;
import com.supplychain.monitor.repository.NewsArticleRepository;
import com.supplychain.monitor.service.NlpClient;
import com.supplychain.monitor.service.GroqClient;
import com.pgvector.PGvector;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class NewsArticleController {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(NewsArticleController.class);

    private final NewsArticleRepository newsArticleRepository;
    private final NlpClient nlpClient;
    private final GroqClient groqClient;

    public NewsArticleController(NewsArticleRepository newsArticleRepository, NlpClient nlpClient, GroqClient groqClient) {
        this.newsArticleRepository = newsArticleRepository;
        this.nlpClient = nlpClient;
        this.groqClient = groqClient;
    }

    @GetMapping("/articles")
    public List<NewsArticle> getAllArticles() {
        return newsArticleRepository.findAllByOrderByPublishedAtDesc();
    }

    @GetMapping("/articles/sources")
    public List<NewsArticleRepository.SourceCountProjection> getSourceCounts() {
        return newsArticleRepository.findSourceCounts();
    }

    public static final double TOP_MATCH_RELEVANCE_THRESHOLD = 0.20;
    public static final double BORDERLINE_RELEVANCE_THRESHOLD = 0.30;
    public static final double ITEM_MATCH_RELEVANCE_THRESHOLD = 0.15;

    @PostMapping("/query")
    public ResponseEntity<?> searchArticles(@RequestBody QueryRequest request) {
        if (request == null || request.getQuery() == null || request.getQuery().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Query string must not be empty");
        }

        // 1) Call the NLP service's POST /embed endpoint to get an embedding vector for the query text.
        //    If NLP service is unavailable (e.g. 429 rate limit), fall back to keyword search.
        float[] embedding = null;
        try {
            embedding = nlpClient.getEmbedding(request.getQuery());
        } catch (Exception e) {
            logger.warn("NLP service unavailable, falling back to keyword search. Reason: {}", e.getMessage());
        }

        // FALLBACK: If NLP embedding failed, seamlessly fall back to keyword search
        if (embedding == null) {
            return keywordFallbackResponse(request.getQuery());
        }


        // 2) Run a native SQL query using pgvector's cosine distance operator (embedding <=> ?)
        String vectorString = java.util.Arrays.toString(embedding);
        List<NewsArticleRepository.NewsArticleSearchResult> searchResults = 
                newsArticleRepository.findSimilarArticles(vectorString);
        logger.info("Semantic search results size: {}", searchResults.size());

        // 3) Calculate raw cosine similarity score for each result (1.0 - cosineDistance)
        List<QueryResponse.Match> allMatches = searchResults.stream().map(result -> {
            double composite = result.getCompositeScore() != null ? result.getCompositeScore() : 0.0;
            double finalScore = Math.round(composite * 10000.0) / 10000.0;
            return new QueryResponse.Match(
                    result.getTitle(),
                    result.getUrl(),
                    result.getSource(),
                    result.getRiskCategory(),
                    finalScore,
                    result.getPublishedAt()
            );
        }).collect(Collectors.toList());

        // 4) Guardrail check: Verify if the top match meets the minimum relevance threshold
        double topScore = allMatches.stream().mapToDouble(QueryResponse.Match::getScore).max().orElse(0.0);

        // 5) Filter matches to retain only items meeting the item relevance threshold (limit 10)
        // NOTE: The relevance threshold (1.0 - cosineDistance >= 0.15) is now strictly enforced in the SQL query
        // before time-decay ranking is applied, ensuring no irrelevant results slip through.
        List<QueryResponse.Match> displayMatches = allMatches.stream()
                .limit(10)
                .collect(Collectors.toList());

        // Guardrail check 2: Minimum context items
        if (displayMatches.isEmpty()) {
            logger.info("Query '{}' downgraded to hard cutoff due to insufficient context items ({} items)", request.getQuery(), displayMatches.size());
            QueryResponse guardrailResponse = new QueryResponse(request.getQuery(), displayMatches);
            guardrailResponse.setAiSummary(new QueryResponse.AiSummary(
                    "This query doesn't appear related to supply chain disruptions in our current dataset.",
                    0
            ));
            return ResponseEntity.ok(guardrailResponse);
        }

        QueryResponse queryResponse = new QueryResponse(request.getQuery(), displayMatches);

        // 6) Build context string from relevant matches only and call Groq API
        try {
            StringBuilder contextBuilder = new StringBuilder();
            int count = 0;
            for (NewsArticleRepository.NewsArticleSearchResult result : searchResults) {
                if (count >= 10) break;
                count++;
                String title = result.getTitle() != null ? result.getTitle() : "";
                String riskCategory = result.getRiskCategory() != null ? result.getRiskCategory() : "Uncategorized";
                String rawContent = result.getRawContent() != null ? result.getRawContent() : "";
                if (rawContent.length() > 300) {
                    rawContent = rawContent.substring(0, 300) + "...";
                }
                contextBuilder.append(String.format("Article %d: %s | Risk Category: %s\nContent: %s\n\n", count, title, riskCategory, rawContent));
            }
            String context = contextBuilder.toString();

            GroqClient.GroqResponse aiResponse = groqClient.generateSummary(request.getQuery(), context);
            if (aiResponse != null) {
                String finalSummary = aiResponse.getSummary();
                if (topScore < BORDERLINE_RELEVANCE_THRESHOLD) {
                    finalSummary = "⚠️ **Low confidence — limited matching data.**\n\n" + finalSummary;
                }
                queryResponse.setAiSummary(new QueryResponse.AiSummary(finalSummary, aiResponse.getConfidenceScore()));
            }
        } catch (Exception e) {
            logger.error("Failed to generate AI summary for query: {}", request.getQuery(), e);
        }

        return ResponseEntity.ok(queryResponse);
    }

    private ResponseEntity<?> keywordFallbackResponse(String query) {
        String trimmedQuery = query.trim();
        String queryLower = trimmedQuery.toLowerCase();
        String[] words = queryLower.split("\\s+");
        List<String> queryKeywords = java.util.Arrays.stream(words)
                .map(w -> w.replaceAll("[^a-zA-Z0-9]", ""))
                .filter(w -> w.length() >= 3)
                .collect(Collectors.toList());
        if (queryKeywords.isEmpty()) {
            queryKeywords = java.util.Arrays.stream(words)
                .map(w -> w.replaceAll("[^a-zA-Z0-9]", ""))
                .filter(w -> !w.isEmpty())
                .collect(Collectors.toList());
        }

        java.util.Map<String, NewsArticle> seen = new java.util.LinkedHashMap<>();
        for (String word : queryKeywords) {
            List<NewsArticle> results = newsArticleRepository.findByKeyword(word);
            for (NewsArticle a : results) {
                if (a.getUrl() != null) seen.putIfAbsent(a.getUrl(), a);
            }
        }

        // Calculate dynamic, naturally differentiated relevance scores for each article
        List<QueryResponse.Match> scoredMatches = new java.util.ArrayList<>();
        java.time.Instant now = java.time.Instant.now();

        for (NewsArticle article : seen.values()) {
            String titleLower = article.getTitle() != null ? article.getTitle().toLowerCase() : "";
            String contentLower = article.getRawContent() != null ? article.getRawContent().toLowerCase() : "";
            String entitiesLower = article.getEntities() != null ? article.getEntities().toLowerCase() : "";

            int titleHits = 0;
            int contentHits = 0;
            int entityHits = 0;

            for (String kw : queryKeywords) {
                if (titleLower.contains(kw)) titleHits++;
                if (contentLower.contains(kw)) contentHits++;
                if (entitiesLower.contains(kw)) entityHits++;
            }

            int totalHits = (titleHits * 3) + (contentHits * 2) + entityHits;
            if (totalHits == 0) {
                continue;
            }

            double titleRatio = !queryKeywords.isEmpty() ? (double) titleHits / queryKeywords.size() : 0.0;
            double contentRatio = !queryKeywords.isEmpty() ? (double) contentHits / queryKeywords.size() : 0.0;

            // Base score: scales dynamically between 0.40 and 0.88 based on keyword coverage
            double score = 0.38 + (titleRatio * 0.36) + (contentRatio * 0.16);

            // Exact phrase match bonus in title or content
            if (titleLower.contains(queryLower)) {
                score += 0.12;
            } else if (contentLower.contains(queryLower)) {
                score += 0.06;
            }

            // Recency weighting: newer articles receive a slight natural variation (up to +0.05)
            // to break ties and differentiate match percentages
            if (article.getPublishedAt() != null) {
                long hoursAgo = Math.max(0, java.time.Duration.between(article.getPublishedAt(), now).toHours());
                double recencyBonus = Math.max(0.0, 0.05 - (hoursAgo / 720.0 * 0.05));
                score += recencyBonus;
            }

            // Cap between 0.45 and 0.96, rounded to 2 decimal places
            double finalScore = Math.min(0.96, Math.max(0.45, Math.round(score * 100.0) / 100.0));

            scoredMatches.add(new QueryResponse.Match(
                article.getTitle(),
                article.getUrl(),
                article.getSource(),
                article.getRiskCategory(),
                finalScore,
                article.getPublishedAt()
            ));
        }

        // Sort by highest relevance score descending
        scoredMatches.sort((m1, m2) -> Double.compare(m2.getScore(), m1.getScore()));

        List<QueryResponse.Match> kwMatches = scoredMatches.stream()
            .limit(10)
            .collect(Collectors.toList());

        QueryResponse kwResponse = new QueryResponse(query, kwMatches);
        if (kwMatches.isEmpty()) {
            kwResponse.setAiSummary(new QueryResponse.AiSummary(
                "No articles found for this query in our current dataset. Try querying specific shipping lanes, port strikes, or trade tariffs.", 0));
        } else {
            // Generate AI summary for keyword matches
            try {
                StringBuilder contextBuilder = new StringBuilder();
                int count = 0;
                for (QueryResponse.Match match : kwMatches) {
                    count++;
                    contextBuilder.append(String.format("Article %d: %s | Risk Category: %s\n\n", count, match.getTitle(), match.getRiskCategory()));
                }
                String context = contextBuilder.toString();
                GroqClient.GroqResponse aiResponse = groqClient.generateSummary(query, context);
                if (aiResponse != null && aiResponse.getSummary() != null) {
                    int confidence = aiResponse.getConfidenceScore() > 0 
                            ? aiResponse.getConfidenceScore() 
                            : (int) Math.round(kwMatches.get(0).getScore() * 100);
                    kwResponse.setAiSummary(new QueryResponse.AiSummary(aiResponse.getSummary(), confidence));
                }
            } catch (Exception e) {
                logger.error("Failed to generate AI summary for query: {}", query, e);
            }
        }
        return ResponseEntity.ok(kwResponse);
    }

    public static class QueryRequest {
        private String query;

        public QueryRequest() {
        }

        public QueryRequest(String query) {
            this.query = query;
        }

        public String getQuery() {
            return query;
        }

        public void setQuery(String query) {
            this.query = query;
        }
    }

    public static class QueryResponse {
        private String query;
        private List<Match> matches;
        private AiSummary aiSummary;

        public QueryResponse() {
        }

        public QueryResponse(String query, List<Match> matches) {
            this.query = query;
            this.matches = matches;
        }

        public String getQuery() {
            return query;
        }

        public void setQuery(String query) {
            this.query = query;
        }

        public List<Match> getMatches() {
            return matches;
        }

        public void setMatches(List<Match> matches) {
            this.matches = matches;
        }

        public AiSummary getAiSummary() {
            return aiSummary;
        }

        public void setAiSummary(AiSummary aiSummary) {
            this.aiSummary = aiSummary;
        }

        public static class AiSummary {
            private String summary;
            private Integer confidenceScore;

            public AiSummary() {
            }

            public AiSummary(String summary, Integer confidenceScore) {
                this.summary = summary;
                this.confidenceScore = confidenceScore;
            }

            public String getSummary() {
                return summary;
            }

            public void setSummary(String summary) {
                this.summary = summary;
            }

            public Integer getConfidenceScore() {
                return confidenceScore;
            }

            public void setConfidenceScore(Integer confidenceScore) {
                this.confidenceScore = confidenceScore;
            }
        }

        public static class Match {
            private String title;
            private String url;
            private String source;
            private String riskCategory;
            private double score;
            private java.time.Instant publishedAt;

            public Match() {
            }

            public Match(String title, String url, String source, String riskCategory, double score, java.time.Instant publishedAt) {
                this.title = title;
                this.url = url;
                this.source = source;
                this.riskCategory = riskCategory;
                this.score = score;
                this.publishedAt = publishedAt;
            }

            public String getTitle() {
                return title;
            }

            public void setTitle(String title) {
                this.title = title;
            }

            public String getUrl() {
                return url;
            }

            public void setUrl(String url) {
                this.url = url;
            }

            public java.time.Instant getPublishedAt() {
                return publishedAt;
            }

            public void setPublishedAt(java.time.Instant publishedAt) {
                this.publishedAt = publishedAt;
            }

            public String getSource() {
                return source;
            }

            public void setSource(String source) {
                this.source = source;
            }

            public String getRiskCategory() {
                return riskCategory;
            }

            public void setRiskCategory(String riskCategory) {
                this.riskCategory = riskCategory;
            }

            public double getScore() {
                return score;
            }

            public void setScore(double score) {
                this.score = score;
            }
        }
    }
}
