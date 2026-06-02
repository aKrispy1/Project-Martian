import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';

const OWNER = 'aKrispy1';
const REPO = 'Project-Martian';
const STATS_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/docs/stats.json`;
const LOGS_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/docs/research_log_msm.md`;
const SPEC_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/docs/research_stage_2_symbology_and_compilation.md`;
const WAT_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/docs/compiled_output.wat`;
const LANDAUER_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/docs/landauer_stats.json`;
const SELF_HOSTING_STATS_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/docs/self_hosting_stats.json`;
const COMPILER_MSM_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/compiler.msm`;
const COMPILER_WAT_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/docs/compiler_executable.wat`;
const AVST_METRICS_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/docs/avst_metrics.json`;
const CA_WAT_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/docs/ca_crystallized.wat`;

// Fallback data in case GitHub fetches fail (e.g., local development before push)
const defaultStats = {
  total_papers: 18,
  last_sync_epoch: "2026-06-02 00:32:00",
  current_vocabulary_size: 51,
  thermodynamic_efficiency: 99.3,
  self_hosting_stage: "Stage 2 (Martian Compiler Source)",
  status: "SELF_HOSTING_ACTIVE"
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

const defaultSelfHosting = {
  status: "SELF_HOSTING_ACTIVE",
  compiler_msm_hash: 3484776783,
  compiler_wat_hash: 3814708803,
  equivalent_proof_verified: true,
  bootstrap_cycles: 3,
  last_bootstrap_time: "2026-06-02 00:30:00"
};

const defaultAvstMetrics = {
  vsa: {
    dimension: 10000,
    similarities: [1.0000, 0.7000],
    noise_robustness_verified: true
  },
  ca: {
    grid_size: [4, 4],
    timesteps: 10,
    patterns: [
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1]
    ],
    crystallized_gates: [2, 3, 2, 5, 3, 1, 0, 1, 5, 2, 4, 1, 2, 0, 0, 5],
    gate_search_errors: [8, 6, 4, 2],
    msm_exported: "Γ ⊢ c_0_0 : ℤ ...\nΦ_state: ⟨c_0_0...⟩"
  },
  marl: {
    success_rate: 0.4,
    episodes: [
      {
        target: [4, 7],
        decoded_coords: [4, 7],
        steps: 8,
        success: true,
        trajectory: [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [4, 5], [4, 6], [4, 7]],
        similarity: 0.7000
      }
    ]
  }
};

export default function App() {
  const [stats, setStats] = useState(defaultStats);
  const [logs, setLogs] = useState([]);
  const [spec, setSpec] = useState('');
  const [watCode, setWatCode] = useState('');
  const [landauer, setLandauer] = useState(defaultLandauer);
  const [selfHosting, setSelfHosting] = useState(defaultSelfHosting);
  const [avstMetrics, setAvstMetrics] = useState(defaultAvstMetrics);
  const [caWat, setCaWat] = useState('');
  const [compilerMsm, setCompilerMsm] = useState('');
  const [compilerWat, setCompilerWat] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [selectedNode, setSelectedNode] = useState('Φ_State');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('terminal'); // 'terminal' | 'spec' | 'bootstrap' | 'avst' | 'ledger'
  const [caStep, setCaStep] = useState(0);

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

        // Fetch Self-hosting stats
        const selfHostingRes = await fetch(SELF_HOSTING_STATS_URL);
        if (selfHostingRes.ok) {
          setSelfHosting(await selfHostingRes.json());
        }

        // Fetch compiler.msm source
        const compilerMsmRes = await fetch(COMPILER_MSM_URL);
        if (compilerMsmRes.ok) {
          setCompilerMsm(await compilerMsmRes.text());
        }

        // Fetch compiler_executable.wat source
        const compilerWatRes = await fetch(COMPILER_WAT_URL);
        if (compilerWatRes.ok) {
          setCompilerWat(await compilerWatRes.text());
        }

        // Fetch AVST Metrics
        const avstRes = await fetch(AVST_METRICS_URL);
        if (avstRes.ok) {
          setAvstMetrics(await avstRes.json());
        }

        // Fetch CA WAT
        const caWatRes = await fetch(CA_WAT_URL);
        if (caWatRes.ok) {
          setCaWat(await caWatRes.text());
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

          const localSelfHosting = await fetch('/docs/self_hosting_stats.json');
          if (localSelfHosting.ok) setSelfHosting(await localSelfHosting.json());

          const localCompilerMsm = await fetch('/compiler.msm');
          if (localCompilerMsm.ok) setCompilerMsm(await localCompilerMsm.text());

          const localCompilerWat = await fetch('/docs/compiler_executable.wat');
          if (localCompilerWat.ok) setCompilerWat(await localCompilerWat.text());

          const localAvst = await fetch('/docs/avst_metrics.json');
          if (localAvst.ok) setAvstMetrics(await localAvst.json());

          const localCaWat = await fetch('/docs/ca_crystallized.wat');
          if (localCaWat.ok) setCaWat(await localCaWat.text());
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

  // Gate type label decoder
  const gateLabels = ["AND", "OR", "XOR", "NOT", "NAND", "NOR"];

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
            className={`tab-btn ${activeTab === 'bootstrap' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('bootstrap')}
          >
            🌀 SELF-HOSTING LOOP
          </button>
          <button 
            className={`tab-btn ${activeTab === 'avst' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('avst')}
          >
            🧠 NEURAL AVST ENGINE
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

        {/* Tab 3: Self-Hosting / Bootstrapping Loop View */}
        {activeTab === 'bootstrap' && (
          <div className="spec-panel">
            <div className="spec-header">
              <h3>Chicken-or-the-Egg Bootstrapping Lifecycle</h3>
              <span style={{ color: 'var(--neon-gold)' }}>Status: {selfHosting.status}</span>
            </div>
            <div className="spec-content">
              <div className="spec-split-container">
                {/* Left Side: Martian self-compiler source code */}
                <div className="spec-left">
                  <div className="spec-block-title">Martian Self-Compiler Source Logic (compiler.msm)</div>
                  <pre className="spec-raw" style={{ fontSize: '0.75rem', lineHeight: '1.4', color: '#fb923c' }}>
                    <code>{compilerMsm || `// Ingesting compiler.msm\nΓ ⊢ src : Vector[ℤ, 256], wat : Vector[ℤ, 512], pc : ℤ, wat_len : ℤ\nΦ_compiler: ⟨wat[wat_len]⟩ ➔ ⟨103 if src[pc] == 120 else 0⟩`}</code>
                  </pre>
                </div>

                {/* Right Side: T-Diagram Flow & Telemetry Status */}
                <div className="spec-right">
                  {/* T-Diagram visual mapping */}
                  <div>
                    <div className="spec-block-title">Active Bootstrapping T-Diagram Flow</div>
                    <div style={{ background: '#020000', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>1. Compiler Source:</span>
                        <span style={{ color: 'var(--neon-orange)' }}>compiler.msm</span>
                      </div>
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>⬇ compiled by C_seed (Python VM)</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>2. Seed Executable:</span>
                        <span style={{ color: 'var(--neon-amber)' }}>compiler_executable.wat</span>
                      </div>
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>⬇ compiles compiler.msm source</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>3. Replicated Executable:</span>
                        <span style={{ color: 'var(--neon-gold)' }}>compiler_replicated.wat</span>
                      </div>
                      <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
                        <span>4. Proof of Equivalence:</span>
                        <span style={{ color: selfHosting.equivalent_proof_verified ? '#10b981' : 'var(--neon-red)' }}>
                          {selfHosting.equivalent_proof_verified ? '🟢 VERIFIED EQUIVALENT' : '🔴 PENDING'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Hashes */}
                  <div>
                    <div className="spec-block-title">Verification Hashes & Telemetry</div>
                    <div style={{ background: '#020000', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>MSM Source Hash:</span>
                        <span style={{ color: 'var(--neon-orange)' }}>{selfHosting.compiler_msm_hash}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>WAT Binary Hash:</span>
                        <span style={{ color: 'var(--neon-gold)' }}>{selfHosting.compiler_wat_hash}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Bootstrap Cycles:</span>
                        <span>{selfHosting.bootstrap_cycles} steps</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Last Compiled:</span>
                        <span>{selfHosting.last_bootstrap_time} UTC</span>
                      </div>
                    </div>
                  </div>

                  {/* Executable compiler WAT preview */}
                  <div>
                    <div className="spec-block-title">WASM Compiler (compiler_executable.wat)</div>
                    <pre style={{ maxHeight: '120px', overflowY: 'auto', background: '#020000', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--neon-orange)' }}>
                      <code>{compilerWat || `(module\n  (memory (export "memory") 1)\n  (global $pc (mut i32) (i32.const 0))\n  (func $transition (export "transition")\n    global.get $pc\n    i32.const 1\n    i32.add\n    global.set $pc\n  )\n)`}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Neural AVST Engine Simulation Dashboard */}
        {activeTab === 'avst' && (
          <div className="spec-panel">
            <div className="spec-header">
              <h3>Autopoietic Vector-Symbolic Topology (AVST) Baseline Harness</h3>
              <span style={{ color: 'var(--neon-orange)' }}>VSA Robustness: {avstMetrics.vsa.noise_robustness_verified ? '🟢 verified' : '🔴 failed'}</span>
            </div>
            <div className="spec-content">
              <div className="spec-split-container">
                {/* Left Side: DiffLogic CA Checkerboard pattern animator */}
                <div className="spec-left">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div className="spec-block-title">DiffLogic CA Checkerboard Pattern (Step: {caStep}/10)</div>
                    <input 
                      type="range" 
                      min="0" 
                      max="10" 
                      value={caStep} 
                      onChange={(e) => setCaStep(parseInt(e.target.value))}
                      style={{ accentColor: 'var(--neon-orange)', cursor: 'pointer' }}
                    />
                  </div>
                  
                  {/* Render 4x4 logic grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 50px)', gap: '8px', justifyContent: 'center', margin: '2rem 0' }}>
                    {avstMetrics.ca.patterns[caStep] && avstMetrics.ca.patterns[caStep].map((val, idx) => (
                      <div 
                        key={idx} 
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '4px',
                          background: val === 1 ? 'radial-gradient(circle, #ea580c 0%, #000 100%)' : '#030100',
                          border: val === 1 ? '2px solid var(--neon-orange)' : '1px solid var(--border-color)',
                          boxShadow: val === 1 ? '0 0 15px var(--neon-orange-glow)' : 'none',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          fontSize: '0.65rem',
                          color: '#fff',
                          fontFamily: 'var(--font-mono)',
                          transition: 'all 0.15s ease-out'
                        }}
                      >
                        {gateLabels[avstMetrics.ca.crystallized_gates[idx]] || 'X'}
                      </div>
                    ))}
                  </div>
                  
                  <div className="spec-block-title">Exported MSM Compiler Interface</div>
                  <pre className="spec-raw" style={{ fontSize: '0.7rem', maxHeight: '130px', overflowY: 'auto', background: '#020000', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.5rem', color: '#fda4af' }}>
                    <code>{avstMetrics.ca.msm_exported}</code>
                  </pre>
                </div>

                {/* Right Side: Rover grid coordinate trajectory, similarity graphs, and crystallized WAT */}
                <div className="spec-right">
                  {/* Trajectory visualizer */}
                  <div>
                    <div className="spec-block-title">MARL Rover rendezvous grid trajectory</div>
                    <div style={{ background: '#020000', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.5rem', display: 'flex', gap: '0.75rem', fontSize: '0.7rem' }}>
                      <div style={{ flex: '1', display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '2px', aspectRatio: '1' }}>
                        {Array.from({ length: 100 }).map((_, idx) => {
                          const x = idx % 10;
                          const y = Math.floor(idx / 10);
                          const isTarget = avstMetrics.marl.episodes[0].target[0] === x && avstMetrics.marl.episodes[0].target[1] === y;
                          const isPath = avstMetrics.marl.episodes[0].trajectory.some(p => p[0] === x && p[1] === y);
                          const isStart = avstMetrics.marl.episodes[0].trajectory[0][0] === x && avstMetrics.marl.episodes[0].trajectory[0][1] === y;
                          
                          let bg = '#020000';
                          let border = '1px solid rgba(249, 115, 22, 0.05)';
                          if (isStart) bg = 'var(--neon-blue, #3b82f6)';
                          else if (isTarget) bg = '#10b981';
                          else if (isPath) bg = 'rgba(234, 88, 12, 0.4)';
                          
                          return (
                            <div 
                              key={idx} 
                              style={{ 
                                background: bg, 
                                border: border,
                                borderRadius: '1px'
                              }} 
                            />
                          );
                        })}
                      </div>
                      
                      <div style={{ width: '120px', display: 'flex', flexDirection: 'column', gap: '0.4rem', justifyContent: 'center' }}>
                        <div>🟢 Target: ({avstMetrics.marl.episodes[0].target[0]}, {avstMetrics.marl.episodes[0].target[1]})</div>
                        <div>🔵 Start: ({avstMetrics.marl.episodes[0].trajectory[0][0]}, {avstMetrics.marl.episodes[0].trajectory[0][1]})</div>
                        <div>🟠 Steps: {avstMetrics.marl.episodes[0].steps}</div>
                        <div>📈 Sim: {avstMetrics.marl.episodes[0].similarity.toFixed(4)}</div>
                      </div>
                    </div>
                  </div>

                  {/* VSA performance details */}
                  <div>
                    <div className="spec-block-title">VSA Bipolar Encoding Similarities</div>
                    <div style={{ background: '#020000', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Clean Code Decoded Similarity:</span>
                        <span style={{ color: '#10b981' }}>{avstMetrics.vsa.similarities[0].toFixed(4)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>15% Noise Decoded Similarity:</span>
                        <span style={{ color: 'var(--neon-gold)' }}>{avstMetrics.vsa.similarities[1].toFixed(4)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Target Dimension:</span>
                        <span>{avstMetrics.vsa.dimension} bits</span>
                      </div>
                    </div>
                  </div>

                  {/* VM compiler bridge WAT preview */}
                  <div>
                    <div className="spec-block-title">VM Compiled CA WebAssembly (ca_crystallized.wat)</div>
                    <pre style={{ maxHeight: '110px', overflowY: 'auto', background: '#020000', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--neon-orange)' }}>
                      <code>{caWat || `(module\n  (global $c_0_0 (mut i32) (i32.const 0))\n  (func $transition\n    global.get $c_0_0\n    i32.eqz\n    global.set $c_0_0\n  )\n)`}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Crawled Ledger */}
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
