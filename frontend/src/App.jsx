import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import ContentLibrary from './pages/ContentLibrary'
import Questions from './pages/Questions'
import MockTests from './pages/MockTests'
import Progress from './pages/Progress'
import AITutor from './pages/AITutor'
import Flashcards from './pages/Flashcards'
import Settings from './pages/Settings'
import './index.css'

// Placeholder pages for future phases
const Placeholder = ({ title }) => (
  <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-secondary)', textAlign: 'center' }}>
    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚧</div>
    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{title}</h2>
    <p style={{ fontSize: '0.9rem' }}>Coming soon — stay tuned!</p>
  </div>
)

// App shell with sidebar
function AppShell() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: 260, flex: 1, minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(99,102,241,0.3)' },
        }}
      />
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/"           element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"  element={<Dashboard />} />
          <Route path="/content"    element={<ContentLibrary />} />
          <Route path="/questions"  element={<Questions />} />
          <Route path="/tests"      element={<MockTests />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/progress"   element={<Progress />} />
          <Route path="/tutor"      element={<AITutor />} />
          <Route path="/settings"   element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
