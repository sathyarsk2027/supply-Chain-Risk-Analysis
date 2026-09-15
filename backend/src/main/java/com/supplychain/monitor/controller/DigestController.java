package com.supplychain.monitor.controller;

import com.supplychain.monitor.service.DailyDigestService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * REST controller for the Daily Digest feature.
 *
 * Endpoints:
 *   POST /api/digest/trigger   — External cron trigger (cron-job.org hits this at 6 AM IST)
 *   POST /api/digest/send-now  — Manual test trigger (dev/viva demos)
 */
@RestController
@RequestMapping("/api/digest")
public class DigestController {

    private static final Logger logger = LoggerFactory.getLogger(DigestController.class);

    private final DailyDigestService dailyDigestService;

    @Value("${digest.trigger.secret:}")
    private String triggerSecret;

    public DigestController(DailyDigestService dailyDigestService) {
        this.dailyDigestService = dailyDigestService;
    }

    /**
     * External cron trigger — called by cron-job.org at 6:00 AM IST daily.
     * If DIGEST_TRIGGER_SECRET is configured, requires matching Authorization header.
     */
    @PostMapping("/trigger")
    public ResponseEntity<?> triggerDigest(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        // Security check
        if (triggerSecret != null && !triggerSecret.trim().isEmpty()) {
            String expectedAuth = "Bearer " + triggerSecret.trim();
            if (authHeader == null || !authHeader.equals(expectedAuth)) {
                logger.warn("Unauthorized digest trigger attempt.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Unauthorized", "message", "Invalid or missing Authorization header."));
            }
        }

        logger.info("Digest trigger endpoint called (external cron). Firing asynchronous process to avoid 30s timeout.");
        
        // Run the heavy AI and SMTP tasks in the background
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                dailyDigestService.generateAndSendDigest(false);
            } catch (Exception e) {
                logger.error("Background digest trigger failed: {}", e.getMessage(), e);
            }
        });

        // Return immediately so cron-job.org doesn't timeout
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(Map.of("status", "accepted", "message", "Digest generation started in the background."));
    }

    /**
     * Manual test trigger — always runs immediately, ignores deduplication.
     * Uses previous 24h from now (not fixed yesterday window).
     * Returns full digest content in response body for inspection.
     */
    @PostMapping("/send-now")
    public ResponseEntity<?> sendNow() {
        logger.info("Manual digest send-now endpoint called.");
        try {
            DailyDigestService.DigestResult result = dailyDigestService.generateAndSendDigest(true);
            return ResponseEntity.ok(buildResponseMap(result));
        } catch (Exception e) {
            logger.error("Manual digest send-now failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Digest generation failed", "message", e.getMessage()));
        }
    }

    private Map<String, Object> buildResponseMap(DailyDigestService.DigestResult result) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", result.getStatus());
        response.put("subject", result.getSubject());
        response.put("indiaRiskScore", result.getIndiaRiskScore());
        response.put("indiaSummary", result.getIndiaSummary());
        response.put("elevatedCountries", result.getElevatedCountries());
        return response;
    }
}
