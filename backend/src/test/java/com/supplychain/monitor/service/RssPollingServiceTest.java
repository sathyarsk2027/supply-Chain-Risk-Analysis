package com.supplychain.monitor.service;

import com.supplychain.monitor.model.NewsArticle;
import com.supplychain.monitor.repository.NewsArticleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@SpringBootTest
class RssPollingServiceTest {

    @Autowired
    private RssPollingService rssPollingService;

    @MockBean
    private NewsArticleRepository newsArticleRepository;

    @MockBean
    private NlpClient nlpClient;

    @BeforeEach
    void setUp() {
        rssPollingService.setFeedUrlsConfig("https://www.freightwaves.com/feed,https://www.joc.com/rssfeed");
    }

    @Test
    void shouldPollRssFeedsAndSaveArticles() {
        when(newsArticleRepository.existsByUrl(anyString())).thenReturn(false);
        when(newsArticleRepository.save(any(NewsArticle.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NlpClient.NlpResponse mockNlp = new NlpClient.NlpResponse();
        mockNlp.category = "Logistics";
        mockNlp.companies = List.of("FreightWaves");
        mockNlp.locations = List.of("USA");
        mockNlp.dates = List.of("2026-07-28");

        when(nlpClient.extractEntities(anyString())).thenReturn(mockNlp);
        when(nlpClient.getEmbedding(anyString())).thenReturn(new float[]{0.1f, 0.2f, 0.3f});

        rssPollingService.pollRssFeeds();

        // Verify that articles were saved to the repository
        verify(newsArticleRepository, atLeastOnce()).save(any(NewsArticle.class));
    }

    @Test
    void shouldNotSaveDuplicateArticles() {
        when(newsArticleRepository.existsByUrl(anyString())).thenReturn(true);

        rssPollingService.pollRssFeeds();

        // Should not save any articles if existsByUrl returns true for all
        verify(newsArticleRepository, never()).save(any(NewsArticle.class));
    }

    @Test
    void shouldHandleEmptyFeedUrlsConfigGracefully() {
        rssPollingService.setFeedUrlsConfig("");
        rssPollingService.pollRssFeeds();
        verify(newsArticleRepository, never()).save(any(NewsArticle.class));
    }
}
