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

    @Value("${nlp.service.url:http://localhost:8000/extract}")
    private String nlpServiceUrl;

    @Value("${nlp.embed.url:http://localhost:8000/embed}")
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
        try {
            ExtractRequest request = new ExtractRequest(text);
            return restTemplate.postForObject(nlpServiceUrl, request, NlpResponse.class);
        } catch (Exception e) {
            logger.warn("Failed to reach NLP service at {}. Error: {}", nlpServiceUrl, e.getMessage());
            return null;
        }
    }

    public float[] getEmbedding(String text) {
        try {
            EmbedRequest request = new EmbedRequest(text);
            EmbedResponse response = restTemplate.postForObject(nlpEmbedUrl, request, EmbedResponse.class);
            return (response != null) ? response.embedding : null;
        } catch (Exception e) {
            logger.warn("Failed to retrieve embedding from NLP service at {}. Error: {}", nlpEmbedUrl, e.getMessage());
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
