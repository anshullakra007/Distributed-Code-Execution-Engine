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
  
  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'model', text: "Hello! I'm CodeEngine AI. How can I help you today?" }
  ]);
  const [chatInputText, setChatInputText] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatMessagesEndRef = useRef(null);

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

  // Scroll chat to bottom
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  const handleSendChatMessage = async () => {
    if (!chatInputText.trim() || isChatLoading) return;

    const userMessage = chatInputText.trim();
    setChatInputText('');
    
    // Add user message to UI immediately
    const updatedMessages = [...chatMessages, { role: 'user', text: userMessage }];
    setChatMessages(updatedMessages);
    setIsChatLoading(true);

    try {
      // Format history for Gemini API
      const history = chatMessages.slice(1).map(msg => ({
        role: msg.role === 'ai' || msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history })
      });

      const data = await response.json();
      if (response.ok) {
        setChatMessages([...updatedMessages, { role: 'model', text: data.text }]);
      } else {
        setChatMessages([...updatedMessages, { role: 'model', text: `Error: ${data.error || 'Failed to get response'}` }]);
      }
    } catch (error) {
      setChatMessages([...updatedMessages, { role: 'model', text: `Network Error: ${error.message}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

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
          <svg className="logo-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          CodeEngine
        </div>
        <div className="controls">
          <button className="icon-btn theme-btn" onClick={() => setTheme(t => t === 'vs-dark' ? 'light' : 'vs-dark')} title="Toggle Theme">
            {theme === 'vs-dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
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
            {isLoading ? (
              <><svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg> Running...</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run</>
            )}
          </button>
          
          <button className={`chat-toggle-btn ${isChatOpen ? 'active' : ''}`} onClick={() => setIsChatOpen(!isChatOpen)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            Ask AI ✨
          </button>
        </div>
      </header>

      <div className={`workspace ${isChatOpen ? 'chat-open' : ''}`}>
        <div className="editor-panel">
          <div className="panel-header-row">
            <span>main.{language === 'cpp' ? 'cpp' : language === 'java' ? 'java' : 'py'}</span>
            <div className="editor-actions">
              <button className="icon-btn" onClick={() => setCode(BOILERPLATES[language])}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> Reset
              </button>
              <button className="icon-btn" onClick={handleDownload}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Save
              </button>
              <button className="icon-btn" onClick={() => navigator.clipboard.writeText(code)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy
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

        {/* --- AI CHAT PANEL --- */}
        <div className={`chat-panel ${isChatOpen ? '' : 'hidden'}`}>
          <div className="chat-header">
            <div className="chat-header-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              CodeEngine AI
            </div>
            <button className="chat-close-btn" onClick={() => setIsChatOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="chat-messages">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role === 'user' ? 'user' : 'ai'}`}>
                <div className="chat-bubble">
                  {msg.text.split('\\n').map((line, i) => <div key={i}>{line}</div>)}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="chat-message ai">
                <div className="chat-bubble typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            )}
            <div ref={chatMessagesEndRef} />
          </div>
          <div className="chat-input-container">
            <textarea
              className="chat-input"
              placeholder="Ask me anything..."
              value={chatInputText}
              onChange={(e) => setChatInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChatMessage();
                }
              }}
            />
            <button className="chat-send-btn" onClick={handleSendChatMessage} disabled={!chatInputText.trim() || isChatLoading}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
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
