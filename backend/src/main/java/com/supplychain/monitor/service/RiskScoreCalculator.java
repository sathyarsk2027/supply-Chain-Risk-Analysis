package com.supplychain.monitor.service;

import com.supplychain.monitor.model.NewsArticle;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Shared utility for computing recency-weighted risk scores from a list of articles.
 * Used by both CountryRiskController (live dashboard) and DailyDigestService (email digest).
 */
public final class RiskScoreCalculator {

    private RiskScoreCalculator() {} // Utility class

    public static RiskResult compute(List<NewsArticle> articles) {
        if (articles == null || articles.isEmpty()) {
            return new RiskResult(0, "INSUFFICIENT DATA",
                    Map.of("geopolitical", 0, "logistics", 0, "weather", 0, "market", 0));
        }

        Instant now = Instant.now();
        double totalWeightedVolume = 0.0;

        Map<String, Double> categoryWeights = new LinkedHashMap<>();
        categoryWeights.put("GEOPOLITICAL", 0.0);
        categoryWeights.put("LOGISTICS", 0.0);
        categoryWeights.put("WEATHER", 0.0);
        categoryWeights.put("MARKET", 0.0);

        for (NewsArticle article : articles) {
            long daysOld = 0;
            if (article.getPublishedAt() != null) {
                daysOld = ChronoUnit.DAYS.between(article.getPublishedAt(), now);
                if (daysOld < 0) daysOld = 0;
            }

            // Half-life decay over 7 days: w = exp(-days / 7)
            double weight = Math.exp(-((double) daysOld) / 7.0);
            totalWeightedVolume += weight;

            String cat = article.getRiskCategory() != null ? article.getRiskCategory().toUpperCase() : "LOGISTICS";
            if (cat.contains("GEO")) {
                categoryWeights.put("GEOPOLITICAL", categoryWeights.get("GEOPOLITICAL") + weight);
            } else if (cat.contains("WEATHER") || cat.contains("CLIMATE")) {
                categoryWeights.put("WEATHER", categoryWeights.get("WEATHER") + weight);
            } else if (cat.contains("MARKET") || cat.contains("FINANCE") || cat.contains("PRICE")) {
                categoryWeights.put("MARKET", categoryWeights.get("MARKET") + weight);
            } else {
                categoryWeights.put("LOGISTICS", categoryWeights.get("LOGISTICS") + weight);
            }
        }

        // Bounded risk factor score formula (15 - 100)
        int overallScore = (int) Math.min(100, Math.round(28.0 * Math.log(1.0 + totalWeightedVolume)));
        if (overallScore < 15) overallScore = 15;

        String status;
        if (overallScore >= 80) {
            status = "Critical";
        } else if (overallScore >= 65) {
            status = "Elevated";
        } else if (overallScore >= 45) {
            status = "Moderate";
        } else {
            status = "Low";
        }

        // Calculate 4 sub-category scores (%) relative to overall risk
        Map<String, Integer> categoryScores = new LinkedHashMap<>();
        for (String catKey : List.of("GEOPOLITICAL", "LOGISTICS", "WEATHER", "MARKET")) {
            double catW = categoryWeights.getOrDefault(catKey, 0.0);
            int catScore = 0;
            if (totalWeightedVolume > 0) {
                catScore = (int) Math.min(100, Math.round((catW / totalWeightedVolume) * overallScore + 12.0));
            }
            categoryScores.put(catKey.toLowerCase(), catScore);
        }

        return new RiskResult(overallScore, status, categoryScores);
    }

    public static class RiskResult {
        private final int score;
        private final String status;
        private final Map<String, Integer> categoryScores;

        public RiskResult(int score, String status, Map<String, Integer> categoryScores) {
            this.score = score;
            this.status = status;
            this.categoryScores = categoryScores;
        }

        public int getScore() { return score; }
        public String getStatus() { return status; }
        public Map<String, Integer> getCategoryScores() { return categoryScores; }

        /**
         * Returns the emoji + color hex for the risk badge.
         */
        public String getEmoji() {
            if (score >= 80) return "🔴";
            if (score >= 65) return "🟠";
            if (score >= 45) return "🟡";
            return "🟢";
        }

        public String getColorHex() {
            if (score >= 80) return "#ef4444";
            if (score >= 65) return "#f59e0b";
            if (score >= 45) return "#eab308";
            return "#22c55e";
        }
    }
}
