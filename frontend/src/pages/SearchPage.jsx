import { useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { Search as SearchIcon, Loader2, FileText, Clock, Database } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const { isDark } = useTheme()

  const highlightText = (text, q) => {
    if (!q.trim() || !text) return text
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase()
        ? isDark
          ? <mark key={i} style={{ background: 'rgba(0,255,136,0.15)', color: 'var(--accent)', borderRadius: '2px', padding: '0 2px' }}>{part}</mark>
          : <mark key={i} className="bg-indigo-500/25 rounded px-0.5" style={{ color: 'var(--text-primary)' }}>{part}</mark>
        : part
    )
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const data = await api.searchDocuments(query)
      setResults(data.results)
      setTotal(data.total)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const hudLabel = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.65rem',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'var(--text-tertiary)',
  }

  return (
    <div>
      {isDark ? (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h2 style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '1.1rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              textShadow: '0 0 20px rgba(0,255,136,0.3)',
            }}>DATABASE QUERY</h2>
          </div>
          <p style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
            color: 'var(--text-tertiary)',
          }}>FULL-TEXT SEARCH ACROSS ALL INDEXED DOCUMENTS</p>
        </div>
      ) : (
        <h2 className="text-2xl font-bold mb-6 text-gradient">Search Documents</h2>
      )}

      <form onSubmit={handleSearch} className={`flex gap-3 mb-8 ${isDark ? 'mb-8' : ''}`}>
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: isDark ? 'var(--accent)' : 'var(--text-secondary)', opacity: isDark ? 0.5 : 1 }} />
          <input
            className={isDark ? 'terminal-input pl-11' : 'glass-input pl-11'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isDark ? '> ENTER SEARCH QUERY...' : 'Search across all documents...'}
          />
        </div>
        <button className={isDark ? 'btn-hud' : 'btn-glow'} type="submit" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
          {isDark ? 'EXECUTE' : 'Search'}
        </button>
      </form>

      {searched && !loading && results.length === 0 && (
        <p className="text-center py-12" style={{ color: 'var(--text-secondary)', fontFamily: isDark ? "'JetBrains Mono', monospace" : undefined, fontSize: isDark ? '0.75rem' : undefined }}>
          {isDark ? '// NO MATCHING RECORDS FOUND' : 'No results found'}
        </p>
      )}

      {results.length > 0 && (
        <div>
          <p style={{
            fontFamily: isDark ? "'JetBrains Mono', monospace" : undefined,
            fontSize: isDark ? '0.7rem' : '0.875rem',
            letterSpacing: isDark ? '0.1em' : undefined,
            textTransform: isDark ? 'uppercase' : undefined,
            color: isDark ? 'var(--accent)' : 'var(--text-secondary)',
            marginBottom: '1rem',
          }}>
            {total} {isDark ? 'RECORDS RETRIEVED' : 'results found'}
          </p>
          <div className="space-y-3">
            {results.map((doc) => (
              isDark ? (
                <div key={doc.id} className="hud-panel" style={{ padding: '1rem' }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '0.8rem',
                        color: 'var(--accent)',
                        marginBottom: '4px',
                      }}>{highlightText(doc.title, query)}</h3>
                      <p style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '0.7rem',
                        color: 'var(--text-tertiary)',
                        lineHeight: '1.5',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>{highlightText(doc.content, query)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs ml-4 shrink-0" style={{ color: 'var(--text-muted)' }}>
                      <Clock className="w-3 h-3" />
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem' }}>
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {doc.tags?.length > 0 && (
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      {doc.tags.map((t) => (
                        <span key={t} style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '0.55rem',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          padding: '2px 6px',
                          border: '1px solid rgba(0,255,136,0.12)',
                          borderRadius: '2px',
                          color: 'var(--text-tertiary)',
                        }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div key={doc.id} className="glass-card hover:border-white/[0.15] transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{highlightText(doc.title, query)}</h3>
                      <p className="text-sm line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{highlightText(doc.content, query)}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs ml-4 shrink-0" style={{ color: 'var(--text-muted)' }}>
                      <Clock className="w-3 h-3" />
                      {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {doc.tags?.length > 0 && (
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      {doc.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06]"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {!searched && (
        isDark ? (
          <div className="text-center py-20">
            <SearchIcon className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--accent)', opacity: 0.15 }} />
            <p style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              color: 'var(--text-tertiary)',
            }}>AWAITING SEARCH QUERY</p>
            <p style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.6rem',
              color: 'var(--text-muted)',
              marginTop: '8px',
            }}>Full-text search across all indexed documents</p>
          </div>
        ) : (
          <div className="text-center py-20">
            <SearchIcon className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Full-text search across all your documents</p>
          </div>
        )
      )}
    </div>
  )
}
