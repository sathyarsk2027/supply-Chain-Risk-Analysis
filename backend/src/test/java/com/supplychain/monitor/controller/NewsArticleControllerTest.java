package com.supplychain.monitor.controller;

import com.supplychain.monitor.model.NewsArticle;
import com.supplychain.monitor.repository.NewsArticleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import org.springframework.boot.test.mock.mockito.MockBean;
import com.supplychain.monitor.service.NlpClient;
import java.time.Instant;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class NewsArticleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private NewsArticleRepository newsArticleRepository;

    @MockBean
    private NlpClient nlpClient;

    @BeforeEach
    void setUp() {
        newsArticleRepository.deleteAll();
    }

    @Test
    void shouldReturnEmptyListWhenNoArticles() throws Exception {
        mockMvc.perform(get("/api/articles")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void shouldReturnArticlesList() throws Exception {
        NewsArticle article = new NewsArticle(
                "Supply Chain Disruptions Peak",
                "https://example.com/article1",
                "Logistics News",
                Instant.now(),
                "Detailed raw content of the article...",
                Instant.now()
        );
        newsArticleRepository.save(article);

        mockMvc.perform(get("/api/articles")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title", is("Supply Chain Disruptions Peak")))
                .andExpect(jsonPath("$[0].url", is("https://example.com/article1")))
                .andExpect(jsonPath("$[0].source", is("Logistics News")))
                .andExpect(jsonPath("$[0].rawContent", is("Detailed raw content of the article...")));
    }

    @Test
    void shouldAllowCorsFromFrontendOrigin() throws Exception {
        mockMvc.perform(get("/api/articles")
                .header("Origin", "http://localhost:5173")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
    }
}
