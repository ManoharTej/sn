import { useState, useEffect } from 'react'
import { progressApi } from '../api/progress'
import toast from 'react-hot-toast'
import {
  TrendingUp, Target, Flame, Award, AlertTriangle,
  CheckCircle2, XCircle, BarChart2, Calendar, Loader,
  ChevronUp, ChevronDown, BookOpen, Trophy
} from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────────
const accuracyColor = (pct) =>
  pct >= 80 ? '#00874e' : pct >= 60 ? '#d97706' : '#dc2626'

const accuracyBg = (pct) =>
  pct >= 80 ? '#e8f7ef' : pct >= 60 ? '#fef9ec' : '#fef2f2'

const accuracyBorder = (pct) =>
  pct >= 80 ? '#b7e5cc' : pct >= 60 ? '#fcd34d' : '#fca5a5'

// ── Mini bar ───────────────────────────────────────────────────────────────────
function Bar({ value, max, color = '#00c65e', height = 8 }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      <div style={{ flex: 1, height, background: '#e5efe9', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color, minWidth: 34, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

// ── Score trend sparkline (pure CSS bars) ──────────────────────────────────────
function ScoreTrend({ history }) {
  if (!history?.length) return (
    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
      Complete a test to see your score trend
    </div>
  )
  const max = 100
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.3rem', height: 80, padding: '0.5rem 0' }}>
      {history.map((t, i) => {
        const h = Math.round((t.score_percent / max) * 72)
        const c = accuracyColor(t.score_percent)
        return (
          <div key={i} title={`${t.title}: ${t.score_percent}%`}
            style={{ flex: 1, height: h, background: c, borderRadius: '3px 3px 0 0', minWidth: 6, opacity: 0.85, cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.target.style.opacity = 1}
            onMouseLeave={e => e.target.style.opacity = 0.85}
          />
        )
      })}
    </div>
  )
}

// ── Activity heatmap (last 30 days) ───────────────────────────────────────────
function ActivityHeatmap({ activity }) {
  if (!activity?.length) return (
    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
      No activity yet — take a test to start tracking
    </div>
  )
  const maxQ = Math.max(...activity.map(d => d.questions_done), 1)
  return (
    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
      {activity.map((d, i) => {
        const intensity = d.questions_done / maxQ
        const green = Math.round(198 * intensity)
        const bg = d.questions_done > 0
          ? `rgba(0, ${green + 100}, ${Math.round(green * 0.5)}, ${0.2 + intensity * 0.7})`
          : '#f0f5f1'
        return (
          <div key={i}
            title={`${d.date}: ${d.questions_done} questions, ${d.tests_done} tests`}
            style={{ width: 20, height: 20, borderRadius: 3, background: bg, border: '1px solid #e5efe9', cursor: 'default' }}
          />
        )
      })}
    </div>
  )
}

// ── Topic Progress Row ─────────────────────────────────────────────────────────
function TopicRow({ t }) {
  const c = accuracyColor(t.accuracy_pct)
  return (
    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0d1f14' }}>{t.topic_name}</span>
          {t.is_weak && (
            <span style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 4, fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.45rem' }}>
              WEAK
            </span>
          )}
        </div>
        <Bar value={t.correct} max={t.total} color={c} height={6} />
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: c }}>{t.accuracy_pct}%</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.correct}/{t.total}</div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Progress() {
  const [overview,  setOverview]  = useState(null)
  const [topics,    setTopics]    = useState([])
  const [activity,  setActivity]  = useState([])
  const [history,   setHistory]   = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      progressApi.overview(),
      progressApi.topics(),
      progressApi.activity(),
      progressApi.testHistory(),
    ]).then(([ov, tp, ac, th]) => {
      setOverview(ov.data)
      setTopics(tp.data)
      setActivity(ac.data)
      setHistory(th.data)
    }).catch(() => toast.error('Failed to load progress'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <Loader size={32} color="#00c65e" className="spin" />
    </div>
  )

  const o = overview || {}
  const weakTopics = topics.filter(t => t.is_weak)

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 1050 }}>

      {/* Header */}
      <div className="fade-in" style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#0d1f14', marginBottom: '0.25rem' }}>
          Progress Analytics
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Track your CSA exam readiness — powered by adaptive analytics
        </p>
      </div>

      {/* Overview stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(165px,1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Overall Accuracy', value: `${o.overall_accuracy || 0}%`, icon: Target,       color: accuracyColor(o.overall_accuracy || 0), bg: accuracyBg(o.overall_accuracy || 0) },
          { label: 'Tests Taken',      value: o.total_tests || 0,            icon: ClipboardList2, color: '#0284c7', bg: '#eff6ff' },
          { label: 'Tests Passed',     value: o.tests_passed || 0,           icon: Trophy,        color: '#00874e', bg: '#e8f7ef' },
          { label: 'Study Streak',     value: `${o.streak_days || 0}d`,      icon: Flame,         color: '#d97706', bg: '#fef9ec' },
          { label: 'Questions Done',   value: o.total_questions || 0,        icon: BookOpen,      color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Avg Score',        value: `${o.avg_score || 0}%`,        icon: TrendingUp,    color: '#00874e', bg: '#e8f7ef' },
        ].map(({ label, value, icon: Icon, color, bg }, i) => (
          <div key={label} className="stat-card fade-in" style={{ animationDelay: `${i * 0.05}s`, padding: '1.1rem' }}>
            <div style={{ width: 36, height: 36, background: bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.65rem', border: `1px solid ${color}25` }}>
              <Icon size={18} color={color} />
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color }}>{value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '0.15rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Readiness banner */}
      {o.overall_accuracy > 0 && (
        <div className="fade-in" style={{
          background: o.overall_accuracy >= 70 ? '#e8f7ef' : '#fef9ec',
          border: `1.5px solid ${o.overall_accuracy >= 70 ? '#b7e5cc' : '#fcd34d'}`,
          borderLeft: `4px solid ${o.overall_accuracy >= 70 ? '#00c65e' : '#d97706'}`,
          borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem'
        }}>
          {o.overall_accuracy >= 70
            ? <CheckCircle2 size={22} color="#00874e" />
            : <AlertTriangle size={22} color="#d97706" />}
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0d1f14' }}>
              {o.overall_accuracy >= 70 ? '🎯 You are exam ready!' : '📚 Keep practicing — you\'re getting there!'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              {o.overall_accuracy >= 70
                ? `Your ${o.overall_accuracy}% accuracy exceeds the 70% passing threshold.`
                : `Need ${(70 - o.overall_accuracy).toFixed(1)}% more accuracy to reach passing threshold (70%).`}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>

        {/* Score trend */}
        <div className="stat-card fade-in">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0d1f14' }}>Score Trend</div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Last {history.length} tests</span>
          </div>
          <ScoreTrend history={history} />
          {history.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                First: <b style={{ color: '#0d1f14' }}>{history[0]?.score_percent}%</b>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Latest: <b style={{ color: accuracyColor(history[history.length - 1]?.score_percent) }}>
                  {history[history.length - 1]?.score_percent}%
                </b>
              </div>
            </div>
          )}
        </div>

        {/* Activity heatmap */}
        <div className="stat-card fade-in">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0d1f14' }}>Study Activity</div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Last 30 days</span>
          </div>
          <ActivityHeatmap activity={activity} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.6rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: '#f0f5f1', border: '1px solid #e5efe9' }} /> None
            <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(0,148,80,0.4)' }} /> Low
            <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(0,198,94,0.7)' }} /> High
          </div>
        </div>
      </div>

      {/* Topic Breakdown */}
      <div className="stat-card fade-in" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.25rem' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '2px solid var(--sn-green)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0f5f1' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0d1f14' }}>
            Topic Breakdown — Adaptive Insight
          </div>
          <span className="badge" style={{ fontSize: '0.7rem' }}>{weakTopics.length} weak topics</span>
        </div>
        {topics.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Complete a test to see topic-level analysis
          </div>
        ) : (
          topics.map(t => <TopicRow key={t.topic_id} t={t} />)
        )}
      </div>

      {/* Weak topics adaptive advice */}
      {weakTopics.length > 0 && (
        <div className="stat-card fade-in" style={{ border: '1px solid #fca5a5', background: '#fef2f2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <AlertTriangle size={17} color="#dc2626" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#991b1b' }}>
              Weak Topics — Focus here next
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {weakTopics.map(t => (
              <span key={t.topic_id}
                style={{ background: '#fff', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 6, padding: '0.25rem 0.65rem', fontSize: '0.8rem', fontWeight: 600 }}>
                {t.topic_name} ({t.accuracy_pct}%)
              </span>
            ))}
          </div>
          <p style={{ fontSize: '0.8rem', color: '#991b1b', marginTop: '0.75rem' }}>
            💡 Go to <b>Mock Tests → Weak Topics</b> for a focused recovery session on these areas.
          </p>
        </div>
      )}
    </div>
  )
}

// Avoid import error — same as ClipboardList
function ClipboardList2(props) {
  return <BarChart2 {...props} />
}
