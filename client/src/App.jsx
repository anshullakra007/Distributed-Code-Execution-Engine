import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import './App.css';

function App() {
  // --- STATE ---
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState('');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [stats, setStats] = useState({ time: null, memory: null, status: null });
  const [isLoading, setIsLoading] = useState(false);
  const [fontSize, setFontSize] = useState(14);

  // --- BOILERPLATES ---
  const BOILERPLATES = {
    cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    if (cin >> a >> b) {\n        cout << "Sum: " << (a + b) << endl;\n    } else {\n        cout << "Hello Distributed World!" << endl;\n    }\n    return 0;\n}`,
    java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (scanner.hasNextInt()) {\n            int a = scanner.nextInt();\n            int b = scanner.nextInt();\n            System.out.println("Sum: " + (a + b));\n        } else {\n            System.out.println("Hello Distributed World!");\n        }\n    }\n}`,
    python: `import sys\n\ntry:\n    lines = sys.stdin.read().split()\n    if len(lines) >= 2:\n        a = int(lines[0])\n        b = int(lines[1])\n        print(f"Sum: {a + b}")\n    else:\n        print("Hello Distributed World!")\nexcept Exception:\n    print("Hello Distributed World!")`
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    setCode(BOILERPLATES[language]);
  }, []);

  // --- SHORTCUT LISTENER (Ctrl + Enter) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleRun();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, input, language]); // Dependencies crucial for latest state

  // --- HANDLERS ---
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(BOILERPLATES[newLang]);
    setStats({ time: null, memory: null, status: null }); // Reset stats
    setOutput('');
  };

  const handleReset = () => {
    if (window.confirm("Reset code to default boilerplate?")) {
      setCode(BOILERPLATES[language]);
    }
  };

  // --- RUN LOGIC ---
  const handleRun = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setOutput("Compiling and Executing...");
    setStats({ time: null, memory: null, status: null });

    // ⚠️ REAL BACKEND URL (Use localhost:8080 if running locally)
    const API_URL = "http://localhost:8080/execute"; 

    try {
      // 1. Send Request
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code, input })
      });

      // 2. Parse Response
      // Expected JSON format from backend:
      // { "output": "Sum: 30", "executionTime": "0.04s", "memoryUsed": "12MB" }
      
      /* MOCKING RESPONSE FOR DEMO PURPOSES (Delete this block when backend is ready) */
      /* -------------------------------------------------------------------------- */
      await new Promise(r => setTimeout(r, 800)); // Fake delay
      const mockData = {
        output: "Hello Distributed World!\nProcess finished.",
        executionTime: (Math.random() * 0.1).toFixed(3) + "s",
        memoryUsed: Math.floor(Math.random() * 5000) + " KB",
        status: "Accepted"
      };
      /* -------------------------------------------------------------------------- */

      // 3. Update UI (Replace 'mockData' with 'await response.json()' later)
      const data = mockData; 
      
      if (data.error) {
        setOutput(data.error);
        setStats({ status: "Error", time: "0.00s", memory: "0 KB" });
      } else {
        setOutput(data.output);
        setStats({ 
          time: data.executionTime, 
          memory: data.memoryUsed, 
          status: "Accepted" 
        });
      }
    
    } catch (error) {
      setOutput(`Error: ${error.message}\n\nIs the backend running?`);
      setStats({ status: "Connection Error", time: "-", memory: "-" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">
          <span style={{color: '#22c55e'}}>⚡</span> DISTRIBUTED ENGINE
        </div>
        <div className="controls">
          <div className="zoom-controls">
            <button onClick={() => setFontSize(s => Math.max(10, s - 1))} title="Decrease Font">A-</button>
            <button onClick={() => setFontSize(s => Math.min(24, s + 1))} title="Increase Font">A+</button>
          </div>
          <select value={language} onChange={handleLanguageChange} className="lang-select">
            <option value="cpp">C++ (GCC 9.2)</option>
            <option value="java">Java (JDK 21)</option>
            <option value="python">Python 3.10</option>
          </select>
          <button className="run-btn" onClick={handleRun} disabled={isLoading} title="Ctrl+Enter to Run">
            {isLoading ? "Running..." : "▶ RUN"}
          </button>
        </div>
      </header>

      <div className="workspace">
        {/* EDITOR PANEL */}
        <div className="editor-panel">
          <div className="panel-header-row">
            <span>SOURCE CODE</span>
            <div className="editor-actions">
              <button className="icon-btn" onClick={handleReset}>↺ Reset</button>
              <button className="icon-btn" onClick={() => navigator.clipboard.writeText(code)}>📋 Copy</button>
            </div>
          </div>
          <Editor
            height="100%"
            language={language === 'cpp' ? 'cpp' : language}
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value)}
            options={{
              fontSize: fontSize,
              lineNumbers: "on",
              minimap: { enabled: false },
              automaticLayout: true,
              tabSize: 4,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          />
        </div>

        {/* I/O PANEL */}
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
              {/* METRICS DISPLAY (Only shows after run) */}
              {stats.time && (
                <div className="metrics">
                  <span className={stats.status === "Error" ? "metric-error" : "metric-success"}>
                    {stats.status}
                  </span>
                  <span>⏱ {stats.time}</span>
                  <span>💾 {stats.memory}</span>
                </div>
              )}
            </div>
            <textarea 
              readOnly
              className={`output-terminal ${stats.status === "Error" ? "error" : ""}`}
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