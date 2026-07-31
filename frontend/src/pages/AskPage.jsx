import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { Brain, Loader2, Send, CheckCircle, Bot, User, Terminal } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useTheme } from '../context/ThemeContext'

export default function AskPage() {
  const [docs, setDocs] = useState([])
  const [question, setQuestion] = useState('')
  const [selectedDocs, setSelectedDocs] = useState([])
  const [useAll, setUseAll] = useState(true)
  const [answer, setAnswer] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const answerRef = useRef(null)
  const { isDark } = useTheme()

  useEffect(() => {
    api.listDocuments(1, 100).then((d) => setDocs(d.documents)).catch(() => {})
  }, [])

  const handleAsk = async (q) => {
    const qText = q || question
    if (!qText.trim()) return

    setLoading(true)
    setQuestion('')
    const userMsg = { role: 'user', content: qText }
    setHistory((prev) => [...prev, userMsg])
    setAnswer('')

    try {
      const data = await api.askQuestion({
        question: qText,
        doc_ids: useAll ? [] : selectedDocs,
        use_all_docs: useAll,
      })
      setAnswer(data.answer)
      setHistory((prev) => [...prev, { role: 'assistant', content: data.answer }])
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleDoc = (id) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  const sampleQuestions = [
    'What are the main topics covered in my documents?',
    'Summarize the key findings',
    'What are the action items mentioned?',
    'Compare the different approaches discussed',
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
            <Terminal className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h2 style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '1.1rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              textShadow: '0 0 20px rgba(0,255,136,0.3)',
            }}>TACTICAL Q&A</h2>
          </div>
          <p style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
            color: 'var(--text-tertiary)',
          }}>QUERY DOCUMENT KNOWLEDGE BASE FOR INTELLIGENCE EXTRACTION</p>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold mb-2 text-gradient flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600/40 to-violet-600/40 backdrop-blur-sm border border-white/[0.08]">
              <Brain className="w-5 h-5 text-indigo-400" />
            </span>
            Ask Question
          </h2>
          <p className="text-sm mb-6 ml-[46px]" style={{ color: 'var(--text-secondary)' }}>
            Ask questions and get answers from your document knowledge base
          </p>
        </>
      )}

      {isDark ? (
        <div className="hud-panel mb-6 scan-overlay relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span style={hudLabel}>SOURCE DOCUMENTS</span>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.6rem',
              letterSpacing: '0.08em',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: '4px 10px',
              border: '1px solid rgba(0,255,136,0.08)',
              borderRadius: '2px',
              background: 'transparent',
            }}>
              <input
                type="checkbox"
                checked={useAll}
                onChange={(e) => setUseAll(e.target.checked)}
                className="rounded border-white/[0.2] bg-white/[0.04] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              USE ALL
            </label>
          </div>
          {!useAll && (
            <div className="flex flex-wrap gap-2 max-h-32 overflow-auto">
              {docs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => toggleDoc(d.id)}
                  className="hud-filter"
                  style={selectedDocs.includes(d.id) ? {
                    borderColor: 'rgba(0,255,136,0.4)',
                    color: 'var(--accent)',
                    background: 'rgba(0,255,136,0.06)',
                  } : undefined}
                >
                  {selectedDocs.includes(d.id) && <CheckCircle className="w-3 h-3 inline mr-1" />}
                  {d.title}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Source Documents</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-colors" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={useAll}
                onChange={(e) => setUseAll(e.target.checked)}
                className="rounded border-white/[0.2] bg-white/[0.04] text-indigo-500 focus:ring-indigo-500"
              />
              Use all documents
            </label>
          </div>
          {!useAll && (
            <div className="flex flex-wrap gap-2 max-h-32 overflow-auto">
              {docs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => toggleDoc(d.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                    selectedDocs.includes(d.id)
                      ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 shadow-lg shadow-indigo-500/10'
                      : 'border-white/[0.08] hover:text-gray-300 hover:border-white/[0.15] bg-white/[0.02]'
                  }`}
                  style={!selectedDocs.includes(d.id) ? { color: 'var(--text-secondary)' } : undefined}
                >
                  {selectedDocs.includes(d.id) && <CheckCircle className="w-3 h-3 inline mr-1" />}
                  {d.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {history.length === 0 && (
        isDark ? (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {sampleQuestions.map((sq) => (
              <button
                key={sq}
                onClick={() => handleAsk(sq)}
                className="hud-panel text-left scan-overlay relative overflow-hidden"
                style={{ padding: '0.75rem', cursor: 'pointer' }}
              >
                <Terminal className="w-4 h-4 mb-2" style={{ color: 'var(--accent)', opacity: 0.5 }} />
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.7rem',
                  color: 'var(--text-tertiary)',
                  lineHeight: '1.5',
                }}>{sq}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {sampleQuestions.map((sq) => (
              <button
                key={sq}
                onClick={() => handleAsk(sq)}
                className="glass-card text-left text-sm hover:text-gray-200 hover:border-indigo-500/20 hover:bg-indigo-500/[0.03] transition-all duration-200"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Brain className="w-4 h-4 mb-2 text-indigo-400" />
                {sq}
              </button>
            ))}
          </div>
        )
      )}

      {history.length > 0 && (
        <div className="space-y-4 mb-6 max-h-96 overflow-auto" ref={answerRef}>
          {history.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                isDark ? (
                  <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{
                    background: 'rgba(0,255,136,0.06)',
                    border: '1px solid rgba(0,255,136,0.2)',
                    borderRadius: '2px',
                  }}>
                    <Terminal className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25">
                    <Bot className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
                  </div>
                )
              )}
              {isDark ? (
                <div
                  className={`max-w-[80%] px-4 py-3 ${
                    msg.role === 'user'
                      ? 'border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.03)]'
                      : 'border border-[rgba(0,255,136,0.08)] bg-[rgba(0,0,0,0.3)]'
                  }`}
                  style={{ borderRadius: '2px' }}
                >
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown className="prose prose-invert prose-sm max-w-none">
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <div className="whitespace-pre-wrap" style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.8rem',
                      color: 'var(--accent)',
                    }}>{msg.content}</div>
                  )}
                </div>
              ) : (
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm backdrop-blur-xl ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-indigo-600/25 to-violet-600/15 border border-indigo-500/20 shadow-lg shadow-indigo-500/5 rounded-tr-sm'
                      : 'bg-white/[0.05] border border-white/[0.08] rounded-tl-sm'
                  }`}
                  style={{ color: 'var(--text-primary)' }}
                >
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown className="prose prose-sm max-w-none">
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
              )}
              {msg.role === 'user' && (
                isDark ? (
                  <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '2px',
                  }}>
                    <User className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-gray-400 to-gray-500 shadow-lg shadow-gray-700/25">
                    <User className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
                  </div>
                )
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              {isDark ? (
                <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{
                  background: 'rgba(0,255,136,0.06)',
                  border: '1px solid rgba(0,255,136,0.2)',
                  borderRadius: '2px',
                }}>
                  <Terminal className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25">
                  <Bot className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
                </div>
              )}
              <div style={isDark ? {
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(0,255,136,0.08)',
                borderRadius: '2px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              } : {
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '1rem 1rem 1rem 0.25rem',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: isDark ? 'var(--accent)' : '#818cf8', animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: isDark ? 'var(--accent)' : '#818cf8', animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: isDark ? 'var(--accent)' : '#818cf8', animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <input
          className={isDark ? 'terminal-input flex-1' : 'glass-input flex-1'}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAsk()}
          placeholder={isDark ? '> ENTER QUERY...' : 'Ask a question about your documents...'}
          disabled={loading}
        />
        <button
          className={isDark ? 'btn-hud' : 'btn-glow'}
          onClick={() => handleAsk()}
          disabled={loading || !question.trim()}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
