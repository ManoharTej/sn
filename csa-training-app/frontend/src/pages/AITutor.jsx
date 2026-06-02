import { useState, useEffect, useRef } from 'react'
import { tutorApi } from '../api/tutor'
import toast from 'react-hot-toast'
import {
  Bot, Send, Plus, Trash2, MessageSquare, Loader,
  BookOpen, ChevronRight, Sparkles, User, Database,
  AlertCircle, Download
} from 'lucide-react'

// ── Markdown-lite renderer ─────────────────────────────────────────────────────
function RenderMessage({ text }) {
  // Bold: **text**, bullet points, code blocks
  const lines = text.split('\n')
  return (
    <div style={{ lineHeight: 1.7, fontSize: '0.875rem' }}>
      {lines.map((line, i) => {
        // Code block detection
        if (line.startsWith('```') || line === '```') return <div key={i} />
        // Bullet
        if (line.match(/^[-•*]\s/)) {
          const content = line.replace(/^[-•*]\s/, '')
          return (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.2rem', paddingLeft: '0.5rem' }}>
              <span style={{ color: '#00c65e', fontWeight: 700, flexShrink: 0 }}>•</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(content) }} />
            </div>
          )
        }
        // Numbered
        if (line.match(/^\d+\.\s/)) {
          return (
            <div key={i} style={{ marginBottom: '0.2rem', paddingLeft: '0.5rem' }}
              dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
          )
        }
        // Key takeaway
        if (line.startsWith('Key takeaway:')) {
          return (
            <div key={i} style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#e8f7ef', borderLeft: '3px solid #00c65e', borderRadius: '0 6px 6px 0', fontSize: '0.83rem', color: '#00874e', fontWeight: 600 }}>
              🎯 {line}
            </div>
          )
        }
        // Heading
        if (line.startsWith('###') || line.startsWith('**') && line.endsWith('**')) {
          return (
            <div key={i} style={{ fontWeight: 700, marginTop: '0.6rem', marginBottom: '0.2rem', color: '#0d1f14' }}
              dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
          )
        }
        // Empty line
        if (!line.trim()) return <div key={i} style={{ height: '0.4rem' }} />
        // Normal
        return (
          <div key={i} style={{ marginBottom: '0.15rem' }}
            dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
        )
      })}
    </div>
  )
}

function formatInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:#f0f5f1;padding:0.1rem 0.35rem;border-radius:4px;font-size:0.82rem;color:#00874e;font-family:monospace">$1</code>')
    .replace(/###\s*/g, '')
}

// ── Chat bubble ────────────────────────────────────────────────────────────────
function ChatBubble({ msg, sourcesUsed }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', marginBottom: '1.25rem',
      flexDirection: isUser ? 'row-reverse' : 'row' }}>
      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        background: isUser ? '#0f2419' : '#e8f7ef',
        border: isUser ? 'none' : '1.5px solid #b7e5cc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isUser ? <User size={16} color="#fff" /> : <Bot size={16} color="#00874e" />}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: '80%',
        background: isUser ? '#0f2419' : '#ffffff',
        color: isUser ? '#e8f7ef' : '#0d1f14',
        border: isUser ? 'none' : '1px solid var(--border)',
        borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
        padding: '0.75rem 1rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {isUser
          ? <div style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{msg.content}</div>
          : <RenderMessage text={msg.content} />
        }
        {/* Source indicator */}
        {!isUser && sourcesUsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.6rem', paddingTop: '0.5rem', borderTop: '1px solid #e5efe9', fontSize: '0.7rem', color: '#7a9e8a' }}>
            <Database size={10} /> Referenced your study material
          </div>
        )}
        <div style={{ fontSize: '0.68rem', color: isUser ? 'rgba(255,255,255,0.4)' : 'var(--text-muted)', marginTop: '0.35rem', textAlign: isUser ? 'left' : 'right' }}>
          {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

// ── Typing indicator ───────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e8f7ef', border: '1.5px solid #b7e5cc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Bot size={16} color="#00874e" />
      </div>
      <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '4px 14px 14px 14px', padding: '0.75rem 1.1rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%', background: '#00c65e',
            animation: `bounce 1.2s ease infinite`,
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </div>
    </div>
  )
}

// ── Session list ───────────────────────────────────────────────────────────────
function SessionItem({ session, active, onClick, onDelete }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.6rem 0.75rem', borderRadius: 6, cursor: 'pointer',
      background: active ? 'var(--sn-green-light)' : 'transparent',
      border: active ? '1px solid #b7e5cc' : '1px solid transparent',
      transition: 'all 0.15s',
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f5f5f5' }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
      <MessageSquare size={13} color={active ? '#00874e' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: active ? 700 : 500, color: active ? '#00874e' : '#0d1f14', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {session.title}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          {session.message_count} messages
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); onDelete(session.id) }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0.4, flexShrink: 0 }}
        onMouseEnter={e => e.currentTarget.style.opacity = 1}
        onMouseLeave={e => e.currentTarget.style.opacity = 0.4}>
        <Trash2 size={12} color="#dc2626" />
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN AI TUTOR PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function AITutor() {
  const [sessions,       setSessions]       = useState([])
  const [activeSession,  setActiveSession]  = useState(null)   // session id
  const [messages,       setMessages]       = useState([])
  const [input,          setInput]          = useState('')
  const [sending,        setSending]        = useState(false)
  const [quickQs,        setQuickQs]        = useState([])
  const [sourcesMap,     setSourcesMap]     = useState({})    // msgId → bool
  const [loadingSess,    setLoadingSess]    = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Load sessions + quick questions on mount
  useEffect(() => {
    tutorApi.listSessions().then(({ data }) => setSessions(data)).catch(() => {})
    tutorApi.quickQuestions().then(({ data }) => setQuickQs(data)).catch(() => {})
  }, [])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const loadSession = async (sessionId) => {
    setLoadingSess(true)
    try {
      const { data } = await tutorApi.getSession(sessionId)
      setActiveSession(sessionId)
      setMessages(data.messages)
      setSourcesMap({})   // reset source display
    } catch {
      toast.error('Failed to load chat')
    } finally {
      setLoadingSess(false)
    }
  }

  const newChat = () => {
    setActiveSession(null)
    setMessages([])
    setSourcesMap({})
    setInput('')
    inputRef.current?.focus()
  }

  const deleteSession = async (id) => {
    try {
      await tutorApi.deleteSession(id)
      setSessions(s => s.filter(x => x.id !== id))
      if (activeSession === id) newChat()
    } catch { toast.error('Failed to delete') }
  }

  const handleIngest = async () => {
    if (!activeSession) return
    const id = toast.loading('Processing conversation...')
    try {
      await tutorApi.ingestSession(activeSession)
      toast.success('✅ Chat added to your library! You can now generate questions from it.', { id })
    } catch (e) {
      toast.error('Failed to ingest chat', { id })
    }
  }

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg || sending) return
    setInput('')
    setSending(true)

    // Optimistic user bubble
    const tempId = Date.now()
    const tempUser = { id: tempId, role: 'user', content: msg, created_at: new Date().toISOString() }
    setMessages(m => [...m, tempUser])

    try {
      const { data } = await tutorApi.sendMessage({
        content: msg,
        session_id: activeSession,
      })

      // Update session id
      if (!activeSession) {
        setActiveSession(data.session_id)
        // Refresh sessions list
        tutorApi.listSessions().then(({ data: s }) => setSessions(s)).catch(() => {})
      }

      // Replace temp + add assistant
      setMessages(m => [
        ...m.filter(x => x.id !== tempId),
        data.user_message,
        data.assistant_message,
      ])

      // Track sources
      if (data.sources_used) {
        setSourcesMap(s => ({ ...s, [data.assistant_message.id]: true }))
      }
    } catch (e) {
      setMessages(m => m.filter(x => x.id !== tempId))
      toast.error('Failed to send message. Is the backend running?')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const isNew = messages.length === 0

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-page)', overflow: 'hidden' }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <div style={{ width: 250, background: '#ffffff', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Header */}
        <div style={{ padding: '1rem', borderBottom: '2px solid var(--sn-green)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Bot size={18} color="#00c65e" />
            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0d1f14' }}>AI Tutor</span>
            <span className="badge" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>FREE</span>
          </div>
          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem', padding: '0.55rem' }}
            onClick={newChat}>
            <Plus size={14} /> New Chat
          </button>
        </div>

        {/* Sessions */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {sessions.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              No chats yet. Ask a question to start!
            </div>
          ) : (
            sessions.map(s => (
              <SessionItem key={s.id} session={s} active={activeSession === s.id}
                onClick={() => loadSession(s.id)} onDelete={deleteSession} />
            ))
          )}
        </div>

        {/* LLM indicator */}
        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Sparkles size={12} color="#00c65e" />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Groq Llama 3.3 · Free</span>
        </div>
      </div>

      {/* ── Main chat area ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{ background: '#ffffff', borderBottom: '1px solid var(--border)', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Bot size={18} color="#00c65e" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0d1f14' }}>CSA AI Tutor</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Ask anything about ServiceNow — I'll answer using your study material
            </div>
          </div>
          {activeSession && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button onClick={handleIngest} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f0f5f1', border: '1px solid #b7e5cc', padding: '0.4rem 0.8rem', borderRadius: 6, fontSize: '0.72rem', color: '#00874e', cursor: 'pointer', fontWeight: 600 }}>
                <Download size={12} /> Ingest Chat
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: '#7a9e8a' }}>
                <Database size={11} /> RAG enabled
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>

          {/* Welcome / empty state */}
          {isNew && (
            <div className="fade-in" style={{ textAlign: 'center', maxWidth: 540, margin: '2rem auto' }}>
              <div style={{ width: 64, height: 64, background: '#e8f7ef', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', border: '2px solid #b7e5cc' }}>
                <Bot size={30} color="#00c65e" />
              </div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0d1f14', marginBottom: '0.4rem' }}>
                Hi Manohar! I'm your CSA Tutor
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Ask me anything about ServiceNow — concepts, exam tips, code examples. I'll search your uploaded PDFs and give you a detailed answer.
              </p>

              {/* Quick questions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 440, margin: '0 auto' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                  Suggested questions
                </div>
                {quickQs.slice(0, 5).map((q, i) => (
                  <button key={i} onClick={() => send(q)}
                    style={{
                      background: '#ffffff', border: '1px solid var(--border)', borderRadius: 8,
                      padding: '0.65rem 0.9rem', textAlign: 'left', cursor: 'pointer',
                      fontSize: '0.83rem', color: '#0d1f14', display: 'flex', alignItems: 'center', gap: '0.6rem',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#00c65e'; e.currentTarget.style.background = '#f2fbf6' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#ffffff' }}>
                    <ChevronRight size={13} color="#00c65e" style={{ flexShrink: 0 }} />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading session */}
          {loadingSess && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <Loader size={28} color="#00c65e" className="spin" />
            </div>
          )}

          {/* Chat messages */}
          {!loadingSess && messages.map((msg, i) => (
            <ChatBubble key={msg.id || i} msg={msg} sourcesUsed={sourcesMap[msg.id]} />
          ))}

          {/* Typing indicator */}
          {sending && <TypingDots />}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{ background: '#ffffff', borderTop: '1px solid var(--border)', padding: '1rem 2rem' }}>
          {/* Quick questions (when active session) */}
          {!isNew && quickQs.length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
              {quickQs.slice(0, 4).map((q, i) => (
                <button key={i} onClick={() => send(q)}
                  style={{ background: '#f0f5f1', border: '1px solid var(--border)', borderRadius: 20, padding: '0.3rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#00c65e'; e.currentTarget.style.color = '#00874e' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                  {q.length > 40 ? q.slice(0, 40) + '...' : q}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask a ServiceNow question... (Enter to send, Shift+Enter for newline)"
              rows={2}
              style={{
                flex: 1, resize: 'none',
                background: '#ffffff', border: '1.5px solid var(--border)',
                borderRadius: 10, padding: '0.75rem 1rem',
                color: '#0d1f14', fontSize: '0.875rem', outline: 'none',
                fontFamily: 'Inter, sans-serif', lineHeight: 1.55,
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = '#00c65e'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || sending}
              style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                background: input.trim() && !sending
                  ? 'linear-gradient(135deg, #00c65e, #00a04b)'
                  : '#e5efe9',
                border: 'none', cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
                boxShadow: input.trim() && !sending ? '0 2px 8px rgba(0,198,94,0.3)' : 'none',
              }}>
              {sending
                ? <Loader size={18} color="#7a9e8a" className="spin" />
                : <Send size={18} color={input.trim() ? '#fff' : '#b7e5cc'} />}
            </button>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            🔒 Powered by Groq (free) · Your data stays local · RAG searches your uploaded PDFs
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
