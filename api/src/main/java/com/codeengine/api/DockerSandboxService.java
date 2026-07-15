package com.codeengine.api;

import org.springframework.stereotype.Service;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.nio.charset.StandardCharsets;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;

@Service
public class DockerSandboxService {

    private static final int COMPILE_TIMEOUT_SEC = 10;
    private static final int RUN_TIMEOUT_SEC = 5;

    public ExecutionResult executeCode(String language, String code, String input) {
        long totalStart = System.nanoTime();
        
        if (!language.equals("cpp") && !language.equals("java") && !language.equals("python")) {
            return ExecutionResult.error("Unsupported language: " + language);
        }

        String taskId = UUID.randomUUID().toString();
        File workDir = new File(System.getProperty("java.io.tmpdir"), "sandbox-" + taskId);
        
        try {
            if (!workDir.mkdirs()) {
                return ExecutionResult.error("Failed to create temporary sandbox directory");
            }

            // Write source code
            String fileName = getSourceFileName(language);
            Files.writeString(workDir.toPath().resolve(fileName), code, StandardCharsets.UTF_8);
            
            // Write input
            if (input != null && !input.isEmpty()) {
                Files.writeString(workDir.toPath().resolve("input.txt"), input, StandardCharsets.UTF_8);
            }

            ExecutionResult result = new ExecutionResult();
            long compileTimeMs = 0;

            if (language.equals("java")) {
                JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
                if (compiler == null) {
                    return ExecutionResult.error("JavaCompiler is not available in this environment.");
                }
                long compStart = System.nanoTime();
                
                // Redirect compiler output to capture errors
                ByteArrayOutputStream errStream = new ByteArrayOutputStream();
                int compResult = compiler.run(null, null, errStream, workDir.getAbsolutePath() + "/Main.java");
                
                compileTimeMs = elapsedMs(compStart);
                if (compResult != 0) {
                    result.setStatus(ExecutionResult.Status.COMPILATION_ERROR);
                    result.setError(trimToEmpty(errStream.toString(StandardCharsets.UTF_8)));
                    result.setCompileTimeMs(compileTimeMs);
                    result.setExitCode(compResult);
                    result.setTotalTimeMs(elapsedMs(totalStart));
                    cleanupTask(workDir);
                    return result;
                }
            } else {
                String[] compileCmd = getCompileCommand(language, workDir.getAbsolutePath());
                if (compileCmd != null) {
                    ExecResult compile = runProcess(compileCmd, workDir, COMPILE_TIMEOUT_SEC);
                    compileTimeMs = compile.elapsedMs;

                    if (!compile.finished) {
                        result.setStatus(ExecutionResult.Status.TIME_LIMIT_EXCEEDED);
                        result.setError("Compilation timed out.");
                        result.setCompileTimeMs(compileTimeMs);
                        result.setTotalTimeMs(elapsedMs(totalStart));
                        cleanupTask(workDir);
                        return result;
                    }

                    if (compile.exitCode != 0) {
                        result.setStatus(ExecutionResult.Status.COMPILATION_ERROR);
                        result.setError(trimToEmpty(compile.error.isEmpty() ? compile.output : compile.error));
                        result.setCompileTimeMs(compileTimeMs);
                        result.setExitCode(compile.exitCode);
                        result.setTotalTimeMs(elapsedMs(totalStart));
                        cleanupTask(workDir);
                        return result;
                    }
                }
            }

            String[] runCmd = getRunCommand(language, workDir.getAbsolutePath(), input != null && !input.isEmpty());
            ExecResult run = runProcess(runCmd, workDir, RUN_TIMEOUT_SEC);

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
            return result;

        } catch (Exception e) {
            ExecutionResult result = ExecutionResult.error("Server error: " + e.getMessage());
            result.setTotalTimeMs(elapsedMs(totalStart));
            return result;
        } finally {
            cleanupTask(workDir);
        }
    }

    private void cleanupTask(File workDir) {
        if (workDir.exists()) {
            try {
                Files.walk(workDir.toPath())
                     .sorted(java.util.Comparator.reverseOrder())
                     .map(Path::toFile)
                     .forEach(File::delete);
            } catch (IOException ignored) {}
        }
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
            case "cpp" -> new String[]{"sh", "-c", String.format("cd %s && g++ -std=c++17 -O0 -Wall -o solution Solution.cpp", workDir)};
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

    private ExecResult runProcess(String[] cmd, File workDir, int timeoutSec) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(cmd);
        pb.directory(workDir);
        
        long start = System.nanoTime();
        Process process = pb.start();
        
        // Close stdin so the process receives EOF instead of hanging indefinitely
        process.getOutputStream().close();
        
        // Read output streams asynchronously to prevent blocking
        StreamGobbler stdoutGobbler = new StreamGobbler(process.getInputStream());
        StreamGobbler stderrGobbler = new StreamGobbler(process.getErrorStream());
        stdoutGobbler.start();
        stderrGobbler.start();
        
        boolean finished = process.waitFor(timeoutSec, TimeUnit.SECONDS);
        long elapsedMs = elapsedMs(start);
        
        if (!finished) {
            process.destroyForcibly();
            stdoutGobbler.join();
            stderrGobbler.join();
            return new ExecResult(false, -1, elapsedMs, stdoutGobbler.getOutput(), stderrGobbler.getOutput());
        }

        stdoutGobbler.join();
        stderrGobbler.join();
        
        return new ExecResult(true, process.exitValue(), elapsedMs, stdoutGobbler.getOutput(), stderrGobbler.getOutput());
    }

    private static class StreamGobbler extends Thread {
        private final InputStream is;
        private final ByteArrayOutputStream baos = new ByteArrayOutputStream();

        StreamGobbler(InputStream is) {
            this.is = is;
        }

        @Override
        public void run() {
            try {
                byte[] buffer = new byte[8192];
                int read;
                while ((read = is.read(buffer)) != -1) {
                    baos.write(buffer, 0, read);
                }
            } catch (IOException ignored) {}
        }

        public String getOutput() {
            return baos.toString(StandardCharsets.UTF_8);
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
