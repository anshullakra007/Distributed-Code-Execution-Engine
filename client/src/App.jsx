import { useState } from 'react';
import Editor from '@monaco-editor/react'; // 👈 The Pro Editor
import './App.css';

function App() {
  // --- STATE ---
  const [code, setCode] = useState('// Write your C++ code here...\n#include <iostream>\n\nint main() {\n    std::cout << "Hello World";\n    return 0;\n}');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [isLoading, setIsLoading] = useState(false);

  // --- LANGUAGE MAP (Dropdown -> Editor Language ID) ---
  const languageMap = {
    cpp: "cpp",
    java: "java",
    python: "python"
  };

  // --- RUN LOGIC ---
  const handleRun = async () => {
    setIsLoading(true);
    setOutput("Running on distributed node...");
    
    // Simulate API Call (Replace with your real fetch)
    setTimeout(() => {
      setOutput("Hello, Distributed World!\nProcess finished with exit code 0.");
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="app-container">
      
      {/* 1. HEADER */}
      <header className="header">
        <div className="logo">
          <div className="status-dot"></div>
          <span>DISTRIBUTED ENGINE</span>
        </div>
        
        <div className="controls">
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            className="lang-select"
          >
            <option value="cpp">C++ (GCC 9.2)</option>
            <option value="java">Java (JDK 21)</option>
            <option value="python">Python 3.10</option>
          </select>

          <button className="run-btn" onClick={handleRun} disabled={isLoading}>
            {isLoading ? "Running..." : "▶ RUN CODE"}
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <div className="workspace">
        
        {/* LEFT: CODE EDITOR (VS Code Engine) */}
        <div className="editor-panel">
          <Editor
            height="100%"
            language={languageMap[language]}
            theme="vs-dark" // 👈 The VS Code Dark Theme
            value={code}
            onChange={(value) => setCode(value)}
            options={{
              fontSize: 14,
              minimap: { enabled: false }, // Hide the mini-map to save space
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>

        {/* RIGHT: I/O PANELS */}
        <div className="io-panel">
          
          {/* Input Area */}
          <div className="input-section">
            <div className="panel-header">STDIN (Input)</div>
            <textarea 
              className="custom-input"
              placeholder="Enter input..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>

          {/* Output Area */}
          <div className="output-section">
            <div className="panel-header">STDOUT (Terminal)</div>
            <textarea 
              readOnly
              className="output-terminal"
              value={output}
              placeholder="> Output will appear here..."
            />
          </div>

        </div>
      </div>

      {/* 3. STATUS BAR */}
      <footer className="status-bar">
        <div className="status-item">STATUS: <span>CONNECTED</span></div>
        <div className="status-item">NODE: <span>AWS-AP-SOUTH-1</span></div>
        <div className="status-item">LATENCY: <span>24ms</span></div>
      </footer>

    </div>
  );
}

export default App;