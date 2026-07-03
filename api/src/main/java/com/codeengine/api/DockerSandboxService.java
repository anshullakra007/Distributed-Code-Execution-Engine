package com.codeengine.api;

import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

@Service
public class DockerSandboxService {

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
                ProcessResult compile = runProcess(
                    config.compileCommand(),
                    workDir,
                    null,
                    null,
                    COMPILE_TIMEOUT_SEC
                );
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
                    result.setError(trimToEmpty(compile.output()));
                    result.setCompileTimeMs(compileTimeMs);
                    result.setExitCode(compile.exitCode());
                    result.setTotalTimeMs(elapsedMs(totalStart));
                    return result;
                }
            }

            File memFile = new File(workDir, "mem.txt");
            ProcessResult run = runProcess(
                config.runCommand(memFile),
                workDir,
                inputFile,
                memFile,
                RUN_TIMEOUT_SEC
            );

            result.setCompileTimeMs(compileTimeMs);
            result.setRunTimeMs(run.elapsedMs());
            result.setExitCode(run.exitCode());
            result.setMemoryKb(readMemoryKb(memFile));

            String runOutput = trimToEmpty(run.output());

            if (!run.finished()) {
                result.setStatus(ExecutionResult.Status.TIME_LIMIT_EXCEEDED);
                result.setError("Execution timed out after " + RUN_TIMEOUT_SEC + " seconds.");
                result.setOutput(runOutput);
            } else if (run.exitCode() != 0) {
                result.setStatus(ExecutionResult.Status.RUNTIME_ERROR);
                result.setError(runOutput.isEmpty() ? "Process exited with code " + run.exitCode() : runOutput);
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

    private record LanguageConfig(File sourceFile, String compileCommand, String runCommandFactory) {
        String runCommand(File memFile) {
            return runCommandFactory.replace("{MEM_FILE}", memFile.getAbsolutePath());
        }
    }

    private LanguageConfig languageConfig(String language, File workDir) {
        return switch (language) {
            case "cpp" -> new LanguageConfig(
                new File(workDir, "Solution.cpp"),
                "g++ -std=c++17 -O2 -Wall -o solution Solution.cpp 2>&1",
                buildTimedRunCommand("./solution")
            );
            case "java" -> new LanguageConfig(
                new File(workDir, "Main.java"),
                "javac Main.java 2>&1",
                buildTimedRunCommand("java Main")
            );
            case "python" -> new LanguageConfig(
                new File(workDir, "script.py"),
                null,
                buildTimedRunCommand("python3 script.py")
            );
            default -> null;
        };
    }

    private String buildTimedRunCommand(String command) {
        if (hasGnuTime()) {
            return "/usr/bin/time -f '%M' -o {MEM_FILE} " + command + " 2>&1";
        }
        return command + " 2>&1";
    }

    private static Boolean gnuTimeAvailable;

    private boolean hasGnuTime() {
        if (gnuTimeAvailable != null) {
            return gnuTimeAvailable;
        }
        try {
            Process probe = new ProcessBuilder("/usr/bin/time", "-f", "%M", "true")
                .redirectErrorStream(true)
                .start();
            boolean finished = probe.waitFor(2, TimeUnit.SECONDS);
            gnuTimeAvailable = finished && probe.exitValue() == 0;
        } catch (Exception e) {
            gnuTimeAvailable = false;
        }
        return gnuTimeAvailable;
    }

    private ProcessResult runProcess(
        String command,
        File workDir,
        File stdinFile,
        File memFile,
        int timeoutSec
    ) throws IOException, InterruptedException {
        File outputFile = new File(workDir, "proc-" + System.nanoTime() + ".out");

        ProcessBuilder pb = new ProcessBuilder("sh", "-c", command);
        pb.directory(workDir);
        pb.redirectOutput(outputFile);
        pb.redirectErrorStream(true);

        if (stdinFile != null) {
            pb.redirectInput(stdinFile);
        }

        long start = System.nanoTime();
        Process process = pb.start();
        boolean finished = process.waitFor(timeoutSec, TimeUnit.SECONDS);
        long elapsedMs = (System.nanoTime() - start) / 1_000_000;

        if (!finished) {
            process.destroyForcibly();
            process.waitFor(2, TimeUnit.SECONDS);
        }

        int exitCode;
        try {
            exitCode = process.exitValue();
        } catch (IllegalThreadStateException e) {
            exitCode = -1;
        }

        String output = readFile(outputFile);
        outputFile.delete();

        return new ProcessResult(finished, exitCode, elapsedMs, output);
    }

    private Long readMemoryKb(File memFile) {
        if (!memFile.exists()) {
            return null;
        }
        try {
            String raw = Files.readString(memFile.toPath()).trim();
            if (raw.isEmpty()) {
                return null;
            }
            return Math.round(Double.parseDouble(raw));
        } catch (Exception ignored) {
            return null;
        } finally {
            memFile.delete();
        }
    }

    private void writeFile(File file, String content) throws IOException {
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(file))) {
            writer.write(content);
        }
    }

    private String readFile(File file) throws IOException {
        if (!file.exists()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append('\n');
            }
        }
        return sb.toString();
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

    private record ProcessResult(boolean finished, int exitCode, long elapsedMs, String output) {}
}
