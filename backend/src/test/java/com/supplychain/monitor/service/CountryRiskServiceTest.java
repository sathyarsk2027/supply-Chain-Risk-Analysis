package com.supplychain.monitor.service;

import com.supplychain.monitor.model.NewsArticle;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class CountryRiskServiceTest {

    @Test
    void testBuildCountryRegexPattern() {
        CountryRiskService service = new CountryRiskService(null, null);

        String indiaPattern = service.buildCountryRegexPattern("India");
        assertTrue(indiaPattern.contains("mumbai"));
        assertTrue(indiaPattern.contains("mundra"));
        assertTrue(indiaPattern.contains("nhava sheva"));
        assertTrue(indiaPattern.contains("delhi"));

        String chinaPattern = service.buildCountryRegexPattern("China");
        assertTrue(chinaPattern.contains("shanghai"));
        assertTrue(chinaPattern.contains("shenzhen"));

        String germanyPattern = service.buildCountryRegexPattern("Germany");
        assertTrue(germanyPattern.contains("hamburg"));
        assertTrue(germanyPattern.contains("rhine"));
        assertTrue(germanyPattern.contains("bremerhaven"));
    }

    @Test
    void testCalculateRiskParity() {
        CountryRiskService service = new CountryRiskService(null, null);

        List<NewsArticle> articles = new ArrayList<>();
        for (int i = 0; i < 50; i++) {
            NewsArticle article = new NewsArticle();
            article.setTitle("Port congestion in Mumbai container terminal " + i);
            article.setRiskCategory("Logistics");
            article.setPublishedAt(Instant.now());
            articles.add(article);
        }

        RiskScoreCalculator.RiskResult directResult = RiskScoreCalculator.compute(articles);
        RiskScoreCalculator.RiskResult serviceResult = service.calculateRisk(articles);

        assertEquals(directResult.getScore(), serviceResult.getScore());
        assertEquals(directResult.getStatus(), serviceResult.getStatus());
        assertEquals(directResult.getCategoryScores(), serviceResult.getCategoryScores());
    }

    @Test
    void testDifferentiatedCategoryBreakdown() {
        // Test that categories do not output flat static 12% across all categories
        List<NewsArticle> articles = new ArrayList<>();
        NewsArticle a1 = new NewsArticle();
        a1.setTitle("Rhine river water levels drop to critical navigation thresholds at Kaub");
        a1.setRiskCategory("Weather");
        a1.setPublishedAt(Instant.now());
        articles.add(a1);

        NewsArticle a2 = new NewsArticle();
        a2.setTitle("Hamburg port rail terminal congestion halts container departures");
        a2.setRiskCategory("Logistics");
        a2.setPublishedAt(Instant.now());
        articles.add(a2);

        RiskScoreCalculator.RiskResult result = RiskScoreCalculator.compute(articles);
        Map<String, Integer> catScores = result.getCategoryScores();

        assertNotNull(catScores);
        // Categories with articles should have elevated risk scores
        assertTrue(catScores.get("weather") > 15, "Weather should reflect direct threat evidence");
        assertTrue(catScores.get("logistics") > 15, "Logistics should reflect direct threat evidence");

        // Categories without articles should have distinct baselines (not static 12% everywhere)
        assertNotEquals(catScores.get("geopolitical"), catScores.get("logistics"));
        assertFalse(catScores.get("geopolitical") == 12 && catScores.get("weather") == 12 && catScores.get("market") == 12,
                "Category scores should not all be flat 12%");
    }

    @Test
    void testDistinctRiskDriversAcrossCountries() {
        CountryRiskService service = new CountryRiskService(null, null);

        NewsArticle deArt = new NewsArticle();
        deArt.setTitle("Rhine low water limits barge transport in Germany");
        deArt.setRiskCategory("Weather");

        NewsArticle brArt = new NewsArticle();
        brArt.setTitle("Santos port vessel lineups grow amid soy export surge");
        brArt.setRiskCategory("Logistics");

        List<String> deDrivers = service.generateRiskDrivers("Germany", List.of(deArt));
        List<String> brDrivers = service.generateRiskDrivers("Brazil", List.of(brArt));

        assertNotNull(deDrivers);
        assertNotNull(brDrivers);
        assertFalse(deDrivers.isEmpty());
        assertFalse(brDrivers.isEmpty());

        // Ensure Germany drivers mention Rhine or Hamburg
        boolean deMentionsGermanyChokePoints = deDrivers.stream().anyMatch(d -> d.contains("Rhine") || d.contains("Hamburg") || d.contains("Bremerhaven"));
        assertTrue(deMentionsGermanyChokePoints, "Germany risk drivers should mention German choke points");

        // Ensure Brazil drivers mention Santos or Paranagua
        boolean brMentionsBrazilChokePoints = brDrivers.stream().anyMatch(d -> d.contains("Santos") || d.contains("Paranaguá") || d.contains("BR-163"));
        assertTrue(brMentionsBrazilChokePoints, "Brazil risk drivers should mention Brazilian choke points");

        // Ensure no generic boilerplate
        for (String d : deDrivers) {
            assertFalse(d.contains("Based on current world news"), "Drivers should not contain generic boilerplate");
        }
        for (String d : brDrivers) {
            assertFalse(d.contains("Based on current world news"), "Drivers should not contain generic boilerplate");
        }

        // Ensure Germany and Brazil drivers are distinct
        assertNotEquals(deDrivers, brDrivers, "Different countries must have completely distinct risk drivers");
    }

    @Test
    void testEmptyArticlesInsufficientData() {
        RiskScoreCalculator.RiskResult empty = RiskScoreCalculator.compute(List.of());
        assertEquals(0, empty.getScore());
        assertEquals("INSUFFICIENT DATA", empty.getStatus());
        assertEquals(0, empty.getCategoryScores().get("geopolitical"));
        assertEquals(0, empty.getCategoryScores().get("logistics"));
        assertEquals(0, empty.getCategoryScores().get("weather"));
        assertEquals(0, empty.getCategoryScores().get("market"));
    }
}
