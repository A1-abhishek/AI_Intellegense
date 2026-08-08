import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { usePageLog } from '../logger'
import { useTheme } from '../context/ThemeContext'
import {
  Users, Search, X, Loader2, Eye, ChevronLeft, ChevronRight,
  Fingerprint, ScanFace, AlertCircle, Target, Crosshair
} from 'lucide-react'

function ScanReticle({ face, imgW, imgH, selected }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [x1, y1, x2, y2] = face.bbox
  const style = {
    left: `${(x1 / imgW) * 100}%`,
    top: `${(y1 / imgH) * 100}%`,
    width: `${((x2 - x1) / imgW) * 100}%`,
    height: `${((y2 - y1) / imgH) * 100}%`,
  }

  if (!isDark) {
    return (
      <div
        className={`absolute border-2 rounded-sm cursor-pointer transition-all duration-200 ${
          selected ? 'border-green-400 shadow-lg shadow-green-500/30' : 'border-indigo-400/60 hover:border-indigo-400'
        }`}
        style={style}
      />
    )
  }

  return (
    <div
      className={`absolute cursor-pointer transition-all duration-300 ${selected ? 'z-20' : 'z-10'}`}
      style={{ ...style, border: 'none' }}
    >
      {/* Corner brackets */}
      <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2" style={{ borderColor: selected ? '#00ff88' : 'rgba(0,255,136,0.6)' }} />
      <div className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2" style={{ borderColor: selected ? '#00ff88' : 'rgba(0,255,136,0.6)' }} />
      <div className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2" style={{ borderColor: selected ? '#00ff88' : 'rgba(0,255,136,0.6)' }} />
      <div className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2" style={{ borderColor: selected ? '#00ff88' : 'rgba(0,255,136,0.6)' }} />
      {/* Label */}
      <div className="absolute -top-5 left-0 flex items-center gap-1 px-1 rounded-sm" style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(0,255,136,0.2)', fontSize: '8px', fontFamily: "'JetBrains Mono', monospace", color: '#00ff88', whiteSpace: 'nowrap' }}>
        <Crosshair className="w-2 h-2" />
        {face.age}y {face.gender}
      </div>
      {selected && (
        <div className="absolute inset-0 animate-reticle-pulse" style={{ background: 'rgba(0,255,136,0.05)' }} />
      )}
    </div>
  )
}

export default function FaceGalleryPage() {
  usePageLog('FaceGallery')
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [images, setImages] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(null)
  const [selectedFace, setSelectedFace] = useState(null)
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [similarityThreshold, setSimilarityThreshold] = useState(0.5)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [galleryData, statsData] = await Promise.all([api.faceGallery(), api.faceStats()])
      setImages(galleryData.images)
      setStats(statsData)
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleFaceSearch = async (docId, faceIndex) => {
    setSearching(true)
    setSearchResults(null)
    setSelectedFace({ docId, faceIndex })
    try {
      const data = await api.faceSearch(docId, faceIndex, similarityThreshold, 20)
      setSearchResults(data)
      toast.success(`Found ${data.total} similar face(s)`)
    } catch (e) { toast.error(e.message) }
    finally { setSearching(false) }
  }

  const faceCount = stats?.total_face_embeddings || 0
  const imagesWithFaces = stats?.images_with_faces || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up" style={{ animationDelay: '0ms' }}>
        <div>
          {isDark ? (
            <div className="flex items-center gap-3">
              <ScanFace className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              <h2 className="text-xl font-bold font-mono tracking-wider" style={{ color: 'var(--text-primary)' }}>FACE RECOGNITION</h2>
              <div className="flex-1 h-px" style={{ background: 'rgba(0,255,136,0.08)' }} />
            </div>
          ) : (
            <h2 className="text-3xl font-bold text-white">Face Gallery</h2>
          )}
          <p className="text-sm mt-1 font-mono" style={{ color: 'var(--text-muted)', fontSize: isDark ? '10px' : undefined, letterSpacing: isDark ? '0.1em' : undefined }}>
            {imagesWithFaces} images // {faceCount} face signatures
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <label className={isDark ? 'font-mono text-[9px] uppercase tracking-wider' : ''}>
              {isDark ? 'THRESHOLD:' : 'Similarity threshold:'}
            </label>
            <input
              type="range" min="0.3" max="0.95" step="0.05"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
              className="w-24 accent-[var(--accent)]"
            />
            <span className="w-10 text-center font-mono" style={{ color: 'var(--accent)' }}>
              {(similarityThreshold * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Loading / Empty / Grid */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
            {isDark && <span className="text-[9px] font-mono uppercase tracking-widest animate-pulse" style={{ color: 'var(--text-tertiary)' }}>SCANNING DATABASE...</span>}
          </div>
        </div>
      ) : images.length === 0 ? (
        <div className={`text-center py-24 ${isDark ? 'hud-panel' : 'glass-card'} animate-slide-up`}>
          <ScanFace className="w-20 h-20 mx-auto mb-5" style={{ color: 'var(--text-muted)', opacity: 0.3 }} strokeWidth={1} />
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
            {isDark ? 'NO FACE SIGNATURES DETECTED' : 'No faces detected yet'}
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            {isDark ? 'Upload images to initiate face scan protocol' : 'Upload images to automatically detect faces'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {images.map((img, i) => (
            <div
              key={img.doc_id}
              className={`${isDark ? 'hud-panel' : 'glass-card'} group transition-all duration-500 animate-slide-up cursor-pointer`}
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'backwards' }}
              onClick={() => setSelectedImage(img)}
            >
              <div className={`relative overflow-hidden mb-3 ${isDark ? '' : 'aspect-video rounded-xl'}`} style={isDark ? { aspectRatio: '16/9', border: '1px solid rgba(0,255,136,0.05)' } : undefined}>
                <img
                  src={img.image_url || `/api/extracted-images/${img.doc_id}/${img.filename}`}
                  alt={img.filename}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                />
                <div className="hidden w-full h-full items-center justify-center" style={{ display: 'none', background: 'var(--surface-2)' }}>
                  <AlertCircle className="w-10 h-10" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                </div>

                {/* Face overlays */}
                {img.faces?.map((face, fi) => (
                  <ScanReticle
                    key={fi}
                    face={face}
                    imgW={img.img_width || 640}
                    imgH={img.img_height || 480}
                    selected={selectedFace?.docId === img.doc_id && selectedFace?.faceIndex === fi}
                  />
                ))}

                {/* Badge */}
                <div className="absolute top-2 right-2">
                  <span
                    className="flex items-center gap-1 px-2 py-0.5 rounded-sm"
                    style={{
                      background: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)',
                      border: isDark ? '1px solid rgba(0,255,136,0.2)' : 'none',
                      fontSize: isDark ? '9px' : '10px',
                      fontFamily: isDark ? "'JetBrains Mono', monospace" : undefined,
                      color: isDark ? 'var(--accent)' : '#fff',
                    }}
                  >
                    <Users className="w-3 h-3" />
                    {img.face_count}
                  </span>
                </div>

                {isDark && (
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.008) 2px, rgba(0,255,136,0.008) 4px)' }} />
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium truncate ${isDark ? 'font-mono text-xs' : 'text-sm'}`} style={{ color: 'var(--text-primary)' }}>{img.filename}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {img.faces?.map((face, fi) => (
                      <button
                        key={fi}
                        className={`text-[10px] px-2 py-0.5 transition-all ${
                          isDark
                            ? `font-mono rounded-sm border ${selectedFace?.docId === img.doc_id && selectedFace?.faceIndex === fi ? 'border-[rgba(0,255,136,0.4)] text-[var(--accent)] bg-[rgba(0,255,136,0.06)]' : 'border-[rgba(0,255,136,0.08)] text-[var(--text-tertiary)] hover:text-[var(--accent)]'}`
                            : `rounded-lg border ${selectedFace?.docId === img.doc_id && selectedFace?.faceIndex === fi ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400' : 'border-white/[0.06] text-gray-500 hover:text-indigo-400'}`
                        }`}
                        onClick={(e) => { e.stopPropagation(); handleFaceSearch(img.doc_id, fi) }}
                      >
                        F{fi + 1}: {face.age}y {face.gender}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search results */}
      {searchResults && (
        <div className={`${isDark ? 'hud-panel scan-overlay' : 'glass-card'} animate-slide-up`}>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                <h3 className={`${isDark ? 'font-mono text-sm tracking-wider uppercase' : 'text-lg font-semibold'}`} style={{ color: 'var(--text-primary)' }}>
                  {isDark ? 'MATCH RESULTS' : 'Face Search Results'}
                </h3>
              </div>
              <button onClick={() => { setSearchResults(null); setSelectedFace(null) }} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`mb-3 text-xs ${isDark ? 'font-mono tracking-wider' : ''}`} style={{ color: 'var(--text-muted)' }}>
              {isDark ? 'QUERY:' : 'Query:'} {searchResults.query_image_id} ({isDark ? 'FACE' : 'Face'} {searchResults.query_face_index + 1})
              <span className="mx-2 opacity-30">|</span>
              {searchResults.total} {isDark ? 'MATCHES' : 'matches found'}
            </div>

            {searching ? (
              <div className="flex justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
                  {isDark && <span className="text-[9px] font-mono uppercase tracking-widest animate-pulse" style={{ color: 'var(--text-tertiary)' }}>SCANNING SIGNATURES...</span>}
                </div>
              </div>
            ) : searchResults.matches.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.2 }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {isDark ? 'NO MATCHES ABOVE THRESHOLD' : 'No similar faces found above threshold'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {searchResults.matches.map((match, i) => (
                  <div key={match.id} className="relative overflow-hidden group" style={isDark ? { border: '1px solid rgba(0,255,136,0.08)', borderRadius: '2px', background: 'rgba(0,255,136,0.01)' } : { borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                    <div className="relative aspect-square">
                      <img src={match.image_url} alt={match.filename} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                      <div className="absolute top-2 right-2">
                        <span
                          className="px-2 py-0.5 rounded-sm font-mono text-[10px]"
                          style={{ background: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,128,0,0.8)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.3)' }}
                        >
                          {(match.similarity * 100).toFixed(1)}%
                        </span>
                      </div>
                      {isDark && (
                        <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.008) 2px, rgba(0,255,136,0.008) 4px)' }} />
                      )}
                    </div>
                    <div className="p-3">
                      <p className={`font-medium truncate ${isDark ? 'font-mono text-xs' : 'text-xs'}`} style={{ color: 'var(--text-primary)' }}>{match.filename}</p>
                      <p className={`mt-1 ${isDark ? 'font-mono text-[9px]' : 'text-[10px]'}`} style={{ color: 'var(--text-muted)' }}>
                        Age {match.metadata?.age || '?'} · {match.metadata?.gender || '?'}
                        <span className="mx-1 opacity-30">|</span>
                        {((match.metadata?.confidence || 0) * 100).toFixed(0)}% conf
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedImage && (
        <FaceDetailModal image={selectedImage} onClose={() => setSelectedImage(null)} onFaceSearch={handleFaceSearch} selectedFace={selectedFace} searching={searching} />
      )}
    </div>
  )
}


function FaceDetailModal({ image, onClose, onFaceSearch, selectedFace, searching }) {
  const [currentFace, setCurrentFace] = useState(0)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className={`${isDark ? '' : 'glass'} w-full max-w-3xl max-h-[90vh] flex flex-col ${isDark ? '' : 'border-glow'} animate-slide-up`} style={isDark ? { background: 'rgba(6,10,18,0.95)', border: '1px solid rgba(0,255,136,0.15)' } : undefined}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: isDark ? 'rgba(0,255,136,0.08)' : 'var(--border-1)' }}>
          <div>
            <h3 className={`font-semibold ${isDark ? 'font-mono tracking-wider uppercase text-sm' : 'text-lg'}`} style={{ color: 'var(--text-primary)' }}>
              {isDark ? 'SUBJECT DOSSIER' : image.filename}
            </h3>
            <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>
              {image.face_count} face signature(s) // {image.filename}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="flex flex-col lg:flex-row gap-5">
            <div className="lg:w-1/2">
              <div className="relative overflow-hidden" style={isDark ? { border: '1px solid rgba(0,255,136,0.1)' } : { borderRadius: '12px' }}>
                <img src={image.image_url || `/api/extracted-images/${image.doc_id}/${image.filename}`} alt={image.filename} className="w-full object-contain" />
                {image.faces?.map((face, fi) => (
                  <div
                    key={fi}
                    className="absolute cursor-pointer"
                    style={{
                      left: `${(face.bbox[0] / (image.img_width || 640)) * 100}%`,
                      top: `${(face.bbox[1] / (image.img_height || 480)) * 100}%`,
                      width: `${((face.bbox[2] - face.bbox[0]) / (image.img_width || 640)) * 100}%`,
                      height: `${((face.bbox[3] - face.bbox[1]) / (image.img_height || 480)) * 100}%`,
                    }}
                    onClick={() => setCurrentFace(fi)}
                  >
                    <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2" style={{ borderColor: currentFace === fi ? 'var(--accent)' : 'rgba(0,255,136,0.4)' }} />
                    <div className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2" style={{ borderColor: currentFace === fi ? 'var(--accent)' : 'rgba(0,255,136,0.4)' }} />
                    <div className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2" style={{ borderColor: currentFace === fi ? 'var(--accent)' : 'rgba(0,255,136,0.4)' }} />
                    <div className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2" style={{ borderColor: currentFace === fi ? 'var(--accent)' : 'rgba(0,255,136,0.4)' }} />
                  </div>
                ))}
                {isDark && <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.008) 2px, rgba(0,255,136,0.008) 4px)' }} />}
              </div>
            </div>

            <div className="lg:w-1/2 space-y-3">
              <h4 className={`font-semibold flex items-center gap-2 ${isDark ? 'font-mono text-xs tracking-wider uppercase' : 'text-sm'}`} style={{ color: 'var(--text-primary)' }}>
                <Users className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                {isDark ? 'DETECTED SIGNATURES' : 'Detected Faces'}
              </h4>

              {image.faces?.map((face, fi) => (
                <div
                  key={fi}
                  className="p-3 cursor-pointer transition-all"
                  style={{
                    background: currentFace === fi ? (isDark ? 'rgba(0,255,136,0.04)' : 'var(--accent-soft)') : 'transparent',
                    border: `1px solid ${currentFace === fi ? (isDark ? 'rgba(0,255,136,0.2)' : 'var(--border-hover)') : (isDark ? 'rgba(0,255,136,0.05)' : 'var(--border-0)')}`,
                    borderRadius: isDark ? '2px' : '12px',
                  }}
                  onClick={() => setCurrentFace(fi)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center" style={{ background: isDark ? 'rgba(0,255,136,0.06)' : 'var(--accent-soft)', borderRadius: isDark ? '2px' : '8px', border: isDark ? '1px solid rgba(0,255,136,0.1)' : 'none' }}>
                        <span className={`font-bold ${isDark ? 'font-mono text-xs' : 'text-xs'}`} style={{ color: 'var(--accent)' }}>{fi + 1}</span>
                      </div>
                      <div>
                        <p className={`font-medium ${isDark ? 'font-mono text-xs tracking-wider uppercase' : 'text-sm'}`} style={{ color: 'var(--text-primary)' }}>
                          SUBJECT {fi + 1}
                        </p>
                        <p className={`${isDark ? 'font-mono text-[9px]' : 'text-[10px]'}`} style={{ color: 'var(--text-muted)' }}>
                          {face.age} years · {face.gender === 'M' ? 'MALE' : 'FEMALE'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`${isDark ? 'font-mono text-[8px] uppercase tracking-wider' : 'text-[10px]'}`} style={{ color: 'var(--text-muted)' }}>
                        {isDark ? 'CONF' : 'Confidence'}
                      </p>
                      <p className={`font-mono ${isDark ? 'text-xs' : 'text-xs'}`} style={{ color: 'var(--accent)' }}>
                        {(face.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {currentFace === fi && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: isDark ? 'rgba(0,255,136,0.06)' : 'var(--border-0)' }}>
                      <button
                        className={`w-full flex items-center justify-center gap-2 text-xs px-3 py-2 transition-colors ${isDark ? 'font-mono uppercase tracking-wider' : ''}`}
                        style={{
                          background: isDark ? 'rgba(0,255,136,0.04)' : 'var(--accent-soft)',
                          border: `1px solid ${isDark ? 'rgba(0,255,136,0.15)' : 'var(--border-hover)'}`,
                          color: 'var(--accent)',
                          borderRadius: isDark ? '2px' : '8px',
                        }}
                        onClick={(e) => { e.stopPropagation(); onFaceSearch(image.doc_id, fi) }}
                        disabled={searching}
                      >
                        {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                        {isDark ? 'RUN FACE MATCH' : 'Search Similar Faces'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
