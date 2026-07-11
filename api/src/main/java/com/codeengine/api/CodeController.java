package com.codeengine.api;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class CodeController {

    private final DockerSandboxService sandboxService;
    private final Executor executor;

    public CodeController(DockerSandboxService sandboxService, @Qualifier("sandboxExecutor") Executor executor) {
        this.sandboxService = sandboxService;
        this.executor = executor;
    }

    @PostMapping("/run")
    public CompletableFuture<org.springframework.http.ResponseEntity<ExecutionResult>> runCode(@RequestBody Map<String, String> payload) {
        String language = payload.get("language");
        String code = payload.get("code");
        String input = payload.get("input");

        return CompletableFuture.supplyAsync(() -> {
            ExecutionResult result = sandboxService.executeCode(language, code, input);
            if (result.getStatus() == ExecutionResult.Status.TIME_LIMIT_EXCEEDED) {
                return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.REQUEST_TIMEOUT).body(result);
            }
            return org.springframework.http.ResponseEntity.ok(result);
        }, executor);
    }
}