package com.codeengine.api;

public class ExecutionResult {

    public enum Status {
        ACCEPTED,
        COMPILATION_ERROR,
        RUNTIME_ERROR,
        TIME_LIMIT_EXCEEDED,
        ERROR
    }

    private Status status;
    private String output;
    private String error;
    private long compileTimeMs;
    private long runTimeMs;
    private long totalTimeMs;
    private Long memoryKb;
    private int exitCode;

    public ExecutionResult() {}

    public static ExecutionResult error(String message) {
        ExecutionResult result = new ExecutionResult();
        result.status = Status.ERROR;
        result.error = message;
        result.output = "";
        return result;
    }

    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }

    public String getOutput() { return output; }
    public void setOutput(String output) { this.output = output; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }

    public long getCompileTimeMs() { return compileTimeMs; }
    public void setCompileTimeMs(long compileTimeMs) { this.compileTimeMs = compileTimeMs; }

    public long getRunTimeMs() { return runTimeMs; }
    public void setRunTimeMs(long runTimeMs) { this.runTimeMs = runTimeMs; }

    public long getTotalTimeMs() { return totalTimeMs; }
    public void setTotalTimeMs(long totalTimeMs) { this.totalTimeMs = totalTimeMs; }

    public Long getMemoryKb() { return memoryKb; }
    public void setMemoryKb(Long memoryKb) { this.memoryKb = memoryKb; }

    public int getExitCode() { return exitCode; }
    public void setExitCode(int exitCode) { this.exitCode = exitCode; }
}
