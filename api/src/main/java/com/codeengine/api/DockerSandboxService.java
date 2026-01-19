package com.codeengine.api;

import org.springframework.stereotype.Service;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

@Service
public class DockerSandboxService {

    public String executeCode(String language, String code, String input) {
        String imageName;
        String fileName;
        String runCommand;

        // 1. Determine Docker Image & Command based on Language
        switch (language) {
            case "cpp":
                imageName = "gcc:latest";
                fileName = "Solution.cpp";
                // Compile + Run pipeline
                runCommand = "g++ -o solution Solution.cpp && ./solution";
                break;
            case "java":
                imageName = "openjdk:latest";
                fileName = "Main.java";
                runCommand = "javac Main.java && java Main";
                break;
            case "python":
                imageName = "python:3.10-slim";
                fileName = "script.py";
                runCommand = "python3 script.py";
                break;
            default:
                return "Error: Unsupported language";
        }

        try {
            // 2. Create a temporary folder for this submission on the HOST
            Path tempDir = Files.createTempDirectory("code-engine-");
            File sourceFile = new File(tempDir.toFile(), fileName);
            File inputFile = new File(tempDir.toFile(), "input.txt");

            // 3. Write User Code & Input to files
            try (BufferedWriter writer = new BufferedWriter(new FileWriter(sourceFile))) {
                writer.write(code);
            }
            try (BufferedWriter writer = new BufferedWriter(new FileWriter(inputFile))) {
                writer.write(input == null ? "" : input);
            }

            // 4. Build Docker Command
            // We mount the temp folder into the container at /app
            ProcessBuilder pb = new ProcessBuilder(
                    "docker", "run",
                    "--rm",                        // Delete container after run
                    "--memory=512m",               // Limit RAM (Important for Free Tier)
                    "--cpus=0.5",                  // Limit CPU
                    "-v", tempDir.toAbsolutePath() + ":/app",
                    "-w", "/app",                  // Working directory
                    imageName,
                    "sh", "-c", runCommand + " < input.txt" // Inject input via file redirection
            );

            pb.redirectErrorStream(true); // Merge Error and Output streams

            long startTime = System.currentTimeMillis();
            Process process = pb.start();

            // 🔴 CRITICAL FIX FOR RENDER FREE TIER 🔴
            // Increase timeout from 2s -> 15s because Docker takes time to start on shared CPUs.
            // Real execution time is calculated separately below.
            boolean finished = process.waitFor(15, TimeUnit.SECONDS);

            if (!finished) {
                process.destroyForcibly();
                return "Error: Time Limit Exceeded (Container startup took too long)";
            }

            // 5. Read Output
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            StringBuilder output = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }

            // 6. Cleanup
            Files.walk(tempDir)
                .map(Path::toFile)
                .sorted((o1, o2) -> -o1.compareTo(o2))
                .forEach(File::delete);

            return output.toString().trim();

        } catch (Exception e) {
            e.printStackTrace();
            return "Server Error: " + e.getMessage();
        }
    }
}