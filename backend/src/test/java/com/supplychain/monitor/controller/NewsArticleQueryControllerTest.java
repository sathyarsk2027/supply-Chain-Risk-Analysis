package com.supplychain.monitor.controller;

import com.supplychain.monitor.repository.NewsArticleRepository;
import com.supplychain.monitor.service.NlpClient;
import com.supplychain.monitor.service.GroqClient;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class NewsArticleQueryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NewsArticleRepository newsArticleRepository;

    @MockBean
    private NlpClient nlpClient;

    @MockBean
    private GroqClient groqClient;

    @Test
    void shouldReturnBadRequestWhenQueryIsEmpty() throws Exception {
        mockMvc.perform(post("/api/query")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"query\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldSearchArticlesSemanticallyWithAiSummary() throws Exception {
        float[] mockEmbedding = new float[]{0.1f, 0.2f, 0.3f};
        when(nlpClient.getEmbedding(anyString())).thenReturn(mockEmbedding);

        NewsArticleRepository.NewsArticleSearchResult mockResult = new NewsArticleRepository.NewsArticleSearchResult() {
            @Override
            public Long getId() {
                return 1L;
            }

            @Override
            public String getTitle() {
                return "Supply Chain Disruption Peak";
            }

            @Override
            public String getUrl() {
                return "https://example.com/disruption";
            }

            @Override
            public String getSource() {
                return "Logistics News";
            }

            @Override
            public String getRiskCategory() {
                return "Logistics";
            }

            @Override
            public String getRawContent() {
                return "Detailed raw content of the logistics issue.";
            }

            @Override
            public Double getCosineDistance() {
                return 0.15;
            }
        };

        when(newsArticleRepository.findSimilarArticles(any())).thenReturn(List.of(mockResult));

        GroqClient.GroqResponse mockAiResponse = new GroqClient.GroqResponse(
                "The key risk is shipping delays, likely causing shipping disruptions.", 85);
        when(groqClient.generateSummary(anyString(), anyString())).thenReturn(mockAiResponse);

        mockMvc.perform(post("/api/query")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"query\":\"disruption\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.query", is("disruption")))
                .andExpect(jsonPath("$.matches", hasSize(1)))
                .andExpect(jsonPath("$.matches[0].title", is("Supply Chain Disruption Peak")))
                .andExpect(jsonPath("$.matches[0].url", is("https://example.com/disruption")))
                .andExpect(jsonPath("$.matches[0].source", is("Logistics News")))
                .andExpect(jsonPath("$.matches[0].riskCategory", is("Logistics")))
                .andExpect(jsonPath("$.matches[0].score", is(0.85)))
                .andExpect(jsonPath("$.aiSummary.summary", is("The key risk is shipping delays, likely causing shipping disruptions.")))
                .andExpect(jsonPath("$.aiSummary.confidenceScore", is(85)));
    }

    @Test
    void shouldGracefullyRecoverWhenGeminiFails() throws Exception {
        float[] mockEmbedding = new float[]{0.1f, 0.2f, 0.3f};
        when(nlpClient.getEmbedding(anyString())).thenReturn(mockEmbedding);

        NewsArticleRepository.NewsArticleSearchResult mockResult = new NewsArticleRepository.NewsArticleSearchResult() {
            @Override
            public Long getId() {
                return 1L;
            }

            @Override
            public String getTitle() {
                return "Supply Chain Disruption Peak";
            }

            @Override
            public String getUrl() {
                return "https://example.com/disruption";
            }

            @Override
            public String getSource() {
                return "Logistics News";
            }

            @Override
            public String getRiskCategory() {
                return "Logistics";
            }

            @Override
            public String getRawContent() {
                return "Detailed raw content of the logistics issue.";
            }

            @Override
            public Double getCosineDistance() {
                return 0.15;
            }
        };

        when(newsArticleRepository.findSimilarArticles(any())).thenReturn(List.of(mockResult));
        when(groqClient.generateSummary(anyString(), anyString())).thenThrow(new RuntimeException("Groq Service Down"));

        mockMvc.perform(post("/api/query")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"query\":\"disruption\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.query", is("disruption")))
                .andExpect(jsonPath("$.matches", hasSize(1)))
                .andExpect(jsonPath("$.matches[0].title", is("Supply Chain Disruption Peak")))
                .andExpect(jsonPath("$.aiSummary", nullValue()));
    }
}

