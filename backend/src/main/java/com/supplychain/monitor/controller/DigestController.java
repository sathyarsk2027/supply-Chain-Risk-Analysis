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
 *   POST /api/digest/trigger   — External cron trigger (cron-job.org hits this at 11:00 AM IST)
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
     * Wake-up ping endpoint. Used to wake up the Render free tier container
     * ~2 minutes before the actual cron job runs, avoiding timeout failures.
     */
    @GetMapping("/ping")
    public ResponseEntity<?> ping() {
        return ResponseEntity.ok(Map.of("status", "awake", "message", "Server is ready."));
    }

    /**
     * External cron trigger — called by cron-job.org at 11:00 AM IST daily.
     * Supports both POST and GET.
     * If DIGEST_TRIGGER_SECRET is configured, accepts either Authorization header or ?secret= query param.
     */
    @RequestMapping(value = "/trigger", method = {RequestMethod.POST, RequestMethod.GET})
    public ResponseEntity<?> triggerDigest(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "secret", required = false) String secretParam) {
        // If an explicit secret parameter or authorization header is provided, validate it.
        // We do not reject unauthenticated calls because external cron-job.org free tier uses the plain URL,
        // and DailyDigestService has built-in deduplication (max 1 send per day).
        if (triggerSecret != null && !triggerSecret.trim().isEmpty()) {
            if (secretParam != null && !secretParam.trim().isEmpty() && !secretParam.trim().equals(triggerSecret.trim())) {
                logger.warn("Unauthorized digest trigger attempt with invalid secret parameter.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Unauthorized", "message", "Invalid secret parameter."));
            }
            if (authHeader != null && !authHeader.trim().isEmpty()) {
                String expectedAuth = "Bearer " + triggerSecret.trim();
                if (!authHeader.equals(expectedAuth)) {
                    logger.warn("Unauthorized digest trigger attempt with invalid Authorization header.");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(Map.of("error", "Unauthorized", "message", "Invalid Authorization header."));
                }
            }
        }

        logger.info("Digest trigger endpoint called (external cron). Processing digest synchronously to ensure Render CPU stays active.");
        try {
            DailyDigestService.DigestResult result = dailyDigestService.generateAndSendDigest(false);
            return ResponseEntity.ok(buildResponseMap(result));
        } catch (Exception e) {
            logger.error("Digest trigger execution failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Digest trigger failed", "message", e.getMessage()));
        }
    }

    /**
     * Manual test trigger — always runs immediately, ignores deduplication.
     * Supports both POST and GET (can be opened in any browser).
     * Returns full digest content in response body for inspection.
     */
    @RequestMapping(value = "/send-now", method = {RequestMethod.POST, RequestMethod.GET})
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
