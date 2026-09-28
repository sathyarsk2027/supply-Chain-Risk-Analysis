package com.supplychain.monitor.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.*;

class RssPollingServiceTest {

    private RssPollingService rssPollingService;

    @BeforeEach
    void setUp() {
        rssPollingService = new RssPollingService(null, null);
    }

    @Test
    void shouldHandleEmptyFeedUrlsConfigGracefully() {
        rssPollingService.setFeedUrlsConfig("");
        int saved = rssPollingService.pollRssFeedsNow();
        assertEquals(0, saved);
    }

    @Test
    void shouldHandleNullFeedUrlsConfigGracefully() {
        rssPollingService.setFeedUrlsConfig(null);
        int saved = rssPollingService.pollRssFeedsNow();
        assertEquals(0, saved);
    }

    @Test
    void testInferInitialCategory() throws Exception {
        Method method = RssPollingService.class.getDeclaredMethod("inferInitialCategory", String.class, String.class);
        method.setAccessible(true);

        String cat1 = (String) method.invoke(rssPollingService, "Port workers strike in Hamburg", "Disruption expected");
        assertEquals("Geopolitical", cat1);

        String cat2 = (String) method.invoke(rssPollingService, "Typhoon halts shipping vessels", "Harbor closed");
        assertEquals("Weather", cat2);

        String cat3 = (String) method.invoke(rssPollingService, "Inflation drives up ocean freight cost", "Market dynamics");
        assertEquals("Market", cat3);

        String cat4 = (String) method.invoke(rssPollingService, "Container terminal operations resume", "Berth operations");
        assertEquals("Logistics", cat4);
    }

    @Test
    void testResolveSourceName() throws Exception {
        Method method = RssPollingService.class.getDeclaredMethod("resolveSourceName", String.class, com.rometools.rome.feed.synd.SyndEntry.class, String.class);
        method.setAccessible(true);

        // Case 1: Title with publisher suffix
        String src1 = (String) method.invoke(rssPollingService, "https://example.com/feed", null, "Major India port expansion underway - The Economic Times");
        assertEquals("The Economic Times", src1);

        // Case 2: Known feed URL
        String src2 = (String) method.invoke(rssPollingService, "https://www.freightwaves.com/feed", null, "Simple Title");
        assertEquals("FreightWaves", src2);

        // Case 3: Unknown feed URL without title dash
        String src3 = (String) method.invoke(rssPollingService, "https://unknown.com/rss", null, "Simple Title");
        assertEquals("Global Disruption Feed", src3);
    }
}
