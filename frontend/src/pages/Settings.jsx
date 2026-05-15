import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  Settings as SettingsIcon, Database, Brain, Palette,
  Info, CheckCircle2, AlertTriangle, ExternalLink,
  Trash2, Download, RefreshCw, Save, Loader,
  Key, Zap, Server, HardDrive
} from 'lucide-react'

const SECTIONS = ['General', 'LLM Provider', 'Data', 'About']

// ── Section card ───────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="stat-card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 32, height: 32, background: 'var(--sn-green-light)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #b7e5cc' }}>
          <Icon size={16} color="var(--sn-green-deep)" />
        </div>
        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0d1f14' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

// ── Row ────────────────────────────────────────────────────────────────────────
function Row({ label, desc, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid #f0f5f1' }}>
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0d1f14' }}>{label}</div>
        {desc && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0, marginLeft: '1rem' }}>{children}</div>
    </div>
  )
}

// ── Toggle ─────────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
        background: value ? '#00c65e' : '#d1d5db',
        position: 'relative', transition: 'background 0.2s',
        border: `1.5px solid ${value ? '#00a04b' : '#9ca3af'}`,
      }}>
      <div style={{
        position: 'absolute', top: 2, left: value ? 20 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  )
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState('General')
  const [backendStatus, setBackendStatus] = useState('checking')
  const [dbStats, setDbStats] = useState(null)
  const [prefs, setPrefs] = useState(() => {
    const saved = localStorage.getItem('csa_prefs')
    return saved ? JSON.parse(saved) : {
      autoAdvance: true,
      showExplanations: true,
      dailyGoal: 20,
      notifications: false,
    }
  })

  // Check backend health
  useEffect(() => {
    fetch('http://localhost:8000/health')
      .then(r => r.json())
      .then(d => setBackendStatus(d.status === 'ok' ? 'online' : 'error'))
      .catch(() => setBackendStatus('offline'))
  }, [])

  // Load DB stats
  useEffect(() => {
    Promise.all([
      fetch('http://localhost:8000/api/questions/count').then(r => r.json()).catch(() => ({ count: 0 })),
      fetch('http://localhost:8000/api/content/list').then(r => r.json()).catch(() => []),
    ]).then(([qCount, sources]) => {
      setDbStats({ questions: qCount.count || 0, sources: Array.isArray(sources) ? sources.length : 0 })
    })
  }, [])

  const savePref = (key, val) => {
    const updated = { ...prefs, [key]: val }
    setPrefs(updated)
    localStorage.setItem('csa_prefs', JSON.stringify(updated))
    toast.success('Saved!')
  }

  const statusColor = backendStatus === 'online' ? '#00874e' : backendStatus === 'checking' ? '#d97706' : '#dc2626'
  const statusBg    = backendStatus === 'online' ? '#e8f7ef' : backendStatus === 'checking' ? '#fef9ec' : '#fef2f2'
  const statusLabel = backendStatus === 'online' ? 'Online' : backendStatus === 'checking' ? 'Checking...' : 'Offline'

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 780 }}>
      {/* Header */}
      <div className="fade-in" style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#0d1f14', marginBottom: '0.25rem' }}>Settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Configure your CSA Training Platform</p>
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1.5rem', background: '#f0f5f1', borderRadius: 8, padding: '0.25rem' }}>
        {SECTIONS.map(s => (
          <button key={s} onClick={() => setActiveSection(s)} style={{
            flex: 1, padding: '0.55rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            background: activeSection === s ? '#ffffff' : 'transparent',
            color: activeSection === s ? '#00874e' : 'var(--text-secondary)',
            fontWeight: activeSection === s ? 700 : 500, fontSize: '0.82rem',
            boxShadow: activeSection === s ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s',
          }}>{s}</button>
        ))}
      </div>

      {/* ── General ─────────────────────────────────────────────────────── */}
      {activeSection === 'General' && (
        <div className="fade-in">
          <SectionCard title="Study Preferences" icon={Palette}>
            <Row label="Auto-advance after correct answer" desc="Automatically move to next question after getting it right">
              <Toggle value={prefs.autoAdvance} onChange={v => savePref('autoAdvance', v)} />
            </Row>
            <Row label="Show explanations immediately" desc="Reveal explanation right after answering (not just when wrong)">
              <Toggle value={prefs.showExplanations} onChange={v => savePref('showExplanations', v)} />
            </Row>
            <Row label="Daily question goal" desc="Target number of questions per day">
              <select value={prefs.dailyGoal} onChange={e => savePref('dailyGoal', +e.target.value)}
                className="input-field" style={{ width: 100, fontSize: '0.82rem', padding: '0.4rem 0.6rem' }}>
                {[10, 20, 30, 50, 100].map(n => <option key={n} value={n}>{n} questions</option>)}
              </select>
            </Row>
          </SectionCard>

          <SectionCard title="System Status" icon={Server}>
            <Row label="Backend API" desc="FastAPI server on port 8000">
              <span style={{ background: statusBg, color: statusColor, border: `1px solid ${statusColor}30`, borderRadius: 20, padding: '0.2rem 0.75rem', fontSize: '0.75rem', fontWeight: 700 }}>
                {statusLabel}
              </span>
            </Row>
            <Row label="Database" desc="SQLite — stored locally at backend/csa_training.db">
              <span className="badge" style={{ fontSize: '0.72rem' }}>SQLite</span>
            </Row>
            <Row label="Frontend" desc="React + Vite on port 5173">
              <span style={{ background: '#e8f7ef', color: '#00874e', border: '1px solid #b7e5cc', borderRadius: 20, padding: '0.2rem 0.75rem', fontSize: '0.75rem', fontWeight: 700 }}>
                Running
              </span>
            </Row>
            {dbStats && (
              <Row label="Data stored" desc="Questions and content sources in your database">
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {dbStats.questions} questions · {dbStats.sources} PDFs
                </span>
              </Row>
            )}
          </SectionCard>
        </div>
      )}

      {/* ── LLM Provider ────────────────────────────────────────────────── */}
      {activeSection === 'LLM Provider' && (
        <div className="fade-in">
          <SectionCard title="Active LLM Provider" icon={Brain}>
            <div style={{ background: '#e8f7ef', border: '1px solid #b7e5cc', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Zap size={16} color="#00c65e" />
                <span style={{ fontWeight: 700, color: '#00874e', fontSize: '0.9rem' }}>Groq — Llama 3.3 70B</span>
                <span className="badge" style={{ fontSize: '0.68rem', marginLeft: 'auto' }}>FREE</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Your active provider. Groq offers free API access to Llama 3.3 70B — extremely fast inference, no cost for personal use.
              </p>
            </div>
            <Row label="Groq API Key" desc="Set in backend/.env as GROQ_API_KEY">
              <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)', background: '#f0f5f1', padding: '0.25rem 0.5rem', borderRadius: 4 }}>
                gsk_aeJ8...WjLA
              </span>
            </Row>
            <Row label="Model" desc="LLM model used for MCQ generation and AI Tutor">
              <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#00874e', fontWeight: 600 }}>
                llama-3.3-70b-versatile
              </span>
            </Row>
          </SectionCard>

          <SectionCard title="Alternative Providers" icon={Key}>
            {[
              { name: 'Google Gemini Flash', badge: 'FREE', desc: '15 requests/min free. Get key at aistudio.google.com', color: '#0284c7', config: 'LLM_PROVIDER=gemini\nGEMINI_API_KEY=your_key' },
              { name: 'Ollama (Local)', badge: '100% FREE', desc: 'Runs models on your PC. No internet needed. Install ollama.com then run: ollama pull llama3.2', color: '#7c3aed', config: 'LLM_PROVIDER=ollama\nOLLAMA_BASE_URL=http://localhost:11434' },
            ].map(p => (
              <div key={p.name} style={{ padding: '0.9rem', background: '#f8fafb', border: '1px solid var(--border)', borderRadius: 8, marginBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0d1f14' }}>{p.name}</span>
                  <span style={{ background: '#e8f7ef', border: '1px solid #b7e5cc', color: '#00874e', borderRadius: 20, padding: '0.1rem 0.55rem', fontSize: '0.68rem', fontWeight: 700 }}>{p.badge}</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{p.desc}</p>
                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: '#0f2419', color: '#00e676', padding: '0.5rem 0.75rem', borderRadius: 6 }}>
                  {p.config}
                </div>
              </div>
            ))}
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              To switch: edit <code style={{ background: '#f0f5f1', padding: '0 4px', borderRadius: 3, fontSize: '0.75rem' }}>backend/.env</code> and restart the backend.
            </p>
          </SectionCard>
        </div>
      )}

      {/* ── Data ────────────────────────────────────────────────────────── */}
      {activeSection === 'Data' && (
        <div className="fade-in">
          <SectionCard title="Your Data" icon={HardDrive}>
            <Row label="Database file" desc="All your questions, tests, flashcards, progress">
              <code style={{ fontSize: '0.78rem', background: '#f0f5f1', padding: '0.2rem 0.5rem', borderRadius: 4, color: '#00874e' }}>
                backend/csa_training.db
              </code>
            </Row>
            <Row label="Uploaded PDFs" desc="Stored in backend/uploads/ folder">
              <code style={{ fontSize: '0.78rem', background: '#f0f5f1', padding: '0.2rem 0.5rem', borderRadius: 4, color: '#00874e' }}>
                backend/uploads/
              </code>
            </Row>
            {dbStats && (
              <Row label="Current data" desc="Total content in your database">
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {dbStats.questions} MCQs · {dbStats.sources} PDFs
                </span>
              </Row>
            )}
          </SectionCard>

          <SectionCard title="Database Actions" icon={Database}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0d1f14' }}>Backup Database</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Copy csa_training.db to a safe location</div>
                </div>
                <button className="btn-ghost" style={{ fontSize: '0.8rem' }}
                  onClick={() => toast('Copy backend/csa_training.db to back it up!', { icon: '💾' })}>
                  <Download size={13} /> How to backup
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: '#fef2f2', borderRadius: 8, border: '1px solid #fca5a5' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#991b1b' }}>Reset All Data</div>
                  <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>Delete database and start fresh — cannot be undone</div>
                </div>
                <button style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 0.9rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  onClick={() => {
                    if (window.confirm('Are you sure? This deletes ALL questions, tests and progress. Cannot be undone!')) {
                      toast.error('Manual step: delete backend/csa_training.db and restart backend')
                    }
                  }}>
                  <Trash2 size={13} /> Reset
                </button>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── About ───────────────────────────────────────────────────────── */}
      {activeSection === 'About' && (
        <div className="fade-in">
          <SectionCard title="About This App" icon={Info}>
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ width: 64, height: 64, background: '#e8f7ef', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', border: '2px solid #b7e5cc' }}>
                <Brain size={32} color="#00c65e" />
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0d1f14', marginBottom: '0.2rem' }}>
                CSA Prep AI
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Personal ServiceNow CSA Training Platform
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', maxWidth: 380, margin: '0 auto', textAlign: 'left' }}>
                {[
                  ['Version', '1.0.0'],
                  ['Mode', 'Personal (No Auth)'],
                  ['Frontend', 'React 18 + Vite'],
                  ['Backend', 'FastAPI + Python 3.13'],
                  ['Database', 'SQLite (local file)'],
                  ['AI Provider', 'Groq — Llama 3.3 70B'],
                  ['PDF Engine', 'PyMuPDF 1.27'],
                  ['Built for', 'Manohar'],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: '#f8fafb', borderRadius: 7, padding: '0.6rem 0.8rem', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0d1f14', marginTop: '0.1rem' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Quick Start Guide" icon={Zap}>
            <ol style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 2 }}>
              <li>Go to <b>Content Library</b> → Upload a CSA study PDF</li>
              <li>Go to <b>Questions</b> → Click "Generate MCQs" → Select your PDF</li>
              <li>Wait ~1-2 min → Questions appear automatically</li>
              <li>Take a <b>Mock Test</b> to test your knowledge</li>
              <li>Review <b>Progress</b> → See your weak topics</li>
              <li>Chat with <b>AI Tutor</b> when stuck on any concept</li>
              <li>Review <b>Flashcards</b> daily for spaced repetition</li>
            </ol>
          </SectionCard>
        </div>
      )}
    </div>
  )
}
