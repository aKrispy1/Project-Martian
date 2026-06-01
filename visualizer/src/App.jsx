import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';

const OWNER = 'aKrispy1';
const REPO = 'Project-Martian';
const STATS_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/docs/stats.json`;
const LOGS_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/docs/research_log_msm.md`;
const SPEC_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/docs/research_stage_2_symbology_and_compilation.md`;
const WAT_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/docs/compiled_output.wat`;
const LANDAUER_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/docs/landauer_stats.json`;

// Fallback data in case GitHub fetches fail (e.g., local development before push)
const defaultStats = {
  total_papers: 18,
  last_sync_epoch: "2026-06-01 18:27:46",
  current_vocabulary_size: 51,
  thermodynamic_efficiency: 99.1,
  self_hosting_stage: "Stage 1 (Seed Compiler)",
  status: "AUTONOMOUS_RUNNING"
};

const defaultLandauer = {
  total_cycles: 10000,
  irreversible: { total_energy_dissipated_ev: 420.2 },
  reversible: { total_energy_dissipated_ev: 0.0 },
  simulation_curve: Array.from({ length: 50 }, (_, i) => ({
    cycle: (i + 1) * 200,
    irreversible_energy_ev: (i + 1) * 8.4,
    reversible_energy_ev: 0.0
  }))
};

export default function App() {
  const [stats, setStats] = useState(defaultStats);
  const [logs, setLogs] = useState([]);
  const [spec, setSpec] = useState('');
  const [watCode, setWatCode] = useState('');
  const [landauer, setLandauer] = useState(defaultLandauer);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [selectedNode, setSelectedNode] = useState('Φ_State');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('terminal'); // 'terminal' | 'spec' | 'ledger'

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch Telemetry Stats
        const statsRes = await fetch(STATS_URL);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        // Fetch Research Logs
        const logsRes = await fetch(LOGS_URL);
        if (logsRes.ok) {
          const logsText = await logsRes.text();
          parseResearchLogs(logsText);
        }

        // Fetch Specifications
        const specRes = await fetch(SPEC_URL);
        if (specRes.ok) {
          const specText = await specRes.text();
          setSpec(specText);
        }

        // Fetch compiled WAT output
        const watRes = await fetch(WAT_URL);
        if (watRes.ok) {
          setWatCode(await watRes.text());
        }

        // Fetch Landauer stats
        const landauerRes = await fetch(LANDAUER_URL);
        if (landauerRes.ok) {
          setLandauer(await landauerRes.json());
        }
      } catch (err) {
        console.error("Error fetching data from remote repository, using local defaults.", err);
        // Attempt to fetch locally
        try {
          const localStats = await fetch('/docs/stats.json');
          if (localStats.ok) setStats(await localStats.json());
          
          const localLogs = await fetch('/docs/research_log_msm.md');
          if (localLogs.ok) parseResearchLogs(await localLogs.text());

          const localSpec = await fetch('/docs/research_stage_2_symbology_and_compilation.md');
          if (localSpec.ok) setSpec(await localSpec.text());

          const localWat = await fetch('/docs/compiled_output.wat');
          if (localWat.ok) setWatCode(await localWat.text());

          const localLandauer = await fetch('/docs/landauer_stats.json');
          if (localLandauer.ok) setLandauer(await localLandauer.json());
        } catch (e) {
          console.error("Local fetches failed, using hardcoded static fallbacks.");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function parseResearchLogs(text) {
    const sections = text.split('## Theme:');
    const parsed = [];
    
    sections.forEach((section, idx) => {
      if (idx === 0) return; // skip header
      const lines = section.split('\n');
      const themeHeader = lines[0].trim();
      const themeName = themeHeader.split('(Sync')[0].trim();
      const syncTime = themeHeader.includes('Sync') ? themeHeader.split('Sync Epoch:')[1].split(')')[0].trim() : '';
      const verified = themeHeader.includes('Alive2 Verified');
      
      // Extract MSM code block
      const content = lines.slice(1).join('\n');
      const msmBlockMatch = content.match(/```(?:msm)?([\s\S]*?)```/);
      const msmContent = msmBlockMatch ? msmBlockMatch[1].trim() : '';

      // Extract Papers
      const papers = [];
      const paperBlocks = content.split('* Paper');
      if (paperBlocks.length > 1) {
        paperBlocks.slice(1).forEach(block => {
          const blockLines = block.split('\n');
          const title = blockLines[0].replace(/^\s*\d+:\s*/, '').trim();
          const urlMatch = block.match(/https?:\/\/[^\s]+/);
          const url = urlMatch ? urlMatch[0] : '';
          if (title) {
            papers.push({ title, url });
          }
        });
      } else {
        const urls = content.match(/https?:\/\/arxiv\.org\/abs\/[0-9a-zA-Z./]+/g);
        if (urls) {
          urls.forEach((url, i) => {
            papers.push({ title: `Academic Paper Reference #${i+1}`, url });
          });
        }
      }

      parsed.push({
        id: idx,
        name: themeName,
        syncTime,
        msm: msmContent,
        papers,
        verified
      });
    });

    setLogs(parsed);
    if (parsed.length > 0) {
      setSelectedTheme(parsed[0]);
    }
  }

  // Helpers to draw the Landauer chart path
  function getSvgPath(curve, key, width, height, maxVal) {
    if (!curve || curve.length === 0) return '';
    const points = curve.map((d, i) => {
      const x = (i / (curve.length - 1)) * width;
      const y = height - (d[key] / maxVal) * height;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  }

  return (
    <div className="martian-app">
      {/* Outer Scanline Grid overlay */}
      <div className="grid-overlay" />
      <div className="scanlines" />

      {/* Main Header */}
      <header className="martian-header">
        <div className="header-brand">
          <div className="pulse-indicator pulse-active"></div>
          <h1>PROJECT MARTIAN</h1>
          <span className="brand-divider">//</span>
          <span className="brand-sub">COGNITIVE COMPILER CORE</span>
        </div>
        <div className="header-status">
          <div className="status-label">STATUS:</div>
          <div className="status-value">{stats.status}</div>
        </div>
      </header>

      {/* Telemetry Dashboard Grid */}
      <section className="telemetry-grid">
        <div className="telemetry-card neon-border-green">
          <span className="card-label">INGESTED LITERATURE</span>
          <h2 className="card-value text-glow-green">{stats.total_papers}</h2>
          <span className="card-meta">Academic Papers Ingested</span>
        </div>
        <div className="telemetry-card neon-border-blue">
          <span className="card-label">MSM VOCABULARY SIZE</span>
          <h2 className="card-value text-glow-blue">{stats.current_vocabulary_size}</h2>
          <span className="card-meta">Active Symbolic Tokens</span>
        </div>
        <div className="telemetry-card neon-border-purple">
          <span className="card-label">THERMODYNAMIC EFFICIENCY</span>
          <h2 className="card-value text-glow-purple">{stats.thermodynamic_efficiency}%</h2>
          <span className="card-meta">Entropy Erasure Offset</span>
        </div>
        <div className="telemetry-card neon-border-gold">
          <span className="card-label">SELF-HOSTING LIFECYCLE</span>
          <h2 className="card-value text-glow-gold font-small">{stats.self_hosting_stage}</h2>
          <span className="card-meta">Bootstrapping Progress</span>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="martian-main">
        {/* Navigation Tabs */}
        <div className="tab-bar">
          <button 
            className={`tab-btn ${activeTab === 'terminal' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            👾 MSM TERMINAL LOGS
          </button>
          <button 
            className={`tab-btn ${activeTab === 'spec' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('spec')}
          >
            📐 FOUNDATIONAL SPEC
          </button>
          <button 
            className={`tab-btn ${activeTab === 'ledger' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('ledger')}
          >
            📚 CRAWLED LEDGER
          </button>
        </div>

        {/* Tab 1: Interactive MSM Terminal & Live Ingress */}
        {activeTab === 'terminal' && (
          <div className="terminal-panel">
            <div className="theme-sidebar">
              <h3>Ingestion Epochs</h3>
              <ul>
                {logs.map(logItem => (
                  <li 
                    key={logItem.id} 
                    className={selectedTheme && selectedTheme.id === logItem.id ? 'theme-active' : ''}
                    onClick={() => setSelectedTheme(logItem)}
                  >
                    <div className="theme-title">{logItem.name}</div>
                    <div className="theme-meta">
                      {logItem.verified ? '🟢 verified' : '🟠 unverified'}
                    </div>
                  </li>
                ))}
                {logs.length === 0 && (
                  <li className="loading-item">Fetching research logs...</li>
                )}
              </ul>
            </div>

            <div className="terminal-body">
              <div className="terminal-header">
                <span className="term-dot dot-red"></span>
                <span className="term-dot dot-yellow"></span>
                <span className="term-dot dot-green"></span>
                <span className="terminal-title">msm_compiler_log://{selectedTheme ? selectedTheme.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'core'}</span>
              </div>
              <div className="terminal-content">
                {selectedTheme ? (
                  <>
                    <div className="term-meta-info">
                      <div>// MODULE CORE INITIALIZED: {selectedTheme.name}</div>
                      <div>// SYNC TIME: {selectedTheme.syncTime}</div>
                      <div>// VERIFICATION: {selectedTheme.verified ? 'Alive2 Formal Verification Passed' : 'Compiler Unverified Fallback'}</div>
                    </div>
                    <pre className="msm-code">
                      <code>{selectedTheme.msm}</code>
                    </pre>
                  </>
                ) : (
                  <div className="term-welcome">
                    <div>🛸 SYSTEM SECURE. AWAITING INITIALIZATION SWEEP...</div>
                    {loading && <div>CRAWLING DATA ARRAYS...</div>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Foundational Spec (Markdown Spec + AST Graph + WAT Compiler Display) */}
        {activeTab === 'spec' && (
          <div className="spec-panel">
            <div className="spec-header">
              <h3>Martian Language Architecture Spec</h3>
              <span>Core Repository Mapping</span>
            </div>
            <div className="spec-content">
              <div className="spec-split-container">
                {/* Left Side: Formal Markdown Specification */}
                <div className="spec-left">
                  <div className="spec-block-title">Formal Grammars</div>
                  {spec ? (
                    <pre className="spec-raw">
                      <code>{spec}</code>
                    </pre>
                  ) : (
                    <div className="loading-spec">Loading specification core schema...</div>
                  )}
                </div>

                {/* Right Side: AST Interactive SVG Graph, Thermo Limit, and compiled WASM (WAT) */}
                <div className="spec-right">
                  {/* AST Graph Visualizer */}
                  <div>
                    <div className="spec-block-title">Active AST State Machine Visualizer</div>
                    <svg className="ast-visualizer-svg">
                      {/* Lines */}
                      <line x1="50" y1="100" x2="140" y2="100" className="ast-link" />
                      <line x1="140" y1="100" x2="230" y2="100" className="ast-link" />
                      <line x1="230" y1="100" x2="310" y2="100" className="ast-link" />
                      
                      {/* Nodes */}
                      <circle cx="50" cy="100" r="18" className="ast-node" onClick={() => setSelectedNode('Γ_Context')} />
                      <circle cx="140" cy="100" r="18" className="ast-node" onClick={() => setSelectedNode('Φ_State')} />
                      <circle cx="230" cy="100" r="18" className="ast-node" onClick={() => setSelectedNode('Alive2_Proof')} />
                      <circle cx="310" cy="100" r="18" className="ast-node" onClick={() => setSelectedNode('WASM_WAT')} />
                      
                      {/* Text */}
                      <text x="50" y="103" className="ast-text">Γ</text>
                      <text x="140" y="103" className="ast-text">Φ</text>
                      <text x="230" y="103" className="ast-text">Alive2</text>
                      <text x="310" y="103" className="ast-text">WAT</text>
                    </svg>
                    
                    {/* Node Description Details */}
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', background: '#020000', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                      {selectedNode === 'Γ_Context' && <div><strong>Node Γ (Typing Context):</strong> Declares variables and explicit mathematical types (e.g., ℤ, ℝ) to lock in context parameters.</div>}
                      {selectedNode === 'Φ_State' && <div><strong>Node Φ (State Transitions):</strong> Maps high-level operations (e.g., ⟨x, y⟩ ➔ ⟨x+y, x-y⟩) stack transitions.</div>}
                      {selectedNode === 'Alive2_Proof' && <div><strong>Node Alive2 (Formal Verification):</strong> Verifies compiler translations using mathematical equivalencies to guarantee zero logic drift.</div>}
                      {selectedNode === 'WASM_WAT' && <div><strong>Node WAT (WebAssembly Compiler):</strong> Generates portable WebAssembly stack-based assembly code to execute on runtimes.</div>}
                    </div>
                  </div>

                  {/* Thermodynamic Limit Tracker */}
                  <div>
                    <div className="spec-block-title">Landauer Thermodynamic Limit (Simulated)</div>
                    <div className="thermo-chart-container">
                      <svg className="thermo-chart-svg">
                        {/* Axes */}
                        <line x1="30" y1="10" x2="30" y2="130" className="chart-axis" />
                        <line x1="30" y1="130" x2="330" y2="130" className="chart-axis" />
                        
                        {/* Lines */}
                        <path 
                          d={getSvgPath(landauer.simulation_curve, 'irreversible_energy_ev', 300, 120, landauer.irreversible.total_energy_dissipated_ev || 500)} 
                          className="chart-line-irrev"
                          transform="translate(30, 10)"
                        />
                        <path 
                          d={getSvgPath(landauer.simulation_curve, 'reversible_energy_ev', 300, 120, landauer.irreversible.total_energy_dissipated_ev || 500)} 
                          className="chart-line-rev"
                          transform="translate(30, 10)"
                        />
                        
                        {/* Graph labels */}
                        <text x="5" y="20" className="chart-text">420 eV</text>
                        <text x="5" y="130" className="chart-text">0 eV</text>
                        <text x="310" y="145" className="chart-text">Cycles</text>
                      </svg>
                      <div className="chart-legend">
                        <div className="legend-item">
                          <div className="legend-color" style={{ backgroundColor: 'var(--neon-red)' }} />
                          <span>Standard CPU (Irreversible AND/ADD)</span>
                        </div>
                        <div className="legend-item">
                          <div className="legend-color" style={{ backgroundColor: '#10b981' }} />
                          <span>Martian Core (Reversible Toffoli/MSM)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Compiled WAT Code */}
                  <div>
                    <div className="spec-block-title">Martian VM Compiled WASM (WAT) Output</div>
                    <pre style={{ maxHeight: '140px', overflowY: 'auto', background: '#020000', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--neon-orange)' }}>
                      <code>{watCode || `(module\n  (func $transition (param $x i32) (param $y i32) (result i32)\n    local.get $x\n    local.get $y\n    i32.add\n  )\n)`}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Crawled Ledger */}
        {activeTab === 'ledger' && (
          <div className="ledger-panel">
            <div className="ledger-header">
              <h3>Ingested Literature References</h3>
              <p>These academic publications were autonomously retrieved, evaluated, and compiled by the cognitive verifier hive.</p>
            </div>
            <div className="ledger-table-container">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Academic Reference</th>
                    <th>Ingress Network Node</th>
                    <th>Verification Path</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.flatMap(l => l.papers).map((paper, idx) => (
                    <tr key={idx}>
                      <td className="paper-title">{paper.title}</td>
                      <td><span className="badge badge-green">arXiv Node</span></td>
                      <td>
                        <a href={paper.url} target="_blank" rel="noopener noreferrer" className="link-arrow">
                          RESOLVE ABSTRACT ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                  {logs.flatMap(l => l.papers).length === 0 && (
                    <tr>
                      <td colSpan="3" className="no-data">Awaiting crawls. Raw telemetry pending verification.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="martian-footer">
        <div>🔒 CTL Sandboxed Programmatic Safe Execution.</div>
        <div>Last Ingress Sweep: {stats.last_sync_epoch} UTC</div>
      </footer>
      <Analytics />
    </div>
  );
}
