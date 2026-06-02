import { useState, useEffect, useRef } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import {
  Brain, RotateCcw, CheckCircle2, XCircle, ChevronRight,
  ChevronLeft, Loader, Flame, Clock, Trophy, BookOpen,
  Sparkles, Eye, EyeOff, RefreshCw, Target
} from 'lucide-react'

// ── Flip card CSS ──────────────────────────────────────────────────────────────
const flipStyles = `
  .flip-card { perspective: 1500px; cursor: pointer; transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
  .flip-card:hover { transform: translateY(-8px) scale(1.02); }
  .flip-card:active { transform: translateY(-2px) scale(0.98); }
  .flip-inner {
    position: relative; width: 100%; height: 100%;
    transform-style: preserve-3d;
    transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.15); /* Springy bounce effect */
  }
  .flip-inner.flipped { transform: rotateY(180deg); }
  .flip-front, .flip-back {
    position: absolute; inset: 0;
    backface-visibility: hidden; -webkit-backface-visibility: hidden;
    border-radius: 14px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 2rem;
  }
  .flip-back { transform: rotateY(180deg); }
  .markdown-content ul { margin: 0.5rem 0; padding-left: 1.2rem; text-align: left; }
  .markdown-content li { margin-bottom: 0.3rem; }
  .markdown-content strong { color: #ffffff; }
`

function MarkdownSimple({ text }) {
  if (!text) return null
  // Simple bold: **text** -> <strong>text</strong>
  // Simple bullets: * text -> <li>text</li>
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .split('\n')
    .map(line => {
      if (line.trim().startsWith('* ')) {
        return `<li>${line.trim().substring(2)}</li>`
      }
      if (line.trim().startsWith('- ')) {
        return `<li>${line.trim().substring(2)}</li>`
      }
      return line.trim() ? `<p>${line}</p>` : ''
    })
    .join('')
    .replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>')

  return <div className="markdown-content" dangerouslySetInnerHTML={{ __html: html }} />
}

// ── Flashcard component ───────────────────────────────────────────────────────
function FlashCard({ card, onCorrect, onWrong, onSkip }) {
  const [flipped, setFlipped] = useState(false)
  const [answered, setAnswered] = useState(false)

  // Reset flip state when card changes
  useEffect(() => { setFlipped(false); setAnswered(false) }, [card?.id])

  const handleCorrect = () => { setAnswered(true); onCorrect() }
  const handleWrong   = () => { setAnswered(true); onWrong() }

  // Interval label
  const intervalLabel = (days) => {
    if (days <= 1) return 'Review tomorrow'
    if (days <= 7) return `Review in ${days} days`
    return 'Review in 1 month'
  }

  return (
    <>
      <style>{flipStyles}</style>
      <div className="flip-card" style={{ width: '100%', height: 320 }}
        onClick={() => !answered && setFlipped(f => !f)}>
        <div className={`flip-inner ${flipped ? 'flipped' : ''}`}>

          {/* Front — Question */}
          <div className="flip-front" style={{ background: '#ffffff', border: '2px solid var(--border)', boxShadow: '0 4px 24px rgba(0,198,94,0.08)' }}>
            <div style={{ position: 'absolute', top: '1rem', left: '1rem', right: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="badge" style={{ fontSize: '0.7rem' }}><Brain size={10} /> Question</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{intervalLabel(card.interval_days || 1)}</span>
            </div>
            <div style={{ textAlign: 'center', maxWidth: 480 }}>
              <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0d1f14', lineHeight: 1.65 }}>
                {card.front}
              </p>
              <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <Eye size={13} /> Click to reveal answer
              </div>
            </div>
          </div>

          {/* Back — Answer */}
          <div className="flip-back" style={{ background: '#0f2419', boxShadow: '0 4px 24px rgba(0,198,94,0.15)' }}>
            <div style={{ position: 'absolute', top: '1rem', left: '1rem', right: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ background: 'rgba(0,198,94,0.15)', border: '1px solid rgba(0,198,94,0.3)', color: '#00e676', borderRadius: 20, padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 700 }}>
                Answer
              </span>
              {card.accuracy != null && (
                <span style={{ fontSize: '0.72rem', color: '#a8c4b0' }}>
                  Accuracy: {card.accuracy}%
                </span>
              )}
            </div>
            <div style={{ textAlign: 'left', maxWidth: 480, width: '100%' }}>
              <div style={{ fontSize: '0.95rem', color: '#e8f7ef', lineHeight: 1.6 }}>
                <MarkdownSimple text={card.back} />
              </div>
            </div>
            {/* Rate buttons (shown when flipped) */}
            {flipped && !answered && (
              <div style={{ position: 'absolute', bottom: '1.25rem', left: '1rem', right: '1rem', display: 'flex', gap: '0.75rem' }}
                onClick={e => e.stopPropagation()}>
                <button onClick={handleWrong}
                  style={{ flex: 1, background: '#fef2f2', border: '1.5px solid #fca5a5', color: '#dc2626', borderRadius: 8, padding: '0.6rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <XCircle size={15} /> Didn't know
                </button>
                <button onClick={handleCorrect}
                  style={{ flex: 1, background: '#e8f7ef', border: '1.5px solid #b7e5cc', color: '#00874e', borderRadius: 8, padding: '0.6rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <CheckCircle2 size={15} /> Got it!
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skip button */}
      {!flipped && !answered && (
        <button className="btn-ghost" onClick={e => { e.stopPropagation(); onSkip() }}
          style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>
          Skip <ChevronRight size={13} />
        </button>
      )}
    </>
  )
}

// ── Session summary ───────────────────────────────────────────────────────────
function SessionSummary({ stats, onRestart, onDone }) {
  const { total, correct, wrong, skipped } = stats
  const acc = total > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0

  return (
    <div className="fade-in" style={{ textAlign: 'center', maxWidth: 480, margin: '0 auto', padding: '2rem' }}>
      <div style={{ width: 72, height: 72, background: acc >= 70 ? '#e8f7ef' : '#fef9ec', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', border: `2px solid ${acc >= 70 ? '#b7e5cc' : '#fcd34d'}` }}>
        <Trophy size={36} color={acc >= 70 ? '#00c65e' : '#d97706'} />
      </div>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0d1f14', marginBottom: '0.3rem' }}>
        Session Complete! 🎉
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        {acc >= 80 ? "Excellent work! Keep it up." : acc >= 60 ? "Good progress! Review the ones you missed." : "Keep practicing — you're improving!"}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { val: total,   label: 'Cards',   color: '#0d1f14', bg: '#f0f5f1' },
          { val: correct, label: 'Correct',  color: '#00874e', bg: '#e8f7ef' },
          { val: wrong,   label: 'Wrong',    color: '#dc2626', bg: '#fef2f2' },
          { val: `${acc}%`, label: 'Score',  color: acc >= 70 ? '#00874e' : '#d97706', bg: acc >= 70 ? '#e8f7ef' : '#fef9ec' },
        ].map(({ val, label, color, bg }) => (
          <div key={label} className="stat-card" style={{ padding: '0.85rem', background: bg }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color }}>{val}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
        <button className="btn-primary" onClick={onRestart}>
          <RotateCcw size={14} /> Review Again
        </button>
        <button className="btn-ghost" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN FLASHCARDS PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function Flashcards() {
  const [mode,      setMode]      = useState('menu')  // menu | session | done
  const [cards,     setCards]     = useState([])
  const [allCards,  setAllCards]  = useState([])
  const [idx,       setIdx]       = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [stats,     setStats]     = useState({ total: 0, correct: 0, wrong: 0, skipped: 0 })

  const currentCard = cards[idx]

  useEffect(() => {
    Promise.all([
      api.get('/questions/flashcards/daily'),
      api.get('/questions/flashcards/all'),
    ]).then(([daily, all]) => {
      setCards(daily.data)
      setAllCards(all.data)
    }).catch(() => toast.error('Failed to load flashcards'))
      .finally(() => setLoading(false))
  }, [])

  const startSession = (cardList) => {
    setCards([...cardList])
    setIdx(0)
    setStats({ total: cardList.length, correct: 0, wrong: 0, skipped: 0 })
    setMode('session')
  }

  const submitReview = async (correct) => {
    const card = cards[idx]
    try {
      await api.post(`/questions/flashcards/${card.id}/review`, { correct })
      setStats(s => ({ ...s, [correct ? 'correct' : 'wrong']: s[correct ? 'correct' : 'wrong'] + 1 }))
    } catch { /* non-critical */ }
    advance()
  }

  const advance = () => {
    if (idx + 1 >= cards.length) {
      setMode('done')
    } else {
      setIdx(i => i + 1)
    }
  }

  const handleSkip = () => {
    setStats(s => ({ ...s, skipped: s.skipped + 1 }))
    advance()
  }

  // ── Menu ───────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <Loader size={32} color="#00c65e" className="spin" />
    </div>
  )

  if (mode === 'done') return (
    <div style={{ padding: '2rem 2.5rem' }}>
      <SessionSummary
        stats={stats}
        onRestart={() => startSession(cards)}
        onDone={() => setMode('menu')}
      />
    </div>
  )

  if (mode === 'session') return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 640, margin: '0 auto' }}>
      {/* Session header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <button className="btn-ghost" onClick={() => setMode('menu')} style={{ fontSize: '0.8rem' }}>
          <ChevronLeft size={14} /> Back
        </button>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', alignItems: 'center' }}>
          <span style={{ color: '#00874e', fontWeight: 700 }}>✓ {stats.correct}</span>
          <span style={{ color: '#dc2626', fontWeight: 700 }}>✗ {stats.wrong}</span>
          <span style={{ color: 'var(--text-muted)' }}>{idx + 1}/{cards.length}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar-bg" style={{ marginBottom: '1.5rem' }}>
        <div className="progress-bar-fill" style={{ width: `${((idx) / cards.length) * 100}%` }} />
      </div>

      {/* Card */}
      {currentCard ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <FlashCard
            card={currentCard}
            onCorrect={() => submitReview(true)}
            onWrong={() => submitReview(false)}
            onSkip={handleSkip}
          />
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No more cards!</div>
      )}

      {/* Hint */}
      <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
        Click card to flip • Rate yourself honestly for best spaced repetition results
      </p>
    </div>
  )

  // ── Menu / Selection ───────────────────────────────────────────────────────
  const dueCards  = cards
  const allDue    = allCards
  const dueCount  = dueCards.length
  const totalCount = allCards.length

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 820 }}>
      {/* Header */}
      <div className="fade-in" style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#0d1f14', marginBottom: '0.25rem' }}>
          Flashcards
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Spaced repetition system — cards due today are prioritized automatically
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Due Today',    value: dueCount,   icon: Clock,   color: dueCount > 0 ? '#d97706' : '#00874e', bg: dueCount > 0 ? '#fef9ec' : '#e8f7ef' },
          { label: 'Total Cards',  value: totalCount, icon: Brain,   color: '#0284c7', bg: '#eff6ff' },
          { label: 'Best Streak',  value: '—',        icon: Flame,   color: '#d97706', bg: '#fef9ec' },
          { label: 'Mastered',     value: allCards.filter(c => c.interval_days >= 30).length,
            icon: Trophy,  color: '#7c3aed', bg: '#f5f3ff' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card fade-in" style={{ padding: '1.1rem' }}>
            <div style={{ width: 36, height: 36, background: bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.65rem', border: `1px solid ${color}25` }}>
              <Icon size={18} color={color} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color }}>{value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Session options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>

        {/* Due today */}
        <div className="stat-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 42, height: 42, background: '#fef9ec', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fcd34d20' }}>
              <Clock size={21} color="#d97706" />
            </div>
            {dueCount > 0 && <span className="badge" style={{ background: '#fef9ec', border: '1px solid #fcd34d', color: '#92400e', fontSize: '0.7rem' }}>
              {dueCount} due
            </span>}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0d1f14' }}>Daily Review</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {dueCount > 0 ? `${dueCount} cards scheduled for today` : 'All caught up! No cards due.'}
            </div>
          </div>
          <button className="btn-primary"
            style={{ fontSize: '0.85rem', padding: '0.6rem', justifyContent: 'center' }}
            onClick={() => dueCount > 0 ? startSession(dueCards) : null}
            disabled={dueCount === 0}>
            {dueCount > 0 ? `Review ${dueCount} Cards` : '✓ All Caught Up'}
          </button>
        </div>

        {/* All cards */}
        <div className="stat-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 42, height: 42, background: '#eff6ff', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={21} color="#0284c7" />
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0d1f14' }}>Practice All</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {totalCount > 0 ? `Review all ${totalCount} cards regardless of schedule` : 'Generate MCQs first to create flashcards'}
            </div>
          </div>
          <button className="btn-secondary"
            style={{ fontSize: '0.85rem', padding: '0.6rem', justifyContent: 'center', width: '100%' }}
            onClick={() => totalCount > 0 ? startSession(allDue) : null}
            disabled={totalCount === 0}>
            {totalCount > 0 ? `Practice All ${totalCount}` : 'No Cards Yet'}
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="stat-card fade-in" style={{ background: '#f0f5f1', border: '1px solid #b7e5cc' }}>
        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0d1f14', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Brain size={15} color="#00c65e" /> How Spaced Repetition Works
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {[
            ['📅 Intervals', 'Cards appear: 1d → 3d → 7d → 30d after correct answers'],
            ['✓ Got it!',    'Correct → interval doubles, appears later'],
            ['✗ Missed',     'Wrong → resets to 1 day, review sooner'],
            ['🏆 Mastered',  'After 30-day interval — you know it!'],
          ].map(([title, desc]) => (
            <div key={title}>
              <div style={{ fontWeight: 700, color: '#0d1f14', marginBottom: '0.15rem' }}>{title}</div>
              <div>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
