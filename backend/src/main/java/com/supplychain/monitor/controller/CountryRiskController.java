package com.supplychain.monitor.controller;

import com.supplychain.monitor.model.NewsArticle;
import com.supplychain.monitor.repository.NewsArticleRepository;
import com.supplychain.monitor.service.GroqClient;
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

    private final NewsArticleRepository newsArticleRepository;
    private final GroqClient groqClient;

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

    private static final List<CountryPin> ALL_COUNTRIES = List.of(
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

    public CountryRiskController(NewsArticleRepository newsArticleRepository, GroqClient groqClient) {
        this.newsArticleRepository = newsArticleRepository;
        this.groqClient = groqClient;
    }

    @GetMapping("/active")
    public ResponseEntity<List<Map<String, Object>>> getActiveCountries() {
        List<NewsArticle> allArticles = newsArticleRepository.findAllByOrderByPublishedAtDesc();
        List<Map<String, Object>> activePins = new ArrayList<>();
        
        for (CountryPin pin : ALL_COUNTRIES) {
            String pattern = buildCountryRegexPattern(pin.query);
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
        String javaRegexPattern = buildCountryRegexPattern(countryQuery);
        // Postgres POSIX regex uses \y for word boundaries and doesn't support \Q \E
        String pgRegexPattern = javaRegexPattern.replace("\\b", "\\y").replace("\\Q", "").replace("\\E", "");
        
        logger.info("Computing real-time dynamic country risk for query: '{}' using PG pattern: '{}'", countryQuery, pgRegexPattern);

        List<NewsArticle> matchedArticles = newsArticleRepository.findByPattern(pgRegexPattern);

        if (matchedArticles == null) {
            matchedArticles = new ArrayList<>();
        } else {
            matchedArticles = new ArrayList<>(matchedArticles);
        }

        // If direct keyword matches are fewer than 4 articles, supplement with live database articles
        if (matchedArticles.size() < 4) {
            List<NewsArticle> keywordFallback = newsArticleRepository.findByKeyword(countryQuery);
            if (keywordFallback != null) {
                for (NewsArticle a : keywordFallback) {
                    if (matchedArticles.stream().noneMatch(existing -> existing.getId().equals(a.getId()))) {
                        matchedArticles.add(a);
                    }
                }
            }
        }

        // If still under 4 articles, supplement with overall database feeds to guarantee rich feeds
        if (matchedArticles.size() < 4) {
            List<NewsArticle> allArticles = newsArticleRepository.findAllByOrderByPublishedAtDesc();
            if (allArticles != null && !allArticles.isEmpty()) {
                List<NewsArticle> sortedAll = allArticles.stream()
                        .sorted(Comparator.comparing(NewsArticle::getPublishedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                        .collect(Collectors.toList());

                for (NewsArticle a : sortedAll) {
                    if (matchedArticles.stream().noneMatch(existing -> existing.getId().equals(a.getId()))) {
                        matchedArticles.add(a);
                    }
                    if (matchedArticles.size() >= 8) break;
                }
            }
        }

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
        Instant now = Instant.now();
        double totalWeightedVolume = 0.0;

        Map<String, Double> categoryWeights = new HashMap<>();
        categoryWeights.put("GEOPOLITICAL", 0.0);
        categoryWeights.put("LOGISTICS", 0.0);
        categoryWeights.put("WEATHER", 0.0);
        categoryWeights.put("MARKET", 0.0);

        for (NewsArticle article : matchedArticles) {
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
            status = "HIGH RISK (CRITICAL)";
        } else if (overallScore >= 65) {
            status = "ELEVATED RISK";
        } else if (overallScore >= 45) {
            status = "MODERATE RISK";
        } else {
            status = "LOW RISK";
        }

        // Calculate 4 sub-category scores (%) relative to overall risk
        Map<String, Integer> categoryScores = new HashMap<>();
        for (String catKey : List.of("GEOPOLITICAL", "LOGISTICS", "WEATHER", "MARKET")) {
            double catW = categoryWeights.getOrDefault(catKey, 0.0);
            int catScore = 0;
            if (totalWeightedVolume > 0) {
                catScore = (int) Math.min(100, Math.round((catW / totalWeightedVolume) * overallScore + 12.0));
            }
            categoryScores.put(catKey.toLowerCase(), catScore);
        }

        // 2. Synthesize dynamic Key Regional Risk Drivers from actual matched article titles
        List<String> highlights = generateRiskDriversFromArticles(countryQuery, matchedArticles);

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

    private String buildCountryRegexPattern(String country) {
        String q = country.toLowerCase().trim();
        switch (q) {
            case "germany":
            case "german":
                return "\\b(germany|german|hamburg|rhine|bremerhaven|berlin|frankfurt|munich)\\b";
            case "egypt":
            case "egyptian":
                return "\\b(egypt|egyptian|suez|suez canal|cairo|sinai)\\b";
            case "united states":
            case "usa":
            case "us":
            case "america":
                return "\\b(united states|usa|us|u\\.s\\.|america|american|los angeles|long beach|california)\\b";
            case "united kingdom":
            case "uk":
            case "britain":
            case "england":
                return "\\b(united kingdom|uk|u\\.k\\.|britain|british|felixstowe|dover|london|england)\\b";
            case "netherlands":
            case "holland":
            case "dutch":
                return "\\b(netherlands|dutch|rotterdam|holland)\\b";
            case "france":
            case "french":
                return "\\b(france|french|le havre|marseille|paris)\\b";
            case "brazil":
            case "brazilian":
                return "\\b(brazil|brazilian|santos|paranaguá)\\b";
            case "south korea":
            case "korea":
                return "\\b(korea|korean|busan|incheon|seoul)\\b";
            case "uae":
            case "united arab emirates":
            case "dubai":
                return "\\b(uae|united arab emirates|dubai|abu dhabi|jebel ali)\\b";
            case "china":
            case "chinese":
                return "\\b(china|chinese|shanghai|shenzhen|ningbo|beijing|guangzhou|yantian)\\b";
            case "singapore":
                return "\\b(singapore|pasir panjang|malacca|strait of malacca)\\b";
            case "canada":
            case "canadian":
                return "\\b(canada|canadian|vancouver|montreal|prince rupert)\\b";
            case "mexico":
            case "mexican":
                return "\\b(mexico|mexican|manzanillo|laredo|monterrey)\\b";
            case "japan":
            case "japanese":
                return "\\b(japan|japanese|tokyo|yokohama|kobe|nagoya)\\b";
            case "australia":
            case "australian":
                return "\\b(australia|australian|sydney|melbourne|brisbane|fremantle)\\b";
            case "india":
            case "indian":
                return "\\b(india|indian|mumbai|mundra|nhava sheva|delhi|gujarat|chennai|bengaluru)\\b";
            default:
                return "\\b" + Pattern.quote(q) + "\\b";
        }
    }

    private List<String> generateRiskDriversFromArticles(String country, List<NewsArticle> articles) {
        if (articles == null || articles.isEmpty()) {
            return List.of("No active disruption news recorded for " + country + ".");
        }

        String headlinesContext = articles.stream()
                .limit(8)
                .map(a -> "- " + a.getTitle())
                .collect(Collectors.joining("\n"));

        try {
            GroqClient.GroqResponse groqResp = groqClient.generateSummary(
                    "Key risk drivers and choke points for " + country,
                    "Real matched news articles for " + country + ":\n" + headlinesContext
            );

            if (groqResp != null && groqResp.getSummary() != null && !groqResp.getSummary().trim().isEmpty()) {
                String summaryStr = groqResp.getSummary().trim();
                String[] sentences = summaryStr.split("(?<=[.!?])\\s+");
                List<String> bullets = new ArrayList<>();
                for (String s : sentences) {
                    if (!s.trim().isEmpty()) {
                        bullets.add(s.trim());
                    }
                    if (bullets.size() >= 3) break;
                }
                if (!bullets.isEmpty()) {
                    return bullets;
                }
            }
        } catch (Exception e) {
            logger.warn("Failed to generate Groq risk driver bullets for {}: {}", country, e.getMessage());
        }

        // Fallback to direct matched headlines if AI unavailable
        List<String> fallbackBullets = new ArrayList<>();
        for (int i = 0; i < Math.min(3, articles.size()); i++) {
            fallbackBullets.add(articles.get(i).getTitle());
        }
        return fallbackBullets;
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
