package com.codeengine.api;

import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class CodeController {

    private final DockerSandboxService sandboxService;

    public CodeController(DockerSandboxService sandboxService) {
        this.sandboxService = sandboxService;
    }

    @PostMapping("/run")
    public String runCode(@RequestBody Map<String, String> payload) {
        String language = payload.get("language");
        String code = payload.get("code");
        String input = payload.get("input");

        // 🟢 Pass Language and Input to the service
        return sandboxService.executeCode(language, code, input);
    }
}