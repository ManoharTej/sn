import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, Zap, Mail, Lock, User } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (!/[A-Z]/.test(form.password)) { toast.error('Password needs an uppercase letter'); return }
    if (!/[0-9]/.test(form.password)) { toast.error('Password needs a number'); return }
    setLoading(true)
    try {
      await signup(form.email, form.username, form.password)
      toast.success('Account created! Welcome 🎉')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  const strength = (() => {
    let s = 0
    if (form.password.length >= 8) s++
    if (/[A-Z]/.test(form.password)) s++
    if (/[0-9]/.test(form.password)) s++
    if (/[^A-Za-z0-9]/.test(form.password)) s++
    return s
  })()

  const strengthColor = ['#ef4444', '#f59e0b', '#10b981', '#6366f1'][strength - 1] || '#334155'
  const strengthLabel = ['Weak', 'Fair', 'Good', 'Strong'][strength - 1] || ''

  return (
    <div className="auth-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem' }}>
      <div className="auth-card fade-in">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={22} color="#fff" />
            </div>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.4rem' }}>
            Start your CSA journey
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            AI-powered exam prep — free forever
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input id="signup-email" type="email" name="email" value={form.email} onChange={handleChange}
                placeholder="you@example.com" className="input-field" style={{ paddingLeft: '2.75rem' }} required />
            </div>
          </div>

          {/* Username */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Username</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input id="signup-username" type="text" name="username" value={form.username} onChange={handleChange}
                placeholder="rajesh_sn" className="input-field" style={{ paddingLeft: '2.75rem' }} required />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input id="signup-password" type={showPw ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                placeholder="Min 8 chars, 1 uppercase, 1 number" className="input-field" style={{ paddingLeft: '2.75rem', paddingRight: '3rem' }} required />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {/* Strength bar */}
            {form.password && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ flex:1, height:3, borderRadius:3, background: i <= strength ? strengthColor : '#1e293b', transition: 'background 0.3s' }} />
                  ))}
                </div>
                <span style={{ fontSize: '0.75rem', color: strengthColor, fontWeight: 600 }}>{strengthLabel}</span>
              </div>
            )}
          </div>

          <button id="signup-submit" type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
            {loading ? 'Creating account...' : 'Create Free Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#a5b4fc', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
