package com.supplychain.monitor.service;

import com.supplychain.monitor.model.NewsArticle;
import com.supplychain.monitor.repository.NewsArticleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import com.pgvector.PGvector;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@SpringBootTest
class NewsApiClientTest {

    @Autowired
    private NewsApiClient newsApiClient;

    @MockBean
    private NewsArticleRepository newsArticleRepository;

    @MockBean
    private NlpClient nlpClient;

    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() {
        mockServer = MockRestServiceServer.createServer(newsApiClient.getRestTemplate());
        newsApiClient.setApiKey("test-real-api-key");
    }

    @Test
    void shouldFetchAndSaveNewArticles() {
        String jsonResponse = "{\n" +
                "  \"status\": \"ok\",\n" +
                "  \"totalResults\": 1,\n" +
                "  \"articles\": [\n" +
                "    {\n" +
                "      \"source\": {\n" +
                "        \"id\": \"reuters\",\n" +
                "        \"name\": \"Reuters\"\n" +
                "      },\n" +
                "      \"author\": \"Jane Doe\",\n" +
                "      \"title\": \"Supply Chain Delays\",\n" +
                "      \"description\": \"Some description\",\n" +
                "      \"url\": \"https://example.com/delay-news\",\n" +
                "      \"publishedAt\": \"2026-07-13T12:00:00Z\",\n" +
                "      \"content\": \"Full article content [+123 chars]\"\n" +
                "    }\n" +
                "  ]\n" +
                "}";

        mockServer.expect(requestTo(containsString("/everything")))
                .andExpect(requestTo(containsString("q=")))
                .andExpect(requestTo(containsString("domains=")))
                .andExpect(requestTo(containsString("language=en")))
                .andExpect(requestTo(containsString("sortBy=publishedAt")))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(jsonResponse, MediaType.APPLICATION_JSON));

        when(newsArticleRepository.existsByUrl("https://example.com/delay-news")).thenReturn(false);
        when(newsArticleRepository.save(any(NewsArticle.class))).thenAnswer(invocation -> invocation.getArgument(0));

        newsApiClient.collectNews();

        mockServer.verify();
        verify(newsArticleRepository, times(1)).save(any(NewsArticle.class));
    }

    @Test
    void shouldNotSaveDuplicateArticles() {
        String jsonResponse = "{\n" +
                "  \"status\": \"ok\",\n" +
                "  \"totalResults\": 1,\n" +
                "  \"articles\": [\n" +
                "    {\n" +
                "      \"source\": {\n" +
                "        \"id\": \"bloomberg\",\n" +
                "        \"name\": \"Bloomberg\"\n" +
                "      },\n" +
                "      \"title\": \"Supply Chain Resilient\",\n" +
                "      \"url\": \"https://example.com/resilient-news\",\n" +
                "      \"publishedAt\": \"2026-07-13T12:00:00Z\",\n" +
                "      \"content\": \"Content\"\n" +
                "    }\n" +
                "  ]\n" +
                "}";

        mockServer.expect(requestTo(containsString("/everything")))
                .andExpect(requestTo(containsString("q=")))
                .andExpect(requestTo(containsString("domains=")))
                .andExpect(requestTo(containsString("language=en")))
                .andExpect(requestTo(containsString("sortBy=publishedAt")))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(jsonResponse, MediaType.APPLICATION_JSON));

        when(newsArticleRepository.existsByUrl("https://example.com/resilient-news")).thenReturn(true);

        newsApiClient.collectNews();

        mockServer.verify();
        verify(newsArticleRepository, never()).save(any(NewsArticle.class));
    }

    @Test
    void shouldEnrichArticleWithNlpResult() {
        String jsonResponse = "{\n" +
                "  \"status\": \"ok\",\n" +
                "  \"totalResults\": 1,\n" +
                "  \"articles\": [\n" +
                "    {\n" +
                "      \"source\": {\n" +
                "        \"id\": \"reuters\",\n" +
                "        \"name\": \"Reuters\"\n" +
                "      },\n" +
                "      \"title\": \"Supply Chain Delay\",\n" +
                "      \"url\": \"https://example.com/delay-news\",\n" +
                "      \"publishedAt\": \"2026-07-13T12:00:00Z\",\n" +
                "      \"content\": \"Full article content\"\n" +
                "    }\n" +
                "  ]\n" +
                "}";

        mockServer.expect(requestTo(containsString("/everything")))
                .andExpect(requestTo(containsString("q=")))
                .andExpect(requestTo(containsString("domains=")))
                .andExpect(requestTo(containsString("language=en")))
                .andExpect(requestTo(containsString("sortBy=publishedAt")))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(jsonResponse, MediaType.APPLICATION_JSON));

        when(newsArticleRepository.existsByUrl("https://example.com/delay-news")).thenReturn(false);
        when(newsArticleRepository.save(any(NewsArticle.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NlpClient.NlpResponse mockNlpResponse = new NlpClient.NlpResponse();
        mockNlpResponse.category = "logistics";
        mockNlpResponse.companies.add("Reuters");
        mockNlpResponse.locations.add("Shenzhen");
        mockNlpResponse.dates.add("July 10, 2026");

        when(nlpClient.extractEntities(anyString())).thenReturn(mockNlpResponse);

        float[] mockEmbedding = new float[]{0.1f, 0.2f, 0.3f};
        when(nlpClient.getEmbedding(anyString())).thenReturn(mockEmbedding);

        newsApiClient.collectNews();

        mockServer.verify();
        verify(newsArticleRepository, times(2)).save(argThat(article -> {
            if ("logistics".equals(article.getRiskCategory())) {
                assertNotNull(article.getEntities());
                assertTrue(article.getEntities().contains("Reuters"));
                assertTrue(article.getEntities().contains("Shenzhen"));
                assertTrue(article.getEntities().contains("July 10, 2026"));
                assertNotNull(article.getEmbedding());
                assertTrue(article.getEmbedding().toArray().length == 3);
            }
            return true;
        }));
    }
}
