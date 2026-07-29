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

    public GroqResponse generateSummary(String query, String context) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            logger.warn("GROQ_API_KEY is not configured. Skipping AI summary generation.");
            return null;
        }

        String userPrompt = "Query: " + query + "\n\nContext articles:\n" + context + "\n\n" +
                "Based on the context articles and the query, analyze the risk. " +
                "Return a JSON object with the following fields:\n" +
                "1. \"summary\": A 2-3 sentence summary of the key supply chain risk, followed by a statement of the likely business impact.\n" +
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
                return null;
            }

            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (choices == null || choices.isEmpty()) {
                logger.warn("Groq API response choices are empty.");
                return null;
            }

            Map<String, Object> firstChoice = choices.get(0);
            Map<String, Object> message = (Map<String, Object>) firstChoice.get("message");
            if (message == null) {
                logger.warn("Groq API response message is null.");
                return null;
            }

            String content = (String) message.get("content");
            if (content == null || content.trim().isEmpty()) {
                logger.warn("Groq API returned empty message content.");
                return null;
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
            return null;
        } catch (Exception e) {
            logger.error("Failed to generate summary from Groq API. Error: {}", e.getMessage(), e);
            return null;
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
