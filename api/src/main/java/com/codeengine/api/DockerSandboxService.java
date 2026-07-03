package com.codeengine.api;

import org.springframework.stereotype.Service;
import java.io.*;
import java.util.Base64;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class DockerSandboxService {

    public String executeCode(String language, String code, String input) {
        try {
            String containerName;
            String filename;
            String compileAndRunCmd;

            // 1. Configure container name and commands based on language
            switch (language) {
                case "cpp":
                    containerName = "cpp-sandbox";
                    filename = "Solution.cpp";
                    compileAndRunCmd = "g++ -O2 -o solution Solution.cpp && ./solution";
                    break;
                case "java":
                    containerName = "java-sandbox";
                    filename = "Main.java";
                    compileAndRunCmd = "javac Main.java && java Main";
                    break;
                case "python":
                    containerName = "python-sandbox";
                    filename = "script.py";
                    compileAndRunCmd = "python3 script.py";
                    break;
                default:
                    return "Error: Unsupported language";
            }

            // 2. Generate a unique ID to isolate this execution within the shared container
            String requestId = UUID.randomUUID().toString();
            String workDir = "/tmp/sandbox_" + requestId;

            // 3. Base64 encode the code to safely pass it
            String b64Code = Base64.getEncoder().encodeToString(code.getBytes("UTF-8"));
            
            // 4. Create isolated directory, run code, and immediately clean up regardless of success
            String script = "mkdir -p " + workDir + " && cd " + workDir + " && " +
                            "echo \"$CODE\" | base64 -d > " + filename + " && " + 
                            compileAndRunCmd + " ; exit_code=$? ; " +
                            "cd / && rm -rf " + workDir + " ; exit $exit_code";

            // 5. Use docker exec for millisecond-latency execution
            ProcessBuilder pb = new ProcessBuilder(
                "docker", "exec", "-i",
                "-e", "CODE=" + b64Code,
                containerName, "sh", "-c", script
            );
            pb.redirectErrorStream(true); // Merge error output with standard output

            long startTime = System.currentTimeMillis();
            Process process = pb.start();

            // 6. Pass the input to the container's stdin
            try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(process.getOutputStream(), "UTF-8"))) {
                if (input != null && !input.isEmpty()) {
                    writer.write(input);
                }
            }

            // 7. Set Timeout
            boolean finished = process.waitFor(10, TimeUnit.SECONDS);

            if (!finished) {
                process.destroyForcibly();
                // Ensure the lingering directory is cleaned up asynchronously
                new ProcessBuilder("docker", "exec", containerName, "sh", "-c", "rm -rf " + workDir).start();
                return "Error: Time Limit Exceeded";
            }

            // 8. Read Output
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