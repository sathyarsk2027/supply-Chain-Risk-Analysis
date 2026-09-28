package com.supplychain.monitor.service;

import com.supplychain.monitor.model.NewsArticle;
import com.supplychain.monitor.repository.NewsArticleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class CountryRiskService {

    private static final Logger logger = LoggerFactory.getLogger(CountryRiskService.class);

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

    private final NewsArticleRepository newsArticleRepository;
    private final GroqClient groqClient;

    @org.springframework.beans.factory.annotation.Autowired
    public CountryRiskService(NewsArticleRepository newsArticleRepository, GroqClient groqClient) {
        this.newsArticleRepository = newsArticleRepository;
        this.groqClient = groqClient;
    }

    /**
     * Finds all real-time matched disruption articles for a given country.
     * Uses regex pattern matching on title, entities, and content, with keyword and recency fallbacks.
     */
    public List<NewsArticle> getMatchedArticles(String countryQuery) {
        if (countryQuery == null || countryQuery.trim().isEmpty()) {
            return Collections.emptyList();
        }

        String q = countryQuery.trim();
        String javaRegexPattern = buildCountryRegexPattern(q);
        String pgRegexPattern = javaRegexPattern.replace("\\b", "\\y").replace("\\Q", "").replace("\\E", "");

        List<NewsArticle> matchedArticles = newsArticleRepository.findByPattern(pgRegexPattern);
        if (matchedArticles == null) {
            matchedArticles = new ArrayList<>();
        } else {
            matchedArticles = new ArrayList<>(matchedArticles);
        }

        // Fallback: supplement if fewer than 4 direct matches
        if (matchedArticles.size() < 4) {
            List<NewsArticle> keywordFallback = newsArticleRepository.findByKeyword(q);
            if (keywordFallback != null) {
                for (NewsArticle a : keywordFallback) {
                    if (matchedArticles.stream().noneMatch(existing -> existing.getId().equals(a.getId()))) {
                        matchedArticles.add(a);
                    }
                }
            }
        }

        // Second fallback: supplement with latest database articles
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

        return matchedArticles;
    }

    /**
     * Calculates the real-time risk score and threat breakdown for a given country.
     */
    public RiskScoreCalculator.RiskResult calculateRisk(String countryQuery) {
        List<NewsArticle> matched = getMatchedArticles(countryQuery);
        return RiskScoreCalculator.compute(matched);
    }

    /**
     * Calculates risk for a pre-filtered list of articles.
     */
    public RiskScoreCalculator.RiskResult calculateRisk(List<NewsArticle> articles) {
        return RiskScoreCalculator.compute(articles);
    }

    /**
     * Synthesizes dynamic regional risk drivers from article titles using Groq AI.
     */
    public List<String> generateRiskDrivers(String country, List<NewsArticle> articles) {
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

        // Direct matched headlines fallback
        List<String> fallbackBullets = new ArrayList<>();
        for (int i = 0; i < Math.min(3, articles.size()); i++) {
            fallbackBullets.add(articles.get(i).getTitle());
        }
        return fallbackBullets;
    }

    public String buildCountryRegexPattern(String country) {
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
            case "russia":
            case "russian":
                return "\\b(russia|russian|moscow|vladivostok)\\b";
            case "south africa":
                return "\\b(south africa|durban|cape town|johannesburg)\\b";
            case "turkey":
            case "turkish":
                return "\\b(turkey|turkish|istanbul|bosphorus)\\b";
            case "saudi arabia":
            case "saudi":
                return "\\b(saudi arabia|saudi|riyadh|jeddah)\\b";
            case "indonesia":
            case "indonesian":
                return "\\b(indonesia|indonesian|jakarta|surabaya)\\b";
            case "malaysia":
            case "malaysian":
                return "\\b(malaysia|malaysian|port klang|penang)\\b";
            case "vietnam":
            case "vietnamese":
                return "\\b(vietnam|vietnamese|ho chi minh|hanoi|haiphong)\\b";
            case "thailand":
            case "thai":
                return "\\b(thailand|thai|bangkok|laem chabang)\\b";
            case "italy":
            case "italian":
                return "\\b(italy|italian|genoa|trieste|rome)\\b";
            case "spain":
            case "spanish":
                return "\\b(spain|spanish|barcelona|valencia|algeciras)\\b";
            default:
                return "\\b" + Pattern.quote(q) + "\\b";
        }
    }
}
