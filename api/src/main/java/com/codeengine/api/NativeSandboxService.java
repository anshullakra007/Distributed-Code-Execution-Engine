package com.codeengine.api;

import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class NativeSandboxService {

    private static final int COMPILE_TIMEOUT_SEC = 10;
    private static final int RUN_TIMEOUT_SEC = 5;

    public ExecutionResult executeCode(String language, String code, String input) {
        Path tempDir = null;
        long totalStart = System.nanoTime();

        try {
            tempDir = Files.createTempDirectory("code-run-");
            File workDir = tempDir.toFile();
            File inputFile = new File(workDir, "input.txt");
            writeFile(inputFile, input == null ? "" : input);

            LanguageConfig config = languageConfig(language, workDir);
            if (config == null) {
                return ExecutionResult.error("Unsupported language: " + language);
            }

            writeFile(config.sourceFile(), code);

            ExecutionResult result = new ExecutionResult();
            long compileTimeMs = 0;

            if (config.compileCommand() != null) {
                ProcessResult compile = runProcess(config.compileCommand(), workDir, COMPILE_TIMEOUT_SEC, null);
                compileTimeMs = compile.elapsedMs();

                if (!compile.finished()) {
                    result.setStatus(ExecutionResult.Status.TIME_LIMIT_EXCEEDED);
                    result.setError("Compilation timed out after " + COMPILE_TIMEOUT_SEC + " seconds.");
                    result.setCompileTimeMs(compileTimeMs);
                    result.setTotalTimeMs(elapsedMs(totalStart));
                    return result;
                }

                if (compile.exitCode() != 0) {
                    result.setStatus(ExecutionResult.Status.COMPILATION_ERROR);
                    result.setError(trimToEmpty(compile.error().isEmpty() ? compile.output() : compile.error()));
                    result.setCompileTimeMs(compileTimeMs);
                    result.setExitCode(compile.exitCode());
                    result.setTotalTimeMs(elapsedMs(totalStart));
                    return result;
                }
            }

            ProcessResult run = runProcess(config.runCommand(), workDir, RUN_TIMEOUT_SEC, inputFile);

            result.setCompileTimeMs(compileTimeMs);
            result.setRunTimeMs(run.elapsedMs());
            result.setExitCode(run.exitCode());
            
            Long memoryKb = parseMemory(run.error());
            result.setMemoryKb(memoryKb);

            String runOutput = trimToEmpty(run.output());
            String runError = trimToEmpty(run.error());

            if (!run.finished()) {
                result.setStatus(ExecutionResult.Status.TIME_LIMIT_EXCEEDED);
                result.setError("Execution timed out after " + RUN_TIMEOUT_SEC + " seconds.");
                result.setOutput(runOutput);
            } else if (run.exitCode() != 0) {
                result.setStatus(ExecutionResult.Status.RUNTIME_ERROR);
                String cleanedError = cleanGnuTimeOutput(runError);
                result.setError(cleanedError.isEmpty() ? "Process exited with code " + run.exitCode() : cleanedError);
                result.setOutput(runOutput);
            } else {
                result.setStatus(ExecutionResult.Status.ACCEPTED);
                result.setOutput(runOutput);
            }

            result.setTotalTimeMs(elapsedMs(totalStart));
            return result;

        } catch (Exception e) {
            ExecutionResult result = ExecutionResult.error("Server error: " + e.getMessage());
            result.setTotalTimeMs(elapsedMs(totalStart));
            return result;
        } finally {
            if (tempDir != null) {
                cleanup(tempDir);
            }
        }
    }

    private record LanguageConfig(File sourceFile, String[] compileCommand, String[] runCommand) {}

    private LanguageConfig languageConfig(String language, File workDir) {
        return switch (language) {
            case "cpp" -> new LanguageConfig(
                new File(workDir, "Solution.cpp"),
                new String[]{"g++", "-std=c++17", "-O2", "-Wall", "-o", "solution", "Solution.cpp"},
                new String[]{"/usr/bin/time", "-v", "./solution"}
            );
            case "java" -> new LanguageConfig(
                new File(workDir, "Main.java"),
                new String[]{"javac", "Main.java"},
                new String[]{"/usr/bin/time", "-v", "java", "Main"}
            );
            case "python" -> new LanguageConfig(
                new File(workDir, "script.py"),
                null,
                new String[]{"/usr/bin/time", "-v", "python3", "script.py"}
            );
            default -> null;
        };
    }

    private ProcessResult runProcess(String[] command, File workDir, int timeoutSec, File inputFile) {
        long start = System.nanoTime();
        try {
            ProcessBuilder pb = new ProcessBuilder(command);
            pb.directory(workDir);
            
            if (inputFile != null && inputFile.exists()) {
                pb.redirectInput(inputFile);
            }
            
            File outputFile = new File(workDir, "output.txt");
            File errorFile = new File(workDir, "error.txt");
            pb.redirectOutput(outputFile);
            pb.redirectError(errorFile);
            
            Process process = pb.start();
            boolean finished = process.waitFor(timeoutSec, TimeUnit.SECONDS);
            long elapsedMs = elapsedMs(start);

            if (!finished) {
                process.destroyForcibly();
            }

            String output = outputFile.exists() ? Files.readString(outputFile.toPath()) : "";
            String error = errorFile.exists() ? Files.readString(errorFile.toPath()) : "";

            return new ProcessResult(finished, finished ? process.exitValue() : -1, elapsedMs, output, error);
        } catch (Exception e) {
            return new ProcessResult(false, -1, elapsedMs(start), "", e.getMessage());
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

    private void writeFile(File file, String content) throws IOException {
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(file))) {
            writer.write(content);
        }
    }

    private String trimToEmpty(String value) {
        return value == null ? "" : value.stripTrailing();
    }

    private long elapsedMs(long startNano) {
        return (System.nanoTime() - startNano) / 1_000_000;
    }

    private void cleanup(Path tempDir) {
        try {
            Files.walk(tempDir)
                .map(Path::toFile)
                .sorted((a, b) -> -a.compareTo(b))
                .forEach(File::delete);
        } catch (IOException ignored) {
        }
    }

    private record ProcessResult(boolean finished, int exitCode, long elapsedMs, String output, String error) {}
}
