import { useState, useEffect } from 'react'
import { questionsApi } from '../api/questions'
import { contentApi } from '../api/content'
import toast from 'react-hot-toast'
import {
  FileQuestion, Filter, Zap, ChevronDown, ChevronUp,
  CheckCircle, XCircle, BookOpen, Loader, RefreshCw, Tag
} from 'lucide-react'

const DIFF_COLORS = {
  easy:   { bg: 'rgba(0,198,94,0.1)',   border: 'rgba(0,198,94,0.3)',   color: '#00c65e' },
  medium: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', color: '#f59e0b' },
  hard:   { bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)',  color: '#ef4444' },
}

const OPTION_LABELS = { a: 'A', b: 'B', c: 'C', d: 'D' }

// ── Single Question Card ──────────────────────────────────────────────────────
function QuestionCard({ q }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const diff = DIFF_COLORS[q.difficulty_level] || DIFF_COLORS.medium

  const handleSelect = (opt) => {
    if (revealed) return
    setSelected(opt)
    setRevealed(true)
  }

  const reset = () => { setSelected(null); setRevealed(false) }

  return (
    <div className="stat-card" style={{ marginBottom: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ flex: 1 }}>
          {/* Badges */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
            <span style={{
              fontSize: '0.72rem', fontWeight: 700, padding: '0.18rem 0.55rem', borderRadius: 5,
              background: diff.bg, border: `1px solid ${diff.border}`, color: diff.color
            }}>
              {q.difficulty_level?.toUpperCase()}
            </span>
            {q.is_scenario_based && (
              <span className="badge" style={{ fontSize: '0.7rem' }}>📋 Scenario</span>
            )}
            {q.topic_name && (
              <span className="tag"><Tag size={10} />{q.topic_name}</span>
            )}
          </div>
          {/* Question */}
          <p style={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.55, color: 'var(--text-primary)' }}>
            {q.question_text}
          </p>
        </div>
        {revealed && (
          <button onClick={reset} title="Try again"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0, marginTop: '0.2rem' }}>
            <RefreshCw size={15} />
          </button>
        )}
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {['a', 'b', 'c', 'd'].map(opt => {
          const isCorrect = q.correct_answer === opt
          const isSelected = selected === opt
          let className = 'option-btn'
          if (revealed && isCorrect) className += ' correct'
          else if (revealed && isSelected && !isCorrect) className += ' wrong'

          return (
            <button key={opt} className={className} onClick={() => handleSelect(opt)}>
              <span className="option-letter" style={
                revealed && isCorrect ? { background: 'rgba(0,198,94,0.2)', color: '#00c65e' } :
                revealed && isSelected && !isCorrect ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444' } : {}
              }>
                {OPTION_LABELS[opt]}
              </span>
              <span style={{ flex: 1 }}>{q[`option_${opt}`]}</span>
              {revealed && isCorrect && <CheckCircle size={16} color="#00c65e" />}
              {revealed && isSelected && !isCorrect && <XCircle size={16} color="#ef4444" />}
            </button>
          )
        })}
      </div>

      {/* Explanation */}
      {revealed && (
        <div className="explanation-box fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem', color: '#00c65e', fontWeight: 700, fontSize: '0.82rem' }}>
            <BookOpen size={14} /> Explanation
          </div>
          {q.explanation}
        </div>
      )}
    </div>
  )
}

// ── Generate Panel ────────────────────────────────────────────────────────────
function GeneratePanel({ onGenerated }) {
  const [sources, setSources] = useState([])
  const [selectedSource, setSelectedSource] = useState('')
  const [perChunk, setPerChunk] = useState(2)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    contentApi.list().then(({ data }) =>
      setSources(data.filter(s => s.status === 'completed'))
    ).catch(() => {})
  }, [])

  const handleGenerate = async () => {
    if (!selectedSource) { toast.error('Select a content source first'); return }
    setGenerating(true)
    try {
      await questionsApi.generate(parseInt(selectedSource), perChunk)
      toast.success('🚀 MCQ generation started! Check back in a minute.')
      setTimeout(onGenerated, 5000)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="stat-card" style={{ marginBottom: '2rem', border: '1px solid rgba(0,198,94,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Zap size={18} color="#00c65e" />
        <span style={{ fontWeight: 700, color: '#00c65e' }}>Generate MCQs with AI</span>
        <span className="badge" style={{ marginLeft: 'auto' }}>FREE — Groq Llama 3.3</span>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            Content Source (PDFs)
          </label>
          <select
            value={selectedSource}
            onChange={e => setSelectedSource(e.target.value)}
            className="input-field"
          >
            <option value="">— Select a processed PDF —</option>
            {sources.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
        <div style={{ width: 140 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            MCQs per chunk (1–3)
          </label>
          <select value={perChunk} onChange={e => setPerChunk(+e.target.value)} className="input-field">
            <option value={1}>1</option>
            <option value={2}>2 (recommended)</option>
            <option value={3}>3</option>
          </select>
        </div>
        <button className="btn-primary" onClick={handleGenerate} disabled={generating || !selectedSource}>
          {generating ? <><Loader size={15} className="spin" style={{ marginRight: 6, display: 'inline' }} />Generating...</> : '⚡ Generate MCQs'}
        </button>
      </div>
      {sources.length === 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
          ⚠️ No processed PDFs found. Upload and process a PDF in Content Library first.
        </p>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Questions() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ difficulty: '', topic_id: '' })
  const [showFilter, setShowFilter] = useState(false)
  const [total, setTotal] = useState(0)

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filter.difficulty) params.difficulty = filter.difficulty
      if (filter.topic_id)   params.topic_id   = filter.topic_id
      const [{ data }, countResp] = await Promise.all([
        questionsApi.list(params),
        questionsApi.count(),
      ])
      setQuestions(data)
      setTotal(countResp.data.count)
    } catch {
      toast.error('Failed to load questions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 860 }}>
      {/* Header */}
      <div className="fade-in" style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.7rem', fontWeight: 800, marginBottom: '0.25rem' }}>
              Question Bank
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {total} MCQs generated — practice by clicking any option
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" onClick={() => setShowFilter(!showFilter)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Filter size={14} /> Filter {showFilter ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            <button className="btn-secondary" onClick={load}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Filter row */}
        {showFilter && (
          <div className="stat-card fade-in" style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Difficulty</label>
              <select
                value={filter.difficulty}
                onChange={e => setFilter({ ...filter, difficulty: e.target.value })}
                className="input-field" style={{ width: 150 }}
              >
                <option value="">All</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setFilter({ difficulty: '', topic_id: '' })}>
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Generate Panel */}
      <GeneratePanel onGenerated={load} />

      {/* Questions List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Loader size={32} color="#00c65e" className="spin" style={{ marginBottom: '0.75rem' }} />
          <p>Loading questions...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="stat-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <FileQuestion size={40} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No questions yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.3rem' }}>
            Upload a PDF → then click "Generate MCQs" above
          </p>
        </div>
      ) : (
        <div className="fade-in">
          {questions.map(q => <QuestionCard key={q.id} q={q} />)}
        </div>
      )}
    </div>
  )
}
