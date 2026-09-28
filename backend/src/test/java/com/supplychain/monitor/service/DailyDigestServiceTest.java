package com.supplychain.monitor.service;

import org.junit.jupiter.api.Test;
import java.lang.reflect.Method;
import static org.junit.jupiter.api.Assertions.*;

class DailyDigestServiceTest {

    @Test
    void testStripHtmlTagsWithEncodedTagsAndUrls() throws Exception {
        DailyDigestService service = new DailyDigestService(null, null);
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
        DailyDigestService service = new DailyDigestService(null, null);
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
}
