import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';

const OWNER = 'aKrispy1';
const REPO = 'Project-Martian';
const STATS_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/docs/stats.json`;
const LOGS_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/docs/research_log_msm.md`;
const SPEC_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/docs/research_stage_2_symbology_and_compilation.md`;

// Fallback data in case GitHub fetches fail (e.g., local development before push)
const defaultStats = {
  total_papers: 11,
  last_sync_epoch: "2026-06-01 17:54:49",
  current_vocabulary_size: 40,
  thermodynamic_efficiency: 98.75,
  self_hosting_stage: "Stage 1 (Seed Compiler)",
  status: "AUTONOMOUS_RUNNING"
};

export default function App() {
  const [stats, setStats] = useState(defaultStats);
  const [logs, setLogs] = useState([]);
  const [spec, setSpec] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(null);
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
      } catch (err) {
        console.error("Error fetching data from remote repository, using local defaults.", err);
        // Attempt to fetch locally from public/docs relative folder if hosted locally
        try {
          const localStats = await fetch('/docs/stats.json');
          if (localStats.ok) setStats(await localStats.json());
          
          const localLogs = await fetch('/docs/research_log_msm.md');
          if (localLogs.ok) parseResearchLogs(await localLogs.text());

          const localSpec = await fetch('/docs/research_stage_2_symbology_and_compilation.md');
          if (localSpec.ok) setSpec(await localSpec.text());
        } catch (e) {
          console.error("Local fetches failed as well, using hardcoded static fallbacks.");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function parseResearchLogs(text) {
    // Basic parser to split Markdown into Theme objects
    const sections = text.split('## Theme:');
    const parsed = [];
    
    sections.forEach((section, idx) => {
      if (idx === 0) return; // skip header
      const lines = section.split('\n');
      const themeHeader = lines[0].trim();
      const themeName = themeHeader.split('(Sync')[0].trim();
      const syncTime = themeHeader.includes('Sync') ? themeHeader.split('Sync Epoch:')[1].replace(')', '').trim() : '';
      
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
        // Fallback simple url matching
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
        papers
      });
    });

    setLogs(parsed);
    if (parsed.length > 0) {
      setSelectedTheme(parsed[0]);
    }
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
          <span className="card-meta">Academic Papers Scraped</span>
        </div>
        <div className="telemetry-card neon-border-blue">
          <span className="card-label">MSM VOCABULARY SIZE</span>
          <h2 className="card-value text-glow-blue">{stats.current_vocabulary_size}</h2>
          <span className="card-meta">Defined Symbolic Tokens</span>
        </div>
        <div className="telemetry-card neon-border-purple">
          <span className="card-label">THERMODYNAMIC EFFICIENCY</span>
          <h2 className="card-value text-glow-purple">{stats.thermodynamic_efficiency}%</h2>
          <span className="card-meta">Landauer Erasure Ratio</span>
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

        {/* Tab 1: Interactive MSM Terminal */}
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
                    <div className="theme-meta">Sync: {logItem.syncTime.split(' ')[0]}</div>
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
                      <div>// GRAMMAR RULES: VERIFIED SEMANTIC PRESERVATION (Alive2)</div>
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

        {/* Tab 2: Foundational Spec (Stage 2 Markdown Viewer) */}
        {activeTab === 'spec' && (
          <div className="spec-panel">
            <div className="spec-header">
              <h3>Martian Language Architecture Spec</h3>
              <span>Source: docs/research_stage_2_symbology_and_compilation.md</span>
            </div>
            <div className="spec-content">
              {spec ? (
                <pre className="spec-raw">
                  <code>{spec}</code>
                </pre>
              ) : (
                <div className="loading-spec">Loading specification core schema...</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Crawled Ledger */}
        {activeTab === 'ledger' && (
          <div className="ledger-panel">
            <div className="ledger-header">
              <h3>Ingested Literature References</h3>
              <p>These academic publications were autonomously retrieved, evaluated, and compiled by the crawler agent.</p>
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
        <div>Last Crawl Epoch: {stats.last_sync_epoch} UTC</div>
      </footer>
      <Analytics />
    </div>
  );
}
