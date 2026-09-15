package com.supplychain.monitor.service;

import com.supplychain.monitor.model.NewsArticle;
import com.supplychain.monitor.repository.NewsArticleRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
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
    private final JavaMailSender mailSender;

    @Value("${digest.recipient.email:}")
    private String recipientEmail;

    @Value("${digest.sender.name:Supply Chain Risk Monitor}")
    private String senderName;

    @Value("${spring.mail.username:}")
    private String senderEmail;

    @Value("${digest.dashboard.url:http://localhost:5173}")
    private String dashboardUrl;

    // Simple date-based deduplication to prevent double-sends
    private volatile String lastSentDate = "";

    public DailyDigestService(NewsArticleRepository newsArticleRepository,
                              GroqClient groqClient,
                              JavaMailSender mailSender) {
        this.newsArticleRepository = newsArticleRepository;
        this.groqClient = groqClient;
        this.mailSender = mailSender;
    }

    // --------------------------------------------------------------------------
    // Backup @Scheduled cron — fires at 6:00 AM IST (00:30 UTC) daily.
    // Primary trigger is the external cron-job.org HTTP call to /api/digest/trigger.
    // --------------------------------------------------------------------------
    @Scheduled(cron = "0 30 0 * * *", zone = "Asia/Kolkata")
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

        // Determine time window
        Instant windowStart;
        Instant windowEnd;
        if (forceRun) {
            // For manual test: previous 24h from now
            windowEnd = Instant.now();
            windowStart = windowEnd.minus(Duration.ofHours(24));
        } else {
            // For scheduled: yesterday 00:00 IST to today 00:00 IST
            LocalDate yesterday = today.minusDays(1);
            windowStart = yesterday.atStartOfDay(IST).toInstant();
            windowEnd = today.atStartOfDay(IST).toInstant();
        }

        logger.info("Generating daily digest for window: {} to {}", windowStart, windowEnd);

        // 1. Query all articles ingested in the window
        List<NewsArticle> allArticles = newsArticleRepository.findArticlesIngestedBetween(windowStart, windowEnd);
        logger.info("Total articles ingested in digest window: {}", allArticles.size());

        if (allArticles.isEmpty()) {
            logger.warn("Daily digest skipped — zero articles ingested in the previous 24h window. Possible ingestion gap.");
            return new DigestResult("skipped", "Zero articles ingested in digest window. No email sent.", null, 0, null);
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
        String dateDisplay = today.minusDays(forceRun ? 0 : 1).format(DATE_DISPLAY);
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

        String currentDate = LocalDate.now(IST).toString();
        String digestPrompt = "Today's date: " + currentDate + ". " +
                "Summarize the following supply chain news articles from the past 24 hours that are relevant to " + sectionLabel + ". " +
                "Write a single cohesive narrative paragraph (NOT a list of headlines) explaining the key events, " +
                "their root causes, and their potential impact on supply chains. " +
                "If the data is thin, say so honestly. Keep it under 150 words.";

        try {
            GroqClient.GroqResponse response = groqClient.generateSummary(digestPrompt, contextBuilder.toString());
            if (response != null && response.getSummary() != null && !response.getSummary().trim().isEmpty()) {
                return response.getSummary().trim();
            }
        } catch (Exception e) {
            logger.error("Groq AI summary generation failed for {}: {}", sectionLabel, e.getMessage());
        }

        // Fallback: concatenate top headlines
        return articles.stream()
                .limit(5)
                .map(a -> "• " + (a.getTitle() != null ? a.getTitle() : "Untitled"))
                .collect(Collectors.joining("\n"));
    }

    // --------------------------------------------------------------------------
    // Email Delivery
    // --------------------------------------------------------------------------
    private boolean sendEmail(String subject, String htmlBody) {
        if (recipientEmail == null || recipientEmail.trim().isEmpty()) {
            logger.warn("DIGEST_RECIPIENT_EMAIL is not configured. Skipping email delivery.");
            return false;
        }
        if (senderEmail == null || senderEmail.trim().isEmpty()) {
            logger.warn("DIGEST_GMAIL_ADDRESS is not configured. Skipping email delivery.");
            return false;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(senderEmail, senderName);
            helper.setTo(recipientEmail.trim());
            helper.setSubject(subject);
            helper.setText(htmlBody, true); // true = isHtml
            mailSender.send(message);
            logger.info("Daily digest email sent successfully to {}", recipientEmail);
            return true;
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            logger.error("Failed to send daily digest email: {}", e.getMessage(), e);
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

        return "<!DOCTYPE html>" +
                "<html lang=\"en\">" +
                "<head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\"></head>" +
                "<body style=\"margin:0;padding:0;background:#0a0f0d;font-family:'Segoe UI',Arial,sans-serif;\">" +
                "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#0a0f0d;\">" +
                "<tr><td align=\"center\" style=\"padding:24px 16px;\">" +
                "<table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#141a16;border-radius:16px;border:1px solid #1e2a22;overflow:hidden;\">" +

                // Header
                "<tr><td style=\"background:linear-gradient(135deg,#1a2318 0%,#0f1a12 100%);padding:28px 32px;border-bottom:1px solid #1e2a22;\">" +
                "<h1 style=\"margin:0;font-size:18px;font-weight:700;color:#8f9e7c;letter-spacing:0.02em;\">SUPPLY CHAIN RISK MONITOR</h1>" +
                "<p style=\"margin:6px 0 0 0;font-size:14px;color:#7a8a6e;\">Daily Digest — " + dateDisplay + "</p>" +
                "</td></tr>" +

                // Risk Badge
                "<tr><td style=\"padding:24px 32px 16px;\">" +
                "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#0d1410;border:1px solid " + riskBadgeColor + "44;border-radius:12px;width:100%;\">" +
                "<tr><td style=\"padding:16px 20px;\">" +
                "<p style=\"margin:0;font-size:12px;font-weight:700;color:#7a8a6e;text-transform:uppercase;letter-spacing:0.06em;\">India Risk Level</p>" +
                "<p style=\"margin:6px 0 0 0;font-size:24px;font-weight:800;color:" + riskBadgeColor + ";\">" + riskEmoji + " " + riskLabel + " (" + riskScore + "/100)</p>" +
                elevatedLine +
                "</td></tr>" +
                "</table>" +
                "</td></tr>" +

                // India Section
                "<tr><td style=\"padding:8px 32px 20px;\">" +
                "<h2 style=\"margin:0 0 12px 0;font-size:15px;font-weight:700;color:#8f9e7c;\">🇮🇳 INDIA FOCUS</h2>" +
                "<p style=\"margin:0;font-size:14px;line-height:1.7;color:#c8d0c0;\">" + indiaHtml + "</p>" +
                "<p style=\"margin:10px 0 0 0;font-size:12px;color:#5a6a4e;\">Based on " + indiaCount + " article" + (indiaCount != 1 ? "s" : "") + " ingested yesterday.</p>" +
                "</td></tr>" +

                // Divider
                "<tr><td style=\"padding:0 32px;\"><hr style=\"border:none;border-top:1px solid #1e2a22;margin:0;\"></td></tr>" +

                // Global Section
                "<tr><td style=\"padding:20px 32px;\">" +
                "<h2 style=\"margin:0 0 12px 0;font-size:15px;font-weight:700;color:#8f9e7c;\">🌐 GLOBAL HIGHLIGHTS</h2>" +
                "<p style=\"margin:0;font-size:14px;line-height:1.7;color:#c8d0c0;\">" + globalHtml + "</p>" +
                "<p style=\"margin:10px 0 0 0;font-size:12px;color:#5a6a4e;\">Based on " + globalCount + " article" + (globalCount != 1 ? "s" : "") + " ingested yesterday.</p>" +
                "</td></tr>" +

                // CTA Button
                "<tr><td style=\"padding:8px 32px 28px;\" align=\"center\">" +
                "<a href=\"" + dashboardUrl + "\" target=\"_blank\" style=\"display:inline-block;padding:12px 28px;background:#8f9e7c;color:#0a0f0d;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;\">View Live Dashboard →</a>" +
                "</td></tr>" +

                // Footer
                "<tr><td style=\"padding:16px 32px;background:#0d1210;border-top:1px solid #1e2a22;\">" +
                "<p style=\"margin:0;font-size:11px;color:#4a5a3e;text-align:center;\">Generated at " +
                LocalTime.now(IST).format(DateTimeFormatter.ofPattern("HH:mm")) + " IST by Supply Chain Risk Monitor. Powered by Groq AI.</p>" +
                "</td></tr>" +

                "</table></td></tr></table></body></html>";
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
