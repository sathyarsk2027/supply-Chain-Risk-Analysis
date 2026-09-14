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

        // FALLBACK: If NLP embedding failed, use keyword search and return results directly
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
            double dist = result.getCosineDistance() != null ? result.getCosineDistance() : 1.0;
            double score = Math.max(0.0, Math.min(1.0, 1.0 - dist));
            score = Math.round(score * 10000.0) / 10000.0;
            return new QueryResponse.Match(
                    result.getTitle(),
                    result.getUrl(),
                    result.getSource(),
                    result.getRiskCategory(),
                    score
            );
        }).collect(Collectors.toList());

        // 4) Guardrail check: Verify if the top match meets the minimum relevance threshold
        double topScore = allMatches.stream().mapToDouble(QueryResponse.Match::getScore).max().orElse(0.0);

        if (allMatches.isEmpty() || topScore < TOP_MATCH_RELEVANCE_THRESHOLD) {
            logger.info("Semantic search below threshold (top score: {}), trying keyword fallback", topScore);
            return keywordFallbackResponse(request.getQuery());
        }

        // 5) Filter matches to retain only items meeting the item relevance threshold (limit 10)
        List<QueryResponse.Match> displayMatches = allMatches.stream()
                .filter(m -> m.getScore() >= ITEM_MATCH_RELEVANCE_THRESHOLD)
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
                double dist = result.getCosineDistance() != null ? result.getCosineDistance() : 1.0;
                double score = Math.max(0.0, Math.min(1.0, 1.0 - dist));
                if (score >= ITEM_MATCH_RELEVANCE_THRESHOLD) {
                    count++;
                    String title = result.getTitle() != null ? result.getTitle() : "";
                    String riskCategory = result.getRiskCategory() != null ? result.getRiskCategory() : "Uncategorized";
                    String rawContent = result.getRawContent() != null ? result.getRawContent() : "";
                    if (rawContent.length() > 300) {
                        rawContent = rawContent.substring(0, 300) + "...";
                    }
                    contextBuilder.append(String.format("Article %d: %s | Risk Category: %s\nContent: %s\n\n", count, title, riskCategory, rawContent));
                }
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
        // Split query into individual words and search for each, then de-duplicate
        String[] words = query.trim().toLowerCase().split("\\s+");
        java.util.Map<String, NewsArticle> seen = new java.util.LinkedHashMap<>();
        for (String word : words) {
            if (word.length() < 3) continue; // skip tiny words like "is", "to"
            List<NewsArticle> results = newsArticleRepository.findByKeyword(word);
            for (NewsArticle a : results) {
                if (a.getUrl() != null) seen.putIfAbsent(a.getUrl(), a);
            }
        }
        List<QueryResponse.Match> kwMatches = seen.values().stream()
            .limit(10)
            .map(article -> new QueryResponse.Match(
                article.getTitle(),
                article.getUrl(),
                article.getSource(),
                article.getRiskCategory(),
                0.6
            ))
            .collect(Collectors.toList());

        QueryResponse kwResponse = new QueryResponse(query, kwMatches);
        if (kwMatches.isEmpty()) {
            kwResponse.setAiSummary(new QueryResponse.AiSummary(
                "No articles found for this query. The database may still be building up article embeddings. Try again in a few minutes.", 0));
        } else {
            // Generate AI summary for keyword matches
            try {
                StringBuilder contextBuilder = new StringBuilder();
                int count = 0;
                for (NewsArticle article : seen.values()) {
                    if (count >= 10) break;
                    count++;
                    String title = article.getTitle() != null ? article.getTitle() : "";
                    String riskCategory = article.getRiskCategory() != null ? article.getRiskCategory() : "Uncategorized";
                    String rawContent = article.getRawContent() != null ? article.getRawContent() : "";
                    if (rawContent.length() > 300) {
                        rawContent = rawContent.substring(0, 300) + "...";
                    }
                    contextBuilder.append(String.format("Article %d: %s | Risk Category: %s\nContent: %s\n\n", count, title, riskCategory, rawContent));
                }
                String context = contextBuilder.toString();
                GroqClient.GroqResponse aiResponse = groqClient.generateSummary(query, context);
                if (aiResponse != null) {
                    kwResponse.setAiSummary(new QueryResponse.AiSummary(
                        "⚠️ **Keyword fallback search.**\n\n" + aiResponse.getSummary(), aiResponse.getConfidenceScore()
                    ));
                }
            } catch (Exception e) {
                logger.error("Failed to generate AI summary for keyword fallback query: {}", query, e);
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

            public Match() {
            }

            public Match(String title, String url, String source, String riskCategory, double score) {
                this.title = title;
                this.url = url;
                this.source = source;
                this.riskCategory = riskCategory;
                this.score = score;
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
