package com.supplychain.monitor.service;

import com.supplychain.monitor.model.NewsArticle;
import com.supplychain.monitor.repository.NewsArticleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
    // We removed JavaMailSender to use Resend API directly over HTTPS

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

    public DailyDigestService(NewsArticleRepository newsArticleRepository, GroqClient groqClient) {
        this.newsArticleRepository = newsArticleRepository;
        this.groqClient = groqClient;
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

        // 2. Split into India-focused and Global buckets
        List<NewsArticle> indiaArticles = new ArrayList<>();
        List<NewsArticle> globalArticles = new ArrayList<>();

        for (NewsArticle article : allArticles) {
            String content = buildSearchableContent(article);
            if (INDIA_PATTERN.matcher(content).find()) {
                indiaArticles.add(article);
            } else {
                globalArticles.add(article);
            }
        }

        // Ensure India risk calculation has rich coverage even if recent 24h was sparse
        if (indiaArticles.size() < 3) {
            List<NewsArticle> indiaFallback = newsArticleRepository.findByKeyword("India");
            if (indiaFallback != null && !indiaFallback.isEmpty()) {
                for (NewsArticle a : indiaFallback) {
                    if (indiaArticles.stream().noneMatch(existing -> existing.getId().equals(a.getId()))) {
                        indiaArticles.add(a);
                    }
                    if (indiaArticles.size() >= 15) break;
                }
                logger.info("Enriched India articles pool with recent matching articles. Total India: {}", indiaArticles.size());
            }
        }
        logger.info("India articles: {}, Global articles: {}", indiaArticles.size(), globalArticles.size());

        // 3. Compute India aggregate risk score
        RiskScoreCalculator.RiskResult indiaRisk = RiskScoreCalculator.compute(indiaArticles);

        // 4. Cross-country scan for elevated risks
        Map<String, Integer> elevatedCountries = new LinkedHashMap<>();
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
                indiaSummary, indiaArticles.size(), globalSummary, globalArticles.size());

        // 7. Send email
        boolean emailSent = sendEmail(subjectLine, htmlBody);

        if (emailSent && !forceRun) {
            lastSentDate = todayStr;
        }

        String status = emailSent ? "sent" : "generated_but_email_failed";
        return new DigestResult(status, subjectLine, indiaSummary, indiaRisk.getScore(),
                elevatedCountries.isEmpty() ? null : elevatedCountries);
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
            String title = article.getTitle() != null ? article.getTitle() : "";
            String riskCategory = article.getRiskCategory() != null ? article.getRiskCategory() : "Uncategorized";
            String rawContent = article.getRawContent() != null ? article.getRawContent() : "";
            if (rawContent.length() > 300) {
                rawContent = rawContent.substring(0, 300) + "...";
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

    // --------------------------------------------------------------------------
    // HTML Email Template — Hybrid Design
    // Dark intelligence header + Clean white body with Google News-style articles
    // --------------------------------------------------------------------------
    private String buildHtmlEmail(String dateDisplay, RiskScoreCalculator.RiskResult indiaRisk,
                                  Map<String, Integer> elevatedCountries,
                                  String indiaSummary, int indiaCount,
                                  String globalSummary, int globalCount) {

        String riskBadgeColor = indiaRisk.getColorHex();
        String riskEmoji = indiaRisk.getEmoji();
        String riskLabel = indiaRisk.getStatus();
        int riskScore = indiaRisk.getScore();

        // Elevated countries line
        String elevatedLine = "";
        if (elevatedCountries != null && !elevatedCountries.isEmpty()) {
            String entries = elevatedCountries.entrySet().stream()
                    .map(e -> e.getKey() + " (" + e.getValue() + "/100)")
                    .collect(Collectors.joining(", "));
            elevatedLine = "<p style=\"margin:8px 0 0 0;font-size:12px;color:#f59e0b;\">⚠️ Also elevated: " + entries + "</p>";
        }

        // Escape HTML in summaries
        String indiaHtml = escapeHtml(indiaSummary).replace("\n", "<br>");
        String globalHtml = escapeHtml(globalSummary).replace("\n", "<br>");

        // Category scores
        Map<String, Integer> catScores = indiaRisk.getCategoryScores();
        int geoScore = catScores.getOrDefault("geopolitical", 0);
        int logScore = catScores.getOrDefault("logistics", 0);
        int wxScore = catScores.getOrDefault("weather", 0);
        int mktScore = catScores.getOrDefault("market", 0);

        // Build inline HTML bar chart
        String chartHtml = buildInlineBarChart(geoScore, logScore, wxScore, mktScore);

        // Build top headlines section from recent articles
        List<NewsArticle> recentArticles = newsArticleRepository.findAllByOrderByPublishedAtDesc();
        String topHeadlinesHtml = buildTopHeadlinesHtml(recentArticles, 5);

        // Risk gauge bar segments
        int filledSegments = riskScore / 10;
        StringBuilder gaugeBar = new StringBuilder();
        for (int i = 0; i < 10; i++) {
            String segColor = i < filledSegments ? riskBadgeColor : "#1e2a22";
            String border = i < filledSegments ? riskBadgeColor : "#2a3a2e";
            gaugeBar.append("<td style=\"width:10%;height:8px;background:" + segColor + ";border:1px solid " + border + ";\"></td>");
        }

        // Total articles stat
        int totalArticles = indiaCount + globalCount;
        String reportId = "#SCR-" + LocalDate.now(IST).format(DateTimeFormatter.ofPattern("yyMMdd"));
        String timeGenerated = LocalTime.now(IST).format(DateTimeFormatter.ofPattern("HH:mm"));

        return "<!DOCTYPE html>" +
                "<html lang=\"en\">" +
                "<head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\">" +
                "<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');</style></head>" +
                "<body style=\"margin:0;padding:0;background:#f0f2f5;font-family:Inter,'Segoe UI',Arial,sans-serif;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f0f2f5;\">" +
                "<tr><td align=\"center\" style=\"padding:0;\">" +
                "<table role=\"presentation\" width=\"640\" cellpadding=\"0\" cellspacing=\"0\" style=\"overflow:hidden;\">" +

                // ════════════════════════════════════════════════════════════
                // DARK HEADER ZONE — Intelligence Dashboard
                // ════════════════════════════════════════════════════════════
                "<tr><td style=\"background:#0c1210;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">" +

                // HEADER ROW
                "<tr><td style=\"padding:32px 36px 20px;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>" +
                "<td>" +
                "<p style=\"margin:0;font-size:10px;font-weight:700;color:" + riskBadgeColor + ";text-transform:uppercase;letter-spacing:0.25em;\">Daily Risk Report</p>" +
                "<h1 style=\"margin:6px 0 0 0;font-size:24px;font-weight:800;color:#e8f0e0;letter-spacing:-0.01em;\">Supply Chain Intelligence</h1>" +
                "<p style=\"margin:6px 0 0 0;font-size:12px;color:#5a7a50;\">" + dateDisplay + "</p></td>" +
                "<td align=\"right\" style=\"vertical-align:top;\"><div style=\"background:#0a120d;border:1px solid #1a2820;border-radius:8px;padding:10px 16px;\">" +
                "<p style=\"margin:0;font-size:8px;color:#4a6440;text-transform:uppercase;letter-spacing:0.15em;\">Report</p>" +
                "<p style=\"margin:3px 0 0;font-size:15px;color:#8fa882;font-family:'Courier New',monospace;font-weight:700;\">" + reportId + "</p>" +
                "</div></td></tr></table>" +
                "</td></tr>" +

                // STAT CARDS
                "<tr><td style=\"padding:4px 36px 16px;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"8\" style=\"border-collapse:separate;\"><tr>" +
                buildStatCard(String.valueOf(totalArticles), "articles scanned", "#5e7254") +
                buildStatCard(String.valueOf(indiaCount), "india focus", "#f59e0b") +
                buildStatCard(String.valueOf(riskScore), "risk score", riskBadgeColor) +
                "</tr></table></td></tr>" +

                // RISK ASSESSMENT ROW
                "<tr><td style=\"padding:4px 36px 16px;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#0a120d;border-radius:10px;\">" +
                "<tr><td style=\"padding:22px 28px;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>" +

                // Left: Score
                "<td style=\"width:45%;vertical-align:top;\">" +
                "<p style=\"margin:0;font-size:9px;font-weight:700;color:#4a6440;text-transform:uppercase;letter-spacing:0.15em;\">India Risk Assessment</p>" +
                "<p style=\"margin:12px 0 0 0;font-size:48px;font-weight:900;color:" + riskBadgeColor + ";line-height:1;\">" + riskScore + "<span style=\"font-size:18px;color:#3e5234;font-weight:400;\">/100</span></p>" +
                "<p style=\"margin:10px 0 0 0;\"><span style=\"display:inline-block;padding:4px 14px;background:" + riskBadgeColor + "18;color:" + riskBadgeColor + ";font-size:11px;font-weight:700;border-radius:20px;letter-spacing:0.05em;\">" + riskLabel + "</span></p>" +
                elevatedLine +
                "</td>" +

                // Right: Threat Breakdown
                "<td style=\"width:55%;vertical-align:top;padding-left:24px;\">" +
                "<p style=\"margin:0 0 14px 0;font-size:9px;color:#4a6440;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;\">Threat Breakdown</p>" +
                buildThreatBreakdownRow("#ef4444", "Geopolitical", geoScore) +
                buildThreatBreakdownRow("#f59e0b", "Logistics", logScore) +
                buildThreatBreakdownRow("#3b82f6", "Weather", wxScore) +
                buildThreatBreakdownRow("#22c55e", "Market", mktScore) +
                "</td></tr>" +

                // Gauge bar
                "<tr><td colspan=\"2\" style=\"padding:18px 0 0 0;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"2\" style=\"border-collapse:separate;\"><tr>" + gaugeBar.toString() + "</tr></table>" +
                "</td></tr></table>" +
                "</td></tr></table>" +
                "</td></tr>" +

                // RISK DISTRIBUTION
                "<tr><td style=\"padding:4px 36px 20px;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#0a120d;border-radius:10px;\">" +
                "<tr><td style=\"padding:20px 28px;\">" +
                "<h2 style=\"margin:0 0 16px 0;font-size:12px;font-weight:800;color:#a3b898;text-transform:uppercase;letter-spacing:0.12em;\">Risk Distribution</h2>" +
                chartHtml +
                "</td></tr></table>" +
                "</td></tr>" +

                "</table></td></tr>" +

                // ════════════════════════════════════════════════════════════
                // TRANSITION — Dark to White
                // ════════════════════════════════════════════════════════════
                "<tr><td style=\"background:linear-gradient(to bottom, #0c1210 0%, #f8f9fa 100%);height:32px;\">" +
                "</td></tr>" +

                // ════════════════════════════════════════════════════════════
                // WHITE BODY ZONE — Google News / Reddit Style
                // ════════════════════════════════════════════════════════════
                "<tr><td style=\"background:#f8f9fa;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">" +

                // INDIA INTELLIGENCE CARD
                "<tr><td style=\"padding:8px 28px 16px;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;\">" +
                "<tr><td style=\"padding:0;\">" +
                // Amber top accent bar
                "<div style=\"height:4px;background:#f59e0b;\"></div>" +
                "</td></tr>" +
                "<tr><td style=\"padding:24px 28px;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>" +
                "<td style=\"vertical-align:middle;\">" +
                "<h2 style=\"margin:0;font-size:16px;font-weight:800;color:#1a1a1a;letter-spacing:-0.01em;\">🇮🇳 India Intelligence</h2>" +
                "</td>" +
                "<td align=\"right\">" +
                "<span style=\"display:inline-block;padding:3px 10px;background:#fef3c7;color:#92400e;font-size:10px;font-weight:600;border-radius:12px;\">" + indiaCount + " articles</span>" +
                "</td></tr></table>" +
                "<p style=\"margin:16px 0 0 0;font-size:14px;line-height:1.75;color:#374151;\">" + indiaHtml + "</p>" +
                "</td></tr></table>" +
                "</td></tr>" +

                // GLOBAL SITUATION CARD
                "<tr><td style=\"padding:0 28px 16px;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;\">" +
                "<tr><td style=\"padding:0;\">" +
                // Blue top accent bar
                "<div style=\"height:4px;background:#3b82f6;\"></div>" +
                "</td></tr>" +
                "<tr><td style=\"padding:24px 28px;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>" +
                "<td style=\"vertical-align:middle;\">" +
                "<h2 style=\"margin:0;font-size:16px;font-weight:800;color:#1a1a1a;letter-spacing:-0.01em;\">🌍 Global Situation</h2>" +
                "</td>" +
                "<td align=\"right\">" +
                "<span style=\"display:inline-block;padding:3px 10px;background:#dbeafe;color:#1e40af;font-size:10px;font-weight:600;border-radius:12px;\">" + globalCount + " articles</span>" +
                "</td></tr></table>" +
                "<p style=\"margin:16px 0 0 0;font-size:14px;line-height:1.75;color:#374151;\">" + globalHtml + "</p>" +
                "</td></tr></table>" +
                "</td></tr>" +

                // TOP STORIES CARD
                "<tr><td style=\"padding:0 28px 16px;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;\">" +
                "<tr><td style=\"padding:0;\">" +
                "<div style=\"height:4px;background:linear-gradient(90deg, #ef4444 0%, #f59e0b 33%, #3b82f6 66%, #22c55e 100%);\"></div>" +
                "</td></tr>" +
                "<tr><td style=\"padding:24px 28px 8px;\">" +
                "<h2 style=\"margin:0 0 4px;font-size:16px;font-weight:800;color:#1a1a1a;letter-spacing:-0.01em;\">📰 Top Stories</h2>" +
                "<p style=\"margin:0 0 20px;font-size:12px;color:#9ca3af;\">Today's most important supply chain developments</p>" +
                topHeadlinesHtml +
                "</td></tr></table>" +
                "</td></tr>" +

                // CTA BUTTON
                "<tr><td style=\"padding:8px 28px 28px;\" align=\"center\">" +
                "<a href=\"" + dashboardUrl + "\" target=\"_blank\" style=\"display:inline-block;padding:14px 48px;background:#0c1210;color:#e8f0e0;font-size:13px;font-weight:700;text-decoration:none;border-radius:10px;letter-spacing:0.04em;\">Open Live Dashboard →</a>" +
                "</td></tr>" +

                "</table></td></tr>" +

                // ════════════════════════════════════════════════════════════
                // FOOTER
                // ════════════════════════════════════════════════════════════
                "<tr><td style=\"background:#f0f2f5;padding:20px 36px;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>" +
                "<td align=\"center\">" +
                "<p style=\"margin:0;font-size:11px;color:#9ca3af;\">" +
                "Generated at " + timeGenerated + " IST &middot; " + reportId + " &middot; Powered by Groq AI + pgvector</p>" +
                "<p style=\"margin:6px 0 0;font-size:10px;color:#c0c7cf;\">" +
                "Supply Chain Risk Monitor &middot; Real-time disruption intelligence</p>" +
                "</td></tr></table>" +
                "</td></tr>" +

                "</table></td></tr></table></body></html>";
    }

    /** Builds a single stat card cell for the header stats row. */
    private String buildStatCard(String value, String label, String accentColor) {
        return "<td style=\"background:#0a120d;border-radius:8px;padding:18px 12px;text-align:center;width:33%;border-top:3px solid " + accentColor + ";\">" +
                "<p style=\"margin:0;font-size:30px;font-weight:900;color:" + accentColor + ";line-height:1;\">" + value + "</p>" +
                "<p style=\"margin:6px 0 0;font-size:8px;color:#4a6440;text-transform:uppercase;letter-spacing:0.14em;font-weight:600;\">" + label + "</p></td>";
    }

    /** Builds a single threat breakdown row for the risk assessment panel. */
    private String buildThreatBreakdownRow(String dotColor, String label, int score) {
        String scoreColor = score > 40 ? "#f59e0b" : "#6b8c5e";
        return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:6px;\">" +
                "<tr><td style=\"width:12px;\"><div style=\"width:8px;height:8px;background:" + dotColor + ";border-radius:2px;\"></div></td>" +
                "<td style=\"padding-left:8px;font-size:12px;color:#8fa882;\">" + label + "</td>" +
                "<td style=\"text-align:right;color:" + scoreColor + ";font-weight:800;font-size:13px;font-family:'Courier New',monospace;\">" + score + "</td>" +
                "</tr></table>";
    }

    /**
     * Builds a pure HTML inline bar chart representing the risk distribution.
     * This avoids external image blocking issues in email clients like Gmail.
     */
    private String buildInlineBarChart(int geo, int log, int wx, int mkt) {
        // Calculate percentages (avoid div by 0)
        int total = geo + log + wx + mkt;
        if (total == 0) return "<p style=\"color:#5e7254;font-size:12px;\">Not enough data to calculate distribution.</p>";

        int geoPct = Math.min(100, (geo * 100) / total);
        int logPct = Math.min(100, (log * 100) / total);
        int wxPct  = Math.min(100, (wx * 100) / total);
        int mktPct = Math.min(100, (mkt * 100) / total);

        // Ensure visible bars even for small non-zero values
        if (geo > 0 && geoPct < 5) geoPct = 5;
        if (log > 0 && logPct < 5) logPct = 5;
        if (wx > 0 && wxPct < 5) wxPct = 5;
        if (mkt > 0 && mktPct < 5) mktPct = 5;

        StringBuilder sb = new StringBuilder();
        sb.append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"8\" style=\"font-size:11px;\">");
        sb.append(buildBarRow("Geopolitical", "#ef4444", geoPct, geo));
        sb.append(buildBarRow("Logistics", "#f59e0b", logPct, log));
        sb.append(buildBarRow("Weather", "#3b82f6", wxPct, wx));
        sb.append(buildBarRow("Market", "#22c55e", mktPct, mkt));
        sb.append("</table>");
        return sb.toString();
    }

    /** Builds a single horizontal bar row for the risk distribution chart. */
    private String buildBarRow(String label, String color, int pct, int value) {
        return "<tr><td style=\"width:22%;color:#8fa882;font-weight:600;\">" + label + "</td>" +
                "<td style=\"width:68%;\"><div style=\"width:100%;background:#1e2a22;border-radius:4px;overflow:hidden;height:12px;\">" +
                "<div style=\"width:" + pct + "%;height:100%;background:" + color + ";border-radius:4px;\"></div></div></td>" +
                "<td style=\"width:10%;color:" + color + ";text-align:right;font-weight:700;\">" + value + "</td></tr>";
    }

    /**
     * Builds HTML for the top N headlines in a compact Google News-style numbered list.
     * Strips HTML tags from raw content to produce clean text snippets.
     */
    private String buildTopHeadlinesHtml(List<NewsArticle> articles, int limit) {
        if (articles == null || articles.isEmpty()) {
            return "<p style=\"font-size:13px;color:#9ca3af;text-align:center;padding:16px 0;\">No recent headlines available.</p>";
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

            // Category color mapping
            String catColor = "#6b7280";
            String catLabel = "News";
            if (category.contains("GEO")) { catColor = "#ef4444"; catLabel = "Geopolitical"; }
            else if (category.contains("LOG")) { catColor = "#f59e0b"; catLabel = "Logistics"; }
            else if (category.contains("WEATHER")) { catColor = "#3b82f6"; catLabel = "Weather"; }
            else if (category.contains("MARKET")) { catColor = "#22c55e"; catLabel = "Market"; }

            // Build a clean snippet — strip HTML tags and URLs from raw content
            String snippet = "";
            if (article.getRawContent() != null && article.getRawContent().length() > 20) {
                String cleaned = stripHtmlTags(article.getRawContent());
                if (cleaned.length() > 100) cleaned = cleaned.substring(0, 100).trim() + "…";
                snippet = escapeHtml(cleaned);
            }

            // Article row
            sb.append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>");

            // Number column
            sb.append("<td style=\"width:32px;vertical-align:top;padding:10px 0;\">");
            sb.append("<div style=\"width:26px;height:26px;border-radius:50%;border:2px solid " + catColor + ";text-align:center;line-height:26px;font-size:12px;font-weight:800;color:" + catColor + ";\">");
            sb.append(count).append("</div></td>");

            // Content column
            sb.append("<td style=\"vertical-align:top;padding:10px 0 10px 10px;\">");

            // Source + category
            sb.append("<p style=\"margin:0 0 3px;font-size:10px;color:#9ca3af;\">");
            sb.append("<span style=\"display:inline-block;width:6px;height:6px;background:" + catColor + ";border-radius:50%;margin-right:4px;vertical-align:middle;\"></span>");
            sb.append(source).append(" &middot; ");
            sb.append("<span style=\"color:" + catColor + ";font-weight:600;\">" + catLabel + "</span></p>");

            // Title (clickable)
            sb.append("<a href=\"").append(url).append("\" target=\"_blank\" style=\"font-size:13px;color:#111827;text-decoration:none;font-weight:700;line-height:1.35;\">");
            sb.append(title).append("</a>");

            // Snippet + Read More on same line
            if (!snippet.isEmpty()) {
                sb.append("<p style=\"margin:3px 0 0;font-size:11px;line-height:1.45;color:#6b7280;\">").append(snippet);
                sb.append(" <a href=\"").append(url).append("\" target=\"_blank\" style=\"color:" + catColor + ";text-decoration:none;font-weight:600;\">Read More</a>");
                sb.append("</p>");
            } else {
                sb.append("<p style=\"margin:3px 0 0;\"><a href=\"").append(url).append("\" target=\"_blank\" style=\"font-size:11px;color:" + catColor + ";text-decoration:none;font-weight:600;\">Read More</a></p>");
            }

            sb.append("</td></tr>");

            // Separator (not after last item)
            if (count < Math.min(articles.size(), limit)) {
                sb.append("<tr><td colspan=\"2\" style=\"padding:0;\"><div style=\"height:1px;background:#eef0f2;\"></div></td></tr>");
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

    /** Strips HTML tags and URLs from raw content to produce clean plain text. */
    private String stripHtmlTags(String html) {
        if (html == null || html.isEmpty()) return "";
        // Remove HTML tags
        String text = html.replaceAll("<[^>]*>", " ");
        // Remove URLs (http/https)
        text = text.replaceAll("https?://\\S+", "");
        // Collapse whitespace
        text = text.replaceAll("\\s+", " ").trim();
        return text;
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
