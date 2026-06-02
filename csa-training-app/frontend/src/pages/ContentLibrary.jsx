import { useState, useEffect, useRef, useCallback } from 'react'
import { contentApi } from '../api/content'
import toast from 'react-hot-toast'
import {
  Upload, FileText, Trash2, RefreshCw,
  CheckCircle, XCircle, Clock, Loader, Tag, ChevronDown, ChevronUp, Link, Search, Brain
} from 'lucide-react'

const STATUS_CONFIG = {
  pending:    { color: '#f59e0b', icon: Clock,     label: 'Pending' },
  processing: { color: '#6366f1', icon: Loader,    label: 'Processing...' },
  completed:  { color: '#10b981', icon: CheckCircle, label: 'Ready' },
  failed:     { color: '#ef4444', icon: XCircle,   label: 'Failed' },
}

function formatBytes(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

// ── Upload Zone ───────────────────────────────────────────────────────────────
function UploadZone({ onUploaded }) {
  const [mode, setMode] = useState('pdf') // 'pdf' | 'url' | 'search'
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const fileRef = useRef()

  const doUpload = async (file) => {
    if (!file || !file.name.endsWith('.pdf')) {
      toast.error('Only PDF files are accepted')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File too large (max 50MB)')
      return
    }
    setUploading(true)
    setProgress(0)
    try {
      await contentApi.upload(file, title || file.name.replace('.pdf', ''), setProgress)
      toast.success('✅ PDF uploaded! Processing in background...')
      setTitle('')
      onUploaded()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) doUpload(file)
  }, [title])

  const doUrlIngest = async () => {
    if (!url) {
      toast.error('Please enter a URL')
      return
    }
    setUploading(true)
    try {
      await contentApi.ingestUrl(url, title || 'Web / YouTube Source')
      toast.success('✅ URL submitted! Processing in background...')
      setTitle('')
      setUrl('')
      onUploaded()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to ingest URL')
    } finally {
      setUploading(false)
    }
  }

  const doSearchAndLearn = async () => {
    if (!searchQuery) {
      toast.error('Please enter a topic')
      return
    }
    setUploading(true)
    try {
      await contentApi.searchAndLearn(searchQuery)
      toast.success('🚀 Auto-learning started! Finding best sources for ' + searchQuery)
      setSearchQuery('')
      onUploaded()
    } catch (e) {
      toast.error('Failed to start search & learn')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ marginBottom: '2rem' }}>
      
      {/* Mode Switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button 
          className={mode === 'pdf' ? 'btn-primary' : 'btn-ghost'} 
          onClick={() => setMode('pdf')} 
          disabled={uploading}>
          <FileText size={16} /> Upload PDF
        </button>
        <button 
          className={mode === 'url' ? 'btn-primary' : 'btn-ghost'} 
          onClick={() => setMode('url')} 
          disabled={uploading}>
          <Link size={16} /> Import Web / YouTube
        </button>
        <button 
          className={mode === 'search' ? 'btn-primary' : 'btn-ghost'} 
          onClick={() => setMode('search')} 
          disabled={uploading}
          style={mode === 'search' ? { background: '#7c3aed', borderColor: '#7c3aed' } : {}}>
          <Search size={16} /> Search & Learn
        </button>
      </div>

      {mode === 'search' && (
        <div className="stat-card fade-in" style={{ border: '1px solid #7c3aed40' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.2rem', color: '#7c3aed' }}>
              Automatic Internet Learning
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              The AI will search the internet, find the best articles on this topic, and ingest them automatically.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              placeholder="e.g. 'ServiceNow Flow Designer best practices'"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field"
              disabled={uploading}
              onKeyDown={e => e.key === 'Enter' && doSearchAndLearn()}
            />
            <button className="btn-primary" onClick={doSearchAndLearn} disabled={uploading} style={{ background: '#7c3aed', borderColor: '#7c3aed', minWidth: 120 }}>
              {uploading ? <Loader size={16} className="spin" /> : <><Brain size={16} /> Learn</>}
            </button>
          </div>
        </div>
      )}

      {mode === 'url' && (
        <div className="stat-card fade-in">
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.2rem' }}>Learn from the Internet</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Paste a YouTube video link or any article URL to generate questions from it.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="text"
              placeholder="https://youtube.com/watch?v=..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="input-field"
              disabled={uploading}
            />
            <input
              type="text"
              placeholder="Custom title (optional)"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="input-field"
              disabled={uploading}
            />
            <button className="btn-primary" onClick={doUrlIngest} disabled={uploading} style={{ width: 'fit-content' }}>
              {uploading ? <Loader size={16} className="spin" /> : <><Link size={16} /> Import URL</>}
            </button>
          </div>
        </div>
      )}

      {mode === 'pdf' && (
        <>
          {/* Title input */}
          <div style={{ marginBottom: '0.75rem' }} className="fade-in">
            <input
              type="text"
              placeholder="Custom title (optional — defaults to filename)"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="input-field"
              style={{ maxWidth: 420 }}
              disabled={uploading}
            />
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !uploading && fileRef.current?.click()}
            className="fade-in"
            style={{
              border: `2px dashed ${dragging ? '#00c65e' : 'var(--border)'}`,
              borderRadius: 16,
              padding: '2.5rem',
              textAlign: 'center',
              cursor: uploading ? 'default' : 'pointer',
              background: dragging ? 'var(--sn-green-xlight)' : '#ffffff',
              transition: 'all 0.2s ease',
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={e => doUpload(e.target.files[0])}
            />
            {uploading ? (
              <div>
                <Loader size={36} color="#00c65e" style={{ animation: 'spin 1s linear infinite', marginBottom: '0.75rem' }} />
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Uploading... {progress}%</div>
                <div style={{ height: 6, background: '#e5efe9', borderRadius: 3, maxWidth: 280, margin: '0 auto' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#00c65e,#00a04b)', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
              </div>
            ) : (
              <div>
                <Upload size={40} color="#00c65e" style={{ marginBottom: '1rem', opacity: 0.8 }} />
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.3rem' }}>
                  Drag & drop your PDF here
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  or click to browse (max 50MB)
                </div>
                <button className="btn-secondary" style={{ padding: '0.6rem 1.5rem' }}>
                  Choose PDF
                </button>
              </div>
            )}
          </div>
        </>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Content Card ──────────────────────────────────────────────────────────────
function ContentCard({ item, onDelete, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState(null)
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending
  const Icon = cfg.icon

  const loadDetail = async () => {
    if (!expanded || detail) return
    try {
      const { data } = await contentApi.get(item.id)
      setDetail(data)
    } catch {}
  }

  useEffect(() => { loadDetail() }, [expanded])

  const handleDelete = async () => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return
    try {
      await contentApi.delete(item.id)
      toast.success('Deleted')
      onDelete(item.id)
    } catch {
      toast.error('Delete failed')
    }
  }

  return (
    <div className="stat-card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        {/* Icon */}
        <div style={{ width: 44, height: 44, background: 'rgba(99,102,241,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileText size={22} color="#6366f1" />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.title}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            {item.filename} · {formatBytes(item.file_size_bytes)} · {formatDate(item.created_at)}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: cfg.color, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon size={13} style={item.status === 'processing' ? { animation: 'spin 1s linear infinite' } : {}} />
              {cfg.label}
            </span>
            {item.status === 'completed' && (
              <>
                <span className="badge" style={{ fontSize: '0.72rem' }}>{item.total_chunks} chunks</span>
                <span className="badge" style={{ fontSize: '0.72rem' }}>{item.total_questions} questions</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
          <button onClick={onRefresh} title="Refresh status"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.3rem' }}>
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setExpanded(!expanded)} title="Expand"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.3rem' }}>
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <button onClick={handleDelete} title="Delete"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.3rem' }}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Expanded: topics */}
      {expanded && detail && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {detail.error_message && (
            <div style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
              ⚠ Error: {detail.error_message}
            </div>
          )}
          {detail.topics?.length > 0 && (
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
                Detected Topics
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {detail.topics.map(t => (
                  <span key={t.id} className="badge" style={{ gap: '0.3rem' }}>
                    <Tag size={10} /> {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ContentLibrary() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await contentApi.list()
      setItems(data)
    } catch {
      toast.error('Failed to load content')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Auto-refresh if any item is still processing
  useEffect(() => {
    const hasProcessing = items.some(i => i.status === 'pending' || i.status === 'processing')
    if (!hasProcessing) return
    const t = setTimeout(load, 4000)
    return () => clearTimeout(t)
  }, [items])

  const handleDelete = (id) => setItems(prev => prev.filter(i => i.id !== id))

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 900 }}>
      <div className="fade-in" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.3rem' }}>
          Content Library
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Upload CSA PDFs — they'll be automatically chunked and indexed for MCQ generation
        </p>
      </div>

      <UploadZone onUploaded={load} />

      {/* List */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Uploaded PDFs ({items.length})
          </h2>
          <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem' }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Loader size={32} color="#6366f1" style={{ animation: 'spin 1s linear infinite', marginBottom: '0.75rem' }} />
            <p>Loading...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="stat-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <FileText size={40} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-muted)' }}>No PDFs uploaded yet</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.3rem' }}>
              Drag and drop a CSA study material PDF above to get started
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {items.map(item => (
              <ContentCard
                key={item.id}
                item={item}
                onDelete={handleDelete}
                onRefresh={load}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
