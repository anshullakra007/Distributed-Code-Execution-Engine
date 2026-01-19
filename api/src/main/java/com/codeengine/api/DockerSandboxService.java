package com.codeengine.api;

import org.springframework.stereotype.Service;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

@Service
public class DockerSandboxService {

    public String executeCode(String language, String code, String input) {
        try {
            // 1. Create a temporary folder for this run
            Path tempDir = Files.createTempDirectory("native-run-");
            File sourceFile;
            File inputFile = new File(tempDir.toFile(), "input.txt");
            String runCommand;

            // 2. Setup based on language
            switch (language) {
                case "cpp":
                    sourceFile = new File(tempDir.toFile(), "Solution.cpp");
                    // Compile directly on the server
                    runCommand = "g++ -o solution Solution.cpp && ./solution < input.txt";
                    break;
                case "java":
                    sourceFile = new File(tempDir.toFile(), "Main.java");
                    runCommand = "javac Main.java && java Main < input.txt";
                    break;
                case "python":
                    sourceFile = new File(tempDir.toFile(), "script.py");
                    runCommand = "python3 script.py < input.txt";
                    break;
                default:
                    return "Error: Unsupported language";
            }

            // 3. Write Code and Input to disk
            try (BufferedWriter writer = new BufferedWriter(new FileWriter(sourceFile))) {
                writer.write(code);
            }
            try (BufferedWriter writer = new BufferedWriter(new FileWriter(inputFile))) {
                writer.write(input == null ? "" : input);
            }

            // 4. Run the Command Natively (No Docker)
            ProcessBuilder pb = new ProcessBuilder("sh", "-c", runCommand);
            pb.directory(tempDir.toFile()); // Run inside the temp folder
            pb.redirectErrorStream(true);   // Merge error/output

            long startTime = System.currentTimeMillis();
            Process process = pb.start();

            // 5. Timeout (Fast for Native Code)
            boolean finished = process.waitFor(5, TimeUnit.SECONDS);

            if (!finished) {
                process.destroyForcibly();
                return "Error: Time Limit Exceeded";
            }

            // 6. Read Output
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            StringBuilder output = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }

            // 7. Cleanup (Important!)
            Files.walk(tempDir)
                .map(Path::toFile)
                .sorted((o1, o2) -> -o1.compareTo(o2)) // Delete files first, then dir
                .forEach(File::delete);

            return output.toString().trim();

        } catch (Exception e) {
            return "Server Error: " + e.getMessage();
        }
    }
}