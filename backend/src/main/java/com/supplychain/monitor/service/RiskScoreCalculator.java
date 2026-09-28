package com.supplychain.monitor.service;

import com.supplychain.monitor.model.NewsArticle;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Shared utility for computing recency-weighted, multi-dimensional risk scores from a list of articles.
 * Used by both CountryRiskController (live dashboard) and DailyDigestService (email digest).
 */
public final class RiskScoreCalculator {

    private RiskScoreCalculator() {} // Utility class

    // High-impact disruption indicator keywords
    private static final Pattern HIGH_SEVERITY_PATTERN = Pattern.compile(
            "\\b(strike|protest|congestion|congested|halt|halted|shutdown|closure|closed|cyclone|flood|flooding|storm|monsoon|sanction|blockade|tariff|tariff war|delay|delayed|disrupt|disruption|crisis|embargo|accident|grounding|sunk)\\b",
            Pattern.CASE_INSENSITIVE
    );

    public static RiskResult compute(List<NewsArticle> articles) {
        if (articles == null || articles.isEmpty()) {
            return new RiskResult(0, "INSUFFICIENT DATA",
                    Map.of("geopolitical", 0, "logistics", 0, "weather", 0, "market", 0));
        }

        Instant now = Instant.now();
        double totalWeightedVolume = 0.0;
        double urgentWeightedVolume = 0.0;

        Map<String, Double> categoryWeights = new LinkedHashMap<>();
        categoryWeights.put("GEOPOLITICAL", 0.0);
        categoryWeights.put("LOGISTICS", 0.0);
        categoryWeights.put("WEATHER", 0.0);
        categoryWeights.put("MARKET", 0.0);

        Map<String, Double> categoryUrgentWeights = new LinkedHashMap<>();
        categoryUrgentWeights.put("GEOPOLITICAL", 0.0);
        categoryUrgentWeights.put("LOGISTICS", 0.0);
        categoryUrgentWeights.put("WEATHER", 0.0);
        categoryUrgentWeights.put("MARKET", 0.0);

        for (NewsArticle article : articles) {
            long daysOld = 0;
            if (article.getPublishedAt() != null) {
                daysOld = ChronoUnit.DAYS.between(article.getPublishedAt(), now);
                if (daysOld < 0) daysOld = 0;
            }

            // Half-life decay over 7 days: w = exp(-days / 7)
            double weight = Math.exp(-((double) daysOld) / 7.0);
            totalWeightedVolume += weight;

            String catRaw = article.getRiskCategory() != null ? article.getRiskCategory().toUpperCase() : "LOGISTICS";
            String catKey;
            if (catRaw.contains("GEO") || catRaw.contains("SANCTION") || catRaw.contains("WAR") || catRaw.contains("TARIFF") || catRaw.contains("POLICY") || catRaw.contains("TRADE")) {
                catKey = "GEOPOLITICAL";
            } else if (catRaw.contains("WEATHER") || catRaw.contains("CLIMATE") || catRaw.contains("FLOOD") || catRaw.contains("STORM") || catRaw.contains("DROUGHT") || catRaw.contains("CYCLONE")) {
                catKey = "WEATHER";
            } else if (catRaw.contains("MARKET") || catRaw.contains("FINANCE") || catRaw.contains("PRICE") || catRaw.contains("INFLATION") || catRaw.contains("LABOR") || catRaw.contains("STRIKE")) {
                catKey = "MARKET";
            } else {
                catKey = "LOGISTICS";
            }

            categoryWeights.put(catKey, categoryWeights.get(catKey) + weight);

            // Detect acute operational disruption signals in title & text
            String textToInspect = (article.getTitle() != null ? article.getTitle() : "") + " " +
                                  (article.getRawContent() != null ? article.getRawContent() : "");
            boolean isUrgent = HIGH_SEVERITY_PATTERN.matcher(textToInspect).find();
            if (isUrgent) {
                urgentWeightedVolume += weight;
                categoryUrgentWeights.put(catKey, categoryUrgentWeights.get(catKey) + weight);
            }
        }

        // Smooth logarithmic diminishing returns on volume (scaling smoothly up to 60)
        double cappedVolume = Math.min(totalWeightedVolume, 60.0);
        double baseVolumeScore = 15.0 + (11.5 * Math.log(1.0 + cappedVolume));

        // Category Severity Factor:
        // Geopolitical (1.30x) & Weather (1.25x) carry higher acute disruption weight than Logistics (1.05x) and Market (0.85x)
        double geoW = categoryWeights.getOrDefault("GEOPOLITICAL", 0.0);
        double wxW = categoryWeights.getOrDefault("WEATHER", 0.0);
        double logW = categoryWeights.getOrDefault("LOGISTICS", 0.0);
        double mktW = categoryWeights.getOrDefault("MARKET", 0.0);

        double severityMultiplier = 1.0;
        double urgencyBonus = 0.0;
        if (totalWeightedVolume > 0.0) {
            severityMultiplier = ((1.30 * geoW) + (1.25 * wxW) + (1.05 * logW) + (0.85 * mktW)) / totalWeightedVolume;
            urgencyBonus = Math.min(15.0, (urgentWeightedVolume / totalWeightedVolume) * 12.0);
        }

        // Bounded dynamic risk factor score (15 - 100)
        int overallScore = (int) Math.min(100, Math.max(15, Math.round(baseVolumeScore * severityMultiplier + urgencyBonus)));

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

        // Differentiated baseline exposure for each category (never static +12% across all categories)
        Map<String, Double> baselineByCategory = Map.of(
                "LOGISTICS", 12.0,
                "MARKET", 10.0,
                "GEOPOLITICAL", 8.0,
                "WEATHER", 6.0
        );
        Map<String, Double> categoryMultiplier = Map.of(
                "GEOPOLITICAL", 1.35,
                "WEATHER", 1.30,
                "LOGISTICS", 1.15,
                "MARKET", 0.95
        );

        // Calculate 4 sub-category scores (%) relative to overall risk and direct category evidence
        Map<String, Integer> categoryScores = new LinkedHashMap<>();
        for (String catKey : List.of("GEOPOLITICAL", "LOGISTICS", "WEATHER", "MARKET")) {
            double catW = categoryWeights.getOrDefault(catKey, 0.0);
            double catUrgent = categoryUrgentWeights.getOrDefault(catKey, 0.0);
            double baseline = baselineByCategory.getOrDefault(catKey, 8.0);
            double multiplier = categoryMultiplier.getOrDefault(catKey, 1.0);

            int catScore;
            if (catW > 0.0) {
                double catVolumeBoost = 15.0 * Math.log(1.0 + catW);
                double catUrgencyBoost = (catUrgent / catW) * 16.0;
                double shareOfOverall = (catW / totalWeightedVolume) * (overallScore * 0.65);
                double computed = baseline + (catVolumeBoost * multiplier) + catUrgencyBoost + shareOfOverall;
                catScore = (int) Math.min(100, Math.max(10, Math.round(computed)));
            } else {
                // When 0 articles in this category, reflect distinct baseline exposure + slight regional spillover
                double spillover = Math.min(10.0, overallScore * 0.08);
                catScore = (int) Math.round(baseline + spillover);
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
