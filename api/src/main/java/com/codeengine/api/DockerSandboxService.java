package com.codeengine.api;

import org.springframework.stereotype.Service;
import java.io.*;
import java.util.Base64;
import java.util.concurrent.TimeUnit;

@Service
public class DockerSandboxService {

    public String executeCode(String language, String code, String input) {
        try {
            String image;
            String filename;
            String compileAndRunCmd;

            // 1. Configure container image and commands based on language
            switch (language) {
                case "cpp":
                    image = "gcc:latest";
                    filename = "Solution.cpp";
                    compileAndRunCmd = "g++ -O2 -o solution Solution.cpp && ./solution";
                    break;
                case "java":
                    image = "openjdk:17-jdk-slim";
                    filename = "Main.java";
                    compileAndRunCmd = "javac Main.java && java Main";
                    break;
                case "python":
                    image = "python:3.10-slim";
                    filename = "script.py";
                    compileAndRunCmd = "python3 script.py";
                    break;
                default:
                    return "Error: Unsupported language";
            }

            // 2. Base64 encode the code to pass it safely via environment variable
            String b64Code = Base64.getEncoder().encodeToString(code.getBytes("UTF-8"));
            String script = "echo \"$CODE\" | base64 -d > " + filename + " && " + compileAndRunCmd;

            // 3. Run the isolated Docker container
            ProcessBuilder pb = new ProcessBuilder(
                "docker", "run", "--rm", "-i", "--network", "none",
                "-e", "CODE=" + b64Code,
                image, "sh", "-c", script
            );
            pb.redirectErrorStream(true); // Merge error output with standard output

            long startTime = System.currentTimeMillis();
            Process process = pb.start();

            // 4. Pass the input to the container's stdin
            try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(process.getOutputStream(), "UTF-8"))) {
                if (input != null && !input.isEmpty()) {
                    writer.write(input);
                }
            }

            // 5. Set Timeout (10 seconds to account for image startup)
            boolean finished = process.waitFor(10, TimeUnit.SECONDS);

            if (!finished) {
                process.destroyForcibly();
                return "Error: Time Limit Exceeded";
            }

            // 6. Read Output
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), "UTF-8"));
            StringBuilder output = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }

            return output.toString().trim();

        } catch (Exception e) {
            return "Server Error: " + e.getMessage();
        }
    }
}