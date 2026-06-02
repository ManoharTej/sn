import { useNavigate } from 'react-router-dom'
import {
  Target, TrendingUp, AlertTriangle, Flame,
  Upload, ClipboardList, BookMarked, Bot,
  ChevronRight, Award, Clock
} from 'lucide-react'

const stats = [
  { label: 'Questions Practiced', value: '0',  icon: Target,        color: '#00c65e', bg: '#e8f7ef', sub: 'Start practicing!' },
  { label: 'Current Accuracy',    value: '—',  icon: TrendingUp,    color: '#00874e', bg: '#e8f7ef', sub: 'No tests yet' },
  { label: 'Weak Topics',         value: '0',  icon: AlertTriangle, color: '#d97706', bg: '#fef9ec', sub: 'Upload a PDF first' },
  { label: 'Study Streak',        value: '0d', icon: Flame,         color: '#dc2626', bg: '#fef2f2', sub: 'Start today!' },
]

const actions = [
  { label: 'Upload PDF',     desc: 'Add study material',  icon: Upload,        color: '#00c65e', bg: '#e8f7ef', to: '/content' },
  { label: 'Take Mock Test', desc: 'Test your knowledge', icon: ClipboardList, color: '#00874e', bg: '#e8f7ef', to: '/tests' },
  { label: 'Review Cards',   desc: 'Spaced repetition',   icon: BookMarked,    color: '#0284c7', bg: '#eff6ff', to: '/flashcards' },
  { label: 'Ask AI Tutor',   desc: 'Get instant help',    icon: Bot,           color: '#d97706', bg: '#fef9ec', to: '/tutor' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 1100 }}>

      {/* Greeting */}
      <div className="fade-in" style={{ marginBottom: '1.75rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.5rem' }}>
          <span className="badge"><Award size={11} /> CSA Learner</span>
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.25rem', color: '#0d1f14' }}>
          {greeting}, <span className="gradient-text">Manohar</span> 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Your AI-powered CSA prep dashboard — let's get certified!
        </p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))', gap:'1rem', marginBottom:'1.75rem' }}>
        {stats.map(({ label, value, icon: Icon, color, bg, sub }, i) => (
          <div key={label} className="stat-card fade-in" style={{ animationDelay:`${i*0.06}s` }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'0.9rem' }}>
              <div style={{ width:38, height:38, background:bg, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', border:`1px solid ${color}30` }}>
                <Icon size={19} color={color} />
              </div>
              <span style={{ fontSize:'1.7rem', fontWeight:800, color }}>{value}</span>
            </div>
            <div style={{ fontWeight:700, fontSize:'0.875rem', color:'#0d1f14', marginBottom:'0.18rem' }}>{label}</div>
            <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom:'1.75rem' }}>
        <h2 style={{ fontSize:'0.85rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.75rem' }}>
          Quick Actions
        </h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(195px,1fr))', gap:'0.85rem' }}>
          {actions.map(({ label, desc, icon: Icon, color, bg, to }, i) => (
            <div key={label} className="action-card fade-in" style={{ animationDelay:`${0.18+i*0.06}s` }}
              onClick={() => navigate(to)}>
              <div style={{ width:40, height:40, background:bg, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'0.35rem', border:`1px solid ${color}25` }}>
                <Icon size={20} color={color} />
              </div>
              <div style={{ fontWeight:700, fontSize:'0.9rem', color:'#0d1f14' }}>{label}</div>
              <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{desc}</div>
              <ChevronRight size={13} color="var(--text-muted)" style={{ marginTop:'0.2rem' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="fade-in" style={{ animationDelay:'0.42s' }}>
        <h2 style={{ fontSize:'0.85rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.75rem' }}>
          Recent Activity
        </h2>
        <div className="stat-card" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'3rem', textAlign:'center' }}>
          <Clock size={36} color="#b7e5cc" style={{ marginBottom:'0.9rem' }} />
          <p style={{ color:'var(--text-muted)', fontSize:'0.9rem', fontWeight:500 }}>No activity yet</p>
          <p style={{ color:'var(--text-muted)', fontSize:'0.78rem', marginTop:'0.3rem' }}>
            Upload a PDF or take a mock test to get started
          </p>
        </div>
      </div>
    </div>
  )
}
