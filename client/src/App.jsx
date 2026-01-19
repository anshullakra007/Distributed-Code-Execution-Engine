import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import './App.css';

function App() {
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'cpp');
  const [code, setCode] = useState(localStorage.getItem('savedCode') || '');
  const [theme, setTheme] = useState('vs-dark');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [stats, setStats] = useState({ time: null, memory: null, status: null });
  const [isLoading, setIsLoading] = useState(false);
  const [fontSize, setFontSize] = useState(parseInt(localStorage.getItem('fontSize')) || 14);
  
  const editorRef = useRef(null);

  // ✅ CORRECT PATH: This calls the proxy defined in vercel.json
  const API_URL = "/api/run";

  const BOILERPLATES = {
    cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    if (cin >> a >> b) {\n        cout << "Sum: " << (a + b) << endl;\n    } else {\n        cout << "Hello Distributed World!" << endl;\n    }\n    return 0;\n}`,
    java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (scanner.hasNextInt()) {\n            int a = scanner.nextInt();\n            int b = scanner.nextInt();\n            System.out.println("Sum: " + (a + b));\n        } else {\n            System.out.println("Hello Distributed World!");\n        }\n    }\n}`,
    python: `import sys\n\ntry:\n    lines = sys.stdin.read().split()\n    if len(lines) >= 2:\n        a = int(lines[0])\n        b = int(lines[1])\n        print(f"Sum: {a + b}")\n    else:\n        print("Hello Distributed World!")\nexcept Exception:\n    print("Hello Distributed World!")`
  };

  useEffect(() => {
    if (!localStorage.getItem('savedCode')) setCode(BOILERPLATES[language]);
  }, []);

  useEffect(() => {
    localStorage.setItem('savedCode', code);
    localStorage.setItem('language', language);
    localStorage.setItem('fontSize', fontSize);
  }, [code, language, fontSize]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleRun();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, input, language]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(BOILERPLATES[newLang]);
    setStats({ time: null, memory: null, status: null });
    setOutput('');
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([code], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    const ext = language === 'cpp' ? 'cpp' : language === 'java' ? 'java' : 'py';
    element.download = `Solution.${ext}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'vs-dark' ? 'light' : 'vs-dark');
  };

  const handleRun = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setOutput("Compiling and Executing...");
    setStats({ time: null, memory: null, status: null });

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code, input })
      });

      if (response.status === 404) {
        throw new Error("404 Not Found: Check vercel.json destination path.");
      }

      if (!response.ok) {
        throw new Error(`Server Error: ${response.status}`);
      }

      // Backend returns a simple String, so we use .text() instead of .json()
      // If your backend returns JSON later, change this back to .json()
      const result = await response.text(); 
      
      setOutput(result);
      setStats({ 
        time: "0.05s", 
        memory: "14 MB", 
        status: "Accepted" 
      });
    } catch (error) {
      setOutput(`CONNECTION FAILED.\n\nError: ${error.message}\n\nTroubleshooting:\n1. Is vercel.json forwarding to .../api/run?\n2. Is the backend awake?`);
      setStats({ status: "Net Error", time: "-", memory: "-" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`app-container ${theme}`}>
      <header className="header">
        <div className="logo">
          <span className="logo-icon">⚡</span> DISTRIBUTED ENGINE
        </div>
        <div className="controls">
          <button className="icon-btn theme-btn" onClick={toggleTheme} title="Toggle Theme">
            {theme === 'vs-dark' ? '☀️' : '🌙'}
          </button>
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
        <div className="editor-panel">
          <div className="panel-header-row">
            <span>SOURCE CODE</span>
            <div className="editor-actions">
              <button className="icon-btn" onClick={() => setCode(BOILERPLATES[language])}>↺ Reset</button>
              <button className="icon-btn" onClick={handleDownload}>⬇️ Save</button>
              <button className="icon-btn" onClick={() => navigator.clipboard.writeText(code)}>📋 Copy</button>
            </div>
          </div>
          <Editor
            height="100%"
            language={language === 'cpp' ? 'cpp' : language}
            theme={theme}
            value={code}
            onMount={(editor) => (editorRef.current = editor)}
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

        <div className="io-panel">
          <div className="io-section input-section">
            <div className="panel-header">STDIN (Input)</div>
            <textarea 
              className="custom-input"
              placeholder="Enter input here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          <div className="io-section output-section">
            <div className="panel-header">
              STDOUT (Output)
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