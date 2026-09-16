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
        this.restTemplate = new RestTemplate();
    }

    public void setNlpServiceUrl(String nlpServiceUrl) {
        this.nlpServiceUrl = nlpServiceUrl;
    }

    public RestTemplate getRestTemplate() {
        return restTemplate;
    }

    public NlpResponse extractEntities(String text) {
        int maxRetries = 4;
        int delayMs = 1500;
        
        for (int i = 0; i < maxRetries; i++) {
            try {
                ExtractRequest request = new ExtractRequest(text);
                return restTemplate.postForObject(nlpServiceUrl, request, NlpResponse.class);
            } catch (org.springframework.web.client.HttpStatusCodeException e) {
                if (e.getStatusCode().value() == 429) {
                    if (i == maxRetries - 1) {
                        logger.error("Rate limit exceeded for NLP extract service after {} retries.", maxRetries);
                        return null;
                    }
                    logger.warn("429 Too Many Requests from NLP extract service. Retrying in {} ms...", delayMs);
                    try {
                        Thread.sleep(delayMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        return null;
                    }
                    delayMs *= 2; // Exponential backoff
                } else {
                    logger.warn("Failed to reach NLP service at {}. Error: {}", nlpServiceUrl, e.getMessage());
                    return null;
                }
            } catch (Exception e) {
                logger.warn("Failed to reach NLP service at {}. Error: {}", nlpServiceUrl, e.getMessage());
                return null;
            }
        }
        return null;
    }

    public float[] getEmbedding(String text) throws Exception {
        int maxRetries = 4;
        int delayMs = 1500;
        
        for (int i = 0; i < maxRetries; i++) {
            try {
                EmbedRequest request = new EmbedRequest(text);
                EmbedResponse response = restTemplate.postForObject(nlpEmbedUrl, request, EmbedResponse.class);
                return (response != null) ? response.embedding : null;
            } catch (org.springframework.web.client.HttpStatusCodeException e) {
                if (e.getStatusCode().value() == 429) {
                    if (i == maxRetries - 1) {
                        logger.error("Rate limit exceeded for NLP embed service after {} retries.", maxRetries);
                        throw new Exception("NLP Service Error (" + nlpEmbedUrl + "): 429 Too Many Requests");
                    }
                    logger.warn("429 Too Many Requests from NLP embed service. Retrying in {} ms...", delayMs);
                    try {
                        Thread.sleep(delayMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new Exception("Interrupted during NLP retry backoff");
                    }
                    delayMs *= 2; // Exponential backoff
                } else {
                    logger.error("Failed to retrieve embedding from NLP service at {}. Error: {}", nlpEmbedUrl, e.getMessage());
                    throw new Exception("NLP Service Error (" + nlpEmbedUrl + "): " + e.getMessage());
                }
            } catch (Exception e) {
                logger.error("Failed to retrieve embedding from NLP service at {}. Error: {}", nlpEmbedUrl, e.getMessage());
                throw new Exception("NLP Service Error (" + nlpEmbedUrl + "): " + e.getMessage());
            }
        }
        return null;
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
