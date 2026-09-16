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
    @Scheduled(cron = "0 0 6 * * *", zone = "Asia/Kolkata")
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
            logger.warn("Zero articles ingested in the previous 24h window. Sending empty digest.");
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

        // 5. Generate AI summaries
        String indiaSummary = generateSectionSummary(indiaArticles, "India");
        String globalSummary = generateSectionSummary(globalArticles, "global supply chain");

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
        if (resendApiKey == null || resendApiKey.trim().isEmpty()) {
            logger.warn("RESEND_API_KEY is not configured. Skipping email delivery.");
            return false;
        }

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
                logger.error("Failed to send email via Resend. Status: {}", response.getStatusCode());
                return false;
            }
        } catch (Exception e) {
            logger.error("Failed to send daily digest email via Resend: {}", e.getMessage(), e);
            return false;
        }
    }

    // --------------------------------------------------------------------------
    // HTML Email Template
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
            elevatedLine = "<p style=\"margin:8px 0 0 0;font-size:13px;color:#f59e0b;\">⚠️ Also elevated: " + entries + "</p>";
        }

        // Escape HTML in summaries
        String indiaHtml = escapeHtml(indiaSummary).replace("\n", "<br>");
        String globalHtml = escapeHtml(globalSummary).replace("\n", "<br>");

        // Build the risk category chart URL using QuickChart.io
        Map<String, Integer> catScores = indiaRisk.getCategoryScores();
        int geoScore = catScores.getOrDefault("geopolitical", 0);
        int logScore = catScores.getOrDefault("logistics", 0);
        int wxScore = catScores.getOrDefault("weather", 0);
        int mktScore = catScores.getOrDefault("market", 0);

        // Build inline HTML bar chart (works in all email clients, no external images)
        String chartHtml = buildInlineBarChart(geoScore, logScore, wxScore, mktScore);

        // Build top headlines section from recent articles
        List<NewsArticle> recentArticles = newsArticleRepository.findAllByOrderByPublishedAtDesc();
        String topHeadlinesHtml = buildTopHeadlinesHtml(recentArticles, 5);

        // Source distribution stats
        String sourceStatsHtml = buildSourceStatsHtml(recentArticles);

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

        return "<!DOCTYPE html>" +
                "<html lang=\"en\">" +
                "<head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\"></head>" +
                "<body style=\"margin:0;padding:0;background:#060a08;font-family:'Segoe UI',Arial,sans-serif;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#060a08;\">" +
                "<tr><td align=\"center\" style=\"padding:24px 16px;\">" +
                "<table role=\"presentation\" width=\"640\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#0c1210;border-radius:16px;border:1px solid #1a2820;overflow:hidden;\">" +

                // ═══════════ HEADER ═══════════
                "<tr><td style=\"background:linear-gradient(135deg,#0a1610 0%,#12201a 50%,#0c1210 100%);padding:30px 32px 22px;border-bottom:2px solid #1e3024;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>" +
                "<td><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\"><tr>" +
                "<td style=\"background:linear-gradient(135deg,#f59e0b,#f97316);width:36px;height:36px;border-radius:10px;text-align:center;vertical-align:middle;font-size:18px;\">&#9889;</td>" +
                "<td style=\"padding-left:12px;\"><h1 style=\"margin:0;font-size:19px;font-weight:800;color:#d4e4c8;letter-spacing:0.06em;\">SUPPLY CHAIN INTELLIGENCE</h1>" +
                "<p style=\"margin:3px 0 0 0;font-size:12px;color:#5e7254;font-weight:500;\">Daily Risk Report &mdash; " + dateDisplay + "</p></td>" +
                "</tr></table></td>" +
                "<td align=\"right\" style=\"vertical-align:top;\"><div style=\"background:#0a120d;border:1px solid #1e3024;border-radius:8px;padding:8px 14px;\">" +
                "<p style=\"margin:0;font-size:9px;color:#5e7254;text-transform:uppercase;letter-spacing:0.12em;\">Report ID</p>" +
                "<p style=\"margin:2px 0 0;font-size:13px;color:#8fa882;font-family:monospace;font-weight:700;\">#SCR-" + LocalDate.now(IST).format(DateTimeFormatter.ofPattern("yyMMdd")) + "</p>" +
                "</div></td></tr></table>" +
                "</td></tr>" +

                // ═══════════ QUICK STATS BAR ═══════════
                "<tr><td style=\"padding:16px 32px 4px;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"8\" style=\"border-collapse:separate;\"><tr>" +
                // Articles Scanned
                "<td style=\"background:linear-gradient(180deg,#0e1a14 0%,#0a120d 100%);border:1px solid #1a2820;border-radius:10px;padding:14px 12px;text-align:center;width:33%;\">" +
                "<p style=\"margin:0;font-size:9px;color:#5e7254;text-transform:uppercase;letter-spacing:0.12em;\">&#128202; Articles Scanned</p>" +
                "<p style=\"margin:6px 0 0;font-size:26px;font-weight:900;color:#a3b898;\">" + totalArticles + "</p></td>" +
                // India Focus
                "<td style=\"background:linear-gradient(180deg,#1a1408 0%,#0a120d 100%);border:1px solid #2a2010;border-radius:10px;padding:14px 12px;text-align:center;width:33%;\">" +
                "<p style=\"margin:0;font-size:9px;color:#b8860b;text-transform:uppercase;letter-spacing:0.12em;\">&#127470;&#127475; India Focus</p>" +
                "<p style=\"margin:6px 0 0;font-size:26px;font-weight:900;color:#f59e0b;\">" + indiaCount + "</p></td>" +
                // Risk Score
                "<td style=\"background:linear-gradient(180deg,#1a0e0e 0%,#0a120d 100%);border:1px solid " + riskBadgeColor + "33;border-radius:10px;padding:14px 12px;text-align:center;width:33%;\">" +
                "<p style=\"margin:0;font-size:9px;color:" + riskBadgeColor + ";text-transform:uppercase;letter-spacing:0.12em;\">&#9888;&#65039; Risk Score</p>" +
                "<p style=\"margin:6px 0 0;font-size:26px;font-weight:900;color:" + riskBadgeColor + ";\">" + riskScore + "</p></td>" +
                "</tr></table></td></tr>" +

                // ═══════════ RISK GAUGE SECTION ═══════════
                "<tr><td style=\"padding:12px 32px 8px;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:linear-gradient(135deg,#0a120d 0%,#101a14 100%);border:1px solid " + riskBadgeColor + "33;border-radius:12px;\">" +
                "<tr><td style=\"padding:22px 24px;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>" +
                "<td style=\"width:55%;\">" +
                "<p style=\"margin:0;font-size:10px;font-weight:700;color:#5e7254;text-transform:uppercase;letter-spacing:0.12em;\">&#127919; India Risk Assessment</p>" +
                "<p style=\"margin:10px 0 0 0;font-size:40px;font-weight:900;color:" + riskBadgeColor + ";line-height:1;\">" + riskScore + "<span style=\"font-size:16px;color:#5e7254;font-weight:400;\">/100</span></p>" +
                "<p style=\"margin:8px 0 0 0;font-size:14px;font-weight:700;color:" + riskBadgeColor + ";\">" + riskEmoji + " " + riskLabel + "</p>" +
                elevatedLine +
                "</td>" +
                "<td style=\"width:45%;vertical-align:top;padding-left:16px;\">" +
                "<p style=\"margin:0 0 10px 0;font-size:9px;color:#5e7254;text-transform:uppercase;letter-spacing:0.12em;\">Threat Categories</p>" +
                "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"4\" style=\"font-size:12px;\">" +
                "<tr><td style=\"color:#ef4444;font-size:14px;width:22px;\">&#9632;</td><td style=\"color:#8fa882;\">Geopolitical</td><td style=\"color:" + (geoScore > 40 ? "#f59e0b" : "#6b8c5e") + ";font-weight:800;text-align:right;padding-left:12px;\">" + geoScore + "</td></tr>" +
                "<tr><td style=\"color:#f59e0b;font-size:14px;\">&#9632;</td><td style=\"color:#8fa882;\">Logistics</td><td style=\"color:" + (logScore > 40 ? "#f59e0b" : "#6b8c5e") + ";font-weight:800;text-align:right;\">" + logScore + "</td></tr>" +
                "<tr><td style=\"color:#3b82f6;font-size:14px;\">&#9632;</td><td style=\"color:#8fa882;\">Weather</td><td style=\"color:" + (wxScore > 40 ? "#f59e0b" : "#6b8c5e") + ";font-weight:800;text-align:right;\">" + wxScore + "</td></tr>" +
                "<tr><td style=\"color:#22c55e;font-size:14px;\">&#9632;</td><td style=\"color:#8fa882;\">Market</td><td style=\"color:" + (mktScore > 40 ? "#f59e0b" : "#6b8c5e") + ";font-weight:800;text-align:right;\">" + mktScore + "</td></tr>" +
                "</table></td></tr>" +
                // Gauge bar
                "<tr><td colspan=\"2\" style=\"padding:16px 0 0 0;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"2\" style=\"border-collapse:separate;\"><tr>" + gaugeBar.toString() + "</tr></table>" +
                "</td></tr></table>" +
                "</td></tr></table>" +
                "</td></tr>" +

                // ═══════════ RISK DISTRIBUTION CHART ═══════════
                "<tr><td style=\"padding:16px 32px 8px;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#0a120d;border-radius:10px;border:1px solid #1a2820;\">" +
                "<tr><td style=\"padding:20px 22px;\">" +
                "<h2 style=\"margin:0 0 16px 0;font-size:14px;font-weight:800;color:#a3b898;text-transform:uppercase;letter-spacing:0.06em;\">&#128200; Risk Distribution Analysis</h2>" +
                chartHtml +
                "</td></tr></table>" +
                "</td></tr>" +

                // ═══════════ INDIA INTELLIGENCE ═══════════
                "<tr><td style=\"padding:20px 32px 16px;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#0a120d;border-radius:10px;border:1px solid #1a2820;\">" +
                "<tr><td style=\"padding:20px 22px;\">" +
                "<h2 style=\"margin:0 0 14px 0;font-size:14px;font-weight:800;color:#a3b898;text-transform:uppercase;letter-spacing:0.06em;\">&#127470;&#127475; India Intelligence</h2>" +
                "<p style=\"margin:0;font-size:13px;line-height:1.85;color:#b8c8ae;\">" + indiaHtml + "</p>" +
                "<p style=\"margin:14px 0 0 0;font-size:11px;color:#3e5234;font-style:italic;\">Analysis based on " + indiaCount + " article" + (indiaCount != 1 ? "s" : "") + " ingested in the past 24h</p>" +
                "</td></tr></table>" +
                "</td></tr>" +

                // ═══════════ GLOBAL SITUATION ═══════════
                "<tr><td style=\"padding:4px 32px 16px;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#0a120d;border-radius:10px;border:1px solid #1a2820;\">" +
                "<tr><td style=\"padding:20px 22px;\">" +
                "<h2 style=\"margin:0 0 14px 0;font-size:14px;font-weight:800;color:#a3b898;text-transform:uppercase;letter-spacing:0.06em;\">&#127758; Global Situation</h2>" +
                "<p style=\"margin:0;font-size:13px;line-height:1.85;color:#b8c8ae;\">" + globalHtml + "</p>" +
                "<p style=\"margin:14px 0 0 0;font-size:11px;color:#3e5234;font-style:italic;\">Analysis based on " + globalCount + " article" + (globalCount != 1 ? "s" : "") + " ingested in the past 24h</p>" +
                "</td></tr></table>" +
                "</td></tr>" +

                // ═══════════ TOP HEADLINES ═══════════
                "<tr><td style=\"padding:4px 32px 20px;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#0a120d;border-radius:10px;border:1px solid #1a2820;\">" +
                "<tr><td style=\"padding:20px 22px;\">" +
                "<h2 style=\"margin:0 0 6px 0;font-size:14px;font-weight:800;color:#a3b898;text-transform:uppercase;letter-spacing:0.06em;\">&#128278; Top Headlines</h2>" +
                "<p style=\"margin:0 0 14px 0;font-size:10px;color:#3e5234;\">Click any headline to read the full article</p>" +
                topHeadlinesHtml +
                "</td></tr></table>" +
                "</td></tr>" +

                // ═══════════ CTA BUTTON ═══════════
                "<tr><td style=\"padding:8px 32px 28px;\" align=\"center\">" +
                "<a href=\"" + dashboardUrl + "\" target=\"_blank\" style=\"display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#6b8c5e 0%,#8fa882 100%);color:#0a0f0d;font-size:14px;font-weight:800;text-decoration:none;border-radius:10px;letter-spacing:0.05em;text-transform:uppercase;\">&#128640; Open Live Dashboard</a>" +
                "</td></tr>" +

                // ═══════════ FOOTER ═══════════
                "<tr><td style=\"padding:18px 32px;background:#070b09;border-top:1px solid #1a2820;\">" +
                "<p style=\"margin:0;font-size:10px;color:#3e5234;text-align:center;\">" +
                "Generated at " + LocalTime.now(IST).format(DateTimeFormatter.ofPattern("HH:mm")) + " IST &middot; Report #SCR-" + LocalDate.now(IST).format(DateTimeFormatter.ofPattern("yyMMdd")) + " &middot; Powered by Groq AI + pgvector</p>" +
                "</td></tr>" +

                "</table></td></tr></table></body></html>";
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
        
        // Geopolitical
        sb.append("<tr><td style=\"width:20%;color:#8fa882;font-weight:600;\">Geopolitical</td>");
        sb.append("<td style=\"width:70%;\"><div style=\"width:100%;background:#1e2a22;border-radius:4px;overflow:hidden;height:12px;\">");
        sb.append("<div style=\"width:").append(geoPct).append("%;height:100%;background:#ef4444;\"></div></div></td>");
        sb.append("<td style=\"width:10%;color:#ef4444;text-align:right;font-weight:700;\">").append(geo).append("</td></tr>");

        // Logistics
        sb.append("<tr><td style=\"width:20%;color:#8fa882;font-weight:600;\">Logistics</td>");
        sb.append("<td style=\"width:70%;\"><div style=\"width:100%;background:#1e2a22;border-radius:4px;overflow:hidden;height:12px;\">");
        sb.append("<div style=\"width:").append(logPct).append("%;height:100%;background:#f59e0b;\"></div></div></td>");
        sb.append("<td style=\"width:10%;color:#f59e0b;text-align:right;font-weight:700;\">").append(log).append("</td></tr>");

        // Weather
        sb.append("<tr><td style=\"width:20%;color:#8fa882;font-weight:600;\">Weather</td>");
        sb.append("<td style=\"width:70%;\"><div style=\"width:100%;background:#1e2a22;border-radius:4px;overflow:hidden;height:12px;\">");
        sb.append("<div style=\"width:").append(wxPct).append("%;height:100%;background:#3b82f6;\"></div></div></td>");
        sb.append("<td style=\"width:10%;color:#3b82f6;text-align:right;font-weight:700;\">").append(wx).append("</td></tr>");

        // Market
        sb.append("<tr><td style=\"width:20%;color:#8fa882;font-weight:600;\">Market</td>");
        sb.append("<td style=\"width:70%;\"><div style=\"width:100%;background:#1e2a22;border-radius:4px;overflow:hidden;height:12px;\">");
        sb.append("<div style=\"width:").append(mktPct).append("%;height:100%;background:#22c55e;\"></div></div></td>");
        sb.append("<td style=\"width:10%;color:#22c55e;text-align:right;font-weight:700;\">").append(mkt).append("</td></tr>");

        sb.append("</table>");
        return sb.toString();
    }

    /**
     * Analyzes recent articles and builds a breakdown of top news sources.
     */
    private String buildSourceStatsHtml(List<NewsArticle> articles) {
        if (articles == null || articles.isEmpty()) return "";

        Map<String, Integer> sourceCounts = new LinkedHashMap<>();
        for (NewsArticle a : articles) {
            String src = a.getSource() != null ? a.getSource() : "Unknown";
            sourceCounts.merge(src, 1, Integer::sum);
        }

        List<Map.Entry<String, Integer>> sortedSources = sourceCounts.entrySet().stream()
                .sorted((e1, e2) -> e2.getValue().compareTo(e1.getValue()))
                .limit(4)
                .collect(Collectors.toList());

        if (sortedSources.isEmpty()) return "";

        StringBuilder sb = new StringBuilder();
        sb.append("<p style=\"margin:16px 0 6px 0;font-size:9px;color:#5e7254;text-transform:uppercase;letter-spacing:0.1em;\">Top Sources</p>");
        sb.append("<div style=\"font-size:10px;color:#8fa882;\">");
        
        List<String> items = new java.util.ArrayList<>();
        for (Map.Entry<String, Integer> e : sortedSources) {
            items.add("<b>" + escapeHtml(e.getKey()) + "</b> (" + e.getValue() + ")");
        }
        sb.append(String.join(" &bull; ", items));
        sb.append("</div>");

        return sb.toString();
    }

    /**
     * Builds HTML for the top N headlines with source badges and links.
     */
    private String buildTopHeadlinesHtml(List<NewsArticle> articles, int limit) {
        if (articles == null || articles.isEmpty()) {
            return "<p style=\"font-size:12px;color:#5e7254;\">No recent headlines available.</p>";
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

            String catColor = "#5e7254";
            String catIcon = "&#9679;";
            if (category.contains("GEO")) { catColor = "#ef4444"; catIcon = "&#9632;"; }
            else if (category.contains("WEATHER")) { catColor = "#3b82f6"; catIcon = "&#9632;"; }
            else if (category.contains("MARKET")) { catColor = "#22c55e"; catIcon = "&#9632;"; }
            else if (category.contains("LOG")) { catColor = "#f59e0b"; catIcon = "&#9632;"; }

            String borderBottom = count < Math.min(articles.size(), limit) ? "border-bottom:1px solid #1a2820;" : "";

            sb.append("<div style=\"padding:12px 0;" + borderBottom + "\">");
            sb.append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>");
            // Number badge
            sb.append("<td style=\"width:28px;vertical-align:top;padding-top:2px;\"><div style=\"width:22px;height:22px;background:" + catColor + "22;border:1px solid " + catColor + "44;border-radius:6px;text-align:center;line-height:22px;font-size:10px;font-weight:800;color:" + catColor + ";\">" + count + "</div></td>");
            // Title + source
            sb.append("<td style=\"padding-left:10px;\"><a href=\"").append(url).append("\" target=\"_blank\" style=\"font-size:13px;color:#d4e4c8;text-decoration:none;font-weight:600;line-height:1.4;\">").append(title).append("</a>");
            sb.append("<br><span style=\"font-size:10px;color:#3e5234;\">").append(source).append("</span></td>");
            // Category badge + arrow
            sb.append("<td align=\"right\" style=\"vertical-align:top;white-space:nowrap;padding-left:8px;\">");
            sb.append("<span style=\"display:inline-block;padding:3px 10px;background:" + catColor + "18;color:" + catColor + ";font-size:9px;font-weight:700;border-radius:4px;border:1px solid " + catColor + "33;text-transform:uppercase;letter-spacing:0.04em;\">" + catIcon + " ").append(category).append("</span>");
            sb.append("<br><a href=\"").append(url).append("\" target=\"_blank\" style=\"font-size:10px;color:#5e7254;text-decoration:none;float:right;margin-top:6px;\">Read &#8594;</a>");
            sb.append("</td>");
            sb.append("</tr></table></div>");
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
