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

    // Authentic regional choke point & strategic vulnerability knowledge map
    private static final Map<String, List<String>> STRATEGIC_CHOKE_POINTS = Map.ofEntries(
        Map.entry("germany", List.of(
            "Rhine River navigability & Kaub gauge draft restrictions directly constraining inland chemical and bulk container barge freight.",
            "Port of Hamburg and Bremerhaven rail transfer interfaces managing container drayage dwell times and intermodal modal shift.",
            "Automotive and industrial manufacturing clusters navigating cross-border European supplier delivery schedules and energy input costs."
        )),
        Map.entry("india", List.of(
            "JNPT (Nhava Sheva) and Mundra port container yard turnarounds navigating seasonal weather variance and peak dwell times.",
            "Western Dedicated Freight Corridor (DFC) rail feeder lines absorbing intermodal freight diversion from highway corridors.",
            "Monsoon seasonal disruptions impacting agricultural cargo flows and secondary tier-2 manufacturing logistics arteries."
        )),
        Map.entry("united states", List.of(
            "San Pedro Bay (Los Angeles / Long Beach) vessel queuing and inland Southern California warehouse dwell capacity.",
            "East and Gulf Coast marine terminals managing container volume surges and chassis availability bottlenecks.",
            "Midwest Class I rail interchange gateways facing localized weather delays and intermodal velocity constraints."
        )),
        Map.entry("china", List.of(
            "Ningbo-Zhoushan and Shanghai Yangshan deepwater berths managing container vessel berth wait times and export feeder loops.",
            "Taiwan Strait and South China Sea maritime transit lanes subject to geopolitical surveillance and naval lane advisories.",
            "Pearl River Delta and Yangtze River manufacturing clusters coordinating inland factory-to-port drayage schedules."
        )),
        Map.entry("singapore", List.of(
            "Strait of Malacca and Singapore Strait high vessel density requiring continuous maritime traffic coordination.",
            "Pasir Panjang and Tuas Mega Port automated container berth operations managing transshipment transfer dwell times.",
            "Regional Southeast Asian feeder vessel connections buffering schedule reliability slips from primary East-West loops."
        )),
        Map.entry("netherlands", List.of(
            "Port of Rotterdam Maasvlakte deep-sea container terminals managing inland barge transfer slot bottlenecks.",
            "Rhine-Meuse-Scheldt river delta network navigating water level changes impacting low-emission barge transport.",
            "Schiphol air cargo logistics hub facing European flight path environmental slots and freight forwarding capacity limits."
        )),
        Map.entry("egypt", List.of(
            "Suez Canal convoy scheduling and vessel booking slot adjustments following Bab el-Mandeb maritime reroutings.",
            "Port Said and Ain Sokhna container hubs managing regional feeder transshipment cargo dwelling.",
            "Overland transit and cross-Sinai logistics routes subject to regional geopolitical security buffer zones."
        )),
        Map.entry("brazil", List.of(
            "Port of Santos agricultural export terminals facing seasonal grain harvest vessel lineups and terminal wait times.",
            "BR-163 and southern agricultural highway freight corridors vulnerable to seasonal rainfall and unpaved transit delays.",
            "Paranaguá and Itajaí container handling facilities balancing refrigerated beef and poultry export reefer plug capacity."
        )),
        Map.entry("united kingdom", List.of(
            "Port of Felixstowe and Southampton container terminals managing inland rail freight connection availability.",
            "Dover-Calais Channel freight corridor truck customs inspection dwell and TAP congestion protocols.",
            "M25 London orbital corridor and Midlands golden logistics triangle warehouse fulfillment labor throughput."
        )),
        Map.entry("france", List.of(
            "Port of Le Havre and Marseille-Fos marine terminals sensitive to national transport union industrial action.",
            "Seine and Rhône river container barge navigation coordinating lock maintenance and draft depth variations.",
            "SNCF freight rail corridors subject to intermodal chassis supply constraints and regional dispatch priorities."
        )),
        Map.entry("japan", List.of(
            "Tokyo Bay, Yokohama, and Kobe container terminals balancing strict seismic berthing protocols and vessel turnarounds.",
            "Kanmon Strait and domestic coastal maritime shipping routes sensitive to severe Pacific typhoon weather alerts.",
            "Advanced semiconductor and precision robotics component supply chains vulnerable to upstream rare gas and wafer import delays."
        )),
        Map.entry("south korea", List.of(
            "Busan New Port transshipment container berths operating near peak capacity for Northeast Asia feeder transits.",
            "Gyeongbu logistics corridor and Incheon International Airport air freight hub handling high-value semiconductor exports.",
            "Ulsan petrochemical and automotive export piers subject to global merchant fleet car-carrier availability."
        )),
        Map.entry("canada", List.of(
            "Port of Vancouver Fraser Canyon rail corridor (CN/CPKC) vulnerable to severe winter freeze, mudslides, and wildfire detours.",
            "Port of Prince Rupert northern Pacific container gateway managing intermodal rail transit times to Chicago.",
            "St. Lawrence Seaway winter freeze navigation restrictions and seasonal Great Lakes lock closures."
        )),
        Map.entry("mexico", List.of(
            "Laredo-Nuevo Laredo and Otay Mesa international border commercial truck customs processing dwell times.",
            "Port of Manzanillo and Lázaro Cárdenas Pacific terminals absorbing heavy Asian import container volumes.",
            "Bajío and Monterrey manufacturing corridors managing domestic freight security and cross-border rail connections."
        )),
        Map.entry("australia", List.of(
            "Pilbara iron ore and LNG bulk ports (Port Hedland, Dampier) exposed to seasonal Southern Hemisphere cyclone closures.",
            "Port of Melbourne and Port Botany (Sydney) stevedoring container terminal enterprise bargaining and dwell times.",
            "Trans-Australian east-west rail and Stuart Highway supply lines vulnerable to extreme heat and localized flash flooding."
        )),
        Map.entry("united arab emirates", List.of(
            "Jebel Ali Port (DP World) Middle East regional container transshipment hub handling high-volume transshipment dwell.",
            "Strait of Hormuz maritime transit corridor subject to regional tanker security advisories and insurance premiums.",
            "Dubai and Abu Dhabi multi-modal sea-air transit corridors managing tight turnaround schedules for Eurasian freight."
        )),
        Map.entry("saudi arabia", List.of(
            "Jeddah Islamic Port and King Abdullah Port navigating Red Sea maritime reroutings and transshipment container diversions.",
            "Dammam King Abdul Aziz Port Arabian Gulf container berths coordinating overland rail link to Riyadh dry port.",
            "Yanbu industrial port crude and petrochemical export facilities operating under strict maritime safety perimeters."
        )),
        Map.entry("south africa", List.of(
            "Port of Durban container terminals addressing Transnet gantry crane equipment reliability and truck staging backlogs.",
            "Cape Town fruit and agricultural export berths subject to persistent high-wind berth stoppages.",
            "Richards Bay coal rail terminal corridor navigating locomotives availability and track infrastructure maintenance."
        )),
        Map.entry("vietnam", List.of(
            "Cai Mep-Thi Vai deepwater container terminal complex handling trans-Pacific direct calls and feeder barge transfers.",
            "Hai Phong and Lach Huyen northern container terminals supporting high-volume electronics assembly export corridors.",
            "Ho Chi Minh City urban expressway access to Cat Lai port managing heavy container truck traffic and gate queues."
        )),
        Map.entry("turkey", List.of(
            "Bosphorus and Dardanelles Straits maritime pilotage bottlenecks and safety transit slot restrictions between Black Sea and Mediterranean.",
            "Kapikule Bulgarian border commercial truck crossing experiencing multi-kilometer export queues into the European Union.",
            "Port of Ambarli and Mersin container terminals managing regional Eastern Mediterranean trade reroutings."
        )),
        Map.entry("indonesia", List.of(
            "Tanjung Priok (Jakarta) container terminal managing inland toll road drayage queues and customs clearance dwell.",
            "Inter-island archipelago feeder shipping lanes susceptible to Java Sea and Malacca Strait monsoonal swells.",
            "Sunda and Lombok Straits accommodating deep-draft bulk carriers avoiding busy regional straits."
        )),
        Map.entry("malaysia", List.of(
            "Port Klang (Northport and Westports) container berths managing peak transshipment transfer dwell times.",
            "Port of Tanjung Pelepas (PTP) coordinating mega container ship vessel calls alongside Singapore Strait feeder loops.",
            "Penang electrical and electronics (E&E) export cluster dependent on timely Penang International Airport air cargo capacity."
        )),
        Map.entry("thailand", List.of(
            "Laem Chabang Port deep seaport container terminals managing automotive and consumer goods export lineups.",
            "Eastern Economic Corridor (EEC) highway and rail freight linkages between Rayong manufacturing hubs and the coast.",
            "Bangkok Port (Klong Toey) shallow-draft river barge traffic coordinating seasonal flood runoff in Chao Phraya basin."
        )),
        Map.entry("italy", List.of(
            "Port of Genoa and La Spezia Ligurian terminals managing trans-Alpine rail freight transfers through the Gotthard and Simplon axes.",
            "Brenner Pass highway truck transit capacity limits and Austrian environmental sectoral bans on alpine road freight.",
            "Port of Trieste Adriatic gateway managing intermodal container block trains into Central and Eastern Europe."
        )),
        Map.entry("spain", List.of(
            "Port of Algeciras Strait of Gibraltar container hub managing high-density transshipment vessel connections.",
            "Port of Valencia container terminals absorbing diverted Mediterranean shipping loops and yard density pressures.",
            "Pyrenees rail freight gauge exchange (standard European vs Iberian broad gauge) causing border transfer delays."
        )),
        Map.entry("russia", List.of(
            "Trans-Siberian rail freight corridor from Vladivostok and Vostochny facing container car shortages and intermodal backlog.",
            "Novorossiysk Black Sea grain and bulk terminal operations navigating maritime security exclusions and insurance sanctions.",
            "St. Petersburg Baltic Sea container volume restructuring toward non-European commercial routes."
        ))
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
     * Uses regex pattern matching on title, entities, and content, with keyword fallback.
     * Strictly avoids padding with unrelated global articles so countries remain distinct.
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

        // Supplementary keyword fallback if pattern returned few direct matches
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

        // Deduplicate and sort by most recent published date
        return matchedArticles.stream()
                .sorted(Comparator.comparing(NewsArticle::getPublishedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
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
     * Synthesizes authentic, country-grounded risk drivers & regional choke points.
     * Combines matched real-time article headlines with authentic regional strategic choke points.
     * Never emits generic boilerplate.
     */
    public List<String> generateRiskDrivers(String country, List<NewsArticle> articles) {
        if (articles == null || articles.isEmpty()) {
            return List.of("No active disruption news recorded for " + country + ".");
        }

        String normCountry = country.toLowerCase().trim();
        List<String> knownChokePoints = STRATEGIC_CHOKE_POINTS.getOrDefault(normCountry, Collections.emptyList());

        // Attempt Groq synthesis if client and API key are configured
        if (groqClient != null && groqClient.getApiKey() != null && !groqClient.getApiKey().trim().isEmpty()) {
            String headlinesContext = articles.stream()
                    .limit(6)
                    .map(a -> "- " + a.getTitle())
                    .collect(Collectors.joining("\n"));

            try {
                GroqClient.GroqResponse groqResp = groqClient.generateSummary(
                        "Supply chain choke points and active disruption drivers for " + country,
                        "Real matched news articles for " + country + ":\n" + headlinesContext
                );

                if (groqResp != null && groqResp.getSummary() != null && !groqResp.getSummary().trim().isEmpty()) {
                    String summaryStr = groqResp.getSummary().trim();
                    // Split by lines or bullet points
                    List<String> parsedBullets = Arrays.stream(summaryStr.split("\n"))
                            .map(line -> line.replaceAll("^[•\\-*\\d.]+\\s*", "").trim())
                            .filter(line -> line.length() > 20 && !line.toLowerCase().contains("based on current world news"))
                            .limit(3)
                            .collect(Collectors.toList());

                    if (parsedBullets.size() >= 2) {
                        return parsedBullets;
                    }
                }
            } catch (Exception e) {
                logger.warn("Groq risk driver synthesis failed for {}: {}", country, e.getMessage());
            }
        }

        // Direct grounded synthesis: Pair actual matched breaking headlines with authentic strategic choke points
        List<String> dynamicDrivers = new ArrayList<>();

        // Bullet 1 & 2: Real-time matched news events
        for (int i = 0; i < Math.min(2, articles.size()); i++) {
            NewsArticle art = articles.get(i);
            String title = art.getTitle() != null ? art.getTitle().trim() : "";
            if (!title.isEmpty()) {
                String cat = art.getRiskCategory() != null ? "[" + art.getRiskCategory() + "] " : "";
                dynamicDrivers.add("Active Disruption: " + cat + title);
            }
        }

        // Bullet 3 (or backfill): Grounded regional choke points for this specific country
        if (!knownChokePoints.isEmpty()) {
            for (String cp : knownChokePoints) {
                if (dynamicDrivers.size() >= 3) break;
                if (!dynamicDrivers.contains(cp)) {
                    dynamicDrivers.add("Regional Choke Point: " + cp);
                }
            }
        }

        // Fallback to remaining articles if any slot remains
        if (dynamicDrivers.size() < 3) {
            for (int i = 2; i < articles.size() && dynamicDrivers.size() < 3; i++) {
                String title = articles.get(i).getTitle();
                if (title != null && !title.trim().isEmpty()) {
                    dynamicDrivers.add("Observed Event: " + title.trim());
                }
            }
        }

        return dynamicDrivers;
    }

    public String buildCountryRegexPattern(String country) {
        String q = country.toLowerCase().trim();
        switch (q) {
            case "germany":
            case "german":
                return "\\b(germany|german|hamburg|rhine|bremerhaven|berlin|frankfurt|munich|duisburg|lufthansa cargo|deutsche bahn|db cargo|bdi|autobahn|stuttgart|wilhelmshaven|cologne)\\b";
            case "egypt":
            case "egyptian":
                return "\\b(egypt|egyptian|suez|suez canal|cairo|sinai|port said|alexandria|ain sokhna|red sea)\\b";
            case "united states":
            case "usa":
            case "us":
            case "america":
                return "\\b(united states|usa|us|u\\.s\\.|america|american|los angeles|long beach|california|baltimore|new york|houston|savannah|chicago|norfolk|charleston|oakland|seattle)\\b";
            case "united kingdom":
            case "uk":
            case "britain":
            case "england":
                return "\\b(united kingdom|uk|u\\.k\\.|britain|british|felixstowe|dover|london|england|southampton|liverpool|heathrow|thames gateway|grangemouth)\\b";
            case "netherlands":
            case "holland":
            case "dutch":
                return "\\b(netherlands|dutch|rotterdam|holland|amsterdam|schiphol|maasvlakte|eindhoven|zeeland)\\b";
            case "france":
            case "french":
                return "\\b(france|french|le havre|marseille|paris|dunkirk|calais|rouen|fos-sur-mer|sncf)\\b";
            case "brazil":
            case "brazilian":
                return "\\b(brazil|brazilian|santos|paranagu[aá]|rio de janeiro|sao paulo|itapoa|rio grande|suape|itajai)\\b";
            case "south korea":
            case "korea":
                return "\\b(korea|korean|busan|incheon|seoul|ulsan|gwangyang|pyeongtaek)\\b";
            case "uae":
            case "united arab emirates":
            case "dubai":
                return "\\b(uae|united arab emirates|dubai|abu dhabi|jebel ali|fujairah|khorfakkan|sharjah)\\b";
            case "china":
            case "chinese":
                return "\\b(china|chinese|shanghai|shenzhen|ningbo|beijing|guangzhou|yantian|hong kong|qingdao|tianjin|xiamen|pearl river|yangtze)\\b";
            case "singapore":
                return "\\b(singapore|pasir panjang|tuas|malacca|jurong|singapore port|psa)\\b";
            case "canada":
            case "canadian":
                return "\\b(canada|canadian|vancouver|montreal|prince rupert|halifax|toronto|calgary|cn rail|cp rail|cpkc|fraser)\\b";
            case "mexico":
            case "mexican":
                return "\\b(mexico|mexican|manzanillo|laredo|monterrey|lazaro cardenas|veracruz|tijuana|altamira|bajio|guadalajara)\\b";
            case "japan":
            case "japanese":
                return "\\b(japan|japanese|tokyo|yokohama|kobe|nagoya|osaka|chiba|fukuoka|kanmon)\\b";
            case "australia":
            case "australian":
                return "\\b(australia|australian|sydney|melbourne|brisbane|fremantle|pilbara|port hedland|dampier|adelaide|botany)\\b";
            case "india":
            case "indian":
                return "\\b(india|indian|mumbai|mundra|nhava sheva|delhi|gujarat|chennai|bengaluru|kolkata|cochin|jnpt|pipavav|hazira|visakhapatnam|kandla)\\b";
            case "russia":
            case "russian":
                return "\\b(russia|russian|moscow|vladivostok|st petersburg|novorossiysk|vostochny|trans-siberian|murmansk)\\b";
            case "south africa":
                return "\\b(south africa|south african|durban|cape town|johannesburg|transnet|richards bay|cape of good hope|coega|port elizabeth)\\b";
            case "turkey":
            case "turkish":
                return "\\b(turkey|turkish|t[uü]rkiye|istanbul|bosphorus|dardanelles|izmir|mersin|ambarli|kapikule)\\b";
            case "saudi arabia":
            case "saudi":
                return "\\b(saudi|saudi arabia|riyadh|jeddah|king abdullah port|dammam|jubail|yanbu)\\b";
            case "indonesia":
            case "indonesian":
                return "\\b(indonesia|indonesian|jakarta|tanjung priok|surabaya|semarang|sunda strait|lombok strait|belawan)\\b";
            case "malaysia":
            case "malaysian":
                return "\\b(malaysia|malaysian|port klang|penang|tanjung pelepas|johor|westports|northport)\\b";
            case "vietnam":
            case "vietnamese":
                return "\\b(vietnam|vietnamese|ho chi minh|hanoi|haiphong|cai mep|da nang|cat lai|saigon)\\b";
            case "thailand":
            case "thai":
                return "\\b(thailand|thai|bangkok|laem chabang|chao phraya|rayong|eastern economic corridor)\\b";
            case "italy":
            case "italian":
                return "\\b(italy|italian|genoa|trieste|rome|gioia tauro|milan|la spezia|livorno|ravenna|brenner pass)\\b";
            case "spain":
            case "spanish":
                return "\\b(spain|spanish|barcelona|valencia|algeciras|bilbao|madrid|las palmas|cartagena)\\b";
            default:
                return "\\b" + Pattern.quote(q) + "\\b";
        }
    }
}
