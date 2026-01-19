package com.codeengine.api;

import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.*;
import java.util.concurrent.TimeUnit;

@Service
public class DockerSandboxService {

    // Define names for our permanent "warm" containers
    private static final String CPP_CONTAINER = "warm-cpp-runner";
    private static final String JAVA_CONTAINER = "warm-java-runner";
    private static final String PY_CONTAINER = "warm-py-runner";

    /**
     * 🟢 ON STARTUP: Wake up the containers!
     * We start them once and keep them running forever with "tail -f /dev/null".
     */
    @PostConstruct
    public void initializeWarmContainers() {
        // 1. C++ Container (GCC)
        startContainer(CPP_CONTAINER, "gcc:latest");

        // 2. Java Container (OpenJDK)
        startContainer(JAVA_CONTAINER, "openjdk:17-jdk-slim");

        // 3. Python Container (Slim version for speed)
        startContainer(PY_CONTAINER, "python:3.10-slim");
    }

    /**
     * 🔴 ON SHUTDOWN: Clean up the mess.
     */
    @PreDestroy
    public void cleanup() {
        stopContainer(CPP_CONTAINER);
        stopContainer(JAVA_CONTAINER);
        stopContainer(PY_CONTAINER);
    }

    private void startContainer(String name, String image) {
        try {
            // Check if already running
            Process check = new ProcessBuilder("docker", "ps", "-q", "-f", "name=" + name).start();
            if (new String(check.getInputStream().readAllBytes()).trim().isEmpty()) {
                // Remove any dead container with the same name
                new ProcessBuilder("docker", "rm", "-f", name).start().waitFor();
                
                // Start new warm container (Detached)
                System.out.println("🚀 Warming up container: " + name);
                new ProcessBuilder("docker", "run", "-d", "--name", name, image, "tail", "-f", "/dev/null").start().waitFor();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void stopContainer(String name) {
        try {
            new ProcessBuilder("docker", "rm", "-f", name).start().waitFor();
        } catch (Exception e) { /* Ignore */ }
    }

    /**
     * ⚡ FAST EXECUTE: Uses 'docker exec' on existing containers.
     */
    public String executeCode(String language, String code, String input) {
        String containerName;
        String fileName;
        String runCommand;

        switch (language) {
            case "cpp":
                containerName = CPP_CONTAINER;
                fileName = "Solution.cpp";
                runCommand = "g++ -o solution Solution.cpp && ./solution";
                break;
            case "java":
                containerName = JAVA_CONTAINER;
                fileName = "Main.java";
                runCommand = "javac Main.java && java Main";
                break;
            case "python":
                containerName = PY_CONTAINER;
                fileName = "script.py";
                runCommand = "python3 script.py";
                break;
            default:
                return "Error: Unsupported language";
        }

        try {
            // STEP 1: Inject Code into the Container
            // We use 'sh -c cat > filename' and pipe the code into it. This avoids file permission issues.
            Process writeProcess = new ProcessBuilder("docker", "exec", "-i", containerName, "sh", "-c", "cat > " + fileName).start();
            try (OutputStream os = writeProcess.getOutputStream()) {
                os.write(code.getBytes());
            }
            writeProcess.waitFor();

            // STEP 2: Inject Input File
            Process writeInput = new ProcessBuilder("docker", "exec", "-i", containerName, "sh", "-c", "cat > input.txt").start();
            try (OutputStream os = writeInput.getOutputStream()) {
                os.write((input == null ? "" : input).getBytes());
            }
            writeInput.waitFor();

            // STEP 3: Execute the Run Command
            ProcessBuilder pb = new ProcessBuilder(
                "docker", "exec", "-i", containerName, 
                "sh", "-c", runCommand + " < input.txt"
            );
            pb.redirectErrorStream(true);
            
            long start = System.currentTimeMillis();
            Process runProcess = pb.start();

            // Timeout Logic (Fast fail)
            boolean finished = runProcess.waitFor(5, TimeUnit.SECONDS);
            
            if (!finished) {
                // If it hangs (infinite loop), we just kill the PROCESS inside the container, 
                // NOT the container itself.
                runProcess.destroyForcibly();
                // Optional: Kill the specific PID inside docker to be clean (advanced), 
                // but for now, we leave the zombie process or restart container if needed.
                return "Error: Time Limit Exceeded";
            }

            // STEP 4: Read Output
            String output = new String(runProcess.getInputStream().readAllBytes());
            long timeTaken = System.currentTimeMillis() - start;

            // Optional: Append timing info for debugging
            // return output.trim() + "\n\n[Execution Time: " + timeTaken + "ms]";
            return output.trim();

        } catch (Exception e) {
            return "Server Error: " + e.getMessage();
        }
    }
}