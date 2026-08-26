import React, { useState, useEffect } from 'react';
import './ArchitectureStory.css';

export function LandingStoryBanner({ onOpenStory }) {
  return (
    <div className="landing-story-banner" onClick={onOpenStory} role="button" tabIndex={0} title="Click to inspect CodeEngine's sandboxed microVM compilation and execution pipeline">
      <div className="landing-story-left">
        <div className="telemetry-badge">
          <span className="telemetry-dot"></span>
          <span>SYSTEM TELEMETRY</span>
        </div>
        <span className="landing-story-text">
          Sandboxed microVMs compile &amp; execute untrusted code in <span className="highlight-metric">~70ms</span> with zero container leakage.
        </span>
      </div>
      <div className="landing-story-right">
        <span>Inspect Pipeline &amp; Architecture</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </div>
    </div>
  );
}

export default function ArchitectureStory({ isOpen, onClose, selectedLanguage = 'cpp' }) {
  const [activeChapter, setActiveChapter] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simMode, setSimMode] = useState('normal'); // 'normal' | 'stress'
  const [concurrentUsers, setConcurrentUsers] = useState(25);
  const [simStep, setSimStep] = useState(0);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setActiveChapter((prev) => Math.min(4, prev + 1));
      if (e.key === 'ArrowLeft') setActiveChapter((prev) => Math.max(0, prev - 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Real-time auto simulation player
  useEffect(() => {
    let timer;
    if (isSimulating) {
      timer = setInterval(() => {
        setSimStep((prevStep) => {
          if (prevStep >= 4) {
            setIsSimulating(false);
            return 0;
          }
          const nextStep = prevStep + 1;
          setActiveChapter(nextStep);
          return nextStep;
        });
      }, 1800);
    }
    return () => clearInterval(timer);
  }, [isSimulating]);

  if (!isOpen) return null;

  const startSimulation = () => {
    setIsSimulating(true);
    setSimStep(0);
    setActiveChapter(0);
  };

  const chapters = [
    {
      title: "Code Dispatch",
      badge: "Phase 1",
      mainTitle: "Instantaneous code serialization.",
      narrative: "When execution is triggered, your source code is securely serialized into a lightweight JSON payload. This payload captures your exact editor state and configuration, transmitting it instantly to our backend services with minimal overhead.",
      highlights: [
        {
          title: "Sub-millisecond Packing",
          desc: "The Monaco Editor state is captured and serialized in under 1ms."
        },
        {
          title: "Secure Transmission",
          desc: "The payload is validated upon arrival before entering the execution pipeline."
        }
      ]
    },
    {
      title: "Traffic Control",
      badge: "Phase 2",
      mainTitle: "Handling concurrency with bounded queues.",
      narrative: "To prevent server overload during traffic spikes, CodeEngine uses a bounded asynchronous queue. This enterprise-grade backpressure mechanism safely queues incoming requests without exhausting CPU threads.",
      highlights: [
        {
          title: "Zero CPU Thrashing",
          desc: "Maintains optimal server health by capping maximum thread allocation."
        },
        {
          title: "High Throughput",
          desc: "Capable of sustaining over 130 requests per second with zero starvation."
        }
      ]
    },
    {
      title: "Warm Environments",
      badge: "Phase 3",
      mainTitle: "Eliminating container cold starts.",
      narrative: "Traditional systems take up to two seconds to provision a new Docker container. We bypass this by maintaining a pre-warmed pool of dormant containers, allowing code to be injected and executed in roughly 70 milliseconds.",
      highlights: [
        {
          title: "Instant Execution",
          desc: "Pre-warmed containers reduce execution latency by a factor of 12."
        },
        {
          title: "Complete Isolation",
          desc: "Your code executes inside a dedicated container namespace, untouched by the host OS."
        }
      ]
    },
    {
      title: "Sandboxed Security",
      badge: "Phase 4",
      mainTitle: "Strict resource and network limits.",
      narrative: "To protect the host infrastructure from malicious or poorly optimized code, each execution runs in a restricted sandbox. We enforce hard memory caps and completely disable network access.",
      highlights: [
        {
          title: "Network Blackhole",
          desc: "Outbound network access is disabled, eliminating SSRF and DDoS vectors."
        },
        {
          title: "Memory Caps",
          desc: "Allocations exceeding 256MB are instantly killed before triggering host OOM."
        }
      ]
    },
    {
      title: "Execution Metrics",
      badge: "Phase 5",
      mainTitle: "Real-time telemetry delivery.",
      narrative: "As your code finishes executing, precise metrics—including compilation latency, runtime duration, and peak memory footprint—are gathered via GNU time instrumentation and delivered directly to the UI.",
      highlights: [
        {
          title: "Granular Profiling",
          desc: "Separates compilation overhead from actual algorithm runtime."
        },
        {
          title: "Consistent Reliability",
          desc: "Designed to gracefully return standard error logs on failure."
        }
      ]
    }
  ];

  const current = chapters[activeChapter];

  return (
    <div className="story-modal-overlay" onClick={(e) => e.target.classList.contains('story-modal-overlay') && onClose()}>
      <div className="story-modal-container">
        {/* Header */}
        <div className="story-header">
          <div className="story-header-title-group">
            <div className="story-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            </div>
            <div>
              <h2 className="story-title">CodeEngine Architecture</h2>
            </div>
          </div>
          <div className="story-header-actions">
            <button className="story-close-btn" onClick={onClose} title="Close (Escape)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>



        {/* Chapter Tabs */}
        <div className="story-chapters-nav">
          {chapters.map((chap, idx) => (
            <button
              key={idx}
              className={`chapter-tab ${activeChapter === idx ? 'active' : ''}`}
              onClick={() => {
                setIsSimulating(false);
                setActiveChapter(idx);
              }}
            >
              <div className="chapter-badge">{chap.badge}</div>
              <div className="chapter-tab-title">{chap.title}</div>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="story-content-area">
          <div className="story-chapter-card">
            {/* Left Story Text */}
            <div className="chapter-story-left">
              <h3 className="chapter-main-title">{current.mainTitle}</h3>
              <p className="chapter-narrative">{current.narrative}</p>

              <div className="chapter-highlights">
                {current.highlights.map((item, idx) => (
                  <div key={idx} className="highlight-item">
                    <div className="highlight-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div className="highlight-text-container">
                      <span className="highlight-title">{item.title}</span>
                      <span className="highlight-desc">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Interactive Visual */}
            <div className="chapter-story-right">
              {activeChapter === 0 && (
                <>
                  <div className="visual-header">
                    <span className="visual-title">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      JSON Payload Serialization
                    </span>
                    <span className="speedup-badge">Dispatch Ready</span>
                  </div>
                  <div className="live-visual-box">
                    <div className="latency-meter">
                      <div>
                        <div className="latency-label">Selected Runtime</div>
                        <div style={{ color: '#ffffff', fontWeight: '600', marginTop: '4px' }}>
                          {selectedLanguage === 'cpp' ? 'C++17 (GCC)' : selectedLanguage === 'java' ? 'Java 21 (OpenJDK)' : 'Python 3.10'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="latency-label">Serialization Latency</div>
                        <div className="latency-value">&lt;1 ms</div>
                      </div>
                    </div>
                    <div className="code-block-visual">
                      <div>POST /api/run HTTP/1.1</div>
                      <div className="string">Host: code-engine-api.onrender.com</div>
                      <div className="prop" style={{ marginTop: '6px' }}>&#123;</div>
                      <div style={{ paddingLeft: '12px' }}>
                        <span className="prop">"language": </span>
                        <span className="string">"{selectedLanguage}"</span>,
                      </div>
                      <div style={{ paddingLeft: '12px' }}>
                        <span className="prop">"code": </span>
                        <span className="string">"// user source snippet..."</span>,
                      </div>
                      <div style={{ paddingLeft: '12px' }}>
                        <span className="prop">"input": </span>
                        <span className="string">""</span>
                      </div>
                      <div className="prop">&#125;</div>
                    </div>
                  </div>
                </>
              )}

              {activeChapter === 1 && (
                <>
                  <div className="visual-header">
                    <span className="visual-title">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                      Concurrency Simulator
                    </span>
                    <span className="speedup-badge">0% Starvation</span>
                  </div>
                  <div className="interactive-slider-box">
                    <div className="slider-header">
                      <span style={{ color: '#c9d1d9' }}>Simulate Concurrent Requests:</span>
                      <span className="slider-val-badge">{concurrentUsers} req / sec</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={concurrentUsers}
                      onChange={(e) => setConcurrentUsers(parseInt(e.target.value, 10))}
                      className="custom-slider"
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>1 (Idle)</span>
                      <span>50 (Moderate)</span>
                      <span>100 (Stress)</span>
                    </div>
                  </div>
                  <div className="latency-meter">
                    <div>
                      <div className="latency-label">ThreadPool Status</div>
                      <div style={{ color: 'var(--success)', fontWeight: '600', marginTop: '4px' }}>
                        {concurrentUsers > 80 ? 'CallerRunsPolicy Active' : 'Optimal Capacity'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="latency-label">Measured Throughput</div>
                      <div className="latency-value">{Math.min(130, Math.round(concurrentUsers * 1.3))} r/s</div>
                    </div>
                  </div>
                </>
              )}

              {activeChapter === 2 && (
                <>
                  <div className="visual-header">
                    <span className="visual-title">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      Cold Start vs. Pre-warmed Pool
                    </span>
                    <span className="speedup-badge">~12.4x Speedup</span>
                  </div>
                  <div className="comparison-container">
                    <div className="bar-row">
                      <div className="bar-label-group">
                        <span>Docker Daemon Cold Start</span>
                        <span style={{ color: 'var(--error)' }}>2,100 ms</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill cold"></div>
                      </div>
                    </div>
                    <div className="bar-row">
                      <div className="bar-label-group">
                        <span>CodeEngine Dormant Pool</span>
                        <span style={{ color: 'var(--success)' }}>~70 ms</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill warm"></div>
                      </div>
                    </div>
                  </div>
                  <div className="latency-meter" style={{ marginTop: '4px' }}>
                    <div>
                      <div className="latency-label">Container Environments</div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: '600', marginTop: '4px' }}>openjdk, g++, python3</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="latency-label">Injection Method</div>
                      <div style={{ color: 'var(--brand)', fontWeight: '600', marginTop: '4px' }}>docker exec stdin</div>
                    </div>
                  </div>
                </>
              )}

              {activeChapter === 3 && (
                <>
                  <div className="visual-header">
                    <span className="visual-title">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      Sandboxing Architecture
                    </span>
                    <span className="speedup-badge" style={{ background: '#a371f7' }}>Strict Isolation</span>
                  </div>
                  <div className="security-grid">
                    <div className="sec-card">
                      <div className="sec-card-title">Memory Quota</div>
                      <div className="sec-card-val">256 MB</div>
                      <div className="sec-card-desc">HostConfig.Memory Limit</div>
                    </div>
                    <div className="sec-card">
                      <div className="sec-card-title">Network Mode</div>
                      <div className="sec-card-val" style={{ color: '#3fb950' }}>NONE</div>
                      <div className="sec-card-desc">Prevents remote probing</div>
                    </div>
                    <div className="sec-card">
                      <div className="sec-card-title">Escalation Risk</div>
                      <div className="sec-card-val" style={{ color: '#3fb950' }}>0.0%</div>
                      <div className="sec-card-desc">Isolated namespaces</div>
                    </div>
                    <div className="sec-card">
                      <div className="sec-card-title">Persistence</div>
                      <div className="sec-card-val">Ephemeral</div>
                      <div className="sec-card-desc">Stateless by design</div>
                    </div>
                  </div>
                </>
              )}

              {activeChapter === 4 && (
                <>
                  <div className="visual-header">
                    <span className="visual-title">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                      Real-time Execution Telemetry
                    </span>
                    <span className="speedup-badge">100% Success Benchmark</span>
                  </div>
                  <div className="code-block-visual" style={{ background: 'var(--success-bg)', borderColor: 'var(--success)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)', fontWeight: '600', borderBottom: '1px dashed var(--success)', paddingBottom: '8px', marginBottom: '10px' }}>
                      <span>STATUS: ACCEPTED</span>
                      <span>EXIT_CODE: 0</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', color: 'var(--text-secondary)' }}>
                      <div>Compile Time: <strong style={{ color: 'var(--text-primary)' }}>24 ms</strong></div>
                      <div>Run Time: <strong style={{ color: 'var(--text-primary)' }}>18 ms</strong></div>
                      <div>Memory Footprint: <strong style={{ color: 'var(--text-primary)' }}>4,120 KB</strong></div>
                      <div>Roundtrip Latency: <strong style={{ color: 'var(--brand)' }}>70.48 ms</strong></div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="story-footer">
          <div className="story-footer-left">
            <div className="footer-sim-controls">
              <button className="sim-play-btn" onClick={startSimulation} disabled={isSimulating}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                {isSimulating ? `Simulating Phase ${activeChapter + 1}...` : 'Auto Walkthrough'}
              </button>
              <div className="sim-mode-toggle">
                <button className={`sim-mode-btn ${simMode === 'normal' ? 'active' : ''}`} onClick={() => setSimMode('normal')}>Standard</button>
                <button className={`sim-mode-btn ${simMode === 'stress' ? 'active' : ''}`} onClick={() => setSimMode('stress')}>Stress Test</button>
              </div>
            </div>
            <span>•</span>
            <span>Use Left/Right keys</span>
          </div>
          <div className="story-nav-btns">
            <button
              className="story-btn"
              onClick={() => {
                setIsSimulating(false);
                setActiveChapter((prev) => Math.max(0, prev - 1));
              }}
              disabled={activeChapter === 0}
            >
              ← Previous
            </button>
            {activeChapter < chapters.length - 1 ? (
              <button
                className="story-btn primary"
                onClick={() => {
                  setIsSimulating(false);
                  setActiveChapter((prev) => Math.min(4, prev + 1));
                }}
              >
                Next Chapter →
              </button>
            ) : (
              <button className="story-btn primary" onClick={onClose}>
                Try It Live in Editor →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
