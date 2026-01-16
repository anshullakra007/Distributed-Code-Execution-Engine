import { useState } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";

function App() {
  const [code, setCode] = useState("// Write C++ code here\n#include <iostream>\n\nint main() {\n    std::cout << \"Hello from React!\" << std::endl;\n    return 0;\n}");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const runCode = async () => {
    setLoading(true);
    try {
      // Send code to your Spring Boot Backend
      const response = await axios.post("http://localhost:8080/api/run", code, {
        headers: { "Content-Type": "text/plain" },
      });
      setOutput(response.data);
    } catch (error) {
      setOutput("Error connecting to server: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#1e1e1e", color: "white" }}>
      {/* HEADER */}
      <div style={{ padding: "10px 20px", background: "#252526", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #333" }}>
        <h2 style={{ margin: 0, fontFamily: "sans-serif" }}>🔥 CodeEngine</h2>
        <button 
          onClick={runCode} 
          disabled={loading}
          style={{ padding: "10px 20px", background: loading ? "#555" : "#0e639c", color: "white", border: "none", cursor: "pointer", borderRadius: "4px", fontSize: "14px", fontWeight: "bold" }}
        >
          {loading ? "Running..." : "Run Code ▶"}
        </button>
      </div>
      
      {/* MAIN EDITOR AREA */}
      <div style={{ display: "flex", flex: 1 }}>
        {/* LEFT: CODE EDITOR */}
        <div style={{ flex: 1, borderRight: "1px solid #333" }}>
          <Editor 
            height="100%" 
            defaultLanguage="cpp" 
            theme="vs-dark" 
            value={code} 
            onChange={(val) => setCode(val)} 
            options={{ minimap: { enabled: false }, fontSize: 14 }}
          />
        </div>
        
        {/* RIGHT: OUTPUT CONSOLE */}
        <div style={{ width: "35%", padding: "15px", background: "#1e1e1e", fontFamily: "monospace", display: "flex", flexDirection: "column" }}>
          <h3 style={{ margin: "0 0 10px 0", color: "#ccc", fontSize: "14px", textTransform: "uppercase" }}>Output</h3>
          <pre style={{ background: "#000", padding: "15px", borderRadius: "6px", flex: 1, overflow: "auto", color: "#0f0", border: "1px solid #333" }}>
            {output || "Run code to see output..."}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default App;