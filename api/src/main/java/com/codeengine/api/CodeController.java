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
        // 🟢 Extract all data from the frontend request
        String language = payload.get("language");
        String code = payload.get("code");
        String input = payload.get("input");

        // 🟢 Pass everything to the new Service logic
        return sandboxService.executeCode(language, code, input);
    }
}