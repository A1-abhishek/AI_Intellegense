import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import ForceGraph2D from 'react-force-graph-2d'
import { api } from '../api'
import { usePageLog } from '../logger'
import { Network, Loader2, User, Building2, MapPin, FileText, X, GitBranch } from 'lucide-react'

const KIND_META = {
  person: { color: '#6366f1', icon: User, label: 'Person' },
  organization: { color: '#0ea5e9', icon: Building2, label: 'Organization' },
  location: { color: '#10b981', icon: MapPin, label: 'Location' },
  document: { color: '#f59e0b', icon: FileText, label: 'Document' },
}

export default function InvestigationPage() {
  usePageLog('Investigation')
  const [graph, setGraph] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [visible, setVisible] = useState({ person: true, organization: true, location: true, document: true })
  const graphRef = useRef(null)

  const loadGraph = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.intelGraph()
      setGraph(data)
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadGraph() }, [loadGraph])

  const filteredNodes = graph?.nodes.filter((n) => visible[n.kind]) || []
  const filteredLinks = graph?.links.filter((l) => {
    const src = graph.nodes.find((n) => n.id === l.source)
    const tgt = graph.nodes.find((n) => n.id === l.target)
    return src && tgt && visible[src.kind] && visible[tgt.kind]
  }) || []

  const connected = selected
    ? (graph?.links.filter((l) => l.source === selected.id || l.target === selected.id) || [])
    : []

  const renderNode = (node, ctx, globalScale) => {
    const meta = KIND_META[node.kind] || { color: '#94a3b8' }
    const isSelected = selected?.id === node.id
    const radius = node.kind === 'document' ? 5 : node.kind === 'person' ? 7 : 6
    const r = (isSelected ? radius + 3 : radius) / globalScale

    ctx.beginPath()
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
    ctx.fillStyle = meta.color
    ctx.fill()
    ctx.strokeStyle = isSelected ? '#000' : 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 1.5 / globalScale
    ctx.stroke()

    if (node.kind === 'person') {
      ctx.beginPath()
      ctx.arc(node.x, node.y - r * 0.3, r * 0.42, 0, 2 * Math.PI)
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(node.x, node.y + r * 0.55, r * 0.6, 0, 2 * Math.PI)
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.fill()
    }

    const label = node.label
    ctx.font = `${Math.max(10 / globalScale, 5)}px Inter, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = 'rgba(30,41,59,0.95)'
    ctx.fillText(label, node.x, node.y + r + 3 / globalScale)

    if (isSelected) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, r + 5 / globalScale, 0, 2 * Math.PI)
      ctx.setLineDash([3 / globalScale, 3 / globalScale])
      ctx.strokeStyle = meta.color
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Network className="w-7 h-7 text-indigo-400" />
            Investigation Linkage
          </h2>
          <p className="text-sm mt-1 text-gray-400">
            Persons, organizations, locations and their connections across all documents
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <GitBranch className="w-4 h-4" />
          {graph ? `${filteredNodes.length} nodes · ${filteredLinks.length} links` : '—'}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 animate-slide-up" style={{ animationDelay: '50ms' }}>
        {Object.entries(KIND_META).map(([kind, meta]) => {
          const Icon = meta.icon
          const active = visible[kind]
          return (
            <button
              key={kind}
              onClick={() => setVisible((v) => ({ ...v, [kind]: !v[kind] }))}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200"
              style={{
                background: active ? `${meta.color}22` : 'rgba(255,255,255,0.03)',
                borderColor: active ? meta.color : 'rgba(255,255,255,0.08)',
                color: active ? meta.color : 'var(--text-muted)',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {meta.label}
              <span className="opacity-60">({graph?.counts?.[kind] || 0})</span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
            <span className="text-xs text-gray-500 animate-pulse">Building investigation graph...</span>
          </div>
        </div>
      ) : graph?.nodes.length === 0 ? (
        <div className="text-center py-24 glass-card animate-slide-up">
          <Network className="w-20 h-20 mx-auto mb-5 text-gray-600" opacity={0.3} strokeWidth={1} />
          <p className="text-lg font-medium text-gray-300">No entity graph yet</p>
          <p className="text-sm mt-2 text-gray-500">
            Upload documents or run "Extract Intelligence" on a document to populate the linkage map
          </p>
        </div>
      ) : (
        <div className="relative glass-card overflow-hidden animate-slide-up" style={{ height: 560 }}>
          <ForceGraph2D
            ref={graphRef}
            graphData={{ nodes: filteredNodes, links: filteredLinks }}
            nodeId="id"
            nodeCanvasObject={renderNode}
            nodePointerAreaPaint={(node, color, ctx) => {
              ctx.fillStyle = color
              ctx.beginPath()
              ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI)
              ctx.fill()
            }}
            linkColor={() => 'rgba(148,163,184,0.25)'}
            linkWidth={1}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={2}
            onNodeClick={(node) => setSelected(node)}
            cooldownTicks={100}
            onNodeDragEnd={(node) => {
              node.fx = node.x
              node.fy = node.y
            }}
          />

          {/* Legend */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 text-[10px] text-gray-400 pointer-events-none">
            {Object.entries(KIND_META).map(([kind, meta]) => (
              <span key={kind} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                {meta.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div className="glass animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-1)' }}>
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = KIND_META[selected.kind]?.icon || FileText
                return <Icon className="w-5 h-5" style={{ color: KIND_META[selected.kind]?.color }} />
              })()}
              <div>
                <h3 className="text-base font-semibold text-white">{selected.label}</h3>
                <p className="text-xs text-gray-500">
                  {KIND_META[selected.kind]?.label}
                  {selected.kind === 'document' ? ` · ${selected.file_type || ''}` : ''}
                </p>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="p-1 rounded-lg text-gray-500 hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4">
            {selected.kind !== 'document' && (
              <p className="text-xs text-gray-400 mb-3">
                Mentioned in <span className="font-semibold" style={{ color: 'var(--accent)' }}>{selected.doc_count}</span> document(s)
              </p>
            )}

            {connected.length === 0 ? (
              <p className="text-xs text-gray-500">No connections yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {connected.map((link) => {
                  const otherId = link.source === selected.id ? link.target : link.source
                  const other = graph?.nodes.find((n) => n.id === otherId)
                  if (!other) return null
                  const meta = KIND_META[other.kind] || {}
                  const Icon = meta.icon || FileText
                  return (
                    <button
                      key={`${other.id}-${link.kind}`}
                      onClick={() => setSelected(other)}
                      className="flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all duration-200 hover:bg-white/[0.04]"
                      style={{ borderColor: 'rgba(255,255,255,0.08)', borderLeft: `3px solid ${meta.color}` }}
                    >
                      <Icon className="w-4 h-4 shrink-0" style={{ color: meta.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-200 truncate">{other.label}</p>
                        <p className="text-[10px] text-gray-500">
                          {meta.label} · {link.kind === 'co-occurs' ? 'co-occurs' : 'mentions'}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
