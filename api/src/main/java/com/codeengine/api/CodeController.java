package com.codeengine.api;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class CodeController {

    private final DockerSandboxService sandboxService;

    // Connect the Controller to the Service
    public CodeController(DockerSandboxService sandboxService) {
        this.sandboxService = sandboxService;
    }

    @PostMapping("/run")
    public String runCode(@RequestBody String code) {
        try {
            return sandboxService.executeCode(code);
        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }
    }
}