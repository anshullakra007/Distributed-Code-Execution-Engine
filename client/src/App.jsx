import { useState } from 'react';
import './App.css';

// ⚠️ IMPORT YOUR EDITOR COMPONENT HERE (e.g., CodeMirror or Monaco)
// import CodeMirror from '@uiw/react-codemirror'; 

function App() {
  // --- YOUR EXISTING STATE ---
  const [code, setCode] = useState('// Write your C++ code here...');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [isLoading, setIsLoading] = useState(false);

  // --- YOUR RUN FUNCTION (Keep your logic!) ---
  const handleRun = async () => {
    setIsLoading(true);
    setOutput("Executing on distributed node...");
    
    // ... INSERT YOUR FETCH/API LOGIC HERE ...
    
    // Simulation for demo:
    setTimeout(() => {
      setOutput("Hello, Distributed World!\nProcess finished with exit code 0.");
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="app-container">
      
      {/* 1. PROFESSIONAL HEADER */}
      <header className="header">
        <div className="logo">
          <div className="status-dot"></div> {/* "Online" Indicator */}
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

      {/* 2. MAIN WORKSPACE (VS Code Style Layout) */}
      <div className="workspace">
        
        {/* Left: Code Editor */}
        <div className="editor-panel">
          {/* <div className="panel-header">MAIN.CPP</div> */}
          
          {/* ⚠️ PUT YOUR CODE EDITOR COMPONENT HERE */}
          {/* Example: */}
          {/* <CodeMirror 
              value={code} 
              height="100%" 
              theme="dark" 
              onChange={(val) => setCode(val)} 
          /> */}
          
          {/* Fallback textarea if you don't have the editor component handy yet */}
          <textarea 
            className="custom-input" 
            style={{fontFamily: 'JetBrains Mono', lineHeight: 1.5}}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck="false"
          />
        </div>

        {/* Right: I/O Panels */}
        <div className="io-panel">
          
          {/* Top Right: Input */}
          <div className="input-section">
            <div className="panel-header">STDIN (Input)</div>
            <textarea 
              className="custom-input"
              placeholder="Enter input for your program..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>

          {/* Bottom Right: Output */}
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

      {/* 3. FAKE STATUS BAR (Adds "Engineering" feel) */}
      <footer className="status-bar">
        <div className="status-item">STATUS: <span>CONNECTED</span></div>
        <div className="status-item">NODE: <span>AWS-AP-SOUTH-1</span></div>
        <div className="status-item">LATENCY: <span>24ms</span></div>
      </footer>

    </div>
  );
}

export default App;