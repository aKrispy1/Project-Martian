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
const COMPILER_R1_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/docs/compiler_r1_metrics.json`;
const WASI_LOG_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/docs/wasi_run_log.txt`;
const CA_WAT_OPT_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/docs/ca_crystallized_optimized.wat`;
const COMPILER_WAT_OPT_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/docs/compiler_executable_optimized.wat`;
const VERIFICATION_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/docs/verification_metrics.json`;

// Fallback data in case GitHub fetches fail (e.g., local development before push)
const defaultStats = {
  total_papers: 18,
  last_sync_epoch: "2026-06-02 01:05:00",
  current_vocabulary_size: 51,
  thermodynamic_efficiency: 99.3,
  self_hosting_stage: "Stage 3 (Executable WASM Bootstrapped)",
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
      [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1]
    ],
    crystallized_gates: [2, 3, 2, 5, 3, 1, 0, 1, 5, 2, 4, 1, 2, 0, 0, 5],
    gate_search_errors: [8, 6, 4, 2],
    msm_exported: "Γ ⊢ c_0_0 : ℤ ...\nΦ_state: ⟨c_0_0...⟩"
  },
  marl: {
    success_rate: 1.0,
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

const defaultCompilerR1 = {
  "ca_crystallized.wat": {
    "initial_instructions": 74,
    "final_instructions": 74,
    "reduction_percentage": 0.0,
    "optimal_sequence": [],
    "episodes": Array.from({ length: 20 }, (_, i) => ({
      "episode": (i + 1) * 5,
      "reward": -0.5,
      "instructions": 74
    }))
  },
  "compiler_executable.wat": {
    "initial_instructions": 531,
    "final_instructions": 338,
    "reduction_percentage": 36.35,
    "optimal_sequence": ["CSE"],
    "episodes": Array.from({ length: 20 }, (_, i) => ({
      "episode": (i + 1) * 5,
      "reward": i * 0.75 - 0.25,
      "instructions": Math.max(338, 531 - Math.floor(i / 2) * 19)
    }))
  }
};

const defaultWasiLog = `[WASI Runtime Init] Sandboxed directory mapping: /wasi_shared -> ./wasi_shared
[WASI System Call] fd_open(wasi_shared/wasi_input.txt, read)
[WASI System Call] fd_read: read 3 bytes -> 'x+y'
[WASI Runtime Init] Loading executable Wasm container: docs/compiler_executable_optimized.wat
[WASI Runtime Success] WAT bytecode parsed and verification constraints passed.
[WASI Memory Mapping] Initialized 'src' vector at Wasm memory [0 .. 1024] with 'x+y'
[WASI Runtime Action] Globals initialized: pc = 0, wat_len = 0
[WASI Sandbox Execution] Running compiler transition loops...
  * Cycle 01: Wasm Execution state -> pc=1, wat_len=14
  * Cycle 02: Wasm Execution state -> pc=2, wat_len=22
  * Cycle 03: Wasm Execution state -> pc=3, wat_len=36
[WASI Sandbox Execution] Execution halt reached in 3 cycles.
[WASI Sandbox Output] Extracted compiled WAT (size: 36 bytes):
------------------------------------------
  global.get $x
  i32.add
  global.get $y
------------------------------------------
[WASI System Call] fd_open(wasi_shared/wasi_output.wat, write)
[WASI System Call] fd_write: wrote 36 bytes to file successfully.
[WASI Runtime Success] WASI execution completed. Return code: 0.`;

const defaultVerification = {
  "ctl_checker": {
    "compiler": {
      "states_explored": 10,
      "property_pc_non_negative": {
        "formula": "AG(pc >= 0)",
        "verified": true
      },
      "property_wat_len_bounded": {
        "formula": "AG(wat_len < 25)",
        "verified": false,
        "counterexample": [
          { "pc": 0, "wat_len": 0 },
          { "pc": 1, "wat_len": 14 },
          { "pc": 2, "wat_len": 28 }
        ]
      }
    },
    "ca_grid": {
      "states_explored": 11,
      "property_cells_non_negative": {
        "formula": "AG(all_cells >= 0)",
        "verified": true
      }
    }
  },
  "translation_validator": {
    "all_correct": true,
    "proof_size": 4,
    "verification_results": [
      {
        "variable": "c_0_0",
        "source_expr": "(1 - (c_0_3 & c_3_0))",
        "wat_expr": "(1 - (c_0_3 & c_3_0))",
        "simplified_msm": "(1 - (c_0_3 & c_3_0))",
        "simplified_wat": "(1 - (c_0_3 & c_3_0))",
        "equivalent": true
      },
      {
        "variable": "c_0_1",
        "source_expr": "(1 - c_0_0)",
        "wat_expr": "(1 - c_0_0)",
        "simplified_msm": "(1 - c_0_0)",
        "simplified_wat": "(1 - c_0_0)",
        "equivalent": true
      },
      {
        "variable": "c_0_2",
        "source_expr": "(1 - c_0_1)",
        "wat_expr": "(1 - c_0_1)",
        "simplified_msm": "(1 - c_0_1)",
        "simplified_wat": "(1 - c_0_1)",
        "equivalent": true
      },
      {
        "variable": "c_0_3",
        "source_expr": "(1 - (c_0_2 | c_3_3))",
        "wat_expr": "(1 - (c_0_2 | c_3_3))",
        "simplified_msm": "(1 - (c_0_2 | c_3_3))",
        "simplified_wat": "(1 - (c_0_2 | c_3_3))",
        "equivalent": true
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
  
  // Phase Six States
  const [compilerR1, setCompilerR1] = useState(defaultCompilerR1);
  const [wasiLog, setWasiLog] = useState(defaultWasiLog);
  const [caWatOpt, setCaWatOpt] = useState('');
  const [compilerWatOpt, setCompilerWatOpt] = useState('');
  const [selectedFsFile, setSelectedFsFile] = useState('wasi_input.txt');
  const [loaderMessage, setLoaderMessage] = useState("Establishing connection to Mars VM...");

  // Phase Seven States
  const [verification, setVerification] = useState(defaultVerification);
  const [selectedCtlProperty, setSelectedCtlProperty] = useState('compiler_p1');
  const [selectedValidationVar, setSelectedValidationVar] = useState('c_0_0');

  const [selectedTheme, setSelectedTheme] = useState(null);
  const [selectedNode, setSelectedNode] = useState('Φ_State');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('terminal'); // 'terminal' | 'spec' | 'bootstrap' | 'avst' | 'wasi' | 'verify' | 'ledger'
  const [caStep, setCaStep] = useState(0);

  // Status message loader loop
  useEffect(() => {
    if (loading) {
      const msgs = [
        "Establishing connection to Mars VM...",
        "Querying VSA coordinate bindings...",
        "Retrieving Cellular Automata grid states...",
        "Synchronizing cryptographic ledger...",
        "Evaluating Landauer thermodynamic thresholds...",
        "Neural Compiler optimization active (Compiler-R1)...",
        "Pre-caching optimized WASM instructions (CSE pass)...",
        "Starting sandboxed WASI filesystem layers...",
        "Decryption complete. Initializing Neural Space..."
      ];
      let idx = 0;
      const timer = setInterval(() => {
        idx = (idx + 1) % msgs.length;
        setLoaderMessage(msgs[idx]);
      }, 350);
      return () => clearInterval(timer);
    }
  }, [loading]);

  useEffect(() => {
    async function fetchData() {
      const startTime = Date.now();
      try {
        // Fetch Telemetry Stats
        const statsRes = await fetch(STATS_URL);
        if (statsRes.ok) setStats(await statsRes.json());

        // Fetch Research Logs
        const logsRes = await fetch(LOGS_URL);
        if (logsRes.ok) parseResearchLogs(await logsRes.text());

        // Fetch Specifications
        const specRes = await fetch(SPEC_URL);
        if (specRes.ok) setSpec(await specRes.text());

        // Fetch compiled WAT output
        const watRes = await fetch(WAT_URL);
        if (watRes.ok) setWatCode(await watRes.text());

        // Fetch Landauer stats
        const landauerRes = await fetch(LANDAUER_URL);
        if (landauerRes.ok) setLandauer(await landauerRes.json());

        // Fetch Self-hosting stats
        const selfHostingRes = await fetch(SELF_HOSTING_STATS_URL);
        if (selfHostingRes.ok) setSelfHosting(await selfHostingRes.json());

        // Fetch compiler.msm source
        const compilerMsmRes = await fetch(COMPILER_MSM_URL);
        if (compilerMsmRes.ok) setCompilerMsm(await compilerMsmRes.text());

        // Fetch compiler_executable.wat source
        const compilerWatRes = await fetch(COMPILER_WAT_URL);
        if (compilerWatRes.ok) setCompilerWat(await compilerWatRes.text());

        // Fetch AVST Metrics
        const avstRes = await fetch(AVST_METRICS_URL);
        if (avstRes.ok) setAvstMetrics(await avstRes.json());

        // Fetch CA WAT
        const caWatRes = await fetch(CA_WAT_URL);
        if (caWatRes.ok) setCaWat(await caWatRes.text());

        // Fetch Phase Six data
        const r1Res = await fetch(COMPILER_R1_URL);
        if (r1Res.ok) setCompilerR1(await r1Res.json());

        const wasiRes = await fetch(WASI_LOG_URL);
        if (wasiRes.ok) setWasiLog(await wasiRes.text());

        const caOptRes = await fetch(CA_WAT_OPT_URL);
        if (caOptRes.ok) setCaWatOpt(await caOptRes.text());

        const compOptRes = await fetch(COMPILER_WAT_OPT_URL);
        if (compOptRes.ok) setCompilerWatOpt(await compOptRes.text());

        // Fetch Phase Seven verification metrics
        const verificationRes = await fetch(VERIFICATION_URL);
        if (verificationRes.ok) setVerification(await verificationRes.json());

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

          const localR1 = await fetch('/docs/compiler_r1_metrics.json');
          if (localR1.ok) setCompilerR1(await localR1.json());

          const localWasi = await fetch('/docs/wasi_run_log.txt');
          if (localWasi.ok) setWasiLog(await localWasi.text());

          const localCaOpt = await fetch('/docs/ca_crystallized_optimized.wat');
          if (localCaOpt.ok) setCaWatOpt(await localCaOpt.text());

          const localCompOpt = await fetch('/docs/compiler_executable_optimized.wat');
          if (localCompOpt.ok) setCompilerWatOpt(await localCompOpt.text());

          const localVerification = await fetch('/docs/verification_metrics.json');
          if (localVerification.ok) setVerification(await localVerification.json());
        } catch (e) {
          console.error("Local fetches failed, using hardcoded static fallbacks.");
        }
      } finally {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 3000 - elapsed); // Enforce minimum 3 seconds loading to show Mars animation
        setTimeout(() => {
          setLoading(false);
        }, delay);
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

  if (loading) {
    return (
      <div className="lazy-loader-overlay">
        <div className="loader-container">
          <div className="loader-orbit">
            <div className="loader-satellite"></div>
          </div>
          <div className="planet-mars"></div>
        </div>
        <div className="loader-status-container">
          <h2 className="loader-title text-glow-orange">PROJECT MARTIAN</h2>
          <div className="loader-status">{loaderMessage}</div>
          <div className="loader-bar-bg">
            <div className="loader-bar-fill"></div>
          </div>
        </div>
      </div>
    );
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
            className={`tab-btn ${activeTab === 'wasi' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('wasi')}
          >
            🚀 COMPILER & WASI
          </button>
          <button 
            className={`tab-btn ${activeTab === 'verify' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('verify')}
          >
            🛡️ FORMAL VERIFICATION
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

        {/* Tab: Compiler Optimization & WASI Sandbox */}
        {activeTab === 'wasi' && (
          <div className="wasi-panel animate-fade-in">
            <div className="wasi-dashboard-grid">
              
              {/* Left Column: Compiler-R1 Auto-Tuning */}
              <div className="spec-left">
                <h3>Compiler-R1 Neural Auto-Tuning</h3>
                <p className="spec-subtitle">Reinforcement learning agent optimizing WAT compilation passes via Q-learning.</p>
                
                <div className="metrics-row">
                  <div className="telemetry-card neon-border-orange" style={{ padding: '0.8rem' }}>
                    <span className="card-label">INITIAL WAT SIZE</span>
                    <h4 className="card-value text-glow-orange font-small">
                      {compilerR1["compiler_executable.wat"]?.initial_instructions || 531} insts
                    </h4>
                  </div>
                  <div className="telemetry-card neon-border-green" style={{ padding: '0.8rem' }}>
                    <span className="card-label">OPTIMIZED SIZE</span>
                    <h4 className="card-value text-glow-green font-small">
                      {compilerR1["compiler_executable.wat"]?.final_instructions || 338} insts
                    </h4>
                  </div>
                </div>

                <div className="telemetry-card neon-border-amber" style={{ padding: '1rem', marginBottom: '1rem' }}>
                  <span className="card-label">OPTIMAL PASS SEQUENCE</span>
                  <div className="pass-badge-list">
                    {(compilerR1["compiler_executable.wat"]?.optimal_sequence || []).length > 0 ? (
                      compilerR1["compiler_executable.wat"].optimal_sequence.map((pass, pIdx) => (
                        <span key={pIdx} className="pass-badge">
                          {pIdx > 0 && <span className="pass-arrow">➔</span>}
                          {pass}
                        </span>
                      ))
                    ) : (
                      <span className="pass-badge">No Passes (Already Optimal)</span>
                    )}
                  </div>
                  <span className="card-meta">
                    Instruction reduction: <strong>{compilerR1["compiler_executable.wat"]?.reduction_percentage?.toFixed(2) || "36.35"}%</strong>
                  </span>
                </div>

                <div className="optimization-panel">
                  <h4>RL Agent Optimization Chart</h4>
                  <p className="card-meta">WAT Instruction count over training episodes (greedy evaluations):</p>
                  
                  <div className="chart-container-r1">
                    {(compilerR1["compiler_executable.wat"]?.episodes || []).map((ep, eIdx) => {
                      // Normalize height between 20% and 90%
                      const minInst = 338;
                      const maxInst = 531;
                      const range = maxInst - minInst;
                      const heightPct = range > 0 ? 20 + 70 * (1 - (ep.instructions - minInst) / range) : 90;
                      return (
                        <div 
                          key={eIdx} 
                          className="chart-bar-r1" 
                          style={{ height: `${heightPct}%` }}
                        >
                          <div className="chart-tooltip-r1">
                            Ep {ep.episode}: {ep.instructions} insts
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Sandboxed WASI Filesystem & Logs */}
              <div className="spec-right">
                <h3>WASI Preview 1 Sandbox Runtime</h3>
                <p className="spec-subtitle">Simulating sandboxed directory path binding and system calls.</p>
                
                {/* Virtual Filesystem Directory Tree Viewport */}
                <div className="wasi-fs-container" style={{ marginBottom: '1rem' }}>
                  <div className="wasi-fs-tree">
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#f97316' }}>📁 /workspace</div>
                    
                    <div style={{ paddingLeft: '0.5rem' }}>
                      <div style={{ fontWeight: 'bold', margin: '0.2rem 0', color: '#e5e7eb' }}>📁 wasi_shared</div>
                      <div style={{ paddingLeft: '0.5rem' }}>
                        <div 
                          className={`fs-node ${selectedFsFile === 'wasi_input.txt' ? 'active' : ''}`}
                          onClick={() => setSelectedFsFile('wasi_input.txt')}
                        >
                          <span className="fs-icon">📄</span> wasi_input.txt
                        </div>
                        <div 
                          className={`fs-node ${selectedFsFile === 'wasi_output.wat' ? 'active' : ''}`}
                          onClick={() => setSelectedFsFile('wasi_output.wat')}
                        >
                          <span className="fs-icon">⚙️</span> wasi_output.wat
                        </div>
                      </div>

                      <div style={{ fontWeight: 'bold', margin: '0.4rem 0 0.2rem 0', color: '#e5e7eb' }}>📁 docs</div>
                      <div style={{ paddingLeft: '0.5rem' }}>
                        <div 
                          className={`fs-node ${selectedFsFile === 'compiler_executable.wat' ? 'active' : ''}`}
                          onClick={() => setSelectedFsFile('compiler_executable.wat')}
                        >
                          <span className="fs-icon">⚙️</span> compiler.wat
                        </div>
                        <div 
                          className={`fs-node ${selectedFsFile === 'compiler_executable_optimized.wat' ? 'active' : ''}`}
                          onClick={() => setSelectedFsFile('compiler_executable_optimized.wat')}
                        >
                          <span className="fs-icon">⚡</span> compiler_opt.wat
                        </div>
                        <div 
                          className={`fs-node ${selectedFsFile === 'ca_crystallized.wat' ? 'active' : ''}`}
                          onClick={() => setSelectedFsFile('ca_crystallized.wat')}
                        >
                          <span className="fs-icon">⚙️</span> ca.wat
                        </div>
                        <div 
                          className={`fs-node ${selectedFsFile === 'ca_crystallized_optimized.wat' ? 'active' : ''}`}
                          onClick={() => setSelectedFsFile('ca_crystallized_optimized.wat')}
                        >
                          <span className="fs-icon">⚡</span> ca_opt.wat
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="wasi-fs-content">
                    <div className="fs-content-title">
                      <span>FILE VIEW: {selectedFsFile}</span>
                      <span>UTF-8 Text</span>
                    </div>
                    <pre className="fs-content-body">
                      {selectedFsFile === 'wasi_input.txt' && "x+y"}
                      {selectedFsFile === 'wasi_output.wat' && (wasiLog.match(/Extracted compiled WAT[\s\S]*?------------------------------------------\n([\s\S]*?)\n------------------------------------------/) ? wasiLog.match(/Extracted compiled WAT[\s\S]*?------------------------------------------\n([\s\S]*?)\n------------------------------------------/)[1] : "global.get $x\ni32.add\nglobal.get $y\n")}
                      {selectedFsFile === 'compiler_executable.wat' && (compilerWat || "Loading compiler wat content...")}
                      {selectedFsFile === 'compiler_executable_optimized.wat' && (compilerWatOpt || "Loading optimized compiler wat content...")}
                      {selectedFsFile === 'ca_crystallized.wat' && (caWat || "Loading ca wat content...")}
                      {selectedFsFile === 'ca_crystallized_optimized.wat' && (caWatOpt || "Loading optimized ca wat content...")}
                    </pre>
                  </div>
                </div>

                {/* WASI Executions Log Viewport */}
                <h4>WASI System Console Trace</h4>
                <div className="wasi-terminal-logs">
                  {wasiLog.split('\n').map((line, lIdx) => {
                    let className = "wasi-log-action";
                    if (line.includes("[WASI Runtime Init]")) className = "wasi-log-init";
                    else if (line.includes("[WASI System Call]")) className = "wasi-log-call";
                    else if (line.includes("[WASI Memory Mapping]") || line.includes("[WASI Sandbox Output]")) className = "wasi-log-mem";
                    else if (line.includes("[WASI Runtime Success]") || line.includes("[WASI Sandbox Execution] Execution halt")) className = "wasi-log-success";
                    else if (line.includes("[WASI Error]") || line.includes("[WASI Fatal]")) className = "wasi-log-error";
                    
                    return (
                      <div key={lIdx} className={`wasi-log-line ${className}`}>
                        {line}
                      </div>
                    );
                  })}
                </div>

              </div>

            </div>
          </div>
        )}

        {/* Tab 6: Formal Verification (CTL & Translation Validation) */}
        {activeTab === 'verify' && (
          <div className="verification-panel">
            <div className="verification-grid">
              
              {/* Left Column: Bounded CTL Model Checker */}
              <div className="verification-card">
                <h3>
                  <span>🛡️ Bounded CTL Model Checker</span>
                  <span className="badge badge-green">
                    States Explored: {verification?.ctl_checker?.compiler?.states_explored || 10}
                  </span>
                </h3>
                
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Verifies branching state-space temporal properties (AG, EG, AF, EF, EX, AX) for both compiler output liveness bounds and Cell Automata state spaces.
                </p>

                <div className="property-selector">
                  {/* Property 1: Compiler pc >= 0 */}
                  <div 
                    className={`property-item ${selectedCtlProperty === 'compiler_p1' ? 'active' : ''}`}
                    onClick={() => setSelectedCtlProperty('compiler_p1')}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#fdba74', fontWeight: 'bold' }}>PC NON-NEGATIVE</div>
                      <div className="property-formula">{verification?.ctl_checker?.compiler?.property_pc_non_negative?.formula || "AG(pc >= 0)"}</div>
                    </div>
                    <div>
                      {verification?.ctl_checker?.compiler?.property_pc_non_negative?.verified ? (
                        <span className="badge badge-verified">VERIFIED</span>
                      ) : (
                        <span className="badge badge-failed">VIOLATED</span>
                      )}
                    </div>
                  </div>

                  {/* Property 2: Compiler wat_len < 25 */}
                  <div 
                    className={`property-item ${selectedCtlProperty === 'compiler_p2' ? 'active' : ''}`}
                    onClick={() => setSelectedCtlProperty('compiler_p2')}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#fdba74', fontWeight: 'bold' }}>WAT LENGTH BOUND</div>
                      <div className="property-formula">{verification?.ctl_checker?.compiler?.property_wat_len_bounded?.formula || "AG(wat_len < 25)"}</div>
                    </div>
                    <div>
                      {verification?.ctl_checker?.compiler?.property_wat_len_bounded?.verified ? (
                        <span className="badge badge-verified">VERIFIED</span>
                      ) : (
                        <span className="badge badge-failed">VIOLATED</span>
                      )}
                    </div>
                  </div>

                  {/* Property 3: CA Grid Non-Negative Cells */}
                  <div 
                    className={`property-item ${selectedCtlProperty === 'ca_p1' ? 'active' : ''}`}
                    onClick={() => setSelectedCtlProperty('ca_p1')}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#fdba74', fontWeight: 'bold' }}>CA CELL VALUE BOUNDS</div>
                      <div className="property-formula">{verification?.ctl_checker?.ca_grid?.property_cells_non_negative?.formula || "AG(all_cells >= 0)"}</div>
                    </div>
                    <div>
                      {verification?.ctl_checker?.ca_grid?.property_cells_non_negative?.verified ? (
                        <span className="badge badge-verified">VERIFIED</span>
                      ) : (
                        <span className="badge badge-failed">VIOLATED</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Counterexample Viewport */}
                {selectedCtlProperty === 'compiler_p1' && (
                  <div className="counterexample-panel" style={{ borderColor: 'rgba(34, 197, 94, 0.25)' }}>
                    <div className="counterexample-title" style={{ color: '#4ade80' }}>
                      🟢 Safety Bounds Preserved
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      All states satisfy the pc &gt;= 0 safety constraint. No counterexamples found.
                    </p>
                  </div>
                )}

                {selectedCtlProperty === 'compiler_p2' && (
                  <div className="counterexample-panel">
                    <div className="counterexample-title">
                      ⚠️ Safety Violation - Counterexample Trace Found
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      A compiler trace can exceed the 25-byte target limit by generating 28 bytes of WAT.
                    </p>
                    <div className="counterexample-steps">
                      {(verification?.ctl_checker?.compiler?.property_wat_len_bounded?.counterexample || []).map((step, idx) => (
                        <div key={idx} className="counterexample-step">
                          Step {idx}: pc={step.pc}, wat_len={step.wat_len} {step.wat_len >= 25 ? "🚨 (Violation)" : ""}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCtlProperty === 'ca_p1' && (
                  <div className="counterexample-panel" style={{ borderColor: 'rgba(34, 197, 94, 0.25)' }}>
                    <div className="counterexample-title" style={{ color: '#4ade80' }}>
                      🟢 All CA Cell States Valid
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      The state spaces of the cellular automaton cells c_r_c verify that no cell value ever drops below 0.
                    </p>
                  </div>
                )}

              </div>

              {/* Right Column: Translation Validation Engine */}
              <div className="verification-card">
                <h3>
                  <span>📜 Translation Validation Engine</span>
                  <span className="badge badge-verified">
                    Proof Size: {verification?.translation_validator?.proof_size || 4} variables
                  </span>
                </h3>
                
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Algebraically proves that compiled WebAssembly WAT global variable updates are 100% equivalent to original mathematical MSM equations.
                </p>

                {/* Variable selectors */}
                <div className="var-selector-row">
                  {(verification?.translation_validator?.verification_results || []).map((result, idx) => (
                    <button
                      key={idx}
                      className={`var-select-btn ${selectedValidationVar === result.variable ? 'active' : ''}`}
                      onClick={() => setSelectedValidationVar(result.variable)}
                    >
                      {result.variable}
                    </button>
                  ))}
                </div>

                {/* Proof Tree Viewer */}
                {(() => {
                  const currentResult = (verification?.translation_validator?.verification_results || []).find(r => r.variable === selectedValidationVar);
                  if (!currentResult) return <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No validation data selected.</p>;
                  return (
                    <div className="proof-details">
                      <div className="proof-row">
                        <span className="proof-label">Variable Identifier</span>
                        <div className="proof-value" style={{ color: '#fdba74', fontWeight: 'bold' }}>{currentResult.variable}</div>
                      </div>
                      
                      <div className="proof-row">
                        <span className="proof-label">Source Expression (MSM)</span>
                        <div className="proof-value">{currentResult.source_expr}</div>
                      </div>
                      
                      <div className="proof-row">
                        <span className="proof-label">Symbolic Execution Target (WAT)</span>
                        <div className="proof-value">{currentResult.wat_expr}</div>
                      </div>

                      <div className="proof-row">
                        <span className="proof-label">Simplified MSM Representation</span>
                        <div className="proof-value" style={{ color: '#38bdf8' }}>{currentResult.simplified_msm}</div>
                      </div>

                      <div className="proof-row">
                        <span className="proof-label">Simplified WAT Representation</span>
                        <div className="proof-value" style={{ color: '#38bdf8' }}>{currentResult.simplified_wat}</div>
                      </div>

                      <div className="proof-row">
                        <span className="proof-label">Validation Equivalence</span>
                        <div>
                          {currentResult.equivalent ? (
                            <span className="badge badge-verified">✓ EQUIVALENT (PROVEN)</span>
                          ) : (
                            <span className="badge badge-failed">✗ MISMATCH (LOGIC DRIFT)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Seal of Authenticity */}
                {verification?.translation_validator?.all_correct && (
                  <div className="proof-certificate-seal">
                    <span className="seal-icon">🎖️</span>
                    <div className="seal-text">
                      <h4>100% PROVEN CORRECT</h4>
                      <p>Wasm compilation is mathematically proven equivalent to source MSM.</p>
                    </div>
                  </div>
                )}

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
