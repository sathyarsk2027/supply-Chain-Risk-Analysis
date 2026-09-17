package com.supplychain.monitor.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.ArrayList;
import java.util.List;

@Service
public class NlpClient {

    private static final Logger logger = LoggerFactory.getLogger(NlpClient.class);
    private final RestTemplate restTemplate;

    @Value("${nlp.service.extract.url:http://localhost:8000/extract}")
    private String nlpServiceUrl;

    @Value("${nlp.service.embed.url:http://localhost:8000/embed}")
    private String nlpEmbedUrl;

    public NlpClient() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = 
                new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2500); // 2.5s connect timeout
        factory.setReadTimeout(3500);    // 3.5s read timeout
        this.restTemplate = new RestTemplate(factory);
    }

    public void setNlpServiceUrl(String nlpServiceUrl) {
        this.nlpServiceUrl = nlpServiceUrl;
    }

    public RestTemplate getRestTemplate() {
        return restTemplate;
    }

    public NlpResponse extractEntities(String text) {
        int maxRetries = 2;
        int delayMs = 800;
        
        for (int i = 0; i < maxRetries; i++) {
            try {
                ExtractRequest request = new ExtractRequest(text);
                return restTemplate.postForObject(nlpServiceUrl, request, NlpResponse.class);
            } catch (org.springframework.web.client.HttpStatusCodeException e) {
                int status = e.getStatusCode().value();
                if (status == 429 || status == 502 || status == 503 || status == 504) {
                    if (i == maxRetries - 1) {
                        logger.warn("NLP extract service unavailable (HTTP {}) after {} retries.", status, maxRetries);
                        return null;
                    }
                    try {
                        Thread.sleep(delayMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        return null;
                    }
                    delayMs = 1200;
                } else {
                    logger.warn("Failed to reach NLP service at {}. Error: {}", nlpServiceUrl, e.getMessage());
                    return null;
                }
            } catch (Exception e) {
                if (i == maxRetries - 1) {
                    logger.warn("Failed to reach NLP service at {} after {} retries: {}", nlpServiceUrl, maxRetries, e.getMessage());
                    return null;
                }
                try {
                    Thread.sleep(delayMs);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return null;
                }
                delayMs = 1200;
            }
        }
        return null;
    }

    public float[] getEmbedding(String text) {
        // Fast single attempt: If Python NLP service on Render is cold/sleeping,
        // fail fast in 2.5s to prevent search UI hanging, and immediately switch to instant keyword search.
        try {
            EmbedRequest request = new EmbedRequest(text);
            EmbedResponse response = restTemplate.postForObject(nlpEmbedUrl, request, EmbedResponse.class);
            return (response != null) ? response.embedding : null;
        } catch (Exception e) {
            logger.warn("NLP embed service unavailable or timed out at {}. Fast fallback triggered: {}", nlpEmbedUrl, e.getMessage());
            return null;
        }
    }

    public static class ExtractRequest {
        public String text;

        public ExtractRequest() {
        }

        public ExtractRequest(String text) {
            this.text = text;
        }
    }

    public static class NlpResponse {
        public List<String> companies = new ArrayList<>();
        public List<String> locations = new ArrayList<>();
        public List<String> dates = new ArrayList<>();
        public String category;
    }

    public static class EmbedRequest {
        public String text;

        public EmbedRequest() {
        }

        public EmbedRequest(String text) {
            this.text = text;
        }
    }

    public static class EmbedResponse {
        public float[] embedding;
    }
}
