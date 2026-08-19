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
    private GroqResponse generateSimulatedSummary(String query) {
        String lowerQuery = query.toLowerCase();
        String summary;
        int score = 78;

        if (lowerQuery.contains("semiconductor") || lowerQuery.contains("tariff")) {
            summary = "Executive Risk Assessment (Simulated): The implementation of semiconductor tariffs significantly threatens downstream manufacturing, particularly in the automotive and consumer electronics sectors. Reduced access to critical microchips will likely force assembly lines to idle, drastically reducing quarterly output. This geopolitical friction increases component costs and disrupts established just-in-time inventory models. Organizations must immediately accelerate localized sourcing strategies, secure long-term semiconductor contracts, and stockpile critical components to insulate against impending price shocks.";
            score = 82;
        } else if (lowerQuery.contains("panama") || lowerQuery.contains("drought")) {
            summary = "Executive Risk Assessment (Simulated): Severe drought conditions in the Panama Canal are drastically reducing daily transit slots and forcing vessels to operate at reduced drafts. This climatic disruption creates a massive bottleneck for US East Coast and Gulf logistics, significantly delaying containerized freight and bulk commodities. The resulting congestion forces carriers to either wait in costly queues or reroute around the Cape of Good Hope, adding weeks to transit times. Supply chain leaders should rapidly shift import volumes to US West Coast ports and utilize intermodal rail networks to bypass the canal constraint.";
            score = 88;
        } else if (lowerQuery.contains("red sea") || lowerQuery.contains("rerout")) {
            summary = "Executive Risk Assessment (Simulated): Geopolitical instability in the Red Sea has forced major ocean carriers to suspend Suez Canal transits, rerouting vessels around the southern tip of Africa. This diversion absorbs massive amounts of global shipping capacity, leading to severe container shortages and skyrocketing spot freight rates. European and East Coast markets face immediate inventory stockouts due to the extended 10-14 day transit delays. Strategic procurement teams must increase safety stock levels, lock in extended ocean freight contracts, and explore expedited air freight for high-margin goods.";
            score = 92;
        } else if (lowerQuery.contains("strike") || lowerQuery.contains("port")) {
            summary = "Executive Risk Assessment (Simulated): Imminent labor strikes at key commercial ports pose a catastrophic risk to regional import/export liquidity. A complete work stoppage will immediately halt container handling, paralyzing the flow of retail goods and critical industrial components just ahead of peak season. The resulting backlog could take months to clear even after a resolution is reached, inflicting massive demurrage costs and lost sales. Supply chains must aggressively front-load shipments, divert inbound cargo to unaffected regional ports, and optimize warehouse space for immediate safety stock.";
            score = 85;
        } else {
            summary = "Executive Risk Assessment (Simulated): Based on contextual data analysis, '" + query + "' presents a severe risk to global supply chain continuity and operational stability. The current scenario highlights cascading disruptions where initial delays at key transit points trigger widespread logistical congestion and port backlogs. Consequently, organizations operating within these affected trade lanes can expect significant volatility in raw material availability and skyrocketing transit rates. Immediate action to secure alternative routing, engage secondary suppliers, and increase on-hand buffer stock is critical to surviving this bottleneck.";
            score = 75;
        }

        return new GroqResponse(summary, score);
    }

    public GroqResponse generateSummary(String query, String context) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            logger.warn("GROQ_API_KEY is not configured. Using fallback AI summary generation.");
            return generateSimulatedSummary(query);
        }

        String userPrompt = "Query: " + query + "\n\nContext articles:\n" + context + "\n\n" +
                "Based on the context articles and the query, perform a deep analysis of the risk. " +
                "Return a JSON object with the following fields:\n" +
                "1. \"summary\": A detailed, comprehensive 4-6 sentence executive summary explaining the current supply chain scenario related to the query. It must provide deep context, underlying risk factors, and a clear statement of the potential business impact.\n" +
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
                return generateSimulatedSummary(query);
            }

            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (choices == null || choices.isEmpty()) {
                logger.warn("Groq API response choices are empty.");
                return generateSimulatedSummary(query);
            }

            Map<String, Object> firstChoice = choices.get(0);
            Map<String, Object> message = (Map<String, Object>) firstChoice.get("message");
            if (message == null) {
                logger.warn("Groq API response message is null.");
                return generateSimulatedSummary(query);
            }

            String content = (String) message.get("content");
            if (content == null || content.trim().isEmpty()) {
                logger.warn("Groq API returned empty message content.");
                return generateSimulatedSummary(query);
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
            return generateSimulatedSummary(query);
        } catch (Exception e) {
            logger.error("Failed to generate summary from Groq API. Error: {}", e.getMessage(), e);
            return generateSimulatedSummary(query);
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
