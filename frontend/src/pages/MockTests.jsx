import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { testsApi } from '../api/tests'
import { contentApi } from '../api/content'
import toast from 'react-hot-toast'
import {
  ClipboardList, Timer, CheckCircle2, XCircle, SkipForward,
  Flag, ChevronLeft, ChevronRight, BarChart2, BookOpen,
  Zap, Target, AlertTriangle, Trophy, RotateCcw, Loader,
  Circle, Tag
} from 'lucide-react'

const OPTION_LABELS = { a: 'A', b: 'B', c: 'C', d: 'D' }

// ══════════════════════════════════════════════════════════════════════════════
// TEST SELECTION SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function TestSelectionScreen({ onTestCreated }) {
  const [topics, setTopics] = useState([])
  const [selectedTopic, setSelectedTopic] = useState('')
  const [questionCount, setQuestionCount] = useState(15)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [histLoading, setHistLoading] = useState(true)

  useEffect(() => {
    contentApi.topics().then(({ data }) => setTopics(data)).catch(() => {})
    testsApi.list().then(({ data }) => setHistory(data.slice(0, 5))).catch(() => {})
      .finally(() => setHistLoading(false))
  }, [])

  const startTest = async (type) => {
    if (type === 'topic' && !selectedTopic) { toast.error('Select a topic first'); return }
    setLoading(true)
    try {
      let resp
      if (type === 'topic')      resp = await testsApi.createTopic(selectedTopic, questionCount)
      else if (type === 'full')  resp = await testsApi.createFullExam()
      else if (type === 'daily') resp = await testsApi.createDaily()
      else                       resp = await testsApi.createWeakTopics()
      onTestCreated(resp.data)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create test. Make sure you have generated questions first.')
    } finally {
      setLoading(false)
    }
  }

  const TYPE_CARDS = [
    {
      type: 'daily',
      icon: Zap,
      color: '#00c65e',
      bg: '#e8f7ef',
      title: 'Daily Practice',
      desc: '15 questions · 20 min',
      badge: 'Recommended',
    },
    {
      type: 'topic',
      icon: BookOpen,
      color: '#0284c7',
      bg: '#eff6ff',
      title: 'Topic Based',
      desc: 'Pick a topic to focus on',
      badge: null,
      hasTopic: true,
    },
    {
      type: 'full',
      icon: Target,
      color: '#7c3aed',
      bg: '#f5f3ff',
      title: 'Full Exam Sim',
      desc: '100 questions · 120 min',
      badge: 'CSA Format',
    },
    {
      type: 'weak',
      icon: AlertTriangle,
      color: '#d97706',
      bg: '#fef9ec',
      title: 'Weak Topics',
      desc: '20 questions on gaps',
      badge: null,
    },
  ]

  const scoreColor = (s) => s >= 70 ? '#00874e' : s >= 50 ? '#d97706' : '#dc2626'

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 920 }}>
      {/* Header */}
      <div className="fade-in" style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#0d1f14', marginBottom: '0.25rem' }}>
          Mock Tests
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Simulate CSA exam conditions — timed, scored, with full results
        </p>
      </div>

      {/* Test Type Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {TYPE_CARDS.map(({ type, icon: Icon, color, bg, title, desc, badge, hasTopic }) => (
          <div key={type} className="stat-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: 42, height: 42, background: bg, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}20` }}>
                <Icon size={21} color={color} />
              </div>
              {badge && <span className="badge" style={{ fontSize: '0.68rem' }}>{badge}</span>}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0d1f14', marginBottom: '0.2rem' }}>{title}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{desc}</div>
            </div>

            {/* Topic picker */}
            {hasTopic && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <select value={selectedTopic} onChange={e => setSelectedTopic(e.target.value)}
                  className="input-field" style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}>
                  <option value="">— Select topic —</option>
                  {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select value={questionCount} onChange={e => setQuestionCount(+e.target.value)}
                  className="input-field" style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}>
                  <option value={10}>10 questions</option>
                  <option value={15}>15 questions</option>
                  <option value={25}>25 questions</option>
                </select>
              </div>
            )}

            <button className="btn-primary" style={{ fontSize: '0.82rem', padding: '0.55rem 1rem', width: '100%', justifyContent: 'center' }}
              onClick={() => startTest(type === 'weak' ? 'weak' : type)}
              disabled={loading}>
              {loading ? <Loader size={14} className="spin" /> : 'Start Test →'}
            </button>
          </div>
        ))}
      </div>

      {/* History */}
      <div>
        <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
          Recent Tests
        </h2>
        {histLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            <Loader size={24} color="#00c65e" className="spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="stat-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            <ClipboardList size={32} color="#b7e5cc" style={{ marginBottom: '0.6rem' }} />
            <p style={{ fontSize: '0.875rem' }}>No tests taken yet — start your first test above!</p>
          </div>
        ) : (
          <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="sn-table">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Type</th>
                  <th>Questions</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.title}</td>
                    <td><span className="tag">{t.test_type.replace('_', ' ')}</span></td>
                    <td>{t.total_questions}</td>
                    <td>
                      {t.score_percent != null
                        ? <span style={{ fontWeight: 700, color: scoreColor(t.score_percent) }}>{t.score_percent}%</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td>
                      <span className={t.status === 'completed' ? 'pill-completed' : 'pill-pending'}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(t.created_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════════════════
// ACTIVE TEST SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function ActiveTestScreen({ test, onComplete }) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers]       = useState({})   // questionId → { answer, marked }
  const [revealed, setRevealed]     = useState({})   // questionId → { isCorrect, correctAnswer, explanation }
  const [submitting, setSubmitting] = useState(false)
  const [elapsed, setElapsed]       = useState(0)
  const timerRef = useRef(null)
  const maxSecs  = test.duration_minutes * 60

  // Flatten questions
  const testQs = test.questions?.sort((a, b) => a.order_index - b.order_index) || []
  const current = testQs[currentIdx]
  const q       = current?.question

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  useEffect(() => {
    if (elapsed >= maxSecs) {
      clearInterval(timerRef.current)
      toast('⏰ Time up! Auto-submitting...')
      handleFinish()
    }
  }, [elapsed])

  const remaining = maxSecs - elapsed
  const mins   = String(Math.floor(remaining / 60)).padStart(2, '0')
  const secs   = String(remaining % 60).padStart(2, '0')
  const urgent = remaining < 120

  const handleSelectOption = (opt) => {
    if (revealed[q.id] || submitting) return
    const prev = answers[q.id]
    setAnswers({ ...answers, [q.id]: { answer: opt, marked: prev?.marked || false } })
  }

  const handleCheckAnswer = async () => {
    const selectedOpt = answers[q.id]?.answer
    if (!selectedOpt || revealed[q.id]) return

    setSubmitting(true)
    try {
      const { data } = await testsApi.submitAnswer(test.id, {
        question_id: q.id,
        answer: selectedOpt,
        time_spent_seconds: elapsed,
        is_marked: answers[q.id]?.marked || false,
      })
      setRevealed(r => ({ ...r, [q.id]: data }))
    } catch {
      toast.error('Failed to submit answer')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = async () => {
    if (revealed[q.id]) { setCurrentIdx(i => Math.min(i + 1, testQs.length - 1)); return }
    try {
      await testsApi.submitAnswer(test.id, {
        question_id: q.id,
        answer: null,
        time_spent_seconds: elapsed,
        is_marked: answers[q.id]?.marked || false,
      })
      setRevealed(r => ({ ...r, [q.id]: { is_correct: null } }))
      setCurrentIdx(i => Math.min(i + 1, testQs.length - 1))
    } catch {}
  }

  const toggleMark = () => {
    setAnswers(a => ({
      ...a,
      [q.id]: { ...a[q.id], answer: a[q.id]?.answer || null, marked: !a[q.id]?.marked },
    }))
  }

  const handleFinish = async () => {
    clearInterval(timerRef.current)
    try {
      const { data } = await testsApi.complete(test.id, elapsed)
      onComplete(data)
    } catch {
      toast.error('Failed to complete test')
    }
  }

  const answeredCount = Object.keys(revealed).length
  const markedCount   = Object.values(answers).filter(a => a.marked).length
  const progress      = ((currentIdx + 1) / testQs.length) * 100

  if (!q) return null

  const rev = revealed[q.id]
  const ans = answers[q.id]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-page)' }}>

      {/* Top bar */}
      <div style={{ background: '#ffffff', borderBottom: '2px solid var(--sn-green)', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
        <div style={{ fontWeight: 800, color: '#0f2419', fontSize: '0.9rem', flex: 1 }}>
          {test.title}
        </div>
        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span style={{ fontWeight: 700, color: '#0d1f14' }}>{currentIdx + 1}</span>
          <span>/ {testQs.length}</span>
        </div>
        {/* Timer */}
        <div className={`timer-chip ${urgent ? 'urgent' : ''}`}>
          <Timer size={14} style={{ display: 'inline', marginRight: 4 }} />
          {mins}:{secs}
        </div>
        {/* Stats */}
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem' }}>
          <span style={{ color: '#00874e', fontWeight: 700 }}>✓ {Object.values(revealed).filter(r => r.is_correct).length}</span>
          <span style={{ color: '#dc2626', fontWeight: 700 }}>✗ {Object.values(revealed).filter(r => r.is_correct === false).length}</span>
          {markedCount > 0 && <span style={{ color: '#d97706', fontWeight: 700 }}>⚑ {markedCount}</span>}
        </div>
        <button className="btn-ghost" onClick={handleFinish} style={{ fontSize: '0.8rem' }}>
          Finish Test
        </button>
      </div>

      {/* Progress bar */}
      <div className="progress-bar-bg" style={{ height: 4, borderRadius: 0 }}>
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left — Question Panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', maxWidth: 720 }}>

          {/* Question number + badges */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--sn-green-deep)', background: 'var(--sn-green-light)', border: '1px solid #b7e5cc', borderRadius: 6, padding: '0.2rem 0.6rem' }}>
              Q{currentIdx + 1}
            </span>
            {q.difficulty_level && (
              <span className={`badge-${q.difficulty_level}`}>{q.difficulty_level}</span>
            )}
            {q.is_scenario_based && <span className="badge" style={{ fontSize: '0.7rem' }}>📋 Scenario</span>}
            {ans?.marked && <span style={{ color: '#d97706', fontSize: '0.78rem', fontWeight: 700 }}>⚑ Marked</span>}
          </div>

          {/* Question text */}
          <div className="stat-card" style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.65, color: '#0d1f14' }}>
              {q.question_text}
            </p>
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
            {['a', 'b', 'c', 'd'].map(opt => {
              const isCorrect = rev && q.correct_answer === opt
              const isSelected = ans?.answer === opt
              let cls = 'option-btn'
              
              if (rev && isCorrect) cls += ' correct'
              else if (rev && isSelected && !isCorrect) cls += ' wrong'
              else if (isSelected) cls += ' selected' // Add selected state

              return (
                <button key={opt} className={cls} onClick={() => handleSelectOption(opt)} disabled={!!rev || submitting}>
                  <span className={`option-letter ${isSelected ? 'pop-anim' : ''}`} style={
                    rev && isCorrect  ? { background: '#e8f7ef', color: '#00874e', borderColor: '#b7e5cc' } :
                    rev && isSelected && !isCorrect ? { background: '#fef2f2', color: '#dc2626', borderColor: '#fca5a5' } : 
                    isSelected ? { background: '#00c65e', color: '#fff', borderColor: '#00a04b' } : {}
                  }>
                    {isSelected && !rev ? <CheckCircle2 size={16} color="#fff" /> : OPTION_LABELS[opt]}
                  </span>
                  <span style={{ flex: 1, fontWeight: isSelected ? 600 : 400 }}>{q[`option_${opt}`]}</span>
                  {rev && isCorrect  && <CheckCircle2 size={18} color="#00c65e" className="pop-anim" />}
                  {rev && isSelected && !isCorrect && <XCircle size={18} color="#dc2626" className="pop-anim" />}
                </button>
              )
            })}
          </div>

          {/* Explanation */}
          {rev && (
            <div className="explanation-box fade-in" style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#00874e', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <BookOpen size={13} /> Explanation
              </div>
              {q.explanation}
            </div>
          )}

          {/* Nav buttons */}
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            {!rev && (
              <button className="btn-primary" onClick={handleCheckAnswer} disabled={!ans?.answer || submitting}>
                Check Answer
              </button>
            )}
            <button className="btn-ghost" onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}>
              <ChevronLeft size={15} /> Prev
            </button>
            {!rev && (
              <button className="btn-ghost" onClick={handleSkip}>
                <SkipForward size={14} /> Skip
              </button>
            )}
            <button className="btn-ghost" onClick={toggleMark}>
              <Flag size={13} color={ans?.marked ? '#d97706' : undefined} />
              {ans?.marked ? 'Unmark' : 'Mark'}
            </button>
            <button className="btn-ghost" onClick={() => setCurrentIdx(i => Math.min(testQs.length - 1, i + 1))}
              disabled={currentIdx === testQs.length - 1}>
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Right — Question Navigator */}
        <div style={{ width: 220, background: '#ffffff', borderLeft: '1px solid var(--border)', padding: '1.25rem', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
            Navigator
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.3rem', marginBottom: '1rem' }}>
            {testQs.map((tq, idx) => {
              const r = revealed[tq.question?.id]
              let bg = '#f0f5f1', color = 'var(--text-muted)', border = 'var(--border)'
              if (r?.is_correct === true)  { bg = '#e8f7ef'; color = '#00874e'; border = '#b7e5cc' }
              if (r?.is_correct === false) { bg = '#fef2f2'; color = '#dc2626'; border = '#fca5a5' }
              if (r?.is_correct === null)  { bg = '#f5f5f5'; color = '#9ca3af'; border = '#e5e7eb' }
              if (answers[tq.question?.id]?.marked) { bg = '#fef9ec'; color = '#d97706'; border = '#fcd34d' }
              if (idx === currentIdx) { border = '#00c65e'; color = '#00874e' }

              return (
                <button key={idx} onClick={() => setCurrentIdx(idx)}
                  style={{ width: 32, height: 32, border: `1.5px solid ${border}`, borderRadius: 5, background: bg, color, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                  {idx + 1}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {[
              ['#e8f7ef','#b7e5cc','#00874e', 'Correct'],
              ['#fef2f2','#fca5a5','#dc2626', 'Wrong'],
              ['#f5f5f5','#e5e7eb','#9ca3af', 'Skipped'],
              ['#fef9ec','#fcd34d','#d97706', 'Marked'],
            ].map(([bg, border, color, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                <div style={{ width: 14, height: 14, background: bg, border: `1.5px solid ${border}`, borderRadius: 3 }} />
                {label}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem' }}
              onClick={handleFinish}>
              Submit Test
            </button>
            <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {answeredCount}/{testQs.length} answered
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════════════════
// RESULTS SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function ResultsScreen({ result, onRetry }) {
  const passed    = result.score_percent >= 70
  const mins      = Math.floor(result.time_taken_seconds / 60)
  const secs      = result.time_taken_seconds % 60

  return (
    <div style={{ padding: '2.5rem', maxWidth: 820, margin: '0 auto' }}>
      {/* Score card */}
      <div className="stat-card fade-in" style={{ textAlign: 'center', padding: '2.5rem', marginBottom: '1.5rem', border: `2px solid ${passed ? 'var(--sn-green)' : '#dc2626'}` }}>
        <div style={{ marginBottom: '1rem' }}>
          {passed
            ? <Trophy size={52} color="#00c65e" />
            : <RotateCcw size={52} color="#dc2626" />}
        </div>
        <div style={{ fontSize: '3.5rem', fontWeight: 900, color: passed ? '#00874e' : '#dc2626', lineHeight: 1 }}>
          {result.score_percent}%
        </div>
        <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '0.5rem', marginBottom: '0.3rem', color: '#0d1f14' }}>
          {passed ? '🎉 Congratulations! You Passed!' : '📚 Keep Practicing — You\'ve Got This!'}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Passing score: 70% · CSA Certification Standard
        </div>

        {/* Breakdown */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
          {[
            { val: result.correct_count,  label: 'Correct',  color: '#00874e', bg: '#e8f7ef' },
            { val: result.wrong_count,    label: 'Wrong',    color: '#dc2626', bg: '#fef2f2' },
            { val: result.skipped_count,  label: 'Skipped',  color: '#9ca3af', bg: '#f5f5f5' },
            { val: `${mins}m ${secs}s`,   label: 'Time',     color: '#0d1f14', bg: '#f0f5f1' },
          ].map(({ val, label, color, bg }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color }}>{val}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.2rem' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
        <button className="btn-primary" onClick={onRetry}>
          <RotateCcw size={15} /> Take Another Test
        </button>
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function MockTests() {
  const [phase, setPhase]  = useState('select')   // select | active | result
  const [test, setTest]    = useState(null)
  const [result, setResult]= useState(null)

  if (phase === 'active' && test) {
    return (
      <ActiveTestScreen
        test={test}
        onComplete={(r) => { setResult(r); setPhase('result') }}
      />
    )
  }
  if (phase === 'result' && result) {
    return (
      <ResultsScreen
        result={result}
        onRetry={() => { setTest(null); setResult(null); setPhase('select') }}
      />
    )
  }
  return (
    <TestSelectionScreen
      onTestCreated={(t) => { setTest(t); setPhase('active') }}
    />
  )
}
