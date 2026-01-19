import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import './App.css';

function App() {
  // --- STATE ---
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState('');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fontSize, setFontSize] = useState(14); // New Feature: Font Size

  // --- BOILERPLATES (New Feature: Auto-code) ---
  const BOILERPLATES = {
    cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << "Sum: " << (a + b) << endl;\n    return 0;\n}`,
    java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        int a = scanner.nextInt();\n        int b = scanner.nextInt();\n        System.out.println("Sum: " + (a + b));\n    }\n}`,
    python: `# Read inputs\na = int(input())\nb = int(input())\n\nprint(f"Sum: {a + b}")`
  };

  // Set initial code when app loads
  useEffect(() => {
    setCode(BOILERPLATES[language]);
  }, []);

  // Handle Language Change
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(BOILERPLATES[newLang]); // Auto-switch code
  };

  // --- REAL RUN LOGIC (No Fakes) ---
  const handleRun = async () => {
    setIsLoading(true);
    setOutput("Compiling and Executing...");

    // ⚠️ REPLACE THIS URL WITH YOUR ACTUAL BACKEND URL (Local or Render)
    // Example: "https://your-backend-service.onrender.com/execute"
    const API_URL = "http://localhost:8080/execute"; 

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: language,
          code: code,
          input: input
        })
      });

      if (!response.ok) {
        throw new Error(`Server Error: ${response.status}`);
      }

      const data = await response.json();
      // Assuming your backend returns { output: "..." }
      setOutput(data.output || "Execution completed with no output.");
    
    } catch (error) {
      setOutput(`Error: ${error.message}\n\nCheck if your backend is running.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper: Copy Code
  const copyCode = () => {
    navigator.clipboard.writeText(code);
    alert("Code copied to clipboard!");
  };

  return (
    <div className="app-container">
      
      {/* HEADER */}
      <header className="header">
        <div className="logo">
          <span style={{color: '#22c55e'}}>⚡</span> DISTRIBUTED ENGINE
        </div>
        
        <div className="controls">
          {/* Font Size Controls */}
          <div className="zoom-controls">
            <button onClick={() => setFontSize(s => Math.max(10, s - 1))}>A-</button>
            <button onClick={() => setFontSize(s => Math.min(24, s + 1))}>A+</button>
          </div>

          <select 
            value={language} 
            onChange={handleLanguageChange}
            className="lang-select"
          >
            <option value="cpp">C++ (GCC 9.2)</option>
            <option value="java">Java (JDK 21)</option>
            <option value="python">Python 3.10</option>
          </select>

          <button className="run-btn" onClick={handleRun} disabled={isLoading}>
            {isLoading ? "Running..." : "▶ RUN"}
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="workspace">
        
        {/* LEFT: EDITOR */}
        <div className="editor-panel">
          <div className="panel-header-row">
            <span>SOURCE CODE</span>
            <button className="icon-btn" onClick={copyCode} title="Copy Code">📋 Copy</button>
          </div>
          
          <Editor
            height="100%"
            language={language === 'cpp' ? 'cpp' : language} // Map to monaco IDs
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value)}
            options={{
              fontSize: fontSize, // Dynamic Font Size
              lineNumbers: "on", // ✅ Explicit Line Numbers
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
            }}
          />
        </div>

        {/* RIGHT: I/O */}
        <div className="io-panel">
          
          {/* Input */}
          <div className="io-section input-section">
            <div className="panel-header">STDIN (Input)</div>
            <textarea 
              className="custom-input"
              placeholder="Enter input here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>

          {/* Output */}
          <div className="io-section output-section">
            <div className="panel-header">
              STDOUT (Output)
              <button className="clear-btn" onClick={() => setOutput('')}>Clear</button>
            </div>
            <textarea 
              readOnly
              className={`output-terminal ${output.startsWith("Error") ? "error" : ""}`}
              value={output}
              placeholder="> Ready to execute."
            />
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;