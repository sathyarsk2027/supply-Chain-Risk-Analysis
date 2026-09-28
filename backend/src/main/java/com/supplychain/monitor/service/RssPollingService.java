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
        pollRssFeedsInternal();
    }

    public int pollRssFeedsNow() {
        return pollRssFeedsInternal();
    }

    private synchronized int pollRssFeedsInternal() {
        logger.info("Starting scheduled RSS feed polling...");
        if (feedUrlsConfig == null || feedUrlsConfig.trim().isEmpty()) {
            logger.warn("RSS feed configuration (rss.feed-urls) is empty. Skipping RSS polling.");
            return 0;
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
        return totalSavedCount;
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

            if (newsArticleRepository.existsByUrl(url)) {
                continue;
            }

            java.util.Optional<NewsArticle> existingOpt = newsArticleRepository.findByUrl(url);
            if (existingOpt.isPresent()) {
                continue;
            }

            String title = entry.getTitle() != null ? entry.getTitle().trim() : "Untitled Disruption Report";
            String entrySource = resolveSourceName(feedUrl, entry, title);

            // Clean title by stripping trailing publisher suffix if present (e.g. "Title - Reuters")
            if (title.contains(" - ")) {
                int lastDash = title.lastIndexOf(" - ");
                if (lastDash > 15) {
                    title = title.substring(0, lastDash).trim();
                }
            }

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
                    entrySource,
                    publishedAt,
                    rawContent,
                    Instant.now()
            );

            // Immediate heuristic categorization so real-time feeds appear categorized immediately
            article.setRiskCategory(inferInitialCategory(title, rawContent));

            // Save immediately so it's live in PostgreSQL for ALL FEEDS and NASA SATELLITE
            try {
                article = newsArticleRepository.save(article);
                savedCount++;
            } catch (Exception e) {
                logger.warn("Could not save initial article '{}': {}", title, e.getMessage());
                continue;
            }

            // NLP enrichment (embeddings & ML category) without blocking the ingestion cycle
            enrichArticleWithNlp(article);
        }

        return savedCount;
    }

    private void enrichArticleWithNlp(NewsArticle article) {
        if (nlpClient == null) return;
        String contentToAnalyze = article.getTitle();
        if (article.getRawContent() != null && !article.getRawContent().trim().isEmpty()) {
            String cleanContent = article.getRawContent().replaceAll("<[^>]*>", " ").trim();
            if (cleanContent.length() > 300) {
                cleanContent = cleanContent.substring(0, 300);
            }
            contentToAnalyze = article.getTitle() + ". " + cleanContent;
        }

        try {
            float[] embedding = nlpClient.getEmbedding(contentToAnalyze);
            boolean updated = false;
            if (embedding != null) {
                article.setEmbedding(new PGvector(embedding));
                updated = true;
            }

            NlpClient.NlpResponse nlpResult = nlpClient.extractEntities(contentToAnalyze);
            if (nlpResult != null && nlpResult.category != null && !nlpResult.category.isEmpty()) {
                article.setRiskCategory(nlpResult.category);
                updated = true;
            }

            if (updated) {
                newsArticleRepository.save(article);
            }
        } catch (Exception e) {
            logger.debug("NLP enrichment skipped for '{}': {}", article.getTitle(), e.getMessage());
        }
    }

    private String inferInitialCategory(String title, String content) {
        String combined = ((title != null ? title : "") + " " + (content != null ? content : "")).toLowerCase();
        if (combined.contains("strike") || combined.contains("war") || combined.contains("tariff") ||
            combined.contains("sanction") || combined.contains("geopolitic") || combined.contains("protest") ||
            combined.contains("conflict") || combined.contains("houthi") || combined.contains("red sea")) {
            return "Geopolitical";
        }
        if (combined.contains("storm") || combined.contains("hurricane") || combined.contains("typhoon") ||
            combined.contains("cyclone") || combined.contains("flood") || combined.contains("drought") ||
            combined.contains("weather") || combined.contains("climate")) {
            return "Weather";
        }
        if (combined.contains("inflation") || combined.contains("price") || combined.contains("cost") ||
            combined.contains("interest rate") || combined.contains("economy") || combined.contains("currency") ||
            combined.contains("market")) {
            return "Market";
        }
        return "Logistics";
    }

    private String resolveSourceName(String feedUrl, SyndEntry entry, String title) {
        if (entry != null && entry.getSource() != null && entry.getSource().getTitle() != null
                && !entry.getSource().getTitle().trim().isEmpty()) {
            return entry.getSource().getTitle().trim();
        }
        if (title != null && title.contains(" - ")) {
            int lastDash = title.lastIndexOf(" - ");
            String candidate = title.substring(lastDash + 3).trim();
            if (!candidate.isEmpty() && candidate.length() < 40) {
                return candidate;
            }
        }
        return getSourceNameForUrl(feedUrl);
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
