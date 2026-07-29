package com.supplychain.monitor.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.List;
import java.util.Map;

@Service
public class GeminiClient {

    private static final Logger logger = LoggerFactory.getLogger(GeminiClient.class);
    private final RestTemplate restTemplate;

    @Value("${GEMINI_API_KEY:}")
    private String apiKey;

    @Value("${gemini.model.name:gemini-1.5-flash}")
    private String modelName;

    public GeminiClient() {
        this.restTemplate = new RestTemplate();
    }

    @jakarta.annotation.PostConstruct
    public void init() {
        System.out.println("GeminiClient init() - RAW ENV GEMINI_API_KEY: " + System.getenv("GEMINI_API_KEY"));
        if (apiKey != null && !apiKey.trim().isEmpty()) {
            String trimmed = apiKey.trim();
            String suffix = trimmed.length() > 6 ? trimmed.substring(trimmed.length() - 6) : trimmed;
            logger.info("GeminiClient initialized successfully. GEMINI_API_KEY suffix loaded: ***{}", suffix);
        } else {
            logger.warn("GeminiClient initialized, but GEMINI_API_KEY is empty or not configured!");
        }
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getApiKey() {
        return apiKey;
    }

    public GeminiResponse generateSummary(String query, String context) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            logger.warn("GEMINI_API_KEY is not configured. Skipping AI summary generation.");
            return null;
        }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + apiKey;

        String prompt = "You are a supply chain risk analyst. You are provided with a query and a set of context articles.\n" +
                "Query: " + query + "\n\n" +
                "Context articles:\n" + context + "\n\n" +
                "Based on the context articles and the query, analyze the risk. " +
                "Return a JSON object with the following fields:\n" +
                "1. \"summary\": A 2-3 sentence summary of the key supply chain risk, followed by a statement of the likely business impact.\n" +
                "2. \"confidenceScore\": A number between 0 and 100 representing how confident you are in this risk assessment based on how many sources agree.\n" +
                "Ensure the response is strictly JSON. Do not include markdown code block formatting (like ```json).";

        try {
            Map<String, Object> textPart = Map.of("text", prompt);
            Map<String, Object> part = Map.of("parts", List.of(textPart));
            Map<String, Object> generationConfig = Map.of("responseMimeType", "application/json");
            
            Map<String, Object> payload = Map.of(
                    "contents", List.of(part),
                    "generationConfig", generationConfig
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(payload, headers);

            Map<String, Object> rawResponse = restTemplate.postForObject(url, requestEntity, Map.class);
            if (rawResponse == null) {
                return null;
            }

            List<Map<String, Object>> candidates = (List<Map<String, Object>>) rawResponse.get("candidates");
            if (candidates == null || candidates.isEmpty()) {
                return null;
            }
            Map<String, Object> firstCandidate = candidates.get(0);
            Map<String, Object> contentMap = (Map<String, Object>) firstCandidate.get("content");
            if (contentMap == null) {
                return null;
            }
            List<Map<String, Object>> parts = (List<Map<String, Object>>) contentMap.get("parts");
            if (parts == null || parts.isEmpty()) {
                return null;
            }
            String text = (String) parts.get(0).get("text");
            if (text == null || text.trim().isEmpty()) {
                logger.warn("Gemini returned empty parts text content.");
                return null;
            }

            String cleanedText = text.trim();
            logger.info("Raw response text from Gemini: {}", cleanedText);
            
            if (cleanedText.startsWith("```")) {
                cleanedText = cleanedText.replaceAll("^```json\\s*", "").replaceAll("\\s*```$", "");
            }

            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            mapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
            return mapper.readValue(cleanedText, GeminiResponse.class);

        } catch (org.springframework.web.client.HttpClientErrorException e) {
            logger.error("Failed to generate summary from Gemini API. HTTP status code: {}, Response body: {}, Error message: {}", 
                    e.getStatusCode(), e.getResponseBodyAsString(), e.getMessage(), e);
            return null;
        } catch (Exception e) {
            logger.error("Failed to generate summary from Gemini API. Error: {}", e.getMessage(), e);
            return null;
        }
    }

    public static class GeminiResponse {
        private String summary;
        private Integer confidenceScore;

        public GeminiResponse() {
        }

        public GeminiResponse(String summary, Integer confidenceScore) {
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
