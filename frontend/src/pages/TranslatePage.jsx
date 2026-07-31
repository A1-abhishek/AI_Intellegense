import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { Languages, Loader2, ArrowRight, Copy, Check, Globe } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ru', name: 'Russian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
]

export default function TranslatePage() {
  const [docs, setDocs] = useState([])
  const [selectedDoc, setSelectedDoc] = useState('')
  const [content, setContent] = useState('')
  const [targetLang, setTargetLang] = useState('es')
  const [translated, setTranslated] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const { isDark } = useTheme()

  useEffect(() => {
    api.listDocuments(1, 100).then((d) => setDocs(d.documents)).catch(() => {})
  }, [])

  const handleSelectDoc = async (id) => {
    setSelectedDoc(id)
    setTranslated('')
    if (id) {
      try {
        const doc = await api.getDocument(id)
        setContent(doc.content)
      } catch {
        toast.error('Failed to load document')
      }
    } else {
      setContent('')
    }
  }

  const handleTranslate = async () => {
    if (!content.trim()) {
      toast.error('No content to translate')
      return
    }
    setLoading(true)
    try {
      const data = await api.translate({
        doc_id: selectedDoc || undefined,
        content: !selectedDoc ? content : undefined,
        target_language: targetLang,
      })
      setTranslated(data.translated_text)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const copyTranslation = () => {
    navigator.clipboard.writeText(translated)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
    <div>
      {isDark ? (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h2 style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '1.1rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              textShadow: '0 0 20px rgba(0,255,136,0.3)',
            }}>LANGUAGE DECODER</h2>
          </div>
          <p style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
            color: 'var(--text-tertiary)',
          }}>MULTILINGUAL TRANSLATION PROTOCOL — 16 LANGUAGES ACTIVE</p>
        </div>
      ) : (
        <h2 className="text-2xl font-bold mb-6 text-gradient flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600/40 to-violet-600/40 backdrop-blur-sm border border-white/[0.08]">
            <Languages className="w-5 h-5 text-indigo-400" />
          </span>
          Translate
        </h2>
      )}

      {isDark ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="hud-panel scan-overlay relative overflow-hidden space-y-4">
            <div>
              <label style={hudLabel}>SOURCE INPUT</label>
              <select
                className="terminal-input"
                value={selectedDoc}
                onChange={(e) => handleSelectDoc(e.target.value)}
              >
                <option value="">-- PASTE CUSTOM TEXT --</option>
                {docs.map((d) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={hudLabel}>原始情报 (ORIGINAL TEXT)</label>
              <textarea
                className="terminal-input h-64 resize-none"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="> PASTE CONTENT FOR DECODING..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="hud-panel scan-overlay relative overflow-hidden">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label style={hudLabel}>TARGET LANGUAGE</label>
                  <select
                    className="terminal-input"
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  className="btn-hud shrink-0"
                  onClick={handleTranslate}
                  disabled={loading || !content.trim()}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  ) : (
                    <Languages className="w-4 h-4 inline mr-2" />
                  )}
                  DECODE
                </button>
              </div>
            </div>
            <div className="relative hud-panel scan-overlay relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span style={hudLabel}>DECODED OUTPUT</span>
                {translated && (
                  <button
                    onClick={copyTranslation}
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
                )}
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.75rem',
                color: translated ? 'var(--accent)' : 'var(--text-muted)',
                height: '16rem',
                overflow: 'auto',
                padding: '0.75rem',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(0,255,136,0.06)',
                borderRadius: '2px',
                lineHeight: '1.7',
                whiteSpace: translated ? 'pre-wrap' : undefined,
              }}>
                {translated || '> AWAITING DECODED TRANSMISSION...'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card space-y-4">
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Source</label>
              <select
                className="glass-input"
                value={selectedDoc}
                onChange={(e) => handleSelectDoc(e.target.value)}
              >
                <option value="">Paste custom text</option>
                {docs.map((d) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Original Text</label>
              <textarea
                className="glass-input h-64 resize-none font-mono text-sm"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Text to translate..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="glass-card">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Target Language</label>
                  <select
                    className="glass-input"
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  className="btn-glow shrink-0"
                  onClick={handleTranslate}
                  disabled={loading || !content.trim()}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  ) : (
                    <Languages className="w-4 h-4 inline mr-2" />
                  )}
                  Translate
                </button>
              </div>
            </div>
            <div className="relative glass-card">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Translation</label>
                {translated && (
                  <button
                    onClick={copyTranslation}
                    className="flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.05]" style={{ color: 'var(--text-secondary)' }}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
              <div className={`bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 h-64 overflow-auto font-mono text-sm ${translated ? 'whitespace-pre-wrap leading-relaxed' : ''}`} style={{ color: translated ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {translated || 'Translation will appear here...'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
