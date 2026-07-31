import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { MessageCircle, Send, Loader2, CheckCircle, Trash2, Bot, User, Terminal } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useTheme } from '../context/ThemeContext'

export default function ChatPage() {
  const [docs, setDocs] = useState([])
  const [selectedDocs, setSelectedDocs] = useState([])
  const [useAll, setUseAll] = useState(true)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)
  const { isDark } = useTheme()

  useEffect(() => {
    api.listDocuments(1, 100).then((d) => setDocs(d.documents)).catch(() => {})
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return

    const userMsg = { role: 'user', content: msg }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const data = await api.chat({
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        doc_ids: useAll ? [] : selectedDocs,
        use_all_docs: useAll,
      })
      setMessages([...newMessages, { role: 'assistant', content: data.reply }])
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const toggleDoc = (id) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  const clearChat = () => {
    setMessages([])
  }

  const starters = [
    'Explain the key concepts from my documents',
    'What are the recurring themes?',
    'Create an outline based on all documents',
    'What questions do these documents answer?',
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-5 px-1">
        <div>
          {isDark ? (
            <>
              <div className="flex items-center gap-3 mb-2">
                <Terminal className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                <h2 style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '1.1rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                  textShadow: '0 0 20px rgba(0,255,136,0.3)',
                }}>COMMAND TERMINAL</h2>
              </div>
              <p style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.7rem',
                letterSpacing: '0.08em',
                color: 'var(--text-tertiary)',
                marginLeft: '32px',
              }}>DOCUMENT INTELLIGENCE CHAT INTERFACE</p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gradient flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600/40 to-violet-600/40 backdrop-blur-sm border border-white/[0.08]">
                  <MessageCircle className="w-5 h-5 text-indigo-400" />
                </span>
                Knowledge Base Chat
              </h2>
              <p className="text-sm mt-1 ml-[46px]" style={{ color: 'var(--text-secondary)' }}>Chat with your documents using AI</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isDark ? (
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
              ALL DOCS
            </label>
          ) : (
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-colors" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={useAll}
                onChange={(e) => setUseAll(e.target.checked)}
                className="rounded border-white/[0.2] bg-white/[0.04] text-indigo-500 focus:ring-indigo-500"
              />
              All docs
            </label>
          )}
          {messages.length > 0 && (
            isDark ? (
              <button
                onClick={clearChat}
                className="hud-filter"
                style={{ borderColor: 'rgba(255,51,102,0.2)', color: 'var(--danger)' }}
              >
                <Trash2 className="w-3 h-3 inline mr-1" /> PURGE
              </button>
            ) : (
              <button
                onClick={clearChat}
                className="flex items-center gap-1.5 text-sm hover:text-red-400 px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-red-500/20 hover:bg-red-500/[0.05] transition-all" style={{ color: 'var(--text-secondary)' }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )
          )}
        </div>
      </div>

      {!useAll && (
        <div className="flex flex-wrap gap-2 mb-4 px-1">
          {docs.map((d) => (
            isDark ? (
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
            ) : (
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
            )
          ))}
        </div>
      )}

      {isDark ? (
        <div className="flex-1 overflow-auto mb-4 flex flex-col" style={{
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(0,255,136,0.1)',
          borderRadius: '2px',
        }}>
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 relative scan-overlay overflow-hidden">
              <div className="w-[72px] h-[72px] flex items-center justify-center mb-5" style={{
                background: 'rgba(0,255,136,0.04)',
                border: '1px solid rgba(0,255,136,0.15)',
                borderRadius: '2px',
              }}>
                <Terminal className="w-8 h-8" style={{ color: 'var(--accent)', opacity: 0.5 }} />
              </div>
              <h3 style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.9rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                marginBottom: '8px',
              }}>COMMAND INTERFACE READY</h3>
              <p style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.65rem',
                color: 'var(--text-tertiary)',
                maxWidth: '28rem',
                lineHeight: '1.6',
                marginBottom: '2rem',
              }}>
                Query the document knowledge base. AI will search and provide intelligence briefings.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
                {starters.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="hud-panel text-left scan-overlay relative overflow-hidden"
                    style={{ padding: '0.75rem', cursor: 'pointer' }}
                  >
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.65rem',
                      color: 'var(--text-tertiary)',
                      lineHeight: '1.5',
                    }}>{s}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 p-5 space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{
                      background: 'rgba(0,255,136,0.06)',
                      border: '1px solid rgba(0,255,136,0.2)',
                      borderRadius: '2px',
                    }}>
                      <Terminal className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] px-4 py-3 ${
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
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '2px',
                    }}>
                      <User className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{
                    background: 'rgba(0,255,136,0.06)',
                    border: '1px solid rgba(0,255,136,0.2)',
                    borderRadius: '2px',
                  }}>
                    <Terminal className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(0,255,136,0.08)',
                    borderRadius: '2px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto glass mb-4 flex flex-col rounded-2xl">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br from-indigo-600/30 to-violet-600/30 border border-white/[0.08] shadow-xl shadow-indigo-500/10">
                <MessageCircle className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Start a conversation
              </h3>
              <p className="text-sm mb-8 max-w-md leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Ask anything about your documents. The AI will search through your knowledge base
                and provide informed answers.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
                {starters.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="p-3.5 text-left text-sm border border-white/[0.08] rounded-xl hover:border-indigo-500/30 hover:text-gray-200 hover:bg-indigo-500/[0.05] transition-all duration-200 bg-white/[0.02]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 p-5 space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25">
                      <Bot className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm backdrop-blur-xl ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-indigo-600/25 to-violet-600/15 text-indigo-100 rounded-tr-sm border border-indigo-500/20 shadow-lg shadow-indigo-500/5'
                        : 'bg-white/[0.05] rounded-tl-sm border border-white/[0.08]'
                    }`}
                    style={msg.role === 'assistant' ? { color: 'var(--text-primary)' } : undefined}
                  >
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown className="prose prose-sm max-w-none">
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-gray-400 to-gray-500 shadow-lg shadow-gray-700/25">
                      <User className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25">
                    <Bot className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
                  </div>
                  <div className="bg-white/[0.05] backdrop-blur-xl border border-white/[0.08] rounded-2xl rounded-tl-sm px-4 py-3.5 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <input
          ref={inputRef}
          className={isDark ? 'terminal-input flex-1' : 'glass-input flex-1'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={isDark ? '> ENTER COMMAND...' : 'Ask anything about your documents...'}
          disabled={loading}
        />
        <button
          className={isDark ? 'btn-hud' : 'btn-glow'}
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
