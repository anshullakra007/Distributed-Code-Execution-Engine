package com.codeengine.api;

import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") // 🟢 Fixes the CORS "Network Error"
public class CodeController {

    private final DockerSandboxService sandboxService;

    public CodeController(DockerSandboxService sandboxService) {
        this.sandboxService = sandboxService;
    }

    @PostMapping("/run")
    public String runCode(@RequestBody Map<String, String> payload) {
        // 🟢 Extract data from the Frontend's JSON
        String language = payload.get("language");
        String code = payload.get("code");
        String input = payload.get("input");

        System.out.println("⚡️ RECEIVED REQUEST: " + language);
        
        try {
            // Send the code to your Docker Sandbox
            return sandboxService.executeCode(code);
        } catch (Exception e) {
            e.printStackTrace();
            return "Server Error: " + e.getMessage();
        }
    }
}