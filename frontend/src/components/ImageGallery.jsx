import { useState } from 'react'
import { Image, X, ZoomIn, Download, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function ImageGallery({ images, docId }) {
  const [selected, setSelected] = useState(null)
  const [fullscreen, setFullscreen] = useState(false)
  const { isDark } = useTheme()

  if (!images || images.length === 0) return null

  const baseUrl = '/api/extracted-images'

  const gridItemStyle = isDark
    ? { borderRadius: '2px', border: '1px solid rgba(0,255,136,0.08)', background: 'rgba(0,255,136,0.015)' }
    : { borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }

  const gridHoverBorder = isDark
    ? 'rgba(0,255,136,0.3)'
    : 'rgba(99,102,241,0.3)'

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img, i) => (
          <div
            key={i}
            className="group relative aspect-square overflow-hidden cursor-pointer transition-all duration-300"
            style={{ ...gridItemStyle, transition: 'border-color 0.3s' }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = gridHoverBorder}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = gridItemStyle.border}
            onClick={() => { setSelected(i); setFullscreen(true) }}
          >
            <img
              src={`${baseUrl}/${docId}/${img.filename}`}
              alt={img.filename}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] truncate"
                  style={isDark
                    ? { fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent)', letterSpacing: '0.05em' }
                    : { color: '#d1d5db' }
                  }
                >
                  {img.filename}
                </span>
                <div className="flex items-center gap-1">
                  {img.width > 0 && (
                    <span className="text-[10px]" style={isDark
                      ? { fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }
                      : { color: 'var(--text-muted)' }
                    }>
                      {img.width}x{img.height}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div
                className={isDark
                  ? 'w-7 h-7 flex items-center justify-center'
                  : 'w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center'
                }
                style={isDark ? { background: 'rgba(0,0,0,0.7)', borderRadius: '2px', border: '1px solid rgba(0,255,136,0.15)' } : undefined}
              >
                <Maximize2 className="w-3.5 h-3.5" style={{ color: isDark ? 'var(--accent)' : 'white' }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {fullscreen && selected !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={isDark
            ? { background: 'rgba(0,0,0,0.95)' }
            : { background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(24px)' }
          }
          onClick={() => setFullscreen(false)}
        >
          {isDark && (
            <div
              className="pointer-events-none fixed inset-0 z-[51]"
              style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.015) 2px, rgba(0,255,136,0.015) 4px)',
              }}
            />
          )}

          <button
            className="absolute top-4 right-4 z-10 transition-colors"
            style={isDark
              ? { padding: '0.5rem', borderRadius: '2px', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)', color: 'var(--accent)' }
              : { padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }
            }
            onClick={() => setFullscreen(false)}
            onMouseEnter={(e) => {
              if (isDark) e.currentTarget.style.background = 'rgba(0,255,136,0.12)'
              else e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
            }}
            onMouseLeave={(e) => {
              if (isDark) e.currentTarget.style.background = 'rgba(0,255,136,0.06)'
              else e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
            }}
          >
            <X className="w-5 h-5" />
          </button>

          {images.length > 1 && (
            <>
              <button
                className="absolute left-4 z-10 transition-colors"
                style={isDark
                  ? { padding: '0.75rem', borderRadius: '2px', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)', color: 'var(--accent)' }
                  : { padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }
                }
                onClick={(e) => { e.stopPropagation(); setSelected((selected - 1 + images.length) % images.length) }}
                onMouseEnter={(e) => {
                  if (isDark) e.currentTarget.style.background = 'rgba(0,255,136,0.12)'
                  else e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                }}
                onMouseLeave={(e) => {
                  if (isDark) e.currentTarget.style.background = 'rgba(0,255,136,0.06)'
                  else e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                className="absolute right-4 z-10 transition-colors"
                style={isDark
                  ? { padding: '0.75rem', borderRadius: '2px', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)', color: 'var(--accent)' }
                  : { padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }
                }
                onClick={(e) => { e.stopPropagation(); setSelected((selected + 1) % images.length) }}
                onMouseEnter={(e) => {
                  if (isDark) e.currentTarget.style.background = 'rgba(0,255,136,0.12)'
                  else e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                }}
                onMouseLeave={(e) => {
                  if (isDark) e.currentTarget.style.background = 'rgba(0,255,136,0.06)'
                  else e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <div className="max-w-5xl max-h-[85vh] relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={`${baseUrl}/${docId}/${images[selected].filename}`}
              alt={images[selected].filename}
              className="max-w-full max-h-[80vh] object-contain"
              style={isDark ? { borderRadius: '2px' } : { borderRadius: '0.75rem' }}
            />
            <div className="flex items-center justify-between mt-3 px-1">
              <div>
                <p
                  className="text-sm"
                  style={isDark
                    ? { fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent)', letterSpacing: '0.05em' }
                    : { color: 'var(--text-primary)' }
                  }
                >
                  {images[selected].filename}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={isDark
                    ? { fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }
                    : { color: 'var(--text-muted)' }
                  }
                >
                  {images[selected].width > 0 && `${images[selected].width}x${images[selected].height} · `}
                  {images[selected].page > 0 && `Page ${images[selected].page} · `}
                  {(images[selected].size_bytes / 1024).toFixed(1)} KB
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs"
                  style={isDark
                    ? { fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)', letterSpacing: '0.1em' }
                    : { color: 'var(--text-muted)' }
                  }
                >
                  {isDark ? `${String(selected + 1).padStart(2, '0')}/${String(images.length).padStart(2, '0')}` : `${selected + 1} / ${images.length}`}
                </span>
                <a
                  href={`${baseUrl}/${docId}/${images[selected].filename}`}
                  download
                  className="transition-colors"
                  style={isDark
                    ? { padding: '0.5rem', borderRadius: '2px', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)', color: 'var(--accent)' }
                    : { padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }
                  }
                  onClick={(e) => e.stopPropagation()}
                  onMouseEnter={(e) => {
                    if (isDark) e.currentTarget.style.background = 'rgba(0,255,136,0.12)'
                    else e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                  }}
                  onMouseLeave={(e) => {
                    if (isDark) e.currentTarget.style.background = 'rgba(0,255,136,0.06)'
                    else e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  }}
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
