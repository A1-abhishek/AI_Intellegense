import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { usePageLog } from '../logger'
import { Dna, Loader2, Search, Image, FileText, Layers, Radar } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
 
export default function VectorSearchPage() {
  usePageLog('VectorSearch')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchType, setSearchType] = useState('all')
  const [nResults, setNResults] = useState(10)
  const [stats, setStats] = useState(null)
  const { isDark } = useTheme()

  useEffect(() => {
    api.stats().then(setStats).catch(() => {})
  }, [])

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    try {
      const data = await api.vectorSearch(query, nResults, searchType)
      setResults(data.results)
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

  const hudValue = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.75rem',
    color: 'var(--accent)',
  }

  const filterOpts = [
    { value: 'all', label: 'ALL', icon: Layers },
    { value: 'chunks', label: 'DOCS', icon: FileText },
    { value: 'images', label: 'IMAGES', icon: Image },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          {isDark ? (
            <>
              <div className="flex items-center gap-3 mb-2">
                <Radar className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                <h2 style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '1.1rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                  textShadow: '0 0 20px rgba(0,255,136,0.3)',
                }}>NEURAL SEMANTIC SEARCH</h2>
              </div>
              <p style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.7rem',
                letterSpacing: '0.08em',
                color: 'var(--text-tertiary)',
              }}>EMBEDDING-BASED SIMILARITY MATCHING</p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gradient">Vector Search</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Semantic search using embeddings</p>
            </>
          )}
        </div>
        {stats && (
          <div className="flex gap-4 text-xs" style={isDark ? {
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.6rem',
            letterSpacing: '0.1em',
            color: 'var(--text-tertiary)',
          } : { color: 'var(--text-secondary)' }}>
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" style={isDark ? { color: 'var(--accent)' } : undefined} />
              {stats.vector_store?.document_chunks || 0} chunks
            </span>
            <span className="flex items-center gap-1">
              <Image className="w-3.5 h-3.5" style={isDark ? { color: 'var(--accent)' } : undefined} />
              {stats.vector_store?.image_embeddings || 0} images
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSearch} className="space-y-3 mb-8">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: isDark ? 'var(--accent)' : 'var(--text-secondary)', opacity: isDark ? 0.5 : 1 }} />
            <input
              className={isDark ? 'terminal-input pl-11' : 'glass-input pl-11'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isDark ? '> DESCRIBE TARGET INTEL...' : "Describe what you're looking for..."}
            />
          </div>
          <button className={isDark ? 'btn-hud' : 'btn-glow'} type="submit" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
            {isDark ? 'EXECUTE' : 'Search'}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {filterOpts.map((opt) => (
              isDark ? (
                <button
                  key={opt.value}
                  type="button"
                  className={`hud-filter ${searchType === opt.value ? 'active' : ''}`}
                  onClick={() => setSearchType(opt.value)}
                >
                  <opt.icon className="w-3 h-3 inline mr-1" />
                  {opt.label}
                </button>
              ) : (
                <button
                  key={opt.value}
                  type="button"
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    searchType === opt.value
                      ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400'
                      : 'border-white/[0.08] hover:text-gray-300'
                  }`}
                  style={searchType !== opt.value ? { color: 'var(--text-muted)' } : undefined}
                  onClick={() => setSearchType(opt.value)}
                >
                  <opt.icon className="w-3 h-3" />
                  {opt.label === 'ALL' ? 'All' : opt.label === 'DOCS' ? 'Documents' : 'Images'}
                </button>
              )
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs" style={isDark ? {
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.6rem',
            color: 'var(--text-tertiary)',
          } : { color: 'var(--text-secondary)' }}>
            <label>{isDark ? 'LIMIT:' : 'Results:'}</label>
            <select
              className={isDark
                ? 'bg-transparent border border-[rgba(0,255,136,0.12)] rounded-none px-2 py-1 text-xs'
                : 'bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-xs'
              }
              style={{ color: isDark ? 'var(--accent)' : 'var(--text-primary)', fontFamily: isDark ? "'JetBrains Mono', monospace" : undefined }}
              value={nResults}
              onChange={(e) => setNResults(Number(e.target.value))}
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      </form>

      {results.length > 0 && (
        <div className="space-y-3">
          <p style={{
            fontFamily: isDark ? "'JetBrains Mono', monospace" : undefined,
            fontSize: isDark ? '0.7rem' : '0.875rem',
            letterSpacing: isDark ? '0.1em' : undefined,
            textTransform: isDark ? 'uppercase' : undefined,
            color: isDark ? 'var(--accent)' : 'var(--text-secondary)',
            marginBottom: '0.5rem',
          }}>
            {results.length} {isDark ? 'VECTORS MATCHED' : 'results found'}
          </p>
          {results.map((r) => (
            isDark ? (
              <div key={r.id} className="hud-panel" style={{ padding: '1rem' }}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 flex items-center justify-center shrink-0 ${
                    r.result_type === 'image' ? '' : ''
                  }`} style={{
                    background: r.result_type === 'image' ? 'rgba(0,255,136,0.06)' : 'rgba(0,255,136,0.04)',
                    border: '1px solid rgba(0,255,136,0.1)',
                    borderRadius: '2px',
                  }}>
                    {r.result_type === 'image' ? (
                      <Image className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    ) : (
                      <FileText className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '0.55rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        border: '1px solid rgba(0,255,136,0.15)',
                        borderRadius: '2px',
                        color: 'var(--accent)',
                      }}>
                        {r.result_type}
                      </span>
                      {r.metadata?.doc_id && (
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '0.55rem',
                          color: 'var(--text-muted)',
                        }}>
                          DOC: {r.metadata.doc_id.substring(0, 8)}...
                        </span>
                      )}
                      <span className="ml-auto" style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '0.55rem',
                        letterSpacing: '0.08em',
                        color: 'var(--accent)',
                      }}>
                        SCORE: {(1 - r.distance).toFixed(4)}
                      </span>
                    </div>
                    <p style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.7rem',
                      color: 'var(--text-tertiary)',
                      lineHeight: '1.5',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>{r.text}</p>
                    {r.metadata?.filename && (
                      <p style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '0.55rem',
                        color: 'var(--text-muted)',
                        marginTop: '4px',
                      }}>{r.metadata.filename}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div key={r.id} className="glass-card hover:border-white/[0.15] transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    r.result_type === 'image' ? 'bg-purple-600/20' : 'bg-blue-600/20'
                  }`}>
                    {r.result_type === 'image' ? (
                      <Image className="w-4 h-4 text-purple-400" />
                    ) : (
                      <FileText className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        r.result_type === 'image'
                          ? 'bg-purple-600/20 text-purple-400'
                          : 'bg-blue-600/20 text-blue-400'
                      }`}>
                        {r.result_type}
                      </span>
                      {r.metadata?.doc_id && (
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          doc: {r.metadata.doc_id.substring(0, 8)}...
                        </span>
                      )}
                      <span className="text-[10px] ml-auto" style={{ color: 'var(--text-muted)' }}>
                        score: {(1 - r.distance).toFixed(4)}
                      </span>
                    </div>
                    <p className="text-sm line-clamp-3" style={{ color: 'var(--text-secondary)' }}>{r.text}</p>
                    {r.metadata?.filename && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{r.metadata.filename}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {!loading && results.length === 0 && query && (
        <p className="text-center py-12" style={{ color: 'var(--text-secondary)', fontFamily: isDark ? "'JetBrains Mono', monospace" : undefined, fontSize: isDark ? '0.75rem' : undefined }}>
          {isDark ? '// NO VECTORS MATCH CRITERIA' : 'No results found'}
        </p>
      )}

      {results.length === 0 && !query && (
        isDark ? (
          <div className="text-center py-20">
            <Dna className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--accent)', opacity: 0.15 }} />
            <p style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.8rem',
              letterSpacing: '0.1em',
              color: 'var(--text-tertiary)',
              marginBottom: '8px',
            }}>SEMANTIC VECTOR ENGINE ONLINE</p>
            <p style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.6rem',
              color: 'var(--text-muted)',
            }}>
              Search by meaning, not keywords. Upload documents with embeddings enabled first.
            </p>
          </div>
        ) : (
          <div className="text-center py-20">
            <Dna className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>Semantic vector search</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Search by meaning, not just keywords. Upload documents with embeddings enabled first.
            </p>
          </div>
        )
      )}
    </div>
  )
}
