import { useState } from "react";
import Editor from "@monaco-editor/react";
import "./App.css";

const BOILERPLATES = {
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, Distributed World!" << endl;\n    return 0;\n}`,
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Distributed World!");\n    }\n}`,
  python: `print("Hello, Distributed World!")`,
  javascript: `console.log("Hello, Distributed World!");`
};

function App() {
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState(BOILERPLATES.cpp);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("idle");

  const runCode = async () => {
    setStatus("running");
    setOutput("Executing...");
    try {
      // 🟢 HARDCODED LINK: Forces connection to your specific Render backend
      const API_URL = "https://code-engine-api-wicb.onrender.com/api/run";
      
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code, input }),
      });

      const rawText = await response.text();

      try {
        const data = JSON.parse(rawText);
        if (data.error) {
          setStatus("error");
          setOutput(data.error);
        } else {
          setStatus("success");
          setOutput(data.output || rawText);
        }
      } catch (e) {
        setStatus(response.ok ? "success" : "error");
        setOutput(rawText);
      }

    } catch (error) {
      console.error(error);
      setStatus("error");
      setOutput("Network Error: Could not reach server.\n\nCheck:\n1. Is the backend running? (./mvnw spring-boot:run)\n2. Is Docker Desktop running?");
    }
  };

  return (
    <div className="app-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <span>⚡ DISTRIBUTED CODE ENGINE</span>
        </div>
        <div className="control-group">
          <select 
            className="lang-select" 
            value={language} 
            onChange={(e) => {
              setLanguage(e.target.value);
              setCode(BOILERPLATES[e.target.value]);
            }}
          >
            <option value="cpp">C++ (GCC)</option>
            <option value="java">Java (JDK 17)</option>
            <option value="python">Python 3</option>
            <option value="javascript">JavaScript (Node)</option>
          </select>
          <button className="btn-run" onClick={runCode} disabled={status === "running"}>
            {status === "running" ? "Running..." : "▶ Run Code"}
          </button>
        </div>
      </nav>

      {/* Workspace */}
      <div className="workspace">
        {/* Editor Side */}
        <div className="editor-wrapper">
          <Editor
            height="100%"
            theme="vs-dark"
            language={language === "cpp" ? "cpp" : language}
            value={code}
            onChange={(val) => setCode(val)}
            options={{
              fontSize: 16, // Readable size
              fontWeight: "600", // Semi-bold text
              fontFamily: "'Fira Code', 'Consolas', monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 20 },
              lineHeight: 24
            }}
          />
        </div>

        {/* IO Side */}
        <div className="io-wrapper">
          <div className="panel">
            <div className="panel-title">Custom Input (Stdin)</div>
            <textarea
              className="panel-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Input goes here..."
            />
          </div>
          <div className="panel" style={{ flex: 1.5 }}>
            <div className="panel-title">Output</div>
            <div 
              className="output-area"
              style={{ color: status === "error" ? "#f48771" : "#89d185" }}
            >
              {output || "Ready to execute."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;