import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { BookOpen, Loader2, Copy, Check, FileSearch } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useTheme } from '../context/ThemeContext'

export default function SummarizePage() {
  const [docs, setDocs] = useState([])
  const [selectedDoc, setSelectedDoc] = useState('')
  const [customContent, setCustomContent] = useState('')
  const [style, setStyle] = useState('concise')
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const { isDark } = useTheme()

  useEffect(() => {
    api.listDocuments(1, 100).then((d) => setDocs(d.documents)).catch(() => {})
  }, [])

  const handleSummarize = async () => {
    if (!selectedDoc && !customContent.trim()) {
      toast.error('Select a document or paste content')
      return
    }
    setLoading(true)
    setSummary('')
    try {
      const data = await api.summarize({
        doc_id: selectedDoc || undefined,
        content: customContent || undefined,
        style,
      })
      setSummary(data.summary)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const copySummary = () => {
    navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const styles = [
    { value: 'concise', label: 'CONCISE', desc: '2-3 sentences' },
    { value: 'detailed', label: 'DETAILED', desc: 'Full paragraph' },
    { value: 'bullets', label: 'BULLETS', desc: '5-7 key points' },
  ]

  const hudLabel = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.65rem',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'var(--text-tertiary)',
    display: 'block',
    marginBottom: '0.5rem',
  }

  return (
    <div className="max-w-3xl">
      {isDark ? (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <FileSearch className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h2 style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '1.1rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              textShadow: '0 0 20px rgba(0,255,136,0.3)',
            }}>INTELLIGENCE SUMMARY</h2>
          </div>
          <p style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
            color: 'var(--text-tertiary)',
          }}>EXTRACT AND DISTILL CRITICAL INFORMATION FROM DOCUMENTS</p>
        </div>
      ) : (
        <h2 className="text-2xl font-bold mb-6 text-gradient flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600/40 to-violet-600/40 backdrop-blur-sm border border-white/[0.08]">
            <BookOpen className="w-5 h-5 text-indigo-400" />
          </span>
          Summarize
        </h2>
      )}

      {isDark ? (
        <div className="hud-panel scan-overlay relative overflow-hidden space-y-5">
          <div>
            <label style={hudLabel}>SELECT DOCUMENT</label>
            <select
              className="terminal-input"
              value={selectedDoc}
              onChange={(e) => { setSelectedDoc(e.target.value); setCustomContent('') }}
            >
              <option value="">-- SELECT TARGET --</option>
              {docs.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>

          {!selectedDoc && (
            <div>
              <label style={hudLabel}>OR PASTE RAW INTEL</label>
              <textarea
                className="terminal-input h-40 resize-none"
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                placeholder="> PASTE CONTENT FOR ANALYSIS..."
              />
            </div>
          )}

          <div>
            <label style={hudLabel}>ANALYSIS DEPTH</label>
            <div className="flex gap-3">
              {styles.map((s) => (
                <button
                  key={s.value}
                  className={`flex-1 p-3 text-left transition-all duration-200 ${
                    style === s.value
                      ? 'btn-hud'
                      : ''
                  }`}
                  style={style !== s.value ? {
                    background: 'transparent',
                    border: '1px solid rgba(0,255,136,0.08)',
                    borderRadius: '2px',
                    fontFamily: "'JetBrains Mono', monospace",
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                  } : undefined}
                  onClick={() => setStyle(s.value)}
                >
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.7rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: style === s.value ? 'var(--accent)' : 'var(--text-secondary)',
                    marginBottom: '2px',
                  }}>{s.label}</div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.55rem',
                    color: 'var(--text-muted)',
                  }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn-hud w-full"
            onClick={handleSummarize}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
            GENERATE REPORT
          </button>
        </div>
      ) : (
        <div className="glass-card space-y-5">
          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Select Document</label>
            <select
              className="glass-input"
              value={selectedDoc}
              onChange={(e) => { setSelectedDoc(e.target.value); setCustomContent('') }}
            >
              <option value="">-- Choose a document --</option>
              {docs.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>

          {!selectedDoc && (
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Or paste content</label>
              <textarea
                className="glass-input h-40 resize-none font-mono text-sm"
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                placeholder="Paste text to summarize..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Summary Style</label>
            <div className="flex gap-3">
              {styles.map((s) => (
                <button
                  key={s.value}
                  className={`flex-1 p-3 rounded-xl border text-left transition-all duration-200 ${
                    style === s.value
                      ? 'border-indigo-500/40 bg-indigo-600/15 shadow-lg shadow-indigo-500/10'
                      : 'border-white/[0.08] hover:border-white/[0.15] bg-white/[0.02]'
                  }`}
                  onClick={() => setStyle(s.value)}
                >
                  <div className="text-sm font-medium">{s.label.replace('CONCISE', 'Concise').replace('DETAILED', 'Detailed').replace('BULLETS', 'Bullets')}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn-glow w-full"
            onClick={handleSummarize}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
            Generate Summary
          </button>
        </div>
      )}

      {summary && (
        isDark ? (
          <div className="hud-panel mt-6 scan-overlay relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.65rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
              }}>DECODED INTEL REPORT</span>
              <button
                onClick={copySummary}
                className="flex items-center gap-1 text-xs transition-colors px-2 py-1 hover:bg-[rgba(0,255,136,0.06)]"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.6rem',
                  letterSpacing: '0.08em',
                  color: 'var(--text-tertiary)',
                  border: '1px solid rgba(0,255,136,0.08)',
                  borderRadius: '2px',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'COPIED' : 'COPY'}
              </button>
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.75rem',
              lineHeight: '1.7',
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
            }}>
              {summary}
            </div>
          </div>
        ) : (
          <div className="glass-card mt-6 relative">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Summary</h3>
              <button
                onClick={copySummary}
                className="flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.05]"
                style={{ color: 'var(--text-secondary)' }}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {summary}
            </div>
          </div>
        )
      )}
    </div>
  )
}
