import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import './App.css';
import ArchitectureStory from './components/ArchitectureStory';

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
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const editorRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(`savedCode_${language}`, code);
    localStorage.setItem('language', language);
    localStorage.setItem('fontSize', fontSize);
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme === 'vs-dark' ? 'dark' : 'light');
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

      const textResponse = await response.text();
      let result;
      try {
        result = JSON.parse(textResponse);
      } catch (e) {
        throw new Error(`Server error (${response.status}): ${textResponse || 'Empty response from execution server'}`);
      }

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
      setOutput(`Error: ${error.message}`);
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

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition(({ position }) => {
      setCursor({ line: position.lineNumber, col: position.column });
    });
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">
          <div className="logo-icon-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          </div>
          <span className="logo-title">CodeEngine</span>
        </div>
        <div className="controls">
          <div className="lang-select-wrapper">
            <span className={`lang-dot ${language}`}></span>
            <select value={language} onChange={handleLanguageChange} className="lang-select">
              <option value="cpp">C++ (GCC 17)</option>
              <option value="java">Java (JDK 21)</option>
              <option value="python">Python 3.11</option>
            </select>
            <svg className="select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>

          <button className="run-btn" onClick={handleRun} disabled={isLoading} title="Run Code (⌘+Enter)">
            {isLoading ? (
              <><svg className="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg> <span>Running...</span></>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> <span>Run</span></>
            )}
          </button>

          <button className="story-mode-btn" onClick={() => setIsStoryOpen(true)} title="Inspect CodeEngine's Execution Pipeline">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            <span>Architecture</span>
          </button>

          <button className="icon-btn theme-btn" onClick={() => setTheme(t => t === 'vs-dark' ? 'light' : 'vs-dark')} title="Toggle Theme">
            {theme === 'vs-dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
        </div>
      </header>

      <div className="workspace">
        <div className="editor-panel">
          <div className="panel-header-row">
            <div className="editor-tab active">
              <span className={`lang-dot ${language}`}></span>
              <span className="file-name">main.{language === 'cpp' ? 'cpp' : language === 'java' ? 'java' : 'py'}</span>
              <span className="file-meta">UTF-8</span>
            </div>
            <div className="editor-actions">
              <button className="icon-btn" onClick={() => setCode(BOILERPLATES[language])} title="Reset to Boilerplate">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> Reset
              </button>
              <button className="icon-btn" onClick={handleDownload} title="Download Source File">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Save
              </button>
              <button className="icon-btn copy-btn" onClick={handleCopy} title="Copy Code to Clipboard">
                {copied ? (
                  <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> <span className="copied-text">Copied</span></>
                ) : (
                  <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</>
                )}
              </button>
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
              <span>Input</span>
            </button>
            <button
              className={`io-tab ${activePanel === 'output' ? 'active' : ''}`}
              onClick={() => setActivePanel('output')}
            >
              <span>Output</span>
              {stats && (
                <span className={`tab-status-pill ${isErrorStatus(stats.status) ? 'error' : 'success'}`}>
                  <span className="status-dot"></span>
                  {statusLabel(stats.status)}
                </span>
              )}
            </button>
          </div>

          {activePanel === 'input' ? (
            <div className="io-section">
              <textarea
                className="custom-input"
                placeholder="Enter custom input here..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                spellCheck={false}
              />
            </div>
          ) : (
            <div className="io-section">
              {stats && (
                <div className="result-metrics">
                  <div className={`metric-badge status-badge ${isErrorStatus(stats.status) ? 'error' : 'success'}`}>
                    <span className="status-dot"></span>
                    {statusLabel(stats.status)}
                  </div>
                  {stats.compileTimeMs > 0 && (
                    <div className="metric-item">
                      <span className="metric-label">Compile</span>
                      <span className="metric-value">{formatMs(stats.compileTimeMs)}</span>
                    </div>
                  )}
                  <div className="metric-item">
                    <span className="metric-label">Exec</span>
                    <span className="metric-value">{formatMs(stats.runTimeMs)}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Memory</span>
                    <span className="metric-value">{formatMemory(stats.memoryKb)}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Total</span>
                    <span className="metric-value">{formatMs(stats.totalTimeMs)}</span>
                  </div>
                  {stats.exitCode != null && (
                    <div className="metric-item">
                      <span className="metric-label">Exit Code</span>
                      <span className={`metric-value ${stats.exitCode === 0 ? 'success' : 'error'}`}>{stats.exitCode}</span>
                    </div>
                  )}
                </div>
              )}
              <textarea
                readOnly
                className={`output-terminal ${stats && isErrorStatus(stats.status) ? 'error' : ''}`}
                value={isLoading ? 'Running...' : (output || 'Click Run to execute code...')}
                spellCheck={false}
              />
            </div>
          )}
        </div>

      </div>

      <footer className="status-bar">
        <div className="status-left">
          <span className="status-item cluster-status">
            <span className="status-dot online"></span>
            <span>Sandbox Ready</span>
          </span>
          <span className="status-divider"></span>
          <span className="status-item">Ln {cursor.line}, Col {cursor.col}</span>
        </div>
        <div className="status-right">
          <span className="status-item">{LANGUAGE_LABELS[language]}</span>
          <span className="status-divider"></span>
          <span className="status-item">UTF-8</span>
          <span className="status-item">Spaces: 4</span>
        </div>
      </footer>

      <ArchitectureStory
        isOpen={isStoryOpen}
        onClose={() => setIsStoryOpen(false)}
        selectedLanguage={language}
      />
    </div>
  );
}

export default App;
