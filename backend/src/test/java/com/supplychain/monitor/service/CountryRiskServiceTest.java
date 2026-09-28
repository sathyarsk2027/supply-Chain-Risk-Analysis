package com.supplychain.monitor.service;

import com.supplychain.monitor.model.NewsArticle;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

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
}
