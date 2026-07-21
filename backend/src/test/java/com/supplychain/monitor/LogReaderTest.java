package com.supplychain.monitor;

import org.junit.jupiter.api.Test;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

class LogReaderTest {

    @Test
    void convertLog() throws IOException {
        File inputFile = new File("output.log");
        if (!inputFile.exists()) {
            inputFile = new File("../output.log");
        }
        if (inputFile.exists()) {
            // Read as UTF-16LE
            byte[] bytes = Files.readAllBytes(inputFile.toPath());
            String content = new String(bytes, StandardCharsets.UTF_16LE);
            // Write as UTF-8
            File outputFile = new File("output_utf8.log");
            Files.write(outputFile.toPath(), content.getBytes(StandardCharsets.UTF_8));
            System.out.println("=== LOG FILE CONVERTED ===");
        } else {
            System.out.println("=== NO LOG FILE FOUND ===");
        }
    }
}
