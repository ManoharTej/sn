import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, FileQuestion,
  ClipboardList, BarChart2, Bot, Settings, Zap
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/content',   icon: BookOpen,         label: 'Content Library' },
  { to: '/questions', icon: FileQuestion,      label: 'Questions' },
  { to: '/tests',     icon: ClipboardList,     label: 'Mock Tests' },
  { to: '/progress',  icon: BarChart2,         label: 'Progress' },
  { to: '/tutor',     icon: Bot,               label: 'AI Tutor' },
  { to: '/settings',  icon: Settings,          label: 'Settings' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      {/* ServiceNow-style green header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: 34, height: 34,
            background: 'linear-gradient(135deg, #00c65e, #008a3f)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Zap size={17} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#e8f0eb' }}>CSA Prep AI</div>
            <div style={{ fontSize: '0.7rem', color: '#00c65e' }}>ServiceNow Training</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Personal mode */}
      <div style={{ borderTop: '1px solid rgba(0,198,94,0.12)', paddingTop: '1rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0 0.25rem' }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #00c65e, #008a3f)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.82rem', fontWeight: 700, color: '#fff'
          }}>M</div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e8f0eb' }}>Manohar</div>
            <div style={{ fontSize: '0.68rem', color: '#00c65e' }}>Personal Mode</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
