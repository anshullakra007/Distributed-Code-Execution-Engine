import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import './App.css';

const BOILERPLATES = {
  cpp: `#include <iostream>
using namespace std;

int main() {
    int a, b;
    if (cin >> a >> b) {
        cout << "Sum: " << (a + b) << endl;
    } else {
        cout << "Hello World!" << endl;
    }
    return 0;
}`,
  java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (scanner.hasNextInt()) {
            int a = scanner.nextInt();
            int b = scanner.nextInt();
            System.out.println("Sum: " + (a + b));
        } else {
            System.out.println("Hello World!");
        }
    }
}`,
  python: `import sys

lines = sys.stdin.read().split()
if len(lines) >= 2:
    a, b = int(lines[0]), int(lines[1])
    print(f"Sum: {a + b}")
else:
    print("Hello World!")`
};

const LANGUAGE_LABELS = {
  cpp: 'C++17',
  java: 'Java 21',
  python: 'Python 3'
};

function formatMs(ms) {
  if (ms == null || ms < 0) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatMemory(kb) {
  if (kb == null) return '—';
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function statusLabel(status) {
  switch (status) {
    case 'ACCEPTED': return 'Accepted';
    case 'COMPILATION_ERROR': return 'Compile Error';
    case 'RUNTIME_ERROR': return 'Runtime Error';
    case 'TIME_LIMIT_EXCEEDED': return 'Time Limit Exceeded';
    case 'ERROR': return 'Error';
    default: return status || '—';
  }
}

function isErrorStatus(status) {
  return status && status !== 'ACCEPTED';
}

function App() {
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'cpp');
  const [code, setCode] = useState(() => {
    const lang = localStorage.getItem('language') || 'cpp';
    return localStorage.getItem(`savedCode_${lang}`) || BOILERPLATES[lang];
  });
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'vs-dark');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [activePanel, setActivePanel] = useState('output');
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fontSize, setFontSize] = useState(parseInt(localStorage.getItem('fontSize'), 10) || 14);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });

  const editorRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(`savedCode_${language}`, code);
    localStorage.setItem('language', language);
    localStorage.setItem('fontSize', fontSize);
    localStorage.setItem('theme', theme);
  }, [code, language, fontSize, theme]);

  const handleRun = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    setOutput('');
    setStats(null);
    setActivePanel('output');

    const clientStart = performance.now();

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code, input })
      });

      const result = await response.json();
      const clientRoundTrip = Math.round(performance.now() - clientStart);

      const displayText = isErrorStatus(result.status)
        ? (result.error || result.output || 'Execution failed.')
        : (result.output || '(no output)');

      setOutput(displayText);
      setStats({
        status: result.status,
        compileTimeMs: result.compileTimeMs,
        runTimeMs: result.runTimeMs,
        totalTimeMs: result.totalTimeMs,
        memoryKb: result.memoryKb,
        exitCode: result.exitCode,
        clientRoundTripMs: clientRoundTrip
      });
    } catch (error) {
      setOutput(`Network Error: ${error.message}`);
      setStats({ status: 'ERROR', clientRoundTripMs: Math.round(performance.now() - clientStart) });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, language, code, input]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRun]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(localStorage.getItem(`savedCode_${newLang}`) || BOILERPLATES[newLang]);
    setStats(null);
    setOutput('');
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    const ext = language === 'cpp' ? 'cpp' : language === 'java' ? 'java' : 'py';
    element.download = `solution.${ext}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition(({ position }) => {
      setCursor({ line: position.lineNumber, col: position.column });
    });
  };

  return (
    <div className={`app-container ${theme}`}>
      <header className="header">
        <div className="logo">
          <span className="logo-icon">⚡</span>
          Code Engine
        </div>
        <div className="controls">
          <button className="icon-btn theme-btn" onClick={() => setTheme(t => t === 'vs-dark' ? 'light' : 'vs-dark')} title="Toggle Theme">
            {theme === 'vs-dark' ? '☀️' : '🌙'}
          </button>

          <div className="zoom-controls">
            <button onClick={() => setFontSize(s => Math.max(10, s - 1))} title="Decrease Font">A-</button>
            <button onClick={() => setFontSize(s => Math.min(24, s + 1))} title="Increase Font">A+</button>
          </div>

          <select value={language} onChange={handleLanguageChange} className="lang-select">
            <option value="cpp">C++ (GCC)</option>
            <option value="java">Java (JDK 21)</option>
            <option value="python">Python 3</option>
          </select>

          <button className="run-btn" onClick={handleRun} disabled={isLoading} title="Ctrl+Enter to Run">
            {isLoading ? 'Running…' : '▶ Run'}
          </button>
        </div>
      </header>

      <div className="workspace">
        <div className="editor-panel">
          <div className="panel-header-row">
            <span>main.{language === 'cpp' ? 'cpp' : language === 'java' ? 'java' : 'py'}</span>
            <div className="editor-actions">
              <button className="icon-btn" onClick={() => setCode(BOILERPLATES[language])}>↺ Reset</button>
              <button className="icon-btn" onClick={handleDownload}>⬇ Save</button>
              <button className="icon-btn" onClick={() => navigator.clipboard.writeText(code)}>📋 Copy</button>
            </div>
          </div>
          <Editor
            height="100%"
            language={language === 'cpp' ? 'cpp' : language}
            theme={theme}
            value={code}
            onMount={handleEditorMount}
            onChange={(value) => setCode(value ?? '')}
            options={{
              fontSize,
              lineNumbers: 'on',
              minimap: { enabled: true },
              automaticLayout: true,
              tabSize: 4,
              insertSpaces: true,
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              fontFamily: "'JetBrains Mono', monospace",
              renderWhitespace: 'selection',
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              padding: { top: 8 }
            }}
          />
        </div>

        <div className="io-panel">
          <div className="io-tabs">
            <button
              className={`io-tab ${activePanel === 'input' ? 'active' : ''}`}
              onClick={() => setActivePanel('input')}
            >
              Input
            </button>
            <button
              className={`io-tab ${activePanel === 'output' ? 'active' : ''}`}
              onClick={() => setActivePanel('output')}
            >
              Output
              {stats && (
                <span className={`tab-badge ${isErrorStatus(stats.status) ? 'error' : 'success'}`}>
                  {statusLabel(stats.status)}
                </span>
              )}
            </button>
          </div>

          {activePanel === 'input' ? (
            <div className="io-section">
              <textarea
                className="custom-input"
                placeholder="Standard input (stdin) — one value per line or space-separated"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                spellCheck={false}
              />
            </div>
          ) : (
            <div className="io-section">
              {stats && (
                <div className="result-metrics">
                  <span className={isErrorStatus(stats.status) ? 'metric-error' : 'metric-success'}>
                    {statusLabel(stats.status)}
                  </span>
                  {stats.compileTimeMs > 0 && (
                    <span>Compile: {formatMs(stats.compileTimeMs)}</span>
                  )}
                  <span>Run: {formatMs(stats.runTimeMs)}</span>
                  <span>Memory: {formatMemory(stats.memoryKb)}</span>
                  <span>Total: {formatMs(stats.totalTimeMs)}</span>
                  {stats.exitCode != null && stats.exitCode !== 0 && (
                    <span>Exit: {stats.exitCode}</span>
                  )}
                </div>
              )}
              <textarea
                readOnly
                className={`output-terminal ${stats && isErrorStatus(stats.status) ? 'error' : ''}`}
                value={isLoading ? 'Compiling and running…' : (output || '> Ready. Press Run or Ctrl+Enter.')}
                spellCheck={false}
              />
            </div>
          )}
        </div>
      </div>

      <footer className="status-bar">
        <span>Ln {cursor.line}, Col {cursor.col}</span>
        <span>{LANGUAGE_LABELS[language]}</span>
        <span>UTF-8</span>
        <span>Spaces: 4</span>
        {stats && <span>Network: {formatMs(stats.clientRoundTripMs)}</span>}
      </footer>
    </div>
  );
}

export default App;
