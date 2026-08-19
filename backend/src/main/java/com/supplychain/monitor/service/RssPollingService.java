package com.supplychain.monitor.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pgvector.PGvector;
import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import com.supplychain.monitor.model.NewsArticle;
import com.supplychain.monitor.repository.NewsArticleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLConnection;
import java.time.Instant;
import java.util.Arrays;
import java.util.Date;
import java.util.List;

@Service
public class RssPollingService {

    private static final Logger logger = LoggerFactory.getLogger(RssPollingService.class);

    private final NewsArticleRepository newsArticleRepository;
    private final NlpClient nlpClient;
    private final ObjectMapper objectMapper;

    @Value("${rss.feed-urls}")
    private String feedUrlsConfig;

    public RssPollingService(NewsArticleRepository newsArticleRepository, NlpClient nlpClient) {
        this.newsArticleRepository = newsArticleRepository;
        this.nlpClient = nlpClient;
        this.objectMapper = new ObjectMapper();
    }

    // Setter for testing
    public void setFeedUrlsConfig(String feedUrlsConfig) {
        this.feedUrlsConfig = feedUrlsConfig;
    }

    @Scheduled(fixedRateString = "${rss.fetch-interval-ms}")
    public void pollRssFeeds() {
        logger.info("Starting scheduled RSS feed polling...");
        if (feedUrlsConfig == null || feedUrlsConfig.trim().isEmpty()) {
            logger.warn("RSS feed configuration (rss.feed-urls) is empty. Skipping RSS polling.");
            return;
        }

        List<String> feedUrls = Arrays.stream(feedUrlsConfig.split(","))
                .map(String::trim)
                .filter(url -> !url.isEmpty())
                .toList();

        int totalSavedCount = 0;

        for (String feedUrl : feedUrls) {
            try {
                int savedForFeed = processFeed(feedUrl);
                totalSavedCount += savedForFeed;
            } catch (Exception e) {
                logger.error("Failed to process RSS feed at '{}': {}", feedUrl, e.getMessage(), e);
            }
        }

        logger.info("RSS feed polling finished. Saved {} new articles across all feeds.", totalSavedCount);
    }

    private int processFeed(String feedUrl) throws Exception {
        String sourceName = getSourceNameForUrl(feedUrl);
        logger.info("Fetching RSS feed for source '{}' from URL: {}", sourceName, feedUrl);

        URLConnection connection = URI.create(feedUrl).toURL().openConnection();
        connection.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(10000);

        SyndFeedInput input = new SyndFeedInput();
        SyndFeed feed;
        try (XmlReader reader = new XmlReader(connection)) {
            feed = input.build(reader);
        }

        if (feed == null || feed.getEntries() == null || feed.getEntries().isEmpty()) {
            logger.warn("RSS feed at '{}' returned zero parseable entries.", feedUrl);
            return 0;
        }

        List<SyndEntry> entries = feed.getEntries();
        logger.info("Found {} entries in RSS feed for '{}'", entries.size(), sourceName);

        int savedCount = 0;
        for (SyndEntry entry : entries) {
            String url = entry.getLink();
            if (url == null || url.trim().isEmpty()) {
                continue;
            }
            url = url.trim();

            if (!newsArticleRepository.existsByUrl(url)) {
                String title = entry.getTitle();
                
                Instant publishedAt = Instant.now();
                Date pubDate = entry.getPublishedDate();
                if (pubDate == null) {
                    pubDate = entry.getUpdatedDate();
                }
                if (pubDate != null) {
                    publishedAt = pubDate.toInstant();
                }

                String rawContent = "";
                if (entry.getDescription() != null && entry.getDescription().getValue() != null) {
                    rawContent = entry.getDescription().getValue();
                } else if (entry.getContents() != null && !entry.getContents().isEmpty()) {
                    rawContent = entry.getContents().get(0).getValue();
                }

                NewsArticle article = new NewsArticle(
                        title,
                        url,
                        sourceName,
                        publishedAt,
                        rawContent,
                        Instant.now()
                );

                NewsArticle savedArticle = newsArticleRepository.save(article);
                savedCount++;

                if (savedArticle != null) {
                    // Extract and enrich using NLP service
                    String contentToAnalyze = savedArticle.getRawContent();
                    if (contentToAnalyze == null || contentToAnalyze.trim().isEmpty()) {
                        contentToAnalyze = savedArticle.getTitle();
                    }

                    boolean needsUpdate = false;

                    if (contentToAnalyze != null && !contentToAnalyze.trim().isEmpty()) {
                        try {
                            NlpClient.NlpResponse nlpResponse = nlpClient.extractEntities(contentToAnalyze);
                            if (nlpResponse != null) {
                                savedArticle.setRiskCategory(nlpResponse.category);
                                NewsApiClient.EntityData entityData = new NewsApiClient.EntityData(
                                        nlpResponse.companies,
                                        nlpResponse.locations,
                                        nlpResponse.dates
                                );
                                savedArticle.setEntities(objectMapper.writeValueAsString(entityData));
                                needsUpdate = true;
                                logger.debug("Successfully enriched RSS article ID {} with category: {}", savedArticle.getId(), nlpResponse.category);
                            }
                        } catch (Exception e) {
                            logger.warn("Failed to enrich RSS article ID {}: {}", savedArticle.getId(), e.getMessage());
                        }
                    }

                    // Generate vector embedding using article title
                    if (savedArticle.getTitle() != null && !savedArticle.getTitle().trim().isEmpty()) {
                        try {
                            float[] embedding = nlpClient.getEmbedding(savedArticle.getTitle());
                            if (embedding != null) {
                                savedArticle.setEmbedding(new PGvector(embedding));
                                needsUpdate = true;
                                logger.debug("Successfully generated embedding for RSS article ID {}", savedArticle.getId());
                            }
                        } catch (Exception e) {
                            logger.warn("Failed to generate embedding for RSS article ID {}: {}", savedArticle.getId(), e.getMessage());
                        }
                    }

                    if (needsUpdate) {
                        try {
                            newsArticleRepository.save(savedArticle);
                        } catch (Exception e) {
                            logger.error("Failed to save enriched RSS article ID {} to database: {}", savedArticle.getId(), e.getMessage());
                        }
                    }
                }
            }
        }

        return savedCount;
    }

    private String getSourceNameForUrl(String feedUrl) {
        if (feedUrl == null) {
            return "RSS Publisher";
        }
        String lowerUrl = feedUrl.toLowerCase();
        if (lowerUrl.contains("freightwaves.com")) {
            return "FreightWaves";
        } else if (lowerUrl.contains("joc.com")) {
            return "Journal of Commerce";
        } else if (lowerUrl.contains("maritime-executive.com")) {
            return "Maritime Executive";
        } else if (lowerUrl.contains("gcaptain.com")) {
            return "gCaptain Maritime";
        } else if (lowerUrl.contains("supplychainbrain.com")) {
            return "SupplyChainBrain";
        } else if (lowerUrl.contains("logisticsmgmt.com")) {
            return "Logistics Management";
        }
        return "Global Disruption Feed";
    }
}
