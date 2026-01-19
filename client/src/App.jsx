// ... inside handleRun() ...
      const result = await response.text();
      
      setOutput(result);
      
      // Check if output contains "Error:" to determine status
      const isError = result.startsWith("Error:") || result.startsWith("Server Error:");
      
      setStats({ 
        // We can't measure exact backend time without backend changes, 
        // but native execution is usually <100ms.
        time: isError ? "---" : "< 0.1s", 
        memory: "Native", 
        status: isError ? "Error" : "Accepted" 
      });
// ...