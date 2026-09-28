package com.supplychain.monitor.controller;

import com.supplychain.monitor.model.NewsArticle;
import com.supplychain.monitor.repository.NewsArticleRepository;
import com.supplychain.monitor.service.GroqClient;
import com.supplychain.monitor.service.RiskScoreCalculator;
import com.supplychain.monitor.service.CountryRiskService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
import java.util.regex.Pattern;
import java.util.regex.Matcher;

@RestController
@RequestMapping("/api/countries")
public class CountryRiskController {

    private static final Logger logger = LoggerFactory.getLogger(CountryRiskController.class);

    private final CountryRiskService countryRiskService;
    private final NewsArticleRepository newsArticleRepository;

    public static class CountryPin {
        public String id;
        public String query;
        public String flag;
        public double lat;
        public double lng;

        public CountryPin(String id, String query, String flag, double lat, double lng) {
            this.id = id;
            this.query = query;
            this.flag = flag;
            this.lat = lat;
            this.lng = lng;
        }
    }

    public static final List<CountryPin> ALL_COUNTRIES = List.of(
        new CountryPin("US", "United States", "🇺🇸", 37.0, -95.0),
        new CountryPin("CN", "China", "🇨🇳", 35.0, 104.0),
        new CountryPin("IN", "India", "🇮🇳", 20.5, 78.9),
        new CountryPin("DE", "Germany", "🇩🇪", 51.1, 10.4),
        new CountryPin("NL", "Netherlands", "🇳🇱", 52.3, 4.9),
        new CountryPin("EG", "Egypt", "🇪🇬", 26.8, 30.8),
        new CountryPin("SG", "Singapore", "🇸🇬", 1.35, 103.8),
        new CountryPin("JP", "Japan", "🇯🇵", 36.2, 138.2),
        new CountryPin("GB", "United Kingdom", "🇬🇧", 55.3, -3.4),
        new CountryPin("BR", "Brazil", "🇧🇷", -14.2, -51.9),
        new CountryPin("AU", "Australia", "🇦🇺", -25.2, 133.7),
        new CountryPin("FR", "France", "🇫🇷", 46.2, 2.2),
        new CountryPin("CA", "Canada", "🇨🇦", 56.1, -106.3),
        new CountryPin("MX", "Mexico", "🇲🇽", 23.6, -102.5),
        new CountryPin("KR", "South Korea", "🇰🇷", 35.9, 127.7),
        new CountryPin("AE", "United Arab Emirates", "🇦🇪", 23.4, 53.8),
        new CountryPin("IT", "Italy", "🇮🇹", 41.8, 12.5),
        new CountryPin("ES", "Spain", "🇪🇸", 40.4, -3.7),
        new CountryPin("RU", "Russia", "🇷🇺", 61.5, 105.3),
        new CountryPin("ZA", "South Africa", "🇿🇦", -30.5, 22.9),
        new CountryPin("TR", "Turkey", "🇹🇷", 38.9, 35.2),
        new CountryPin("SA", "Saudi Arabia", "🇸🇦", 23.8, 45.0),
        new CountryPin("ID", "Indonesia", "🇮🇩", -0.7, 113.9),
        new CountryPin("MY", "Malaysia", "🇲🇾", 4.2, 109.2),
        new CountryPin("VN", "Vietnam", "🇻🇳", 14.0, 108.2),
        new CountryPin("TH", "Thailand", "🇹🇭", 15.8, 100.9)
    );

    public CountryRiskController(CountryRiskService countryRiskService, NewsArticleRepository newsArticleRepository) {
        this.countryRiskService = countryRiskService;
        this.newsArticleRepository = newsArticleRepository;
    }

    @GetMapping("/active")
    public ResponseEntity<List<Map<String, Object>>> getActiveCountries() {
        List<NewsArticle> allArticles = newsArticleRepository.findAllByOrderByPublishedAtDesc();
        List<Map<String, Object>> activePins = new ArrayList<>();
        
        for (CountryRiskService.CountryPin pin : CountryRiskService.ALL_COUNTRIES) {
            String pattern = countryRiskService.buildCountryRegexPattern(pin.query);
            Pattern r = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE);
            
            boolean matches = false;
            for (NewsArticle article : allArticles) {
                String content = (article.getTitle() != null ? article.getTitle() : "") + " " +
                                 (article.getRawContent() != null ? article.getRawContent() : "") + " " +
                                 (article.getEntities() != null ? article.getEntities() : "");
                if (r.matcher(content).find()) {
                    matches = true;
                    break;
                }
            }
            
            if (matches) {
                Map<String, Object> pinMap = new HashMap<>();
                pinMap.put("id", pin.id);
                pinMap.put("query", pin.query);
                pinMap.put("flag", pin.flag);
                pinMap.put("lat", pin.lat);
                pinMap.put("lng", pin.lng);
                pinMap.put("baseScore", 50); // Default base score
                activePins.add(pinMap);
            }
        }
        
        return ResponseEntity.ok(activePins);
    }

    @GetMapping("/risk")
    public ResponseEntity<CountryRiskResponse> getCountryRisk(@RequestParam("query") String query) {
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        String countryQuery = query.trim();
        logger.info("Computing real-time dynamic country risk for query: '{}' via CountryRiskService", countryQuery);

        List<NewsArticle> matchedArticles = countryRiskService.getMatchedArticles(countryQuery);

        if (matchedArticles.isEmpty()) {
            CountryRiskResponse emptyResp = new CountryRiskResponse(
                    false,
                    countryQuery,
                    null,
                    "INSUFFICIENT DATA",
                    Map.of("geopolitical", 0, "logistics", 0, "weather", 0, "market", 0),
                    List.of("No active disruption news articles recorded in system database for " + countryQuery + "."),
                    Collections.emptyList()
            );
            return ResponseEntity.ok(emptyResp);
        }

        // 1. Recency-weighted mathematical risk score calculation
        RiskScoreCalculator.RiskResult riskResult = countryRiskService.calculateRisk(matchedArticles);
        int overallScore = riskResult.getScore();
        String status;
        if (overallScore >= 80) {
            status = "HIGH RISK (CRITICAL)";
        } else if (overallScore >= 65) {
            status = "ELEVATED RISK";
        } else if (overallScore >= 45) {
            status = "MODERATE RISK";
        } else {
            status = "LOW RISK";
        }
        Map<String, Integer> categoryScores = riskResult.getCategoryScores();

        // 2. Synthesize dynamic Key Regional Risk Drivers from actual matched article titles
        List<String> highlights = countryRiskService.generateRiskDrivers(countryQuery, matchedArticles);

        CountryRiskResponse response = new CountryRiskResponse(
                true,
                countryQuery,
                overallScore,
                status,
                categoryScores,
                highlights,
                matchedArticles
        );

        return ResponseEntity.ok(response);
    }

    public static class CountryRiskResponse {
        private boolean hasData;
        private String countryName;
        private Integer baseScore;
        private String status;
        private Map<String, Integer> categoryScores;
        private List<String> highlights;
        private List<NewsArticle> matchedArticles;

        public CountryRiskResponse() {
        }

        public CountryRiskResponse(boolean hasData, String countryName, Integer baseScore, String status,
                                   Map<String, Integer> categoryScores, List<String> highlights,
                                   List<NewsArticle> matchedArticles) {
            this.hasData = hasData;
            this.countryName = countryName;
            this.baseScore = baseScore;
            this.status = status;
            this.categoryScores = categoryScores;
            this.highlights = highlights;
            this.matchedArticles = matchedArticles;
        }

        public boolean isHasData() {
            return hasData;
        }

        public void setHasData(boolean hasData) {
            this.hasData = hasData;
        }

        public String getCountryName() {
            return countryName;
        }

        public void setCountryName(String countryName) {
            this.countryName = countryName;
        }

        public Integer getBaseScore() {
            return baseScore;
        }

        public void setBaseScore(Integer baseScore) {
            this.baseScore = baseScore;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public Map<String, Integer> getCategoryScores() {
            return categoryScores;
        }

        public void setCategoryScores(Map<String, Integer> categoryScores) {
            this.categoryScores = categoryScores;
        }

        public List<String> getHighlights() {
            return highlights;
        }

        public void setHighlights(List<String> highlights) {
            this.highlights = highlights;
        }

        public List<NewsArticle> getMatchedArticles() {
            return matchedArticles;
        }

        public void setMatchedArticles(List<NewsArticle> matchedArticles) {
            this.matchedArticles = matchedArticles;
        }
    }
}
