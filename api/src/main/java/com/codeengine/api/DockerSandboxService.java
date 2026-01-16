package com.codeengine.api;

import org.springframework.stereotype.Service;
import java.io.*;
import java.util.concurrent.TimeUnit;

@Service
public class DockerSandboxService {

    public String executeCode(String userCode) throws Exception {
        
        // 1. GET PATH TO TEMP FOLDER
        // We create a folder named "temp" inside your project directory
        String folderPath = System.getProperty("user.dir") + "/temp";
        File codeFile = new File(folderPath + "/Solution.cpp");
        
        // Create the folder if it doesn't exist
        codeFile.getParentFile().mkdirs(); 
        
        // 2. SAVE USER CODE TO FILE
        try (FileWriter writer = new FileWriter(codeFile)) {
            writer.write(userCode);
        }

        // 3. COMPILE (Docker Command)
        // We mount the "temp" folder into the container at "/app"
        // "c-runner" is the image name you built earlier
        String compileCmd = "docker run --rm -v " + folderPath + ":/app c-runner g++ Solution.cpp -o output";
        runProcess(compileCmd);

        // 4. RUN (Docker Command)
        // We run the compiled "output" file
        String runCmd = "docker run --rm -v " + folderPath + ":/app c-runner ./output";
        String output = runProcess(runCmd);

        return output;
    }

    // Helper to run terminal commands from Java
    private String runProcess(String command) throws Exception {
        ProcessBuilder builder = new ProcessBuilder(command.split(" "));
        builder.redirectErrorStream(true); // Merge errors with output
        Process process = builder.start();

        // Capture the output text
        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
        StringBuilder output = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            output.append(line).append("\n");
        }

        // Wait max 5 seconds (Simple Timeout logic)
        boolean finished = process.waitFor(5, TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            throw new RuntimeException("Time Limit Exceeded");
        }

        return output.toString();
    }
}