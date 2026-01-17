package com.codeengine.api;

import org.springframework.stereotype.Service;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

@Service
public class DockerSandboxService {

    // 🟢 Updated to accept Language and Input directly
    public String executeCode(String language, String code, String input) {
        try {
            // 1. Create a temporary file for the code
            Path codeFile = Files.createTempFile("code", getExtension(language));
            Files.writeString(codeFile, code);

            ProcessBuilder pb;
            
            // 2. Choose the right compiler based on language
            // (We are running these DIRECTLY on the server, not in Docker)
            if (language.equals("cpp")) {
                Path exeFile = Files.createTempFile("app", ".out");
                // Compile: g++ code.cpp -o app.out
                Process compile = new ProcessBuilder("g++", codeFile.toString(), "-o", exeFile.toString()).start();
                compile.waitFor();
                if (compile.exitValue() != 0) return "Compilation Error:\n" + readStream(compile.getErrorStream());
                
                // Run: ./app.out
                pb = new ProcessBuilder(exeFile.toString());
            } else if (language.equals("python")) {
                // Run: python3 code.py
                pb = new ProcessBuilder("python3", codeFile.toString());
            } else if (language.equals("java")) {
                // Rename file to Main.java (Required for Java)
                Path javaFile = codeFile.resolveSibling("Main.java");
                Files.move(codeFile, javaFile);
                
                // Compile: javac Main.java
                Process compile = new ProcessBuilder("javac", javaFile.toString()).start();
                compile.waitFor();
                if (compile.exitValue() != 0) return "Compilation Error:\n" + readStream(compile.getErrorStream());

                // Run: java -cp . Main
                pb = new ProcessBuilder("java", "-cp", javaFile.getParent().toString(), "Main");
            } else {
                return "Error: Language not supported";
            }

            // 3. Start the process
            pb.redirectErrorStream(true);
            Process process = pb.start();

            // 4. Pass Input (if provided)
            if (input != null && !input.isEmpty()) {
                try (OutputStream os = process.getOutputStream()) {
                    os.write(input.getBytes());
                    os.flush();
                }
            }

            // 5. Wait for output (5 second timeout)
            if (!process.waitFor(5, TimeUnit.SECONDS)) {
                process.destroy();
                return "Error: Time Limit Exceeded";
            }

            return readStream(process.getInputStream());

        } catch (Exception e) {
            return "Server Error: " + e.getMessage();
        }
    }

    private String getExtension(String lang) {
        if (lang.equals("cpp")) return ".cpp";
        if (lang.equals("python")) return ".py";
        if (lang.equals("java")) return ".java";
        return ".txt";
    }

    private String readStream(InputStream stream) throws IOException {
        BufferedReader reader = new BufferedReader(new InputStreamReader(stream));
        StringBuilder output = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            output.append(line).append("\n");
        }
        return output.toString().trim();
    }
}