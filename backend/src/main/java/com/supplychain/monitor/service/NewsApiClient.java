package com.supplychain.monitor.service;

import com.supplychain.monitor.model.NewsArticle;
import com.supplychain.monitor.repository.NewsArticleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.pgvector.PGvector;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class NewsApiClient {

    private static final Logger logger = LoggerFactory.getLogger(NewsApiClient.class);

    private final NewsArticleRepository newsArticleRepository;
    private final RestTemplate restTemplate;
    private final NlpClient nlpClient;
    private final ObjectMapper objectMapper;

    @Value("${newsapi.key}")
    private String apiKey;

    public NewsApiClient(NewsArticleRepository newsArticleRepository, NlpClient nlpClient) {
        this.newsArticleRepository = newsArticleRepository;
        this.nlpClient = nlpClient;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    // Setter for testing
    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public RestTemplate getRestTemplate() {
        return restTemplate;
    }

    @Scheduled(fixedRateString = "${scheduler.fetch-interval-ms}")
    public void collectNews() {
        logger.info("Starting scheduled news collection...");
        if (apiKey == null || apiKey.isEmpty() || "test-api-key".equals(apiKey)) {
            logger.warn("NewsAPI key is empty or invalid ('{}'). Skipping collection.", apiKey);
            return;
        }

        String url = "https://newsapi.org/v2/everything?q={query}&domains={domains}&language=en&sortBy=publishedAt&apiKey={apiKey}";
        try {
            String query = "(\"supply chain\" OR \"logistics\" OR \"shipping\" OR \"port congestion\" OR \"tariffs\" OR \"trade war\" OR \"factory shutdown\" OR \"freight\" OR \"raw materials shortage\") AND NOT (\"best stocks\" OR \"up and coming stocks\" OR \"stocks to invest\")";
            String domains = "reuters.com,bloomberg.com,freightwaves.com,joc.com,supplychaindive.com";
            NewsApiResponse response = restTemplate.getForObject(url, NewsApiResponse.class, query, domains, apiKey);
            if (response == null || response.articles == null) {
                logger.warn("Received empty response from NewsAPI.");
                return;
            }

            int savedCount = 0;
            for (NewsApiArticle apiArticle : response.articles) {
                if (apiArticle.url == null || apiArticle.url.isEmpty()) {
                    continue;
                }

                if (!newsArticleRepository.existsByUrl(apiArticle.url)) {
                    Instant publishedAt = Instant.now();
                    if (apiArticle.publishedAt != null) {
                        try {
                            publishedAt = Instant.parse(apiArticle.publishedAt);
                        } catch (Exception e) {
                            logger.debug("Failed to parse publishedAt: {}. Using current timestamp.", apiArticle.publishedAt);
                        }
                    }

                    String sourceName = (apiArticle.source != null) ? apiArticle.source.name : "Unknown Source";

                    NewsArticle article = new NewsArticle(
                            apiArticle.title,
                            apiArticle.url,
                            sourceName,
                            publishedAt,
                            apiArticle.content,
                            Instant.now()
                    );

                    NewsArticle savedArticle = newsArticleRepository.save(article);
                    savedCount++;

                    if (savedArticle != null) {
                        // Extract and enrich using NLP service
                        String contentToAnalyze = savedArticle.getRawContent();
                        if (contentToAnalyze == null || contentToAnalyze.isEmpty()) {
                            contentToAnalyze = savedArticle.getTitle();
                        }

                        boolean needsUpdate = false;

                        if (contentToAnalyze != null && !contentToAnalyze.isEmpty()) {
                            try {
                                NlpClient.NlpResponse nlpResponse = nlpClient.extractEntities(contentToAnalyze);
                                if (nlpResponse != null) {
                                    savedArticle.setRiskCategory(nlpResponse.category);
                                    EntityData entityData = new EntityData(
                                            nlpResponse.companies,
                                            nlpResponse.locations,
                                            nlpResponse.dates
                                    );
                                    savedArticle.setEntities(objectMapper.writeValueAsString(entityData));
                                    needsUpdate = true;
                                    logger.debug("Successfully enriched article ID {} with category: {}", savedArticle.getId(), nlpResponse.category);
                                }
                            } catch (Exception e) {
                                logger.warn("Failed to enrich article ID {}: {}", savedArticle.getId(), e.getMessage());
                            }
                        }

                        // Generate vector embedding using the article title
                        if (savedArticle.getTitle() != null && !savedArticle.getTitle().isEmpty()) {
                            try {
                                float[] embedding = nlpClient.getEmbedding(savedArticle.getTitle());
                                if (embedding != null) {
                                    savedArticle.setEmbedding(new PGvector(embedding));
                                    needsUpdate = true;
                                    logger.debug("Successfully generated embedding for article ID {}", savedArticle.getId());
                                }
                            } catch (Exception e) {
                                logger.warn("Failed to generate embedding for article ID {}: {}", savedArticle.getId(), e.getMessage());
                            }
                        }

                        if (needsUpdate) {
                            try {
                                newsArticleRepository.save(savedArticle);
                            } catch (Exception e) {
                                logger.error("Failed to save enriched article ID {} to database: {}", savedArticle.getId(), e.getMessage());
                            }
                        }
                    }
                }
            }

            logger.info("News collection finished. Saved {} new articles.", savedCount);

        } catch (Exception e) {
            logger.error("Failed to collect news articles from NewsAPI", e);
        }
    }

    // DTO Classes matching the NewsAPI response JSON structure
    public static class NewsApiResponse {
        public String status;
        public int totalResults;
        public List<NewsApiArticle> articles = new ArrayList<>();
    }

    public static class NewsApiArticle {
        public NewsApiSource source;
        public String author;
        public String title;
        public String description;
        public String url;
        public String urlToImage;
        public String publishedAt;
        public String content;
    }

    public static class NewsApiSource {
        public String id;
        public String name;
    }

    public static class EntityData {
        public List<String> companies;
        public List<String> locations;
        public List<String> dates;

        public EntityData() {}
        public EntityData(List<String> companies, List<String> locations, List<String> dates) {
            this.companies = companies;
            this.locations = locations;
            this.dates = dates;
        }
    }
}
