package com.supplychain.monitor;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.List;
import java.util.TimeZone;

import org.springframework.context.annotation.Bean;
import org.springframework.boot.CommandLineRunner;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@EnableScheduling
@SpringBootApplication
public class MonitorApplication {
    private static final Logger logger = LoggerFactory.getLogger(MonitorApplication.class);

    @Bean
    public CommandLineRunner initDatabase(DataSource dataSource) {
        return args -> {
            try (Connection conn = dataSource.getConnection();
                 Statement stmt = conn.createStatement()) {
                stmt.execute("CREATE EXTENSION IF NOT EXISTS vector;");
                logger.info("Successfully checked/created pgvector extension.");
            } catch (Exception e) {
                logger.warn("Could not create vector extension (expected if running in H2 test mode): {}", e.getMessage());
            }
        };
    }
    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        loadDotEnv();
        SpringApplication.run(MonitorApplication.class, args);
    }

    private static void loadDotEnv() {
        // Look for .env in the current directory or parent directory
        File dotEnv = new File(".env");
        if (!dotEnv.exists()) {
            dotEnv = new File("../.env");
        }

        if (dotEnv.exists()) {
            try {
                List<String> lines = Files.readAllLines(dotEnv.toPath());
                for (String line : lines) {
                    line = line.trim();
                    if (line.isEmpty() || line.startsWith("#")) {
                        continue;
                    }
                    int eqIdx = line.indexOf('=');
                    if (eqIdx > 0) {
                        String key = line.substring(0, eqIdx).trim();
                        String value = line.substring(eqIdx + 1).trim();
                        if (value.startsWith("\"") && value.endsWith("\"")) {
                            value = value.substring(1, value.length() - 1);
                        } else if (value.startsWith("'") && value.endsWith("'")) {
                            value = value.substring(1, value.length() - 1);
                        }
                        if (System.getProperty(key) == null && System.getenv(key) == null) {
                            System.setProperty(key, value);
                        }
                    }
                }
            } catch (IOException e) {
                // Ignore or log
            }
        }
    }
}
