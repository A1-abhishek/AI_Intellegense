import { useState, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { Upload as UploadIcon, Loader2, Image, FileText, CheckCircle, Shield } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const { isDark } = useTheme()

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setResult(null)
    try {
      const data = await api.uploadFile(file, true)
      setResult(data)
      toast.success(`Uploaded! Type: ${data.content_type}`)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (e) {
      toast.error(e.message)
    } finally {
      setUploading(false)
    }
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) {
      setFile(e.dataTransfer.files[0])
      setResult(null)
    }
  }, [])

  const hudLabel = (text) => ({
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.65rem',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'var(--text-tertiary)',
  })

  const hudValue = (text) => ({
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.8rem',
    color: 'var(--accent)',
  })

  return (
    <div className="max-w-2xl">
      {isDark ? (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h2 style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '1.1rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              textShadow: '0 0 20px rgba(0,255,136,0.3)',
            }}>SECURE UPLOAD CHANNEL</h2>
          </div>
          <p style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
            color: 'var(--text-tertiary)',
          }}>
            AUTO-DETECT FILE TYPE &bull; DOCUMENTS CHUNKED &amp; EMBEDDED &bull; IMAGES OCR&apos;D &amp; DESCRIBED
          </p>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold mb-2 text-gradient">Upload Document or Image</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Auto-detects file type. Documents get chunked & embedded. Images get OCR & described.
          </p>
        </>
      )}

      {isDark ? (
        <div className="hud-panel scan-overlay relative overflow-hidden">
          <div
            className={`relative border border-dashed p-12 text-center transition-colors cursor-pointer ${
              dragOver
                ? 'border-[var(--accent)] bg-[rgba(0,255,136,0.03)]'
                : 'border-[rgba(0,255,136,0.12)] hover:border-[rgba(0,255,136,0.25)]'
            }`}
            style={{ borderRadius: '2px' }}
            onClick={() => document.getElementById('file-input').click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <UploadIcon className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--accent)', opacity: 0.5 }} />
            {file ? (
              <div>
                <p style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.85rem',
                  color: 'var(--accent)',
                }}>{file.name}</p>
                <p style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.65rem',
                  color: 'var(--text-tertiary)',
                  marginTop: '4px',
                }}>
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <p style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.75rem',
                  color: 'var(--text-tertiary)',
                  marginBottom: '8px',
                }}>DROP FILE OR CLICK TO BROWSE</p>
                <p style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.6rem',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.05em',
                }}>
                  DOCUMENTS: PDF DOCX PPTX XLSX TXT MD CSV JSON HTML EPUB RTF
                </p>
                <p style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.6rem',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.05em',
                }}>
                  IMAGES: PNG JPG GIF BMP TIFF WEBP
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              id="file-input"
              type="file"
              className="hidden"
              onChange={(e) => { setFile(e.target.files[0]); setResult(null) }}
            />
          </div>

          {file && (
            <div className="mt-4 flex justify-end gap-3">
              <button
                className="btn-ghost"
                style={{ borderRadius: '2px' }}
                onClick={() => { setFile(null); setResult(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
              >
                CANCEL
              </button>
              <button className="btn-hud" onClick={handleUpload} disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                UPLOAD &amp; PROCESS
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
              dragOver ? 'border-indigo-500 bg-indigo-600/5' : 'border-white/[0.08] hover:border-white/[0.15]'
            }`}
            onClick={() => document.getElementById('file-input').click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <UploadIcon className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            {file ? (
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>Drop a file here or click to browse</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Documents: PDF, DOCX, PPTX, XLSX, TXT, MD, CSV, JSON, HTML, EPUB, RTF
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Images: PNG, JPG, GIF, BMP, TIFF, WebP
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              id="file-input"
              type="file"
              className="hidden"
              onChange={(e) => { setFile(e.target.files[0]); setResult(null) }}
            />
          </div>

          {file && (
            <div className="mt-4 flex justify-end gap-3">
              <button className="btn-ghost" onClick={() => { setFile(null); setResult(null); if (fileInputRef.current) fileInputRef.current.value = '' }}>
                Cancel
              </button>
              <button className="btn-glow" onClick={handleUpload} disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                Upload & Process
              </button>
            </div>
          )}
        </div>
      )}

      {result && (
        isDark ? (
          <div className="hud-panel mt-6 scan-overlay relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.7rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
              }}>UPLOAD COMPLETE — INTEL RECEIVED</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span style={hudLabel()}>CONTENT TYPE</span>
                  <span className="flex items-center gap-1.5">
                    {result.content_type === 'image' ? (
                      <><Image className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} /><span style={hudValue()}>IMAGE</span></>
                    ) : (
                      <><FileText className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} /><span style={hudValue()}>DOCUMENT</span></>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={hudLabel()}>SIZE</span>
                  <span style={hudValue()}>{result.size?.toLocaleString()} chars</span>
                </div>
                {result.content_type === 'image' && (
                  <>
                    {result.image_width && (
                      <div className="flex justify-between">
                        <span style={hudLabel()}>DIMENSIONS</span>
                        <span style={hudValue()}>{result.image_width} x {result.image_height}</span>
                      </div>
                    )}
                    {result.image_format && (
                      <div className="flex justify-between">
                        <span style={hudLabel()}>FORMAT</span>
                        <span style={hudValue()}>{result.image_format}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span style={hudLabel()}>EMBEDDED</span>
                  <span style={result.has_embeddings ? hudValue() : { ...hudLabel(), color: 'var(--text-muted)' }}>
                    {result.has_embeddings ? 'YES' : 'NO'}
                  </span>
                </div>
                {result.chunk_count > 0 && (
                  <div className="flex justify-between">
                    <span style={hudLabel()}>CHUNKS</span>
                    <span style={hudValue()}>{result.chunk_count}</span>
                  </div>
                )}
                {result.ocr_text && (
                  <div className="col-span-2 mt-2">
                    <span style={{ ...hudLabel(), fontSize: '0.6rem' }}>OCR TEXT:</span>
                    <p className="mt-1 max-h-20 overflow-auto p-2" style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.7rem',
                      color: 'var(--text-tertiary)',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(0,255,136,0.06)',
                      borderRadius: '2px',
                    }}>
                      {result.ocr_text.substring(0, 300)}
                    </p>
                  </div>
                )}
                {result.image_description && (
                  <div className="col-span-2 mt-2">
                    <span style={{ ...hudLabel(), fontSize: '0.6rem' }}>AI DESCRIPTION:</span>
                    <p className="mt-1 max-h-20 overflow-auto p-2" style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.7rem',
                      color: 'var(--text-tertiary)',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(0,255,136,0.06)',
                      borderRadius: '2px',
                    }}>
                      {result.image_description.substring(0, 300)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card mt-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <h3 className="font-semibold">Upload Complete</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>Content Type</span>
                  <span className="flex items-center gap-1.5">
                    {result.content_type === 'image' ? (
                      <><Image className="w-3.5 h-3.5 text-purple-400" /><span className="text-purple-400">Image</span></>
                    ) : (
                      <><FileText className="w-3.5 h-3.5 text-blue-400" /><span className="text-blue-400">Document</span></>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>Size</span>
                  <span>{result.size?.toLocaleString()} chars</span>
                </div>
                {result.content_type === 'image' && (
                  <>
                    {result.image_width && (
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-secondary)' }}>Dimensions</span>
                        <span>{result.image_width} x {result.image_height}</span>
                      </div>
                    )}
                    {result.image_format && (
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-secondary)' }}>Format</span>
                        <span>{result.image_format}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>Embedded</span>
                  <span className={result.has_embeddings ? 'text-green-400' : ''} style={!result.has_embeddings ? { color: 'var(--text-muted)' } : undefined}>
                    {result.has_embeddings ? 'Yes' : 'No'}
                  </span>
                </div>
                {result.chunk_count > 0 && (
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Chunks</span>
                    <span>{result.chunk_count}</span>
                  </div>
                )}
                {result.ocr_text && (
                  <div className="col-span-2 mt-2">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>OCR Text:</span>
                    <p className="text-xs mt-1 max-h-20 overflow-auto bg-white/[0.03] rounded p-2" style={{ color: 'var(--text-secondary)' }}>
                      {result.ocr_text.substring(0, 300)}
                    </p>
                  </div>
                )}
                {result.image_description && (
                  <div className="col-span-2 mt-2">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>AI Description:</span>
                    <p className="text-xs mt-1 max-h-20 overflow-auto bg-white/[0.03] rounded p-2" style={{ color: 'var(--text-secondary)' }}>
                      {result.image_description.substring(0, 300)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  )
}
