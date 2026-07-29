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
        return newsArticleRepository.findAll();
    }

    @GetMapping("/articles/sources")
    public List<NewsArticleRepository.SourceCountProjection> getSourceCounts() {
        return newsArticleRepository.findSourceCounts();
    }

    @PostMapping("/query")
    public ResponseEntity<?> searchArticles(@RequestBody QueryRequest request) {
        if (request == null || request.getQuery() == null || request.getQuery().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Query string must not be empty");
        }

        // 1) Call the NLP service's POST /embed endpoint to get an embedding vector for the query text.
        float[] embedding = nlpClient.getEmbedding(request.getQuery());
        if (embedding == null) {
            return ResponseEntity.internalServerError().body("Failed to generate embedding for the query");
        }

        // 2) Run a native SQL query using pgvector's cosine distance operator (embedding <=> ?)
        String vectorString = java.util.Arrays.toString(embedding);
        List<NewsArticleRepository.NewsArticleSearchResult> searchResults = 
                newsArticleRepository.findSimilarArticles(vectorString);
        logger.info("Semantic search results size: {}", searchResults.size());

        // 3) Return the query, the top 5 matched articles and their similarity scores as JSON.
        List<QueryResponse.Match> matches = searchResults.stream().map(result -> {
            double score = 1.0 - (result.getCosineDistance() != null ? result.getCosineDistance() : 0.0);
            return new QueryResponse.Match(
                    result.getTitle(),
                    result.getUrl(),
                    result.getSource(),
                    result.getRiskCategory(),
                    score
            );
        }).collect(Collectors.toList());

        double minScore = matches.stream().mapToDouble(QueryResponse.Match::getScore).min().orElse(0.0);
        double maxScore = matches.stream().mapToDouble(QueryResponse.Match::getScore).max().orElse(1.0);
        double range = maxScore - minScore;

        List<QueryResponse.Match> displayMatches = matches.stream().map(m -> {
            double normalized = range > 0.0001
                ? 0.40 + ((m.getScore() - minScore) / range) * 0.55
                : 0.70; // fallback if all scores are identical
            return new QueryResponse.Match(
                m.getTitle(), m.getUrl(), m.getSource(), m.getRiskCategory(), normalized
            );
        }).collect(Collectors.toList());

        QueryResponse queryResponse = new QueryResponse(request.getQuery(), displayMatches);

        // 4) Build context string (truncating rawContent to ~300 characters) and call Groq API
        try {
            StringBuilder contextBuilder = new StringBuilder();
            for (int i = 0; i < searchResults.size(); i++) {
                NewsArticleRepository.NewsArticleSearchResult result = searchResults.get(i);
                String title = result.getTitle() != null ? result.getTitle() : "";
                String riskCategory = result.getRiskCategory() != null ? result.getRiskCategory() : "Uncategorized";
                String rawContent = result.getRawContent() != null ? result.getRawContent() : "";
                if (rawContent.length() > 300) {
                    rawContent = rawContent.substring(0, 300) + "...";
                }
                contextBuilder.append(String.format("Article %d: %s | Risk Category: %s\nContent: %s\n\n", i + 1, title, riskCategory, rawContent));
            }
            String context = contextBuilder.toString();

            GroqClient.GroqResponse aiResponse = groqClient.generateSummary(request.getQuery(), context);
            if (aiResponse != null) {
                queryResponse.setAiSummary(new QueryResponse.AiSummary(aiResponse.getSummary(), aiResponse.getConfidenceScore()));
            }
        } catch (Exception e) {
            logger.error("Failed to generate AI summary for query: {}", request.getQuery(), e);
        }

        return ResponseEntity.ok(queryResponse);
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
