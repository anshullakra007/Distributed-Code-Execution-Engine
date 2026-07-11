package com.codeengine.api;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.command.CreateContainerResponse;
import com.github.dockerjava.api.command.ExecCreateCmdResponse;
import com.github.dockerjava.api.model.HostConfig;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientImpl;
import com.github.dockerjava.core.command.ExecStartResultCallback;
import com.github.dockerjava.httpclient5.ApacheDockerHttpClient;
import com.github.dockerjava.transport.DockerHttpClient;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class DockerSandboxService {

    private static final int COMPILE_TIMEOUT_SEC = 10;
    private static final int RUN_TIMEOUT_SEC = 5;
    private static final long MAX_MEMORY = 256 * 1024 * 1024L; // 256MB
    
    private final DockerClient dockerClient;
    
    private final Map<String, BlockingQueue<String>> warmPools = new ConcurrentHashMap<>();
    private final Map<String, String> languageImages = Map.of(
            "cpp", "gcc:latest",
            "java", "openjdk:21-slim",
            "python", "python:3-slim"
    );

    public DockerSandboxService() {
        DefaultDockerClientConfig config = DefaultDockerClientConfig.createDefaultConfigBuilder().build();
        DockerHttpClient httpClient = new ApacheDockerHttpClient.Builder()
                .dockerHost(config.getDockerHost())
                .sslConfig(config.getSSLConfig())
                .build();
        this.dockerClient = DockerClientImpl.getInstance(config, httpClient);
    }

    @PostConstruct
    public void initPools() {
        int poolSize = Runtime.getRuntime().availableProcessors();
        
        for (Map.Entry<String, String> entry : languageImages.entrySet()) {
            String lang = entry.getKey();
            String image = entry.getValue();
            BlockingQueue<String> queue = new ArrayBlockingQueue<>(poolSize);
            
            // Ensure image exists
            try {
                dockerClient.inspectImageCmd(image).exec();
            } catch (Exception e) {
                try {
                    dockerClient.pullImageCmd(image).start().awaitCompletion();
                } catch (InterruptedException ex) {
                    Thread.currentThread().interrupt();
                }
            }

            for (int i = 0; i < poolSize; i++) {
                HostConfig hostConfig = HostConfig.newHostConfig()
                        .withMemory(MAX_MEMORY)
                        .withNetworkMode("none")
                        .withAutoRemove(true);

                CreateContainerResponse container = dockerClient.createContainerCmd(image)
                        .withHostConfig(hostConfig)
                        .withCmd("tail", "-f", "/dev/null") // Keep alive
                        .exec();
                
                String containerId = container.getId();
                dockerClient.startContainerCmd(containerId).exec();
                
                // Ensure /usr/bin/time is installed for python and java if not present
                if (!lang.equals("cpp")) {
                    try {
                        runInContainer(containerId, new String[]{"sh", "-c", "apt-get update && apt-get install -y time"}, 30);
                    } catch (Exception ignored) {}
                }
                
                queue.offer(containerId);
            }
            warmPools.put(lang, queue);
        }
    }

    @PreDestroy
    public void cleanupService() {
        for (BlockingQueue<String> queue : warmPools.values()) {
            for (String containerId : queue) {
                try {
                    dockerClient.killContainerCmd(containerId).exec();
                } catch (Exception ignored) {}
            }
        }
        try {
            dockerClient.close();
        } catch (IOException ignored) {}
    }

    public ExecutionResult executeCode(String language, String code, String input) {
        long totalStart = System.nanoTime();
        BlockingQueue<String> pool = warmPools.get(language);
        
        if (pool == null) {
            return ExecutionResult.error("Unsupported language: " + language);
        }

        String containerId = null;
        try {
            // Wait for an available pre-warmed container (bounded wait)
            containerId = pool.poll(30, TimeUnit.SECONDS);
            if (containerId == null) {
                return ExecutionResult.error("Server is too busy. Queue timeout.");
            }

            String taskId = UUID.randomUUID().toString();
            String workDir = "/sandbox/" + taskId;

            // Setup working directory and write files
            String setupCmd = String.format("mkdir -p %s", workDir);
            runInContainer(containerId, new String[]{"sh", "-c", setupCmd}, 2);
            
            writeFileInContainer(containerId, workDir, getSourceFileName(language), code);
            if (input != null && !input.isEmpty()) {
                writeFileInContainer(containerId, workDir, "input.txt", input);
            }

            ExecutionResult result = new ExecutionResult();
            long compileTimeMs = 0;

            String[] compileCmd = getCompileCommand(language, workDir);
            if (compileCmd != null) {
                ExecResult compile = runInContainer(containerId, compileCmd, COMPILE_TIMEOUT_SEC);
                compileTimeMs = compile.elapsedMs;

                if (!compile.finished) {
                    result.setStatus(ExecutionResult.Status.TIME_LIMIT_EXCEEDED);
                    result.setError("Compilation timed out.");
                    result.setCompileTimeMs(compileTimeMs);
                    result.setTotalTimeMs(elapsedMs(totalStart));
                    cleanupTask(containerId, workDir);
                    return result;
                }

                if (compile.exitCode != 0) {
                    result.setStatus(ExecutionResult.Status.COMPILATION_ERROR);
                    result.setError(trimToEmpty(compile.error.isEmpty() ? compile.output : compile.error));
                    result.setCompileTimeMs(compileTimeMs);
                    result.setExitCode(compile.exitCode);
                    result.setTotalTimeMs(elapsedMs(totalStart));
                    cleanupTask(containerId, workDir);
                    return result;
                }
            }

            String[] runCmd = getRunCommand(language, workDir, input != null && !input.isEmpty());
            ExecResult run = runInContainer(containerId, runCmd, RUN_TIMEOUT_SEC);

            result.setCompileTimeMs(compileTimeMs);
            result.setRunTimeMs(run.elapsedMs);
            result.setExitCode(run.exitCode);
            
            Long memoryKb = parseMemory(run.error);
            result.setMemoryKb(memoryKb);

            String runOutput = trimToEmpty(run.output);
            String runError = trimToEmpty(run.error);

            if (!run.finished) {
                result.setStatus(ExecutionResult.Status.TIME_LIMIT_EXCEEDED);
                result.setError("Execution timed out after " + RUN_TIMEOUT_SEC + " seconds.");
                result.setOutput(runOutput);
            } else if (run.exitCode != 0) {
                result.setStatus(ExecutionResult.Status.RUNTIME_ERROR);
                String cleanedError = cleanGnuTimeOutput(runError);
                result.setError(cleanedError.isEmpty() ? "Process exited with code " + run.exitCode : cleanedError);
                result.setOutput(runOutput);
            } else {
                result.setStatus(ExecutionResult.Status.ACCEPTED);
                result.setOutput(runOutput);
            }

            result.setTotalTimeMs(elapsedMs(totalStart));
            cleanupTask(containerId, workDir);
            return result;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return ExecutionResult.error("Execution interrupted");
        } catch (Exception e) {
            ExecutionResult result = ExecutionResult.error("Server error: " + e.getMessage());
            result.setTotalTimeMs(elapsedMs(totalStart));
            return result;
        } finally {
            if (containerId != null) {
                pool.offer(containerId);
            }
        }
    }

    private void writeFileInContainer(String containerId, String workDir, String fileName, String content) throws Exception {
        String base64Content = java.util.Base64.getEncoder().encodeToString(content.getBytes(StandardCharsets.UTF_8));
        String cmd = String.format("echo '%s' | base64 -d > %s/%s", base64Content, workDir, fileName);
        runInContainer(containerId, new String[]{"sh", "-c", cmd}, 5);
    }

    private void cleanupTask(String containerId, String workDir) {
        try {
            runInContainer(containerId, new String[]{"rm", "-rf", workDir}, 2);
        } catch (Exception ignored) {}
    }

    private String getSourceFileName(String language) {
        return switch (language) {
            case "cpp" -> "Solution.cpp";
            case "java" -> "Main.java";
            case "python" -> "script.py";
            default -> "code.txt";
        };
    }

    private String[] getCompileCommand(String language, String workDir) {
        return switch (language) {
            case "cpp" -> new String[]{"sh", "-c", String.format("cd %s && g++ -std=c++17 -O2 -Wall -o solution Solution.cpp", workDir)};
            case "java" -> new String[]{"sh", "-c", String.format("cd %s && javac Main.java", workDir)};
            default -> null;
        };
    }

    private String[] getRunCommand(String language, String workDir, boolean hasInput) {
        String inputRedirect = hasInput ? " < input.txt" : "";
        return switch (language) {
            case "cpp" -> new String[]{"sh", "-c", String.format("cd %s && /usr/bin/time -v ./solution%s", workDir, inputRedirect)};
            case "java" -> new String[]{"sh", "-c", String.format("cd %s && /usr/bin/time -v java Main%s", workDir, inputRedirect)};
            case "python" -> new String[]{"sh", "-c", String.format("cd %s && /usr/bin/time -v python3 script.py%s", workDir, inputRedirect)};
            default -> new String[]{"echo", "error"};
        };
    }

    private ExecResult runInContainer(String containerId, String[] cmd, int timeoutSec) throws Exception {
        ExecCreateCmdResponse execCreateCmdResponse = dockerClient.execCreateCmd(containerId)
                .withAttachStdout(true)
                .withAttachStderr(true)
                .withCmd(cmd)
                .exec();

        try (ByteArrayOutputStream stdout = new ByteArrayOutputStream();
             ByteArrayOutputStream stderr = new ByteArrayOutputStream();
             ExecStartResultCallback callback = new ExecStartResultCallback(stdout, stderr)) {
             
            long start = System.nanoTime();
            dockerClient.execStartCmd(execCreateCmdResponse.getId()).exec(callback);
            
            boolean finished = callback.awaitCompletion(timeoutSec, TimeUnit.SECONDS);
            long elapsedMs = elapsedMs(start);
            if (!finished) {
                return new ExecResult(false, -1, elapsedMs, stdout.toString(StandardCharsets.UTF_8), stderr.toString(StandardCharsets.UTF_8));
            }

            int exitCode = dockerClient.inspectExecCmd(execCreateCmdResponse.getId()).exec().getExitCodeLong().intValue();
            return new ExecResult(true, exitCode, elapsedMs, stdout.toString(StandardCharsets.UTF_8), stderr.toString(StandardCharsets.UTF_8));
        }
    }

    private Long parseMemory(String stderr) {
        if (stderr == null) return null;
        Pattern pattern = Pattern.compile("Maximum resident set size \\(kbytes\\):\\s+(\\d+)");
        Matcher matcher = pattern.matcher(stderr);
        if (matcher.find()) {
            try {
                return Long.parseLong(matcher.group(1));
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    private String cleanGnuTimeOutput(String stderr) {
        if (stderr == null) return "";
        StringBuilder sb = new StringBuilder();
        for (String line : stderr.split("\n")) {
            String t = line.trim();
            if (!t.startsWith("Command being timed:") &&
                !t.startsWith("User time (seconds):") &&
                !t.startsWith("System time (seconds):") &&
                !t.startsWith("Percent of CPU this job got:") &&
                !t.startsWith("Elapsed (wall clock) time") &&
                !t.startsWith("Average shared text size") &&
                !t.startsWith("Average unshared data size") &&
                !t.startsWith("Average stack size") &&
                !t.startsWith("Average total size") &&
                !t.startsWith("Maximum resident set size") &&
                !t.startsWith("Average resident set size") &&
                !t.startsWith("Major (requiring I/O) page faults:") &&
                !t.startsWith("Minor (reclaiming a frame) page faults:") &&
                !t.startsWith("Voluntary context switches:") &&
                !t.startsWith("Involuntary context switches:") &&
                !t.startsWith("Swaps:") &&
                !t.startsWith("File system inputs:") &&
                !t.startsWith("File system outputs:") &&
                !t.startsWith("Socket messages sent:") &&
                !t.startsWith("Socket messages received:") &&
                !t.startsWith("Signals delivered:") &&
                !t.startsWith("Page size (bytes):") &&
                !t.startsWith("Exit status:")) {
                sb.append(line).append("\n");
            }
        }
        return sb.toString().trim();
    }

    private String trimToEmpty(String value) {
        return value == null ? "" : value.stripTrailing();
    }

    private long elapsedMs(long startNano) {
        return (System.nanoTime() - startNano) / 1_000_000;
    }

    private record ExecResult(boolean finished, int exitCode, long elapsedMs, String output, String error) {}
}
