import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  Plus, Trash2, Edit2, X, Clock, Loader2,
  ChevronLeft, ChevronRight, FileText, Image, Cpu, Filter, Sparkles,
  Scan, Eye, Brain, Upload as UploadIcon, Users, ScanFace
} from 'lucide-react'
import EntitiesPanel from '../components/EntitiesPanel'
import ImageGallery from '../components/ImageGallery'

export default function DocumentsPage() {
  const { isEditor } = useAuth()
  const { theme, isDark } = useTheme()
  const [docs, setDocs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [viewingDoc, setViewingDoc] = useState(null)
  const [selectedTag, setSelectedTag] = useState(null)
  const [contentFilter, setContentFilter] = useState(null)
  const [tags, setTags] = useState([])
  const [embedding, setEmbedding] = useState(null)
  const size = 12

  const loadDocs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.listDocuments(page, size, selectedTag, contentFilter)
      setDocs(data.documents)
      setTotal(data.total)
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }, [page, selectedTag, contentFilter])

  useEffect(() => { loadDocs() }, [loadDocs])
  useEffect(() => { api.listTags().then(setTags).catch(() => {}) }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this document?')) return
    try { await api.deleteDocument(id); toast.success('Deleted'); loadDocs() }
    catch (e) { toast.error(e.message) }
  }

  const handleEmbed = async (id) => {
    setEmbedding(id)
    try {
      const data = await api.embedDocument(id)
      toast.success(data.embedded ? `Embedded: ${data.chunks || 1} chunks` : 'Already embedded')
      loadDocs()
    } catch (e) { toast.error(e.message) }
    finally { setEmbedding(null) }
  }

  const totalPages = Math.ceil(total / size)

  const filterButtons = [
    { value: null, label: 'All' },
    { value: 'document', label: 'Docs' },
    { value: 'image', label: 'Images' },
  ]

  const hudStyle = (active) => isDark ? {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.65rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    padding: '0.375rem 0.75rem',
    borderRadius: '2px',
    border: active ? '1px solid rgba(0,255,136,0.35)' : '1px solid rgba(0,255,136,0.08)',
    background: active ? 'rgba(0,255,136,0.1)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    transition: 'all 0.2s',
    cursor: 'pointer',
  } : {}

  const tagHudStyle = (active) => isDark ? {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.65rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    padding: '0.375rem 0.75rem',
    borderRadius: '2px',
    border: active ? '1px solid rgba(0,255,136,0.35)' : '1px solid rgba(0,255,136,0.08)',
    background: active ? 'rgba(0,255,136,0.1)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    transition: 'all 0.2s',
    cursor: 'pointer',
  } : {}

  return (
    <div className={isDark ? '' : 'space-y-6'} style={isDark ? { padding: '0' } : undefined}>
      {/* Header */}
      <div
        className={`${isDark ? '' : 'flex items-center justify-between animate-slide-up'}`}
        style={isDark ? {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 0 1rem 0',
          animationDelay: '0ms',
        } : { animationDelay: '0ms' }}
      >
        <div>
          <h2 style={isDark ? {
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--accent)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            textShadow: '0 0 20px rgba(0,255,136,0.3)',
          } : {}} className={isDark ? '' : 'text-3xl font-bold text-white'}>
            {isDark && <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>{'//>'}</span>}
            Documents
          </h2>
          <p style={isDark ? {
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            marginTop: '0.25rem',
          } : {}} className={isDark ? '' : 'text-sm text-gray-500 mt-1'}>
            {total} documents indexed
          </p>
        </div>
        {isEditor && (
          <button
            className={isDark ? '' : 'btn-glow flex items-center gap-2'}
            style={isDark ? {
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '0.5rem 1rem',
              borderRadius: '2px',
              border: '1px solid rgba(0,255,136,0.3)',
              background: 'rgba(0,255,136,0.08)',
              color: 'var(--accent)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
            } : undefined}
            onClick={() => setShowCreate(true)}
          >
            <Plus className="w-4 h-4" /> New Document
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div
        className={`${isDark ? '' : 'flex items-center gap-2 flex-wrap animate-slide-up'}`}
        style={isDark ? {
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
          padding: '0.75rem 1rem',
          background: 'rgba(0,255,136,0.015)',
          border: '1px solid rgba(0,255,136,0.08)',
          borderRadius: '2px',
          animationDelay: '100ms',
        } : { animationDelay: '100ms' }}
      >
        <Filter className="w-3.5 h-3.5" style={isDark ? { color: 'var(--text-muted)' } : { color: 'var(--text-secondary)' }} />
        {filterButtons.map((opt) => (
          isDark ? (
            <button
              key={opt.label}
              className={`hud-filter ${contentFilter === opt.value ? 'active' : ''}`}
              style={hudStyle(contentFilter === opt.value)}
              onClick={() => { setContentFilter(contentFilter === opt.value ? null : opt.value); setPage(1) }}
            >
              {opt.label}
            </button>
          ) : (
            <button
              key={opt.label}
              className={`text-xs px-3 py-1.5 rounded-xl border transition-all duration-300 ${
                contentFilter === opt.value
                  ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400 shadow-lg shadow-indigo-500/5'
                  : 'border-white/[0.06] text-gray-600 hover:text-gray-400 hover:border-white/[0.12]'
              }`}
              onClick={() => { setContentFilter(contentFilter === opt.value ? null : opt.value); setPage(1) }}
            >
              {opt.label}
            </button>
          )
        ))}
        {tags.length > 0 && <div className={isDark ? '' : 'w-px h-4 bg-white/[0.06] mx-1'} style={isDark ? { width: '1px', height: '1rem', background: 'rgba(0,255,136,0.15)', margin: '0 0.25rem' } : undefined} />}
        {tags.map((t) => (
          isDark ? (
            <button
              key={t}
              className={`hud-filter ${selectedTag === t ? 'active' : ''}`}
              style={tagHudStyle(selectedTag === t)}
              onClick={() => { setSelectedTag(selectedTag === t ? null : t); setPage(1) }}
            >
              {t}
            </button>
          ) : (
            <button
              key={t}
              className={`text-xs px-3 py-1.5 rounded-xl border transition-all duration-300 ${
                selectedTag === t
                  ? 'bg-violet-500/15 border-violet-500/40 text-violet-400 shadow-lg shadow-violet-500/5'
                  : 'border-white/[0.06] text-gray-600 hover:text-gray-400 hover:border-white/[0.12]'
              }`}
              onClick={() => { setSelectedTag(selectedTag === t ? null : t); setPage(1) }}
            >
              {t}
            </button>
          )
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin" style={isDark ? { color: 'var(--accent)' } : { color: 'var(--accent)' }} />
        </div>
      ) : docs.length === 0 ? (
        <div
          className={`text-center py-24 animate-slide-up ${isDark ? '' : 'glass-card'}`}
          style={isDark ? {
            padding: '6rem 1rem',
            background: 'rgba(0,255,136,0.015)',
            border: '1px solid rgba(0,255,136,0.08)',
            borderRadius: '2px',
          } : undefined}
        >
          <FileText className="w-20 h-20 mx-auto mb-5" strokeWidth={1} style={isDark ? { color: 'var(--text-muted)' } : { color: 'var(--text-secondary)' }} />
          <p style={isDark ? { fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)', letterSpacing: '0.1em' } : {}} className={isDark ? '' : 'text-gray-600 text-lg font-medium'}>No documents yet</p>
          <p style={isDark ? { fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem', letterSpacing: '0.05em' } : {}} className={isDark ? '' : 'text-gray-700 text-sm mt-2'}>Create your first document to get started</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {docs.map((doc, i) => (
              <div
                key={doc.id}
                className={`${isDark ? '' : 'glass-card group hover:border-white/[0.12] transition-all duration-500 animate-slide-up cursor-pointer'}`}
                style={isDark ? {
                  position: 'relative',
                  background: 'rgba(0,255,136,0.015)',
                  border: '1px solid rgba(0,255,136,0.08)',
                  borderRadius: '2px',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  animationDelay: `${i * 50}ms`,
                } : { animationDelay: `${i * 50}ms` }}
                onClick={() => setViewingDoc(doc)}
                onMouseEnter={(e) => { if (isDark) e.currentTarget.style.borderColor = 'rgba(0,255,136,0.25)' }}
                onMouseLeave={(e) => { if (isDark) e.currentTarget.style.borderColor = 'rgba(0,255,136,0.08)' }}
              >
                {isDark && (
                  <>
                    <span style={{ position: 'absolute', top: 0, left: 0, width: '8px', height: '8px', borderTop: '1px solid var(--accent)', borderLeft: '1px solid var(--accent)', opacity: 0.4 }} />
                    <span style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', borderTop: '1px solid var(--accent)', borderRight: '1px solid var(--accent)', opacity: 0.4 }} />
                    <span style={{ position: 'absolute', bottom: 0, left: 0, width: '8px', height: '8px', borderBottom: '1px solid var(--accent)', borderLeft: '1px solid var(--accent)', opacity: 0.4 }} />
                    <span style={{ position: 'absolute', bottom: 0, right: 0, width: '8px', height: '8px', borderBottom: '1px solid var(--accent)', borderRight: '1px solid var(--accent)', opacity: 0.4 }} />
                  </>
                )}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`${isDark ? '' : 'w-10 h-10 rounded-xl flex items-center justify-center shrink-0'} ${
                        isDark ? '' : doc.content_type === 'image'
                          ? 'bg-gradient-to-br from-pink-500/20 to-rose-500/20'
                          : 'bg-gradient-to-br from-indigo-500/20 to-blue-500/20'
                      } group-hover:scale-110 transition-transform duration-300`}
                      style={isDark ? {
                        width: '2.5rem',
                        height: '2.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        borderRadius: '2px',
                        background: doc.content_type === 'image' ? 'rgba(0,255,136,0.06)' : 'rgba(0,255,136,0.06)',
                        border: '1px solid rgba(0,255,136,0.12)',
                      } : undefined}
                    >
                      {doc.content_type === 'image'
                        ? <Image className="w-5 h-5" style={isDark ? { color: 'var(--accent)' } : { color: 'var(--accent)' }} />
                        : <FileText className="w-5 h-5" style={isDark ? { color: 'var(--accent)' } : { color: 'var(--accent)' }} />}
                    </div>
                    <h3
                      style={isDark ? {
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        letterSpacing: '0.05em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      } : {}}
                      className={isDark ? '' : 'font-semibold text-white truncate text-sm group-hover:text-indigo-300 transition-colors'}
                    >
                      {doc.title}
                    </h3>
                  </div>
                  {isEditor && (
                    <div className={isDark ? '' : 'flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300'} style={isDark ? { display: 'flex', gap: '2px', opacity: 1 } : undefined} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEmbed(doc.id)}
                        className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors"
                        style={isDark ? { padding: '0.375rem', borderRadius: '2px', transition: 'all 0.2s' } : undefined}
                        disabled={embedding === doc.id}
                      >
                        {embedding === doc.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={isDark ? { color: 'var(--accent)' } : { color: 'var(--accent)' }} />
                          : <Cpu className="w-3.5 h-3.5" style={isDark ? { color: doc.has_embeddings ? 'var(--accent)' : 'var(--text-muted)' } : { color: doc.has_embeddings ? '#4ade80' : 'var(--text-muted)' }} />}
                      </button>
                      <button onClick={() => setViewingDoc({ ...doc, _editMode: true })} className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors" style={isDark ? { padding: '0.375rem', borderRadius: '2px' } : undefined}>
                        <Edit2 className="w-3.5 h-3.5" style={isDark ? { color: 'var(--text-secondary)' } : { color: 'var(--text-secondary)' }} />
                      </button>
                      <button onClick={() => handleDelete(doc.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors" style={isDark ? { padding: '0.375rem', borderRadius: '2px' } : undefined}>
                        <Trash2 className="w-3.5 h-3.5" style={{ color: isDark ? 'var(--danger)' : 'var(--danger)' }} />
                      </button>
                    </div>
                  )}
                </div>
                <p style={isDark ? {
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                  lineHeight: '1.6',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  marginBottom: '1rem',
                } : {}} className={isDark ? '' : 'text-xs text-gray-500 line-clamp-3 mb-4 leading-relaxed'}>
                  {doc.content_type === 'image' && doc.image_description ? doc.image_description.substring(0, 200) : doc.content?.substring(0, 200)}
                </p>

                {doc.has_entities && doc.entities && (
                  <div className="mb-3">
                    <EntitiesPanel entities={doc.entities} compact />
                  </div>
                )}

                <div style={isDark ? {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.6rem',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.05em',
                } : {}} className={isDark ? '' : 'flex items-center gap-2 text-[10px] text-gray-600'}>
                  <Clock className="w-3 h-3" />{new Date(doc.created_at).toLocaleDateString()}
                  <span style={isDark ? { opacity: 0.3 } : {}} className={isDark ? '' : 'mx-1 opacity-30'}>|</span>
                  {doc.file_type}
                  {doc.chunk_count > 0 && (
                    <>
                      <span style={isDark ? { opacity: 0.3 } : {}} className={isDark ? '' : 'mx-1 opacity-30'}>|</span>
                      <span style={isDark ? { color: 'var(--accent)', opacity: 0.7 } : {}} className={isDark ? '' : 'text-indigo-500/70'}>{doc.chunk_count} chunks</span>
                    </>
                  )}
                  {doc.has_faces && (
                    <>
                      <span style={isDark ? { opacity: 0.3 } : {}} className={isDark ? '' : 'mx-1 opacity-30'}>|</span>
                      <span className={isDark ? '' : 'text-pink-500/70 flex items-center gap-1'} style={isDark ? { display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--danger)' } : undefined}>
                        <ScanFace className="w-3 h-3" />{doc.face_count} face(s)
                      </span>
                    </>
                  )}
                  {doc.has_embeddings && <span style={isDark ? { color: 'var(--accent)', opacity: 0.6 } : {}} className={isDark ? '' : 'text-green-500/60'}>embedded</span>}
                  {doc.has_entities && <span style={isDark ? { color: 'var(--accent)', opacity: 0.6, marginLeft: 'auto' } : {}} className={isDark ? '' : 'text-violet-500/60 ml-auto'}>intel</span>}
                </div>
                {doc.tags?.length > 0 && (
                  <div style={isDark ? { display: 'flex', gap: '0.375rem', marginTop: '0.75rem', flexWrap: 'wrap' } : {}} className={isDark ? '' : 'flex gap-1.5 mt-3 flex-wrap'}>
                    {doc.tags.map((t) => (
                      <span
                        key={t}
                        style={isDark ? {
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '0.55rem',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '2px',
                          background: 'rgba(0,255,136,0.04)',
                          color: 'var(--text-muted)',
                          border: '1px solid rgba(0,255,136,0.08)',
                          letterSpacing: '0.05em',
                        } : {}}
                        className={isDark ? '' : 'text-[10px] px-2 py-0.5 rounded-lg bg-white/[0.04] text-gray-500 border border-white/[0.06]'}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div style={isDark ? {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              marginTop: '2rem',
            } : {}} className={isDark ? '' : 'flex items-center justify-center gap-4 mt-8'}>
              <button
                className={isDark ? '' : 'btn-ghost btn-sm'}
                style={isDark ? {
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: '0.375rem 0.75rem',
                  borderRadius: '2px',
                  border: '1px solid rgba(0,255,136,0.08)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 ? 0.3 : 1,
                  transition: 'all 0.2s',
                } : undefined}
                disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span style={isDark ? {
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                letterSpacing: '0.1em',
              } : {}} className={isDark ? '' : 'text-xs text-gray-600'}>Page {page} of {totalPages}</span>
              <button
                className={isDark ? '' : 'btn-ghost btn-sm'}
                style={isDark ? {
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: '0.375rem 0.75rem',
                  borderRadius: '2px',
                  border: '1px solid rgba(0,255,136,0.08)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages ? 0.3 : 1,
                  transition: 'all 0.2s',
                } : undefined}
                disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <DocumentModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); loadDocs() }} />
      )}
      {viewingDoc && (
        <DocumentDetail
          doc={viewingDoc}
          onClose={() => setViewingDoc(null)}
          onSaved={() => { setViewingDoc(null); loadDocs() }}
          onRefresh={loadDocs}
          isEditor={isEditor}
        />
      )}
    </div>
  )
}


function DocumentDetail({ doc: initialDoc, onClose, onSaved, onRefresh, isEditor }) {
  const { theme, isDark } = useTheme()
  const [doc, setDoc] = useState(initialDoc)
  const [entities, setEntities] = useState(initialDoc.entities || null)
  const [images, setImages] = useState([])
  const [loadingEntities, setLoadingEntities] = useState(false)
  const [loadingImages, setLoadingImages] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [activeTab, setActiveTab] = useState(initialDoc._editMode ? 'edit' : (initialDoc.has_entities ? 'intel' : 'content'))
  const [editTitle, setEditTitle] = useState(doc.title || '')
  const [editContent, setEditContent] = useState(doc.content || '')
  const [editTags, setEditTags] = useState(doc.tags?.join(', ') || '')
  const [saving, setSaving] = useState(false)
  const [suggestingTags, setSuggestingTags] = useState(false)
  const [reuploadFile, setReuploadFile] = useState(null)
  const [reuploading, setReuploading] = useState(false)
  const [detectingFaces, setDetectingFaces] = useState(false)
  const reuploadRef = useRef(null)

  useEffect(() => {
    if (doc.has_entities && !entities) {
      setLoadingEntities(true)
      api.getDocEntities(doc.id).then((d) => setEntities(d.entities)).catch(() => {}).finally(() => setLoadingEntities(false))
    }
    if (doc.has_extracted_images) {
      setLoadingImages(true)
      api.getDocImages(doc.id).then((d) => setImages(d.images)).catch(() => {}).finally(() => setLoadingImages(false))
    }
  }, [doc.id])

  const handleExtractIntelligence = async () => {
    setExtracting(true)
    try {
      const data = await api.fullExtract({ doc_id: doc.id })
      setEntities(data.entities)
      if (data.tags?.length) {
        setDoc((prev) => ({ ...prev, tags: data.tags, has_entities: true, entities: data.entities }))
      } else {
        setDoc((prev) => ({ ...prev, has_entities: true, entities: data.entities }))
      }
      toast.success('Intelligence extracted!')
      onRefresh()
    } catch (e) { toast.error(e.message) }
    finally { setExtracting(false) }
  }

  const handleSave = async () => {
    if (!editTitle.trim() || !editContent.trim()) { toast.error('Title and content required'); return }
    setSaving(true)
    try {
      const tagList = editTags.split(',').map((t) => t.trim()).filter(Boolean)
      await api.updateDocument(doc.id, { title: editTitle, content: editContent, tags: tagList })
      setDoc((prev) => ({ ...prev, title: editTitle, content: editContent, tags: tagList }))
      toast.success('Updated')
      onRefresh()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleSuggestTags = async () => {
    if (!editContent.trim()) { toast.error('Add content first'); return }
    setSuggestingTags(true)
    try {
      const data = await api.autoTags({ content: editContent })
      if (data.tags?.length) {
        const existing = editTags.split(',').map(t => t.trim()).filter(Boolean)
        setEditTags([...new Set([...existing, ...data.tags])].join(', '))
        toast.success(`Suggested ${data.tags.length} tags`)
      }
    } catch (e) { toast.error(e.message) }
    finally { setSuggestingTags(false) }
  }

  const handleReupload = async () => {
    if (!reuploadFile) return
    setReuploading(true)
    try {
      const data = await api.extractFromUpload(doc.id, reuploadFile)
      setImages(data.images)
      setDoc((prev) => ({ ...prev, has_extracted_images: true }))
      toast.success(`Extracted ${data.count} images`)
      setReuploadFile(null)
      if (reuploadRef.current) reuploadRef.current.value = ''
      onRefresh()
    } catch (e) { toast.error(e.message) }
    finally { setReuploading(false) }
  }

  const handleDetectFaces = async () => {
    setDetectingFaces(true)
    try {
      const data = await api.detectFaces(doc.id)
      setDoc((prev) => ({
        ...prev,
        has_faces: data.face_count > 0,
        face_count: data.face_count,
        face_details: data.faces,
      }))
      toast.success(data.face_count > 0 ? `Detected ${data.face_count} face(s)` : 'No faces found')
      onRefresh()
    } catch (e) { toast.error(e.message) }
    finally { setDetectingFaces(false) }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this document?')) return
    try { await api.deleteDocument(doc.id); toast.success('Deleted'); onSaved() }
    catch (e) { toast.error(e.message) }
  }

  const tabs = [
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'edit', label: 'Edit', icon: Edit2 },
    { id: 'intel', label: 'Intelligence', icon: Brain },
    { id: 'images', label: 'Images', icon: Image },
    { id: 'faces', label: 'Faces', icon: ScanFace },
  ]

  const modalPanelStyle = isDark ? {
    width: '100%',
    maxWidth: '56rem',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(0,255,136,0.015)',
    border: '1px solid rgba(0,255,136,0.12)',
    borderRadius: '2px',
    position: 'relative',
    overflow: 'hidden',
  } : {}

  const modalHeaderStyle = isDark ? {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.25rem',
    borderBottom: '1px solid rgba(0,255,136,0.08)',
  } : {}

  const inputStyle = isDark ? {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.75rem',
    letterSpacing: '0.03em',
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '2px',
    border: '1px solid rgba(0,255,136,0.12)',
    background: 'rgba(0,255,136,0.02)',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 0.2s',
  } : {}

  return (
    <div className={isDark ? '' : 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in'} style={isDark ? {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '1rem',
    } : undefined}>
      {isDark && (
        <style>{`
          .modal-scanline {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 999;
            background: repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0,255,136,0.008) 2px,
              rgba(0,255,136,0.008) 4px
            );
          }
        `}</style>
      )}
      <div className={isDark ? '' : 'glass w-full max-w-4xl max-h-[90vh] flex flex-col border-glow animate-slide-up'} style={modalPanelStyle}>
        {isDark && (
          <>
            <span style={{ position: 'absolute', top: 0, left: 0, width: '16px', height: '16px', borderTop: '1px solid var(--accent)', borderLeft: '1px solid var(--accent)', opacity: 0.6 }} />
            <span style={{ position: 'absolute', top: 0, right: 0, width: '16px', height: '16px', borderTop: '1px solid var(--accent)', borderRight: '1px solid var(--accent)', opacity: 0.6 }} />
            <span style={{ position: 'absolute', bottom: 0, left: 0, width: '16px', height: '16px', borderBottom: '1px solid var(--accent)', borderLeft: '1px solid var(--accent)', opacity: 0.6 }} />
            <span style={{ position: 'absolute', bottom: 0, right: 0, width: '16px', height: '16px', borderBottom: '1px solid var(--accent)', borderRight: '1px solid var(--accent)', opacity: 0.6 }} />
          </>
        )}
        <div style={modalHeaderStyle} className={isDark ? '' : 'flex items-center justify-between p-5 border-b border-white/[0.04]'}>
          <div className="flex-1 min-w-0">
            <h3 style={isDark ? {
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--accent)',
              letterSpacing: '0.05em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            } : {}} className={isDark ? '' : 'text-lg font-semibold text-white truncate'}>{doc.title}</h3>
            <div style={isDark ? {
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '0.25rem',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.6rem',
              color: 'var(--text-muted)',
              letterSpacing: '0.05em',
            } : {}} className={isDark ? '' : 'flex items-center gap-2 mt-1 text-[10px] text-gray-600'}>
              <Clock className="w-3 h-3" />{new Date(doc.created_at).toLocaleDateString()}
              <span style={isDark ? { opacity: 0.3 } : {}} className={isDark ? '' : 'opacity-30'}>|</span>
              {doc.file_type}
              {doc.has_embeddings && <><span style={isDark ? { opacity: 0.3 } : {}} className={isDark ? '' : 'opacity-30'}>|</span><span style={isDark ? { color: 'var(--accent)', opacity: 0.6 } : {}} className={isDark ? '' : 'text-green-500/60'}>embedded</span></>}
              {doc.has_faces && <><span style={isDark ? { opacity: 0.3 } : {}} className={isDark ? '' : 'opacity-30'}>|</span><span style={isDark ? { color: 'var(--danger)', opacity: 0.6 } : {}} className={isDark ? '' : 'text-pink-500/60'}>{doc.face_count} face(s)</span></>}
              {doc.has_entities && <><span style={isDark ? { opacity: 0.3 } : {}} className={isDark ? '' : 'opacity-30'}>|</span><span style={isDark ? { color: 'var(--accent)', opacity: 0.6 } : {}} className={isDark ? '' : 'text-violet-500/60'}>intel</span></>}
            </div>
          </div>
          <div style={isDark ? { display: 'flex', alignItems: 'center', gap: '0.5rem' } : {}} className={isDark ? '' : 'flex items-center gap-2'}>
            {isEditor && doc.content_type === 'image' && (
              <button
                style={isDark ? {
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.65rem',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '2px',
                  border: '1px solid rgba(236,72,153,0.25)',
                  background: 'rgba(236,72,153,0.06)',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                } : {}}
                className={isDark ? '' : 'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 hover:bg-pink-500/15 transition-colors'}
                onClick={handleDetectFaces}
                disabled={detectingFaces}
              >
                {detectingFaces ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanFace className="w-3 h-3" />}
                {doc.has_faces ? `${doc.face_count} Face(s)` : 'Detect Faces'}
              </button>
            )}
            {isEditor && (
              <button
                style={isDark ? {
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.65rem',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '2px',
                  border: '1px solid rgba(0,255,136,0.2)',
                  background: 'rgba(0,255,136,0.06)',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                } : {}}
                className={isDark ? '' : 'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/15 transition-colors'}
                onClick={handleExtractIntelligence}
                disabled={extracting}
              >
                {extracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Scan className="w-3 h-3" />}
                {entities ? 'Re-extract' : 'Extract Intelligence'}
              </button>
            )}
            <button
              onClick={onClose}
              style={isDark ? {
                color: 'var(--text-muted)',
                padding: '0.375rem',
                borderRadius: '2px',
                transition: 'all 0.2s',
                cursor: 'pointer',
                background: 'transparent',
                border: 'none',
              } : {}}
              className={isDark ? '' : 'text-gray-500 hover:text-white transition-colors p-1 hover:bg-white/[0.06] rounded-lg'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={isDark ? {
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          padding: '0 1.25rem',
          paddingTop: '0.75rem',
          borderBottom: '1px solid rgba(0,255,136,0.08)',
        } : {}} className={isDark ? '' : 'flex items-center gap-1 px-5 pt-3 border-b border-white/[0.04]'}>
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                style={isDark ? {
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.65rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '2px',
                  transition: 'all 0.2s',
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  background: isActive ? 'rgba(0,255,136,0.06)' : 'transparent',
                  border: isActive ? '1px solid rgba(0,255,136,0.2)' : '1px solid transparent',
                  borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: 'pointer',
                } : {}}
                className={isDark ? '' : `flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-all ${
                  activeTab === tab.id
                    ? 'text-white bg-white/[0.04] border-b-2 border-indigo-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div style={isDark ? { flex: 1, overflow: 'auto', padding: '1.25rem' } : {}} className={isDark ? '' : 'flex-1 overflow-auto p-5'}>
          {activeTab === 'content' && (
            <div>
              <pre style={isDark ? {
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.75rem',
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.8',
              } : {}} className={isDark ? '' : 'text-sm text-gray-300 whitespace-pre-wrap leading-relaxed font-sans'}>
                {doc.content}
              </pre>
            </div>
          )}

          {activeTab === 'edit' && isEditor && (
            <div style={isDark ? { display: 'flex', flexDirection: 'column', gap: '1rem' } : {}} className={isDark ? '' : 'space-y-4'}>
              <div>
                <label style={isDark ? {
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.6rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '0.375rem',
                } : {}} className={isDark ? '' : 'block text-xs text-gray-500 uppercase tracking-wider mb-1.5'}>Title</label>
                <input
                  className={isDark ? 'terminal-input' : 'glass-input'}
                  style={isDark ? inputStyle : {}}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <div>
                <div style={isDark ? { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' } : {}} className={isDark ? '' : 'flex items-center justify-between mb-1.5'}>
                  <label style={isDark ? {
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.6rem',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  } : {}} className={isDark ? '' : 'text-xs text-gray-500 uppercase tracking-wider'}>Tags</label>
                  <button
                    type="button"
                    style={isDark ? {
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.55rem',
                      color: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      transition: 'opacity 0.2s',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      letterSpacing: '0.05em',
                    } : {}}
                    className={isDark ? '' : 'text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors'}
                    onClick={handleSuggestTags}
                    disabled={suggestingTags || !editContent.trim()}
                  >
                    {suggestingTags ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    AI Suggest
                  </button>
                </div>
                <input
                  className={isDark ? 'terminal-input' : 'glass-input'}
                  style={isDark ? inputStyle : {}}
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="comma separated"
                />
              </div>
              <div>
                <label style={isDark ? {
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.6rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '0.375rem',
                } : {}} className={isDark ? '' : 'block text-xs text-gray-500 uppercase tracking-wider mb-1.5'}>Content</label>
                <textarea
                  className={isDark ? 'terminal-input' : 'glass-input h-64 resize-none font-mono text-xs'}
                  style={isDark ? { ...inputStyle, height: '16rem', resize: 'none' } : {}}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
              </div>
              <div style={isDark ? { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' } : {}} className={isDark ? '' : 'flex justify-end gap-3 pt-2'}>
                <button
                  style={isDark ? {
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.7rem',
                    letterSpacing: '0.05em',
                    color: 'var(--danger)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'opacity 0.2s',
                  } : {}}
                  className={isDark ? '' : 'btn-ghost text-red-400/70 hover:text-red-400'}
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 inline mr-1" /> Delete
                </button>
                <button
                  style={isDark ? {
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.7rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    padding: '0.5rem 1rem',
                    borderRadius: '2px',
                    border: '1px solid rgba(0,255,136,0.3)',
                    background: 'rgba(0,255,136,0.08)',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                  } : {}}
                  className={isDark ? '' : 'btn-glow'}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}Update
                </button>
              </div>
            </div>
          )}

          {activeTab === 'intel' && (
            <div style={isDark ? { display: 'flex', flexDirection: 'column', gap: '1.25rem' } : {}} className={isDark ? '' : 'space-y-5'}>
              {loadingEntities ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin" style={isDark ? { color: 'var(--accent)' } : { color: 'var(--accent)' }} />
                </div>
              ) : entities ? (
                <EntitiesPanel entities={entities} />
              ) : (
                <div className="text-center py-12">
                  <Brain className="w-16 h-16 mx-auto mb-4" style={isDark ? { color: 'var(--text-muted)' } : { color: 'var(--text-secondary)' }} />
                  <p style={isDark ? { fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '0.05em' } : {}} className={isDark ? '' : 'text-gray-500 mb-3'}>No intelligence data extracted yet</p>
                  {isEditor && (
                    <button
                      style={isDark ? {
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '0.7rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        padding: '0.5rem 1rem',
                        borderRadius: '2px',
                        border: '1px solid rgba(0,255,136,0.3)',
                        background: 'rgba(0,255,136,0.08)',
                        color: 'var(--accent)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s',
                      } : {}}
                      className={isDark ? '' : 'btn-glow text-sm'}
                      onClick={handleExtractIntelligence}
                      disabled={extracting}
                    >
                      {extracting ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : <Scan className="w-4 h-4 inline mr-2" />}
                      Run Intelligence Extraction
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'images' && (
            <div style={isDark ? { display: 'flex', flexDirection: 'column', gap: '1rem' } : {}} className={isDark ? '' : 'space-y-4'}>
              {loadingImages ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin" style={isDark ? { color: 'var(--accent)' } : { color: 'var(--accent)' }} />
                </div>
              ) : images.length > 0 ? (
                <ImageGallery images={images} docId={doc.id} />
              ) : (
                <div className="text-center py-12">
                  <Image className="w-16 h-16 mx-auto mb-4" style={isDark ? { color: 'var(--text-muted)' } : { color: 'var(--text-secondary)' }} />
                  <p style={isDark ? { fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem' } : {}} className={isDark ? '' : 'text-gray-500 mb-2'}>No images extracted from this document</p>
                  <p style={isDark ? { fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.03em', marginBottom: '1rem' } : {}} className={isDark ? '' : 'text-xs text-gray-600 mb-4'}>Upload the original file to extract embedded images</p>
                  {isEditor && (
                    <div style={isDark ? { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' } : {}} className={isDark ? '' : 'flex flex-col items-center gap-3'}>
                      <input
                        ref={reuploadRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.doc,.pptx"
                        onChange={(e) => setReuploadFile(e.target.files[0])}
                      />
                      {reuploadFile ? (
                        <div style={isDark ? { display: 'flex', alignItems: 'center', gap: '0.75rem' } : {}} className={isDark ? '' : 'flex items-center gap-3'}>
                          <span style={isDark ? { fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '0.03em' } : {}} className={isDark ? '' : 'text-xs text-gray-400'}>{reuploadFile.name}</span>
                          <button
                            style={isDark ? {
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: '0.65rem',
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase',
                              padding: '0.375rem 0.75rem',
                              borderRadius: '2px',
                              border: '1px solid rgba(0,255,136,0.3)',
                              background: 'rgba(0,255,136,0.08)',
                              color: 'var(--accent)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              transition: 'all 0.2s',
                            } : {}}
                            className={isDark ? '' : 'btn-glow text-sm'}
                            onClick={handleReupload}
                            disabled={reuploading}
                          >
                            {reuploading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : <UploadIcon className="w-4 h-4 inline mr-2" />}
                            Extract Images
                          </button>
                          <button
                            style={isDark ? {
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: '0.65rem',
                              color: 'var(--text-muted)',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              letterSpacing: '0.05em',
                            } : {}}
                            className={isDark ? '' : 'btn-ghost text-xs'}
                            onClick={() => { setReuploadFile(null); if (reuploadRef.current) reuploadRef.current.value = '' }}
                          >Cancel</button>
                        </div>
                      ) : (
                        <button
                          style={isDark ? {
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '0.65rem',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            padding: '0.375rem 0.75rem',
                            borderRadius: '2px',
                            border: '1px solid rgba(0,255,136,0.3)',
                            background: 'rgba(0,255,136,0.08)',
                            color: 'var(--accent)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s',
                          } : {}}
                          className={isDark ? '' : 'btn-glow text-sm'}
                          onClick={() => reuploadRef.current?.click()}
                        >
                          <UploadIcon className="w-4 h-4 inline mr-2" />Re-upload File for Image Extraction
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'faces' && (
            <div style={isDark ? { display: 'flex', flexDirection: 'column', gap: '1rem' } : {}} className={isDark ? '' : 'space-y-4'}>
              {doc.content_type !== 'image' ? (
                <div className="text-center py-12">
                  <ScanFace className="w-16 h-16 mx-auto mb-4" style={isDark ? { color: 'var(--text-muted)' } : { color: 'var(--text-secondary)' }} />
                  <p style={isDark ? { fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '0.05em' } : {}} className={isDark ? '' : 'text-gray-500 mb-2'}>Face detection is only available for image documents</p>
                </div>
              ) : doc.has_faces && doc.face_details?.length > 0 ? (
                <div style={isDark ? { display: 'flex', flexDirection: 'column', gap: '1rem' } : {}} className={isDark ? '' : 'space-y-4'}>
                  <div style={isDark ? { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } : {}} className={isDark ? '' : 'flex items-center justify-between'}>
                    <h4 style={isDark ? {
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    } : {}} className={isDark ? '' : 'text-sm font-semibold text-white flex items-center gap-2'}>
                      <ScanFace className="w-4 h-4" style={isDark ? { color: 'var(--danger)' } : { color: 'var(--danger)' }} />
                      {doc.face_count} Face(s) Detected
                    </h4>
                    {isEditor && (
                      <button
                        style={isDark ? {
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '0.6rem',
                          color: 'var(--accent)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          letterSpacing: '0.05em',
                        } : {}}
                        className={isDark ? '' : 'text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors'}
                        onClick={handleDetectFaces}
                        disabled={detectingFaces}
                      >
                        {detectingFaces ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanFace className="w-3 h-3" />}
                        Re-detect
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {doc.face_details.map((face, fi) => (
                      <div
                        key={fi}
                        style={isDark ? {
                          padding: '1rem',
                          borderRadius: '2px',
                          border: '1px solid rgba(0,255,136,0.08)',
                          background: 'rgba(0,255,136,0.015)',
                          transition: 'border-color 0.2s',
                        } : {}}
                        className={isDark ? '' : 'p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-pink-500/20 transition-all'}
                      >
                        <div style={isDark ? { display: 'flex', alignItems: 'center', gap: '0.75rem' } : {}} className={isDark ? '' : 'flex items-center gap-3'}>
                          <div style={isDark ? {
                            width: '2.5rem',
                            height: '2.5rem',
                            borderRadius: '2px',
                            background: 'rgba(0,255,136,0.06)',
                            border: '1px solid rgba(0,255,136,0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          } : {}} className={isDark ? '' : 'w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center'}>
                            <span style={isDark ? {
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              color: 'var(--accent)',
                            } : {}} className={isDark ? '' : 'text-sm font-bold text-pink-400'}>{fi + 1}</span>
                          </div>
                          <div className="flex-1">
                            <p style={isDark ? {
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              color: 'var(--text-primary)',
                              letterSpacing: '0.05em',
                            } : {}} className={isDark ? '' : 'text-sm font-medium text-white'}>Face {fi + 1}</p>
                            <div style={isDark ? { display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' } : {}} className={isDark ? '' : 'flex items-center gap-3 mt-1'}>
                              <span style={isDark ? {
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '0.6rem',
                                color: 'var(--text-muted)',
                                letterSpacing: '0.03em',
                              } : {}} className={isDark ? '' : 'text-[10px] text-gray-500'}>
                                {face.age} years old
                              </span>
                              <span style={isDark ? {
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '0.6rem',
                                color: 'var(--text-muted)',
                                letterSpacing: '0.03em',
                              } : {}} className={isDark ? '' : 'text-[10px] text-gray-500'}>
                                {face.gender === 'M' ? 'Male' : 'Female'}
                              </span>
                              <span style={isDark ? {
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '0.6rem',
                                color: 'var(--accent)',
                              } : {}} className={isDark ? '' : 'text-[10px] text-green-400 font-mono'}>
                                {(face.confidence * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div style={isDark ? {
                          marginTop: '0.75rem',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '0.55rem',
                          color: 'var(--text-muted)',
                          letterSpacing: '0.03em',
                        } : {}} className={isDark ? '' : 'mt-3 text-[10px] text-gray-600 font-mono'}>
                          BBox: [{face.bbox.join(', ')}]
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <ScanFace className="w-16 h-16 mx-auto mb-4" style={isDark ? { color: 'var(--text-muted)' } : { color: 'var(--text-secondary)' }} />
                  <p style={isDark ? { fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem' } : {}} className={isDark ? '' : 'text-gray-500 mb-2'}>No faces detected in this image</p>
                  {isEditor && (
                    <button
                      style={isDark ? {
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '0.65rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '2px',
                        border: '1px solid rgba(0,255,136,0.3)',
                        background: 'rgba(0,255,136,0.08)',
                        color: 'var(--accent)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s',
                      } : {}}
                      className={isDark ? '' : 'btn-glow text-sm'}
                      onClick={handleDetectFaces}
                      disabled={detectingFaces}
                    >
                      {detectingFaces ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : <ScanFace className="w-4 h-4 inline mr-2" />}
                      Detect Faces
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


function DocumentModal({ onClose, onSaved }) {
  const { theme, isDark } = useTheme()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [suggestingTags, setSuggestingTags] = useState(false)

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) { toast.error('Title and content required'); return }
    setSaving(true)
    try {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean)
      await api.createDocument({ title, content, tags: tagList })
      toast.success('Created')
      onSaved()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleSuggestTags = async () => {
    if (!content.trim()) { toast.error('Add content first'); return }
    setSuggestingTags(true)
    try {
      const data = await api.autoTags({ content })
      if (data.tags?.length) {
        const existing = tags.split(',').map(t => t.trim()).filter(Boolean)
        setTags([...new Set([...existing, ...data.tags])].join(', '))
        toast.success(`Suggested ${data.tags.length} tags`)
      }
    } catch (e) { toast.error(e.message) }
    finally { setSuggestingTags(false) }
  }

  const inputStyle = isDark ? {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.75rem',
    letterSpacing: '0.03em',
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '2px',
    border: '1px solid rgba(0,255,136,0.12)',
    background: 'rgba(0,255,136,0.02)',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 0.2s',
  } : {}

  const labelStyle = isDark ? {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.6rem',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    display: 'block',
    marginBottom: '0.375rem',
  } : {}

  return (
    <div className={isDark ? '' : 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in'} style={isDark ? {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '1rem',
    } : undefined}>
      <div className={isDark ? '' : 'glass w-full max-w-2xl max-h-[85vh] flex flex-col border-glow animate-slide-up'} style={isDark ? {
        width: '100%',
        maxWidth: '42rem',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(0,255,136,0.015)',
        border: '1px solid rgba(0,255,136,0.12)',
        borderRadius: '2px',
        position: 'relative',
        overflow: 'hidden',
      } : undefined}>
        {isDark && (
          <>
            <span style={{ position: 'absolute', top: 0, left: 0, width: '16px', height: '16px', borderTop: '1px solid var(--accent)', borderLeft: '1px solid var(--accent)', opacity: 0.6 }} />
            <span style={{ position: 'absolute', top: 0, right: 0, width: '16px', height: '16px', borderTop: '1px solid var(--accent)', borderRight: '1px solid var(--accent)', opacity: 0.6 }} />
            <span style={{ position: 'absolute', bottom: 0, left: 0, width: '16px', height: '16px', borderBottom: '1px solid var(--accent)', borderLeft: '1px solid var(--accent)', opacity: 0.6 }} />
            <span style={{ position: 'absolute', bottom: 0, right: 0, width: '16px', height: '16px', borderBottom: '1px solid var(--accent)', borderRight: '1px solid var(--accent)', opacity: 0.6 }} />
          </>
        )}
        <div style={isDark ? {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.5rem',
          borderBottom: '1px solid rgba(0,255,136,0.08)',
        } : {}} className={isDark ? '' : 'flex items-center justify-between p-6 border-b border-white/[0.04]'}>
          <h3 style={isDark ? {
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--accent)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          } : {}} className={isDark ? '' : 'text-lg font-semibold text-white'}>
            {isDark && <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>{'//>'}</span>}
            New Document
          </h3>
          <button
            onClick={onClose}
            style={isDark ? {
              color: 'var(--text-muted)',
              padding: '0.375rem',
              borderRadius: '2px',
              transition: 'all 0.2s',
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
            } : {}}
            className={isDark ? '' : 'text-gray-500 hover:text-white transition-colors p-1 hover:bg-white/[0.06] rounded-lg'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div style={isDark ? {
          padding: '1.5rem',
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        } : {}} className={isDark ? '' : 'p-6 flex-1 overflow-auto space-y-5'}>
          <div>
            <label style={labelStyle} className={isDark ? '' : 'block text-xs text-gray-500 uppercase tracking-wider mb-1.5'}>Title</label>
            <input
              className={isDark ? 'terminal-input' : 'glass-input'}
              style={isDark ? inputStyle : {}}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <div style={isDark ? { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' } : {}} className={isDark ? '' : 'flex items-center justify-between mb-1.5'}>
              <label style={isDark ? {
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.6rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              } : {}} className={isDark ? '' : 'text-xs text-gray-500 uppercase tracking-wider'}>Tags</label>
              <button
                type="button"
                style={isDark ? {
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.55rem',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'opacity 0.2s',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  letterSpacing: '0.05em',
                } : {}}
                className={isDark ? '' : 'text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors'}
                onClick={handleSuggestTags}
                disabled={suggestingTags || !content.trim()}
              >
                {suggestingTags ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                AI Suggest
              </button>
            </div>
            <input
              className={isDark ? 'terminal-input' : 'glass-input'}
              style={isDark ? inputStyle : {}}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="comma separated"
            />
          </div>
          <div>
            <label style={labelStyle} className={isDark ? '' : 'block text-xs text-gray-500 uppercase tracking-wider mb-1.5'}>Content</label>
            <textarea
              className={isDark ? 'terminal-input' : 'glass-input h-56 resize-none font-mono text-xs'}
              style={isDark ? { ...inputStyle, height: '14rem', resize: 'none' } : {}}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>
        <div style={isDark ? {
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          padding: '1.5rem',
          borderTop: '1px solid rgba(0,255,136,0.08)',
        } : {}} className={isDark ? '' : 'flex justify-end gap-3 p-6 border-t border-white/[0.04]'}>
          <button
            style={isDark ? {
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.7rem',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)',
              background: 'transparent',
              border: '1px solid rgba(0,255,136,0.08)',
              borderRadius: '2px',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            } : {}}
            className={isDark ? '' : 'btn-ghost'}
            onClick={onClose}
          >Cancel</button>
          <button
            style={isDark ? {
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '0.5rem 1rem',
              borderRadius: '2px',
              border: '1px solid rgba(0,255,136,0.3)',
              background: 'rgba(0,255,136,0.08)',
              color: 'var(--accent)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
            } : {}}
            className={isDark ? '' : 'btn-glow'}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}Create
          </button>
        </div>
      </div>
    </div>
  )
}
