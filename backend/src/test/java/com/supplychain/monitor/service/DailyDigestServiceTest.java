package com.supplychain.monitor.service;

import org.junit.jupiter.api.Test;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class DailyDigestServiceTest {

    @Test
    void testStripHtmlTagsWithEncodedTagsAndUrls() throws Exception {
        DailyDigestService service = new DailyDigestService(null, null, null);
        Method method = DailyDigestService.class.getDeclaredMethod("stripHtmlTags", String.class);
        method.setAccessible(true);

        // Test 1: Encoded <a> tag with URL (common in Google News RSS description)
        String raw1 = "&lt;a href=\"https://news.google.com/rss/articles/CBMi12345\"&gt;India's manufacturing startups&lt;/a&gt; move toward supply chain ownership";
        String cleaned1 = (String) method.invoke(service, raw1);
        assertEquals("India's manufacturing startups move toward supply chain ownership", cleaned1);

        // Test 2: Standard HTML tags and bare URLs
        String raw2 = "<p>Port congestion rising. Visit https://example.com/details for updates.</p>";
        String cleaned2 = (String) method.invoke(service, raw2);
        assertEquals("Port congestion rising. Visit for updates.", cleaned2);

        // Test 3: Null and empty strings
        assertNotNull(method.invoke(service, (String) null));
        assertEquals("", method.invoke(service, ""));
    }

    @Test
    void testBuildHtmlEmailStructure() throws Exception {
        DailyDigestService service = new DailyDigestService(null, null, null);
        Method method = DailyDigestService.class.getDeclaredMethod("buildHtmlEmail",
                String.class,
                com.supplychain.monitor.service.RiskScoreCalculator.RiskResult.class,
                java.util.Map.class,
                String.class, int.class,
                String.class, int.class);
        method.setAccessible(true);

        java.util.Map<String, Integer> catScores = new java.util.HashMap<>();
        catScores.put("geopolitical", 15);
        catScores.put("logistics", 60);
        catScores.put("weather", 10);
        catScores.put("market", 15);

        com.supplychain.monitor.service.RiskScoreCalculator.RiskResult riskResult =
                new com.supplychain.monitor.service.RiskScoreCalculator.RiskResult(55, "Moderate", catScores);

        java.util.Map<String, Integer> elevated = new java.util.LinkedHashMap<>();
        elevated.put("China", 45);

        String html = (String) method.invoke(service,
                "September 28, 2026",
                riskResult,
                elevated,
                "India supply chain is operating steadily with moderate logistics delays.", 25,
                "Global shipping rates remain elevated across Red Sea lanes.", 45);

        assertNotNull(html);
        assertTrue(html.contains("<!DOCTYPE html>"));
        assertTrue(html.contains("Supply Chain Intelligence"));
        assertTrue(html.contains("India Risk Index"));
        assertTrue(html.contains("55"));
        assertTrue(html.contains("Threat Breakdown"));
        assertTrue(html.contains("India Intelligence"));
        assertTrue(html.contains("Global Situation"));
        assertTrue(html.contains("Top Stories"));
        assertTrue(html.contains("Open Live Dashboard"));
    }

    @Test
    void testSanitizeSummaryTextStripsBigLinksAndLeakedTags() throws Exception {
        DailyDigestService service = new DailyDigestService(null, null, null);
        Method method = DailyDigestService.class.getDeclaredMethod("sanitizeSummaryText", String.class);
        method.setAccessible(true);

        String rawLeak = "Primary disruption report: India so far successfully navigated crude supply disruption. " +
                "Compounding factor: Content: <a href=\"https://news.google.com/rss/articles/CBMizwFBVV95cUxQS09xWnNiaFhtSW9mZkVpMktCQ3BsdUxIVHJ1WI85WmZUYTIibGg3QVd3dWJCalMyMW9xamRVakZIMI4R2s2ZmlqQTkxc2dpRjJkbWh5STREQVhOQmtqOUw1Z0RcDjBnZlBWSWpZekdZTjJQMlB3QjdEOF9Lc0VaeFJQSWZVRGg2Y2wwU1VhbW82T00yZWN1NGZ1VVRTeGpzU19SNU9mNFhfaVBBVmNyZTdEQi05bUE2OW\">https://news.google.com/rss/articles/...</a>. " +
                "Logistics operators are actively re-evaluating carrier lead times.";

        String sanitized = (String) method.invoke(service, rawLeak);

        assertNotNull(sanitized);
        assertFalse(sanitized.contains("<a"));
        assertFalse(sanitized.contains("</a>"));
        assertFalse(sanitized.contains("https://"));
        assertFalse(sanitized.contains("Content:"));
        assertTrue(sanitized.contains("Primary disruption report: India so far successfully navigated crude supply disruption."));
        assertTrue(sanitized.contains("Logistics operators are actively re-evaluating carrier lead times."));
    }

    @Test
    void testGroqClientFiltersContentLinesAndUrlsFromSummary() {
        GroqClient groqClient = new GroqClient();
        String context = "Article 1: India so far successfully navigated crude supply disruption, says Puri | Category: Logistics\n" +
                "Content: <a href=\"https://news.google.com/rss/articles/CBMi12345\">Raw RSS link snippet</a>\n\n" +
                "Article 2: JNPT container terminal dwell time eases after rail clearance | Category: Logistics\n" +
                "Content: Rail lines cleared after monsoon inspections.\n";

        GroqClient.GroqResponse response = groqClient.generateSummary("India", context);
        assertNotNull(response);
        String summary = response.getSummary();

        assertNotNull(summary);
        assertFalse(summary.contains("<a"));
        assertFalse(summary.contains("</a>"));
        assertFalse(summary.contains("https://"));
        assertFalse(summary.contains("Content:"));
        assertFalse(summary.contains("| Category:"));
        assertTrue(summary.contains("India so far successfully navigated crude supply disruption, says Puri"));
        assertTrue(summary.contains("JNPT container terminal dwell time eases after rail clearance"));
    }

    @Test
    void testThreatBreakdownNotMaxedAt100ForIndia() {
        java.util.List<com.supplychain.monitor.model.NewsArticle> articles = new java.util.ArrayList<>();
        for (int i = 0; i < 35; i++) {
            com.supplychain.monitor.model.NewsArticle a = new com.supplychain.monitor.model.NewsArticle();
            a.setTitle("Container freight congestion and vessel delay at Indian port " + i);
            a.setRiskCategory("Logistics");
            a.setPublishedAt(java.time.Instant.now());
            articles.add(a);
        }
        for (int i = 0; i < 10; i++) {
            com.supplychain.monitor.model.NewsArticle a = new com.supplychain.monitor.model.NewsArticle();
            a.setTitle("Trade tariff revision and bilateral agreement updates " + i);
            a.setRiskCategory("Geopolitical");
            a.setPublishedAt(java.time.Instant.now());
            articles.add(a);
        }
        for (int i = 0; i < 5; i++) {
            com.supplychain.monitor.model.NewsArticle a = new com.supplychain.monitor.model.NewsArticle();
            a.setTitle("Monsoon heavy rainfall alert in coastal regions " + i);
            a.setRiskCategory("Weather");
            a.setPublishedAt(java.time.Instant.now());
            articles.add(a);
        }

        RiskScoreCalculator.RiskResult result = RiskScoreCalculator.compute(articles);
        Map<String, Integer> catScores = result.getCategoryScores();

        assertNotNull(catScores);
        int logScore = catScores.get("logistics");
        // Logistics should reflect high/moderate acute disruption (~60-80), NOT maxed out at 100!
        assertTrue(logScore > 50, "Logistics score should be elevated (> 50)");
        assertTrue(logScore < 90, "Logistics score should NOT be maxed out at 100 (was " + logScore + ")");
    }

    @Test
    void testGenerateDigestPreviewHtml() {
        DailyDigestService service = new DailyDigestService(null, null, null);
        String previewHtml = service.generateDigestPreviewHtml();

        assertNotNull(previewHtml);
        assertTrue(previewHtml.contains("<!DOCTYPE html>"));
        assertTrue(previewHtml.contains("Supply Chain Intelligence"));
        assertTrue(previewHtml.contains("Threat Breakdown"));
        assertTrue(previewHtml.contains("India Intelligence"));
        assertTrue(previewHtml.contains("Global Situation"));
    }
}
