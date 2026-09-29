package com.supplychain.monitor.service;

import com.supplychain.monitor.model.NewsArticle;
import com.supplychain.monitor.repository.NewsArticleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Daily Digest Service — generates an AI-powered supply chain risk summary email.
 *
 * Architecture:
 *   1. Queries all articles ingested in the previous 24h (by fetchedAt).
 *   2. Splits them into India-focused and Global buckets using regex matching.
 *   3. Computes an aggregate India risk score using the shared RiskScoreCalculator.
 *   4. Scans all 26 tracked countries for elevated risk (score >= 65).
 *   5. Calls Groq to generate narrative summaries for each section.
 *   6. Builds a clean HTML email and sends it via Gmail SMTP.
 */
@Service
public class DailyDigestService {

    private static final Logger logger = LoggerFactory.getLogger(DailyDigestService.class);

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter DATE_DISPLAY = DateTimeFormatter.ofPattern("MMMM d, yyyy");
    private static final int ELEVATED_THRESHOLD = 65;

    // India regex — matches the same pattern as CountryRiskController
    private static final Pattern INDIA_PATTERN = Pattern.compile(
            "\\b(india|indian|mumbai|mundra|nhava sheva|delhi|gujarat|chennai|bengaluru)\\b",
            Pattern.CASE_INSENSITIVE
    );

    // Country regex patterns for cross-country scanning (subset of CountryRiskController.ALL_COUNTRIES)
    private static final Map<String, Pattern> COUNTRY_PATTERNS = new LinkedHashMap<>();
    static {
        COUNTRY_PATTERNS.put("United States", Pattern.compile("\\b(united states|usa|us|u\\.s\\.|america|american|los angeles|long beach|california)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("China", Pattern.compile("\\b(china|chinese|shanghai|shenzhen|ningbo|beijing|guangzhou|yantian)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("Germany", Pattern.compile("\\b(germany|german|hamburg|rhine|bremerhaven|berlin|frankfurt|munich)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("Egypt", Pattern.compile("\\b(egypt|egyptian|suez|suez canal|cairo|sinai)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("Singapore", Pattern.compile("\\b(singapore|pasir panjang|malacca|strait of malacca)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("Japan", Pattern.compile("\\b(japan|japanese|tokyo|yokohama|kobe|nagoya)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("United Kingdom", Pattern.compile("\\b(united kingdom|uk|u\\.k\\.|britain|british|felixstowe|dover|london|england)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("Netherlands", Pattern.compile("\\b(netherlands|dutch|rotterdam|holland)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("South Korea", Pattern.compile("\\b(korea|korean|busan|incheon|seoul)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("Brazil", Pattern.compile("\\b(brazil|brazilian|santos|paranaguá)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("Turkey", Pattern.compile("\\b(turkey|turkish|istanbul|bosphorus)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("Saudi Arabia", Pattern.compile("\\b(saudi arabia|saudi|riyadh|jeddah)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("UAE", Pattern.compile("\\b(uae|united arab emirates|dubai|abu dhabi|jebel ali)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("Russia", Pattern.compile("\\b(russia|russian|moscow|vladivostok)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("France", Pattern.compile("\\b(france|french|le havre|marseille|paris)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("Mexico", Pattern.compile("\\b(mexico|mexican|manzanillo|laredo|monterrey)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("Canada", Pattern.compile("\\b(canada|canadian|vancouver|montreal|prince rupert)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("Australia", Pattern.compile("\\b(australia|australian|sydney|melbourne|brisbane|fremantle)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("Indonesia", Pattern.compile("\\b(indonesia|indonesian|jakarta|surabaya)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("Vietnam", Pattern.compile("\\b(vietnam|vietnamese|ho chi minh|hanoi|haiphong)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("Malaysia", Pattern.compile("\\b(malaysia|malaysian|port klang|penang)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("Thailand", Pattern.compile("\\b(thailand|thai|bangkok|laem chabang)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("Italy", Pattern.compile("\\b(italy|italian|genoa|trieste|rome)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("Spain", Pattern.compile("\\b(spain|spanish|barcelona|valencia|algeciras)\\b", Pattern.CASE_INSENSITIVE));
        COUNTRY_PATTERNS.put("South Africa", Pattern.compile("\\b(south africa|durban|cape town|johannesburg)\\b", Pattern.CASE_INSENSITIVE));
    }

    private final NewsArticleRepository newsArticleRepository;
    private final GroqClient groqClient;
    private final CountryRiskService countryRiskService;

    @Value("${digest.recipient.email:}")
    private String recipientEmail;

    @Value("${resend.api.key:}")
    private String resendApiKey;

    @Value("${spring.mail.username:}")
    private String gmailUsername;

    @Value("${spring.mail.password:}")
    private String gmailPassword;

    @Value("${digest.dashboard.url:http://localhost:5173}")
    private String dashboardUrl;

    // Simple date-based deduplication to prevent double-sends
    private volatile String lastSentDate = "";

    @Autowired
    public DailyDigestService(NewsArticleRepository newsArticleRepository, GroqClient groqClient, CountryRiskService countryRiskService) {
        this.newsArticleRepository = newsArticleRepository;
        this.groqClient = groqClient;
        this.countryRiskService = countryRiskService;
    }

    // --------------------------------------------------------------------------
    // Backup @Scheduled cron — fires at 6:00 AM IST daily.
    // Primary trigger is the external cron-job.org HTTP call to /api/digest/trigger.
    // --------------------------------------------------------------------------
    @Scheduled(cron = "${digest.cron.expression:0 0 6 * * *}", zone = "Asia/Kolkata")
    public void scheduledDigest() {
        logger.info("@Scheduled daily digest cron firing at 6:00 AM IST...");
        try {
            generateAndSendDigest(false);
        } catch (Exception e) {
            logger.error("Scheduled daily digest failed: {}", e.getMessage(), e);
        }
    }

    /**
     * Core method: generates the digest and sends the email.
     *
     * @param forceRun If true, skips deduplication (used by /send-now).
     * @return A DigestResult containing the generated content (for API response inspection).
     */
    public DigestResult generateAndSendDigest(boolean forceRun) {
        LocalDate today = LocalDate.now(IST);
        String todayStr = today.toString();

        // Deduplication check
        if (!forceRun && todayStr.equals(lastSentDate)) {
            logger.info("Daily digest already sent for {}. Skipping.", todayStr);
            return new DigestResult("already_sent", "Digest already sent for " + todayStr, null, 0, null);
        }

        // Determine time window — always use rolling 24h from now
        Instant windowEnd = Instant.now();
        Instant windowStart = windowEnd.minus(Duration.ofHours(24));

        logger.info("Generating daily digest for window: {} to {}", windowStart, windowEnd);

        // 1. Query all articles ingested in the window
        List<NewsArticle> allArticles = newsArticleRepository.findArticlesIngestedBetween(windowStart, windowEnd);
        logger.info("Total articles ingested in digest window: {}", allArticles.size());

        if (allArticles.isEmpty()) {
            logger.warn("Zero articles ingested in strict 24h window. Supplementing with latest database articles.");
            List<NewsArticle> latestArticles = newsArticleRepository.findAllByOrderByPublishedAtDesc();
            if (latestArticles != null && !latestArticles.isEmpty()) {
                allArticles = latestArticles.stream().limit(35).collect(Collectors.toList());
                logger.info("Supplemented digest with {} recent database articles.", allArticles.size());
            }
        }

        // 2. Query real-time India intelligence pool — 100% synchronized with NASA Satellite tab
        List<NewsArticle> indiaArticles = (countryRiskService != null)
                ? countryRiskService.getMatchedArticles("India")
                : Collections.emptyList();

        if (indiaArticles.isEmpty()) {
            for (NewsArticle article : allArticles) {
                String content = buildSearchableContent(article);
                if (INDIA_PATTERN.matcher(content).find()) {
                    indiaArticles.add(article);
                }
            }
        }

        // Global articles: articles outside the India focus pool
        Set<Long> indiaArticleIds = indiaArticles.stream()
                .map(NewsArticle::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        List<NewsArticle> globalArticles = allArticles.stream()
                .filter(a -> a.getId() == null || !indiaArticleIds.contains(a.getId()))
                .collect(Collectors.toList());

        // Supplement global articles if count is low
        if (globalArticles.size() < 10) {
            List<NewsArticle> recentAll = newsArticleRepository.findAllByOrderByPublishedAtDesc();
            if (recentAll != null) {
                for (NewsArticle a : recentAll) {
                    if (a.getId() != null && !indiaArticleIds.contains(a.getId())
                            && globalArticles.stream().noneMatch(existing -> existing.getId().equals(a.getId()))) {
                        globalArticles.add(a);
                    }
                    if (globalArticles.size() >= 30) break;
                }
            }
        }

        logger.info("Real-time India articles (NASA Satellite sync): {}, Global articles: {}",
                indiaArticles.size(), globalArticles.size());

        // 3. Compute India aggregate risk score — exact mathematical parity with NASA Satellite tab
        RiskScoreCalculator.RiskResult indiaRisk = (countryRiskService != null)
                ? countryRiskService.calculateRisk(indiaArticles)
                : RiskScoreCalculator.compute(indiaArticles);

        // 4. Cross-country scan for elevated risks — synchronized with live country intelligence
        Map<String, Integer> elevatedCountries = new LinkedHashMap<>();
        if (countryRiskService != null) {
            for (CountryRiskService.CountryPin pin : CountryRiskService.ALL_COUNTRIES) {
                if ("India".equalsIgnoreCase(pin.query)) continue;
                RiskScoreCalculator.RiskResult countryResult = countryRiskService.calculateRisk(pin.query);
                if (countryResult.getScore() >= ELEVATED_THRESHOLD) {
                    elevatedCountries.put(pin.query, countryResult.getScore());
                }
            }
        } else {
            for (Map.Entry<String, Pattern> entry : COUNTRY_PATTERNS.entrySet()) {
                List<NewsArticle> countryArticles = allArticles.stream()
                        .filter(a -> entry.getValue().matcher(buildSearchableContent(a)).find())
                        .collect(Collectors.toList());
                if (!countryArticles.isEmpty()) {
                    RiskScoreCalculator.RiskResult result = RiskScoreCalculator.compute(countryArticles);
                    if (result.getScore() >= ELEVATED_THRESHOLD) {
                        elevatedCountries.put(entry.getKey(), result.getScore());
                    }
                }
            }
        }

        // 5. Generate AI summaries in parallel to reduce response time (from ~15s to ~6s)
        java.util.concurrent.CompletableFuture<String> indiaFuture =
                java.util.concurrent.CompletableFuture.supplyAsync(() -> generateSectionSummary(indiaArticles, "India"));
        java.util.concurrent.CompletableFuture<String> globalFuture =
                java.util.concurrent.CompletableFuture.supplyAsync(() -> generateSectionSummary(globalArticles, "global supply chain"));

        String indiaSummary;
        String globalSummary;
        try {
            indiaSummary = indiaFuture.get(12, java.util.concurrent.TimeUnit.SECONDS);
        } catch (Exception e) {
            logger.warn("India summary generation timed out or failed: {}", e.getMessage());
            indiaSummary = buildDataDrivenSummary(indiaArticles, "India");
        }

        try {
            globalSummary = globalFuture.get(12, java.util.concurrent.TimeUnit.SECONDS);
        } catch (Exception e) {
            logger.warn("Global summary generation timed out or failed: {}", e.getMessage());
            globalSummary = buildDataDrivenSummary(globalArticles, "global supply chain");
        }

        // 6. Build HTML email
        String dateDisplay = today.format(DATE_DISPLAY);
        String subjectLine = "Supply Chain Risk Digest — " + dateDisplay;
        String htmlBody = buildHtmlEmail(dateDisplay, indiaRisk, elevatedCountries,
                indiaSummary, indiaArticles.size(), globalSummary, globalArticles.size(), allArticles.size());

        // 7. Send email
        boolean emailSent = sendEmail(subjectLine, htmlBody);

        if (emailSent && !forceRun) {
            lastSentDate = todayStr;
        }

        String status = emailSent ? "sent" : "generated_but_email_failed";
        return new DigestResult(status, subjectLine, indiaSummary, indiaRisk.getScore(),
                elevatedCountries.isEmpty() ? null : elevatedCountries);
    }

    /**
     * Generates the rendered HTML email without sending it,
     * allowing instant local browser preview and verification.
     */
    public String generateDigestPreviewHtml() {
        LocalDate today = LocalDate.now(IST);
        List<NewsArticle> allArticles = (newsArticleRepository != null)
                ? newsArticleRepository.findAllByOrderByPublishedAtDesc()
                : Collections.emptyList();
        if (allArticles == null) allArticles = Collections.emptyList();

        List<NewsArticle> indiaArticles = (countryRiskService != null)
                ? countryRiskService.getMatchedArticles("India")
                : allArticles.stream()
                        .filter(a -> COUNTRY_PATTERNS.get("India").matcher(buildSearchableContent(a)).find())
                        .collect(Collectors.toList());

        Set<Long> indiaArticleIds = indiaArticles.stream()
                .map(NewsArticle::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        List<NewsArticle> globalArticles = allArticles.stream()
                .filter(a -> a.getId() == null || !indiaArticleIds.contains(a.getId()))
                .collect(Collectors.toList());

        RiskScoreCalculator.RiskResult indiaRisk = (countryRiskService != null)
                ? countryRiskService.calculateRisk(indiaArticles)
                : RiskScoreCalculator.compute(indiaArticles);

        Map<String, Integer> elevatedCountries = new LinkedHashMap<>();
        if (countryRiskService != null) {
            for (CountryRiskService.CountryPin pin : CountryRiskService.ALL_COUNTRIES) {
                if ("India".equalsIgnoreCase(pin.query)) continue;
                RiskScoreCalculator.RiskResult countryResult = countryRiskService.calculateRisk(pin.query);
                if (countryResult.getScore() >= ELEVATED_THRESHOLD) {
                    elevatedCountries.put(pin.query, countryResult.getScore());
                }
            }
        }

        String indiaSummary = generateSectionSummary(indiaArticles, "India");
        String globalSummary = generateSectionSummary(globalArticles, "global supply chain");

        String dateDisplay = today.format(DATE_DISPLAY);
        return buildHtmlEmail(dateDisplay, indiaRisk, elevatedCountries,
                indiaSummary, indiaArticles.size(), globalSummary, globalArticles.size(), allArticles.size());
    }

    // --------------------------------------------------------------------------
    // AI Summary Generation
    // --------------------------------------------------------------------------
    private String generateSectionSummary(List<NewsArticle> articles, String sectionLabel) {
        if (articles == null || articles.isEmpty()) {
            if (sectionLabel.toLowerCase().contains("india")) {
                return "No India-specific disruption news was ingested yesterday.";
            }
            return "No significant global disruptions reported yesterday.";
        }

        // Build context from article titles + content snippets
        StringBuilder contextBuilder = new StringBuilder();
        int count = 0;
        for (NewsArticle article : articles) {
            if (count >= 15) break;
            count++;
            String title = stripHtmlTags(article.getTitle() != null ? article.getTitle() : "");
            String riskCategory = article.getRiskCategory() != null ? article.getRiskCategory() : "Uncategorized";
            String rawContent = stripHtmlTags(article.getRawContent() != null ? article.getRawContent() : "");
            if (rawContent.length() > 250) {
                rawContent = rawContent.substring(0, 250) + "...";
            }
            contextBuilder.append(String.format("Article %d: %s | Category: %s\nContent: %s\n\n", count, title, riskCategory, rawContent));
        }

        try {
            GroqClient.GroqResponse response = groqClient.generateSummary(sectionLabel, contextBuilder.toString());
            if (response != null && response.getSummary() != null && !response.getSummary().trim().isEmpty()
                    && !response.getSummary().contains("localized adjustments and emerging risk factors")) {
                return response.getSummary().trim();
            }
        } catch (Exception e) {
            logger.error("Groq AI summary generation failed for {}: {}", sectionLabel, e.getMessage());
        }

        // Smart data-driven fallback: analyze actual article data
        return buildDataDrivenSummary(articles, sectionLabel);
    }

    /**
     * Builds an intelligent summary by analyzing article titles, categories, and sources.
     * This replaces the generic "localized adjustments" canned text with actual data insights.
     */
    private String buildDataDrivenSummary(List<NewsArticle> articles, String sectionLabel) {
        // Count categories
        Map<String, Integer> catCounts = new LinkedHashMap<>();
        Map<String, Integer> sourceCounts = new LinkedHashMap<>();
        for (NewsArticle a : articles) {
            String cat = a.getRiskCategory() != null ? a.getRiskCategory().toLowerCase() : "other";
            catCounts.merge(cat, 1, Integer::sum);
            String src = a.getSource() != null ? a.getSource() : "Unknown";
            sourceCounts.merge(src, 1, Integer::sum);
        }

        // Find dominant category
        String dominantCat = catCounts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("general");

        // Find top source
        String topSource = sourceCounts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(e -> e.getKey() + " (" + e.getValue() + " articles)")
                .orElse("various sources");

        // Get top 3 article titles for specificity
        List<String> topTitles = articles.stream()
                .limit(3)
                .map(a -> a.getTitle() != null ? a.getTitle() : "Untitled")
                .collect(Collectors.toList());

        StringBuilder sb = new StringBuilder();
        String dateStr = LocalDate.now(IST).format(DATE_DISPLAY);

        sb.append("As of ").append(dateStr).append(", our monitoring systems ingested ")
          .append(articles.size()).append(" articles relevant to ").append(sectionLabel).append(". ");

        // Category insight
        if ("logistics".equals(dominantCat)) {
            sb.append("The dominant theme is logistics and freight operations, indicating active movements in shipping lanes, port operations, and cargo management. ");
        } else if ("geopolitical".equals(dominantCat) || dominantCat.contains("geo")) {
            sb.append("Geopolitical developments dominate the coverage, signaling potential regulatory shifts, trade policy changes, or regional tensions affecting supply routes. ");
        } else if ("weather".equals(dominantCat)) {
            sb.append("Weather and climate events are the primary focus, with environmental disruptions potentially impacting port access, transit times, and infrastructure stability. ");
        } else if ("market".equals(dominantCat)) {
            sb.append("Market and financial dynamics lead the coverage, suggesting evolving commercial pressures on supply chain cost structures. ");
        } else {
            sb.append("Coverage spans multiple risk categories, reflecting a complex and evolving operational landscape. ");
        }

        sb.append("Primary intelligence sourced from ").append(topSource).append(".");

        // Top stories
        sb.append("\n\nKey stories driving the risk assessment:\n");
        for (int i = 0; i < topTitles.size(); i++) {
            sb.append("• ").append(topTitles.get(i)).append("\n");
        }

        return sb.toString().trim();
    }

    // --------------------------------------------------------------------------
    // Email Delivery (via Resend API over HTTPS)
    // --------------------------------------------------------------------------
    private boolean sendEmail(String subject, String htmlBody) {
        if (recipientEmail == null || recipientEmail.trim().isEmpty()) {
            logger.warn("DIGEST_RECIPIENT_EMAIL is not configured. Skipping email delivery.");
            return false;
        }

        // Tier 1: Try Resend API (HTTPS)
        if (resendApiKey != null && !resendApiKey.trim().isEmpty()) {
            try {
                org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
                org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
                headers.set("Authorization", "Bearer " + resendApiKey.trim());

                java.util.Map<String, Object> payload = new java.util.HashMap<>();
                payload.put("from", "Supply Chain Intelligence <onboarding@resend.dev>");
                payload.put("to", recipientEmail.trim());
                payload.put("subject", subject);
                payload.put("html", htmlBody);
                payload.put("reply_to", recipientEmail.trim());

                org.springframework.http.HttpEntity<java.util.Map<String, Object>> request = new org.springframework.http.HttpEntity<>(payload, headers);
                org.springframework.http.ResponseEntity<String> response = restTemplate.postForEntity("https://api.resend.com/emails", request, String.class);

                if (response.getStatusCode().is2xxSuccessful()) {
                    logger.info("Daily digest email sent successfully via Resend to {}", recipientEmail);
                    return true;
                } else {
                    logger.warn("Resend API returned non-2xx status: {}. Attempting fallback...", response.getStatusCode());
                }
            } catch (Exception e) {
                logger.warn("Resend API delivery failed: {}. Attempting Gmail SMTP fallback...", e.getMessage());
            }
        }

        // Tier 2: Fallback to Gmail SMTP if configured
        if (gmailUsername != null && !gmailUsername.trim().isEmpty()
                && gmailPassword != null && !gmailPassword.trim().isEmpty()) {
            String cleanPassword = gmailPassword.trim().replace(" ", "");

            // Attempt A: Port 587 with STARTTLS
            try {
                org.springframework.mail.javamail.JavaMailSenderImpl mailSender = new org.springframework.mail.javamail.JavaMailSenderImpl();
                mailSender.setHost("smtp.gmail.com");
                mailSender.setPort(587);
                mailSender.setUsername(gmailUsername.trim());
                mailSender.setPassword(cleanPassword);

                java.util.Properties props = mailSender.getJavaMailProperties();
                props.put("mail.transport.protocol", "smtp");
                props.put("mail.smtp.auth", "true");
                props.put("mail.smtp.starttls.enable", "true");
                props.put("mail.smtp.ssl.trust", "smtp.gmail.com");
                props.put("mail.smtp.connectiontimeout", "10000");
                props.put("mail.smtp.timeout", "10000");

                jakarta.mail.internet.MimeMessage message = mailSender.createMimeMessage();
                org.springframework.mail.javamail.MimeMessageHelper helper =
                        new org.springframework.mail.javamail.MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(new jakarta.mail.internet.InternetAddress(gmailUsername.trim(), "Supply Chain Intelligence"));
                helper.setTo(recipientEmail.trim());
                helper.setSubject(subject);
                helper.setText(htmlBody, true);
                helper.setReplyTo(recipientEmail.trim());

                mailSender.send(message);
                logger.info("Daily digest email sent successfully via Gmail SMTP (port 587) to {}", recipientEmail);
                return true;
            } catch (Exception e) {
                logger.warn("Gmail SMTP port 587 delivery failed: {}. Retrying with Port 465 SSL...", e.getMessage());
            }

            // Attempt B: Port 465 with direct SSL
            try {
                org.springframework.mail.javamail.JavaMailSenderImpl mailSenderSsl = new org.springframework.mail.javamail.JavaMailSenderImpl();
                mailSenderSsl.setHost("smtp.gmail.com");
                mailSenderSsl.setPort(465);
                mailSenderSsl.setUsername(gmailUsername.trim());
                mailSenderSsl.setPassword(cleanPassword);

                java.util.Properties propsSsl = mailSenderSsl.getJavaMailProperties();
                propsSsl.put("mail.transport.protocol", "smtps");
                propsSsl.put("mail.smtp.auth", "true");
                propsSsl.put("mail.smtp.ssl.enable", "true");
                propsSsl.put("mail.smtp.ssl.trust", "smtp.gmail.com");
                propsSsl.put("mail.smtp.connectiontimeout", "10000");
                propsSsl.put("mail.smtp.timeout", "10000");

                jakarta.mail.internet.MimeMessage message = mailSenderSsl.createMimeMessage();
                org.springframework.mail.javamail.MimeMessageHelper helper =
                        new org.springframework.mail.javamail.MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(new jakarta.mail.internet.InternetAddress(gmailUsername.trim(), "Supply Chain Intelligence"));
                helper.setTo(recipientEmail.trim());
                helper.setSubject(subject);
                helper.setText(htmlBody, true);
                helper.setReplyTo(recipientEmail.trim());

                mailSenderSsl.send(message);
                logger.info("Daily digest email sent successfully via Gmail SMTP (port 465 SSL) to {}", recipientEmail);
                return true;
            } catch (Exception e) {
                logger.error("Gmail SMTP port 465 SSL delivery also failed: {}", e.getMessage(), e);
            }
        } else {
            logger.warn("Neither RESEND_API_KEY nor valid Gmail SMTP credentials (username/password) are available.");
        }

        return false;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HTML Email Template — Premium Executive Briefing Design
    // Deep navy hero + clean white body + minimal article feed
    // ══════════════════════════════════════════════════════════════════════════
    private String buildHtmlEmail(String dateDisplay, RiskScoreCalculator.RiskResult indiaRisk,
                                  Map<String, Integer> elevatedCountries,
                                  String indiaSummary, int indiaCount,
                                  String globalSummary, int globalCount) {
        return buildHtmlEmail(dateDisplay, indiaRisk, elevatedCountries, indiaSummary, indiaCount, globalSummary, globalCount, indiaCount + globalCount);
    }

    private String buildHtmlEmail(String dateDisplay, RiskScoreCalculator.RiskResult indiaRisk,
                                  Map<String, Integer> elevatedCountries,
                                  String indiaSummary, int indiaCount,
                                  String globalSummary, int globalCount, int scannedCount) {

        String riskColor = indiaRisk.getColorHex();
        String riskLabel = indiaRisk.getStatus();
        int riskScore = indiaRisk.getScore();
        int totalArticles = Math.max(scannedCount, indiaCount + globalCount);

        String indiaHtml = escapeHtml(sanitizeSummaryText(indiaSummary)).replace("\n", "<br>");
        String globalHtml = escapeHtml(sanitizeSummaryText(globalSummary)).replace("\n", "<br>");

        Map<String, Integer> catScores = indiaRisk.getCategoryScores();
        int geo = catScores.getOrDefault("geopolitical", 0);
        int log = catScores.getOrDefault("logistics", 0);
        int wx  = catScores.getOrDefault("weather", 0);
        int mkt = catScores.getOrDefault("market", 0);

        String reportId = "#SCR-" + LocalDate.now(IST).format(DateTimeFormatter.ofPattern("yyMMdd"));
        String timeGen = LocalTime.now(IST).format(DateTimeFormatter.ofPattern("HH:mm"));

        // Elevated countries pill
        String elevatedHtml = "";
        if (elevatedCountries != null && !elevatedCountries.isEmpty()) {
            StringBuilder eb = new StringBuilder();
            for (Map.Entry<String, Integer> e : elevatedCountries.entrySet()) {
                eb.append("<span style=\"display:inline-block;margin:2px 4px 2px 0;padding:2px 8px;background:rgba(245,158,11,0.12);color:#d97706;font-size:10px;font-weight:700;border-radius:10px;\">")
                  .append(escapeHtml(e.getKey())).append(" ").append(e.getValue()).append("</span>");
            }
            elevatedHtml = "<div style=\"margin-top:8px;\">" + eb.toString() + "</div>";
        }

        // Top headlines
        List<NewsArticle> recentArticles = (newsArticleRepository != null)
                ? newsArticleRepository.findAllByOrderByPublishedAtDesc()
                : java.util.Collections.emptyList();
        String headlinesHtml = buildTopHeadlinesHtml(recentArticles, 5);

        // Build risk gauge — 20 thin segments for a sleek look
        StringBuilder gauge = new StringBuilder();
        int filled20 = Math.max(1, riskScore / 5);
        for (int i = 0; i < 20; i++) {
            String bg = i < filled20 ? riskColor : "#e2e8f0";
            gauge.append("<td style=\"width:5%;height:6px;font-size:1px;line-height:1px;background:").append(bg).append(";border-radius:3px;\">&nbsp;</td>");
        }

        // ─── Assemble the email ─────────────────────────────────────────────
        return "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\"><title>Supply Chain Risk Intelligence</title></head>" +
        "<body style=\"margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;\">" +
        "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color:#f1f5f9;\"><tr><td align=\"center\" style=\"padding:24px 12px 36px;\">" +
        "<table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.08);border:1px solid #e2e8f0;\">" +

        // ╔══════════════════════════════════════════════════════════════════╗
        // ║  HERO HEADER — Deep Navy Executive Gradient                    ║
        // ╚══════════════════════════════════════════════════════════════════╝
        "<tr><td style=\"background-color:#0f172a;background:linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#334155 100%);padding:28px 32px 24px;\">" +

        // Top row: branding + report ID
        "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>" +
        "<td><p style=\"margin:0;font-size:10px;font-weight:700;color:#f59e0b;text-transform:uppercase;letter-spacing:0.25em;\">Daily Risk Report</p>" +
        "<h1 style=\"margin:4px 0 0;font-size:22px;font-weight:800;color:#f8fafc;letter-spacing:-0.02em;\">Supply Chain Intelligence</h1>" +
        "<p style=\"margin:6px 0 0;font-size:11px;color:#94a3b8;\">" + dateDisplay + "</p></td>" +
        "<td align=\"right\" style=\"vertical-align:top;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\"><tr>" +
        "<td style=\"background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:6px 12px;text-align:right;\">" +
        "<p style=\"margin:0;font-size:7px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.18em;font-weight:600;\">Report</p>" +
        "<p style=\"margin:2px 0 0;font-size:12px;color:#e2e8f0;font-family:'Courier New',monospace;font-weight:700;\">" + reportId + "</p>" +
        "</td></tr></table></td></tr></table>" +

        // ── Stats Row ──────────────────────────────────────────────────────
        "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top:20px;\"><tr>" +
        "<td style=\"width:33%;text-align:center;padding:12px 6px;background:rgba(255,255,255,0.05);border-radius:10px 0 0 10px;\">" +
        "<p style=\"margin:0;font-size:24px;font-weight:900;color:#f8fafc;line-height:1;\">" + totalArticles + "</p>" +
        "<p style=\"margin:4px 0 0;font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.14em;font-weight:700;\">Scanned</p></td>" +
        "<td style=\"width:34%;text-align:center;padding:12px 6px;background:rgba(255,255,255,0.05);border-left:1px solid rgba(255,255,255,0.07);border-right:1px solid rgba(255,255,255,0.07);\">" +
        "<p style=\"margin:0;font-size:24px;font-weight:900;color:#f59e0b;line-height:1;\">" + indiaCount + "</p>" +
        "<p style=\"margin:4px 0 0;font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.14em;font-weight:700;\">India Focus</p></td>" +
        "<td style=\"width:33%;text-align:center;padding:12px 6px;background:rgba(255,255,255,0.05);border-radius:0 10px 10px 0;\">" +
        "<p style=\"margin:0;font-size:24px;font-weight:900;color:" + riskColor + ";line-height:1;\">" + riskScore + "</p>" +
        "<p style=\"margin:4px 0 0;font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.14em;font-weight:700;\">Risk Score</p></td>" +
        "</tr></table>" +

        "</td></tr>" +

        // ╔══════════════════════════════════════════════════════════════════╗
        // ║  RISK ASSESSMENT BAND                                          ║
        // ╚══════════════════════════════════════════════════════════════════╝
        "<tr><td style=\"background-color:#ffffff;padding:24px 32px;border-bottom:1px solid #f1f5f9;\">" +
        "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>" +

        // Left: Big score + label
        "<td style=\"width:38%;vertical-align:top;\">" +
        "<p style=\"margin:0;font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.18em;\">India Risk Index</p>" +
        "<p style=\"margin:6px 0 0;font-size:46px;font-weight:900;color:" + riskColor + ";line-height:1;letter-spacing:-0.03em;\">" + riskScore +
        "<span style=\"font-size:16px;color:#94a3b8;font-weight:500;\">/100</span></p>" +
        "<div style=\"margin-top:8px;\">" +
        "<span style=\"display:inline-block;padding:3px 12px;background:" + riskColor + "18;color:" + riskColor + ";font-size:10px;font-weight:800;border-radius:12px;letter-spacing:0.06em;\">" + riskLabel.toUpperCase() + "</span>" +
        "</div>" +
        elevatedHtml +
        "</td>" +

        // Right: Category breakdown as compact rows
        "<td style=\"width:62%;vertical-align:top;padding-left:24px;\">" +
        "<p style=\"margin:0 0 10px;font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.18em;\">Threat Breakdown</p>" +
        buildCategoryRow("#ef4444", "Geopolitical", geo) +
        buildCategoryRow("#f59e0b", "Logistics", log) +
        buildCategoryRow("#3b82f6", "Weather", wx) +
        buildCategoryRow("#10b981", "Market", mkt) +
        "</td></tr></table>" +

        // Gauge bar
        "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"2\" style=\"border-collapse:separate;margin-top:16px;\"><tr>" + gauge.toString() + "</tr></table>" +

        "</td></tr>" +

        // ╔══════════════════════════════════════════════════════════════════╗
        // ║  INDIA INTELLIGENCE                                            ║
        // ╚══════════════════════════════════════════════════════════════════╝
        "<tr><td style=\"background-color:#ffffff;padding:24px 32px;border-bottom:1px solid #f1f5f9;\">" +
        "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>" +
        "<td style=\"vertical-align:middle;\"><p style=\"margin:0;font-size:14px;font-weight:800;color:#0f172a;\">🇮🇳&nbsp; India Intelligence</p></td>" +
        "<td align=\"right\"><span style=\"display:inline-block;padding:3px 10px;background:#fef3c7;color:#92400e;font-size:9px;font-weight:700;border-radius:12px;\">" + indiaCount + " articles</span></td>" +
        "</tr></table>" +
        "<div style=\"margin-top:12px;font-size:13px;line-height:1.65;color:#334155;\">" + indiaHtml + "</div>" +
        "</td></tr>" +

        // ╔══════════════════════════════════════════════════════════════════╗
        // ║  GLOBAL SITUATION                                              ║
        // ╚══════════════════════════════════════════════════════════════════╝
        "<tr><td style=\"background-color:#ffffff;padding:24px 32px;border-bottom:1px solid #f1f5f9;\">" +
        "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>" +
        "<td style=\"vertical-align:middle;\"><p style=\"margin:0;font-size:14px;font-weight:800;color:#0f172a;\">🌍&nbsp; Global Situation</p></td>" +
        "<td align=\"right\"><span style=\"display:inline-block;padding:3px 10px;background:#e0f2fe;color:#0369a1;font-size:9px;font-weight:700;border-radius:12px;\">" + globalCount + " articles</span></td>" +
        "</tr></table>" +
        "<div style=\"margin-top:12px;font-size:13px;line-height:1.65;color:#334155;\">" + globalHtml + "</div>" +
        "</td></tr>" +

        // ╔══════════════════════════════════════════════════════════════════╗
        // ║  TOP STORIES                                                   ║
        // ╚══════════════════════════════════════════════════════════════════╝
        "<tr><td style=\"background-color:#ffffff;padding:24px 32px 16px;\">" +
        "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:14px;\"><tr>" +
        "<td><p style=\"margin:0;font-size:14px;font-weight:800;color:#0f172a;\">📰&nbsp; Top Stories</p></td>" +
        "<td align=\"right\"><span style=\"font-size:10px;color:#94a3b8;font-weight:500;\">Priority intelligence</span></td>" +
        "</tr></table>" +
        headlinesHtml +
        "</td></tr>" +

        // ╔══════════════════════════════════════════════════════════════════╗
        // ║  CTA + FOOTER                                                  ║
        // ╚══════════════════════════════════════════════════════════════════╝
        "<tr><td style=\"background-color:#ffffff;padding:12px 32px 28px;\" align=\"center\">" +
        "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\"><tr>" +
        "<td style=\"border-radius:8px;background-color:#0f172a;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);\">" +
        "<a href=\"" + dashboardUrl + "\" target=\"_blank\" style=\"display:inline-block;padding:12px 36px;color:#f8fafc;font-size:12px;font-weight:700;text-decoration:none;letter-spacing:0.04em;\">Open Live Dashboard &rarr;</a>" +
        "</td></tr></table>" +
        "</td></tr>" +

        // Footer
        "<tr><td style=\"background-color:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;border-radius:0 0 16px 16px;\">" +
        "<p style=\"margin:0;font-size:10px;color:#94a3b8;text-align:center;line-height:1.5;\">" +
        timeGen + " IST &middot; " + reportId + " &middot; Groq AI + pgvector &middot; " + dateDisplay + "</p>" +
        "</td></tr>" +

        "</table></td></tr></table></body></html>";
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helper: compact category row with inline mini-bar
    // ──────────────────────────────────────────────────────────────────────────
    private String buildCategoryRow(String color, String label, int score) {
        int barPct = Math.min(100, Math.max(4, score));
        String scoreColor = score >= 70 ? "#ef4444" : (score >= 40 ? "#d97706" : "#64748b");
        return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:6px;\"><tr>" +
            "<td style=\"width:80px;font-size:11px;color:#475569;font-weight:500;\">" + label + "</td>" +
            "<td style=\"padding:0 10px;\"><div style=\"width:100%;background:#f1f5f9;border-radius:3px;height:8px;overflow:hidden;font-size:1px;line-height:1px;\">" +
            "<div style=\"width:" + barPct + "%;height:100%;background:" + color + ";border-radius:3px;font-size:1px;line-height:1px;\"></div></div></td>" +
            "<td style=\"width:34px;min-width:34px;text-align:right;font-size:12px;font-weight:800;color:" + scoreColor + ";font-family:'Courier New',monospace;\">" + score + "</td>" +
            "</tr></table>";
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helper: Google News-style numbered article list
    // ──────────────────────────────────────────────────────────────────────────
    private String buildTopHeadlinesHtml(List<NewsArticle> articles, int limit) {
        if (articles == null || articles.isEmpty()) {
            return "<p style=\"font-size:12px;color:#94a3b8;text-align:center;padding:12px 0;\">No recent headlines.</p>";
        }

        StringBuilder sb = new StringBuilder();
        int count = 0;
        for (NewsArticle article : articles) {
            if (count >= limit) break;
            count++;
            String title = article.getTitle() != null ? escapeHtml(article.getTitle()) : "Untitled";
            String source = article.getSource() != null ? escapeHtml(article.getSource()) : "Unknown";
            String url = article.getUrl() != null ? article.getUrl() : "#";
            String category = article.getRiskCategory() != null ? article.getRiskCategory().toUpperCase() : "NEWS";

            String catColor = "#64748b";
            String catLabel = "News";
            if (category.contains("GEO")) { catColor = "#ef4444"; catLabel = "Geopolitical"; }
            else if (category.contains("LOG")) { catColor = "#f59e0b"; catLabel = "Logistics"; }
            else if (category.contains("WEATHER")) { catColor = "#3b82f6"; catLabel = "Weather"; }
            else if (category.contains("MARKET")) { catColor = "#10b981"; catLabel = "Market"; }

            // Clean snippet — decode entities, strip tags and URLs
            String snippet = "";
            if (article.getRawContent() != null && article.getRawContent().length() > 20) {
                String cleaned = stripHtmlTags(article.getRawContent());
                if (cleaned.length() > 90) cleaned = cleaned.substring(0, 90).trim() + "…";
                snippet = escapeHtml(cleaned);
            }

            sb.append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>");

            // Number badge (circular with category color)
            sb.append("<td style=\"width:28px;vertical-align:top;padding:8px 0;\">");
            sb.append("<div style=\"width:22px;height:22px;border-radius:50%;background:" + catColor + ";text-align:center;line-height:22px;font-size:11px;font-weight:800;color:#ffffff;\">");
            sb.append(count).append("</div></td>");

            // Content
            sb.append("<td style=\"vertical-align:top;padding:8px 0 8px 10px;\">");
            sb.append("<p style=\"margin:0 0 2px;font-size:9px;color:#94a3b8;font-weight:500;\">");
            sb.append(source).append(" &middot; <span style=\"color:" + catColor + ";font-weight:700;\">" + catLabel + "</span></p>");
            sb.append("<a href=\"").append(url).append("\" target=\"_blank\" style=\"font-size:13px;color:#0f172a;text-decoration:none;font-weight:600;line-height:1.35;\">");
            sb.append(title).append("</a>");
            if (!snippet.isEmpty()) {
                sb.append("<p style=\"margin:2px 0 0;font-size:11px;color:#64748b;line-height:1.4;\">").append(snippet);
                sb.append(" <a href=\"").append(url).append("\" target=\"_blank\" style=\"color:" + catColor + ";text-decoration:none;font-weight:600;white-space:nowrap;\">Read More &rarr;</a></p>");
            } else {
                sb.append("<p style=\"margin:2px 0 0;\"><a href=\"").append(url).append("\" target=\"_blank\" style=\"font-size:11px;color:" + catColor + ";text-decoration:none;font-weight:600;white-space:nowrap;\">Read More &rarr;</a></p>");
            }
            sb.append("</td></tr>");

            // Divider between items
            if (count < Math.min(articles.size(), limit)) {
                sb.append("<tr><td colspan=\"2\" style=\"padding:0;\"><div style=\"height:1px;background:#f1f5f9;margin:2px 0;\"></div></td></tr>");
            }
            sb.append("</table>");
        }
        return sb.toString();
    }

    // --------------------------------------------------------------------------
    // Helpers
    // --------------------------------------------------------------------------
    private String buildSearchableContent(NewsArticle article) {
        return (article.getTitle() != null ? article.getTitle() : "") + " " +
               (article.getRawContent() != null ? article.getRawContent() : "") + " " +
               (article.getEntities() != null ? article.getEntities() : "");
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;");
    }

    /** Strips HTML tags, unescapes HTML entities, and removes URLs to produce clean plain text. */
    private String stripHtmlTags(String html) {
        if (html == null || html.isEmpty()) return "";
        // Unescape HTML entities first so encoded tags (&lt;a ...&gt;) become real tags (<a ...>)
        String text = html.replace("&amp;", "&")
                          .replace("&lt;", "<")
                          .replace("&gt;", ">")
                          .replace("&quot;", "\"")
                          .replace("&#39;", "'")
                          .replace("&nbsp;", " ");
        // Strip all HTML tags
        text = text.replaceAll("<[^>]*>", " ");
        // Strip URLs (http/https)
        text = text.replaceAll("https?://\\S+", "");
        // Collapse whitespace
        text = text.replaceAll("\\s+", " ").trim();
        return text;
    }

    /**
     * Sanitizes executive summary text before rendering into email HTML.
     * Removes raw URLs, Google News links, residual HTML tags, and leaked 'Content:' tags,
     * ensuring executive reports are strictly clean prose.
     */
    private String sanitizeSummaryText(String text) {
        if (text == null || text.isEmpty()) return "";
        // Strip HTML tags and encoded entities
        String cleaned = text.replaceAll("(?i)<[^>]*>", " ");
        // Strip any bare or encoded HTTP/HTTPS URLs
        cleaned = cleaned.replaceAll("https?://\\S+", "");
        // Strip leaked prefixes like 'Content:' or 'Article 1:' inside body sentences
        cleaned = cleaned.replaceAll("(?i)\\bContent:\\s*", "");
        cleaned = cleaned.replaceAll("(?i)\\bArticle\\s+\\d+:\\s*", "");
        // Normalize whitespace and punctuation spacing
        cleaned = cleaned.replaceAll("[ \\t]+", " ");
        cleaned = cleaned.replaceAll("\\s*\\.\\s*\\.", ".");
        cleaned = cleaned.replaceAll(" ,", ",");
        cleaned = cleaned.replaceAll(" \\.", ".");
        return cleaned.trim();
    }

    // --------------------------------------------------------------------------
    // Result DTO
    // --------------------------------------------------------------------------
    public static class DigestResult {
        private final String status;
        private final String subject;
        private final String indiaSummary;
        private final int indiaRiskScore;
        private final Map<String, Integer> elevatedCountries;

        public DigestResult(String status, String subject, String indiaSummary,
                            int indiaRiskScore, Map<String, Integer> elevatedCountries) {
            this.status = status;
            this.subject = subject;
            this.indiaSummary = indiaSummary;
            this.indiaRiskScore = indiaRiskScore;
            this.elevatedCountries = elevatedCountries;
        }

        public String getStatus() { return status; }
        public String getSubject() { return subject; }
        public String getIndiaSummary() { return indiaSummary; }
        public int getIndiaRiskScore() { return indiaRiskScore; }
        public Map<String, Integer> getElevatedCountries() { return elevatedCountries; }
    }
}
