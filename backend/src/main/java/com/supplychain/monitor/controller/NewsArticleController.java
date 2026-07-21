package com.supplychain.monitor.controller;

import com.supplychain.monitor.model.NewsArticle;
import com.supplychain.monitor.repository.NewsArticleRepository;
import com.supplychain.monitor.service.NlpClient;
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

    private final NewsArticleRepository newsArticleRepository;
    private final NlpClient nlpClient;

    public NewsArticleController(NewsArticleRepository newsArticleRepository, NlpClient nlpClient) {
        this.newsArticleRepository = newsArticleRepository;
        this.nlpClient = nlpClient;
    }

    @GetMapping("/articles")
    public List<NewsArticle> getAllArticles() {
        return newsArticleRepository.findAll();
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

        return ResponseEntity.ok(new QueryResponse(request.getQuery(), matches));
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
