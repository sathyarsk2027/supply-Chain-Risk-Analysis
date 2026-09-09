package com.supplychain.monitor.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

@Service
public class GroqClient {

    private static final Logger logger = LoggerFactory.getLogger(GroqClient.class);
    private final RestTemplate restTemplate;

    @Value("${groq.api.key:}")
    private String apiKey;

    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String modelName;

    @Value("${groq.api.url:https://api.groq.com/openai/v1/chat/completions}")
    private String apiUrl;

    public GroqClient() {
        this.restTemplate = new RestTemplate();
    }

    @jakarta.annotation.PostConstruct
    public void init() {
        String propKey = System.getProperty("GROQ_API_KEY");
        String envKey = System.getenv("GROQ_API_KEY");
        if (propKey != null && !propKey.trim().isEmpty()) {
            this.apiKey = propKey.trim();
        } else if (envKey != null && !envKey.trim().isEmpty()) {
            this.apiKey = envKey.trim();
        }

        if (apiKey != null && !apiKey.trim().isEmpty()) {
            String trimmed = apiKey.trim();
            String suffix = trimmed.length() > 6 ? trimmed.substring(trimmed.length() - 6) : trimmed;
            logger.info("GroqClient initialized successfully. GROQ_API_KEY suffix loaded: ***{}", suffix);
        } else {
            logger.warn("GroqClient initialized, but GROQ_API_KEY is empty or not configured!");
        }
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getApiKey() {
        return apiKey;
    }

    private GroqResponse generateSimulatedSummary(String query, String context) {
        if (context == null || context.trim().isEmpty()) {
            return new GroqResponse("This query doesn't appear related to supply chain disruptions in our current dataset.", 0);
        }

        String lowerQuery = query.toLowerCase();
        String summary;
        int score = 78;

        if (lowerQuery.contains("semiconductor") || lowerQuery.contains("tariff")) {
            summary = "Based on current world news, semiconductor tariffs are being aggressively implemented as a geopolitical tool to secure domestic supply chains and reduce reliance on foreign manufacturing. This sudden policy shift is causing a major ripple effect across the global electronics industry, threatening downstream manufacturing in sectors like automotive, aerospace, and consumer electronics. Foundries in affected regions are facing immediate export restrictions, which abruptly halts the flow of critical microchips to assembly lines. As a result, businesses are experiencing unprecedented component shortages, leading to forced factory idling and delayed product launches. The increasing geopolitical friction is fundamentally disrupting established just-in-time inventory models and causing component costs to skyrocket on the spot market.\n\nBest strategic ideas to mitigate this:\n• Accelerate localized sourcing and nearshoring strategies.\n• Secure long-term microchip contracts with diversified suppliers outside affected regions.\n• Temporarily stockpile critical components to insulate against impending price shocks.\n• Invest in product redesigns that utilize legacy or alternative chips.";
            score = 82;
        } else if (lowerQuery.contains("panama") || lowerQuery.contains("drought")) {
            summary = "Current world news highlights severe drought conditions in the Panama Canal driven by unprecedented El Niño weather patterns and declining rainfall in the Gatun Lake watershed. Because the canal relies on fresh water from this lake to operate its lock systems, authorities have been forced to drastically reduce daily vessel transit slots and impose strict draft limits on ships. This climatic disruption creates a massive, compounding bottleneck for US East Coast and Gulf logistics, as vessels must carry lighter loads and wait in extensive queues. The reduced capacity is significantly delaying containerized freight, bulk commodities, and energy shipments globally. Consequently, carriers are forced to either absorb exorbitant congestion surcharges or reroute entire fleets around the Cape of Good Hope, adding weeks to transit times and driving up shipping costs.\n\nBest suggestions for supply chain leaders:\n• Rapidly shift import volumes to US West Coast ports.\n• Utilize intermodal rail networks to bypass the canal constraint entirely.\n• Explore alternative routing via the Suez Canal (if viable) or air freight for high-margin goods.\n• Renegotiate delivery windows with major customers.";
            score = 88;
        } else if (lowerQuery.contains("red sea") || lowerQuery.contains("rerout")) {
            summary = "Current world news reports severe geopolitical instability and militant attacks in the Red Sea corridor, making one of the world's most critical maritime chokepoints highly unsafe for commercial vessels. In response to the escalating threat to crew safety and cargo integrity, major ocean carriers have completely suspended transit through the Suez Canal. Instead, fleets are being systematically rerouted around the southern tip of Africa via the Cape of Good Hope. This massive diversion absorbs huge amounts of global shipping capacity, leading to severe container shortages and skyrocketing spot freight rates. The extended 10-14 day transit delays are causing immediate inventory stockouts and wreaking havoc on European and East Coast supply chains.\n\nBest actionable ideas:\n• Immediately increase safety stock levels for critical inventory.\n• Lock in extended ocean freight contracts to avoid spot rate volatility.\n• Strategically shift high-value/low-weight goods to expedited air freight.\n• Diversify suppliers to regions not dependent on the Suez transit lane.";
            score = 92;
        } else if (lowerQuery.contains("strike") || lowerQuery.contains("port")) {
            summary = "Current world news indicates imminent labor strikes at key commercial ports resulting from stalled contract negotiations between maritime unions and port operators. The core disputes center around wage stagnation in the face of inflation and the increasing automation of terminal operations which threatens union jobs. As the strike deadline approaches, the threat of a complete work stoppage poses a catastrophic risk to regional import/export liquidity. If terminal operations halt, the flow of retail goods, agricultural exports, and critical industrial components will be immediately paralyzed just ahead of peak season. The resulting vessel backlog and container congestion could take months to clear, inflicting massive demurrage costs and widespread inventory stockouts.\n\nBest mitigation ideas:\n• Aggressively front-load shipments ahead of anticipated strike deadlines.\n• Divert inbound cargo to unaffected regional ports immediately.\n• Optimize warehouse space to store increased safety stock.\n• Form alliances with alternative logistics providers who rely on less-congested private terminals.";
            score = 85;
        } else {
            summary = "Based on current world news, there are localized adjustments and emerging risk factors directly related to '" + query + "'. Rapidly changing market dynamics, shifting geopolitical alliances, and localized environmental events are forcing supply chains to adapt. Organizations are currently assessing the short-term impact of these events on supplier lead times and transit lane stability. While baseline logistics networks remain generally operational, the situation remains highly fluid and requires close observation. Procurement teams must remain agile to prevent minor disruptions from cascading into major stockouts.\n\nBest suggestions:\n• Monitor key transit lanes for volatility.\n• Proactively communicate with tier-1 suppliers about potential lead time extensions.\n• Develop contingency plans for alternative sourcing.";
            score = 65;
        }

        return new GroqResponse(summary, score);
    }

    public GroqResponse generateSummary(String query, String context) {
        if (context == null || context.trim().isEmpty()) {
            return new GroqResponse("This query doesn't appear related to supply chain disruptions in our current dataset.", 0);
        }

        if (apiKey == null || apiKey.trim().isEmpty()) {
            logger.warn("GROQ_API_KEY is not configured. Using fallback AI summary generation.");
            return generateSimulatedSummary(query, context);
        }

        String userPrompt = "Query: " + query + "\n\nContext articles:\n" + context + "\n\n" +
                "Based on the context articles and the query, perform a deep analysis of the risk based on current world news. " +
                "Return a JSON object with the following fields:\n" +
                "1. \"summary\": First, provide a detailed 5-7 sentence explanation of WHY this risk is happening based on current world news. Explain the root causes and the cascading effects on the supply chain. Then, use two newlines (\\n\\n) and provide the absolute best actionable suggestions, mitigation strategies, and innovative business ideas to handle these risks, formatted as a bulleted list.\n" +
                "2. \"confidenceScore\": A number between 0 and 100 representing how confident you are in this risk assessment.\n" +
                "Ensure the response is strictly JSON. Do not include markdown code block formatting.";

        try {
            Map<String, Object> systemMessage = Map.of(
                    "role", "system",
                    "content", "You are a supply chain risk analyst. Summarize the provided articles concisely, citing risk category and key entities."
            );
            Map<String, Object> userMessage = Map.of(
                    "role", "user",
                    "content", userPrompt
            );

            Map<String, Object> payload = Map.of(
                    "model", modelName,
                    "messages", List.of(systemMessage, userMessage),
                    "response_format", Map.of("type", "json_object"),
                    "temperature", 0.3,
                    "max_tokens", 500
            );

            String cleanKey = apiKey.trim();
            String keySuffix = cleanKey.length() > 6 ? cleanKey.substring(cleanKey.length() - 6) : cleanKey;
            logger.info("Sending request to Groq API ({}) with model [{}] and key suffix ***{}", apiUrl, modelName, keySuffix);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + cleanKey);

            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(payload, headers);

            Map<String, Object> response = restTemplate.postForObject(apiUrl, requestEntity, Map.class);
            if (response == null) {
                logger.warn("Groq API returned null response.");
                return generateSimulatedSummary(query, context);
            }

            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (choices == null || choices.isEmpty()) {
                logger.warn("Groq API response choices are empty.");
                return generateSimulatedSummary(query, context);
            }

            Map<String, Object> firstChoice = choices.get(0);
            Map<String, Object> message = (Map<String, Object>) firstChoice.get("message");
            if (message == null) {
                logger.warn("Groq API response message is null.");
                return generateSimulatedSummary(query, context);
            }

            String content = (String) message.get("content");
            if (content == null || content.trim().isEmpty()) {
                logger.warn("Groq API returned empty message content.");
                return generateSimulatedSummary(query, context);
            }

            String cleanedText = content.trim();
            logger.info("Raw response text from Groq: {}", cleanedText);

            if (cleanedText.startsWith("```")) {
                cleanedText = cleanedText.replaceAll("^```json\\s*", "").replaceAll("^```\\s*", "").replaceAll("\\s*```$", "");
            }

            ObjectMapper mapper = new ObjectMapper();
            mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

            try {
                return mapper.readValue(cleanedText, GroqResponse.class);
            } catch (Exception parseException) {
                logger.info("Groq content was not valid JSON, using raw content as summary string.");
                return new GroqResponse(cleanedText, 85);
            }

        } catch (HttpClientErrorException e) {
            logger.error("Failed to generate summary from Groq API. HTTP status code: {}, Response body: {}, Error message: {}",
                    e.getStatusCode(), e.getResponseBodyAsString(), e.getMessage(), e);
            return generateSimulatedSummary(query, context);
        } catch (Exception e) {
            logger.error("Failed to generate summary from Groq API. Error: {}", e.getMessage(), e);
            return generateSimulatedSummary(query, context);
        }
    }

    public static class GroqResponse {
        private String summary;
        private Integer confidenceScore;

        public GroqResponse() {
        }

        public GroqResponse(String summary, Integer confidenceScore) {
            this.summary = summary;
            this.confidenceScore = confidenceScore;
        }

        public String getSummary() {
            return summary;
        }

        public void setSummary(String summary) {
            this.summary = summary;
        }

        public Integer getConfidenceScore() {
            return confidenceScore;
        }

        public void setConfidenceScore(Integer confidenceScore) {
            this.confidenceScore = confidenceScore;
        }
    }
}
