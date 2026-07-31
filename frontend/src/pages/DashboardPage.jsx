import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import { usePageLog } from '../logger'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  FileText, Image, Layers, Brain, Zap, TrendingUp, Clock, Activity,
  ArrowUpRight, ScanFace, Target, Radio, AlertTriangle
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#00ff88', '#00d4ff', '#ff6b35', '#ff3366', '#a78bfa', '#f59e0b', '#06b6d4']

function AnimatedCounter({ value }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const num = Number(value) || 0
    if (num === 0) { setDisplay(0); return }
    let start = 0
    const duration = 1500
    const startTime = performance.now()
    const tick = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * num))
      if (progress < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [value])
  return <span>{display.toLocaleString()}</span>
}

function HudCard({ label, value, icon: Icon, color, delay }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <div
      className={`stat-card group transition-all duration-500 animate-slide-up ${isDark ? 'scan-overlay' : ''}`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
      <div className="relative z-10 flex items-center justify-between">
        <div
          className="w-12 h-12 flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
          style={{
            background: isDark ? `${color}15` : `linear-gradient(135deg, ${color}, ${color}cc)`,
            border: isDark ? `1px solid ${color}30` : 'none',
            borderRadius: isDark ? '2px' : '16px',
          }}
        >
          <Icon className="w-6 h-6" style={{ color: isDark ? color : '#fff' }} />
        </div>
        {isDark ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm" style={{ background: `${color}08`, border: `1px solid ${color}15` }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
            <span className="text-[8px] font-mono uppercase" style={{ color }}>ACTIVE</span>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--btn-ghost-hover)' }}>
            <ArrowUpRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </div>
        )}
      </div>
      <div className="stat-value mt-4"><AnimatedCounter value={value} /></div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export default function DashboardPage() {
  usePageLog('Dashboard')
  const { user } = useAuth()
  const { isDark, theme } = useTheme()
  const [stats, setStats] = useState(null)
  const [docs, setDocs] = useState([])
  const [recentDocs, setRecentDocs] = useState([])
  const [faceStats, setFaceStats] = useState(null)

  useEffect(() => {
    api.stats().then(setStats).catch(() => {})
    api.faceStats().then(setFaceStats).catch(() => {})
    api.listDocuments(1, 100).then((d) => {
      setDocs(d.documents)
      setRecentDocs(d.documents.slice(0, 5))
    }).catch(() => {})
  }, [])

  const totalDocs = stats?.elasticsearch_docs || 0
  const totalChunks = stats?.vector_store?.document_chunks || 0
  const totalImages = stats?.vector_store?.image_embeddings || 0
  const totalFaces = faceStats?.total_face_embeddings || 0

  const docTypes = docs.reduce((acc, d) => {
    const type = d.content_type || 'document'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  const pieData = Object.entries(docTypes).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1), value,
  }))

  const tagCounts = docs.flatMap((d) => d.tags || []).reduce((acc, t) => {
    acc[t] = (acc[t] || 0) + 1
    return acc
  }, {})
  const barData = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }))

  const tooltipStyle = isDark
    ? { background: '#0a0e17', border: '1px solid rgba(0,255,136,0.15)', borderRadius: '2px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }
    : { background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '14px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }
  const tickColor = isDark ? '#4a5c6f' : '#9ca3af'

  const statCards = [
    { label: 'DOCUMENTS', value: totalDocs, icon: FileText, color: '#00ff88' },
    { label: 'VECTOR CHUNKS', value: totalChunks, icon: Layers, color: '#00d4ff' },
    { label: 'IMAGE EMBEDS', value: totalImages, icon: Image, color: '#ff6b35' },
    { label: 'FACES DETECTED', value: totalFaces, icon: ScanFace, color: '#ff3366' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-slide-up" style={{ animationDelay: '0ms' }}>
        {isDark ? (
          <div className="flex items-center gap-3 mb-1">
            <Target className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h2 className="text-xl font-bold font-mono tracking-wider" style={{ color: 'var(--text-primary)' }}>
              COMMAND CENTER
            </h2>
            <div className="flex-1 h-px" style={{ background: 'rgba(0,255,136,0.08)' }} />
            <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
              OPERATOR: {(user?.full_name || user?.username).toUpperCase()}
            </span>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-bold">
              Welcome back, <span className="text-gradient">{user?.full_name || user?.username}</span>
            </h2>
            <p className="text-sm mt-2 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <Activity className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              Intelligence Overview
            </p>
          </>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((s, i) => (
          <HudCard key={s.label} {...s} delay={i * 100 + 100} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className={`${isDark ? 'hud-panel scan-overlay' : 'glass-card'} lg:col-span-2 animate-slide-up`} style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <h3 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'font-mono text-[11px] tracking-[0.15em]' : ''}`} style={{ color: 'var(--text-secondary)' }}>
                {isDark ? 'DOCUMENT INDEX BY TAG' : 'Documents by Tag'}
              </h3>
            </div>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isDark ? '#00ff88' : '#818cf8'} />
                      <stop offset="100%" stopColor={isDark ? '#00cc6a' : '#4f46e5'} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: isDark ? 10 : 11, fontFamily: isDark ? "'JetBrains Mono'" : undefined }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: tickColor, fontSize: isDark ? 10 : 11, fontFamily: isDark ? "'JetBrains Mono'" : undefined }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: isDark ? 'rgba(0,255,136,0.02)' : 'rgba(0,0,0,0.03)' }} contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="url(#barGrad)" radius={isDark ? [2, 2, 0, 0] : [8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex flex-col items-center justify-center text-sm gap-3" style={{ color: 'var(--text-muted)' }}>
                <Activity className="w-10 h-10 opacity-30" />
                Upload documents to see analytics
              </div>
            )}
          </div>
        </div>

        {/* Pie chart */}
        <div className={`${isDark ? 'hud-panel' : 'glass-card'} animate-slide-up`} style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}>
          <div className="flex items-center gap-2 mb-5">
            <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h3 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'font-mono text-[11px] tracking-[0.15em]' : ''}`} style={{ color: 'var(--text-secondary)' }}>
              {isDark ? 'CONTENT TYPE' : 'Content Types'}
            </h3>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <defs>
                  {COLORS.map((c, i) => (
                    <linearGradient key={i} id={`pieGrad${i}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={c} />
                      <stop offset="100%" stopColor={c} stopOpacity={0.7} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={5} dataKey="value" stroke="transparent">
                  {pieData.map((_, i) => <Cell key={i} fill={`url(#pieGrad${i % COLORS.length})`} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex flex-col items-center justify-center text-sm gap-3" style={{ color: 'var(--text-muted)' }}>
              <AlertTriangle className="w-10 h-10 opacity-30" />
              No data yet
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span>{d.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent docs */}
      <div className={`${isDark ? 'hud-panel' : 'glass-card'} animate-slide-up`} style={{ animationDelay: '600ms', animationFillMode: 'backwards' }}>
        <div className="flex items-center gap-2 mb-5">
          <Clock className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <h3 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'font-mono text-[11px] tracking-[0.15em]' : ''}`} style={{ color: 'var(--text-secondary)' }}>
            {isDark ? 'RECENT INTEL LOG' : 'Recent Documents'}
          </h3>
        </div>
        {recentDocs.length > 0 ? (
          <div className="space-y-1">
            {recentDocs.map((d, i) => (
              <div
                key={d.id}
                className="flex items-center gap-4 p-4 rounded-xl transition-all duration-300 group cursor-default"
                style={{ background: isDark ? (i % 2 === 0 ? 'rgba(0,255,136,0.01)' : 'transparent') : 'transparent' }}
              >
                <div
                  className="w-10 h-10 flex items-center justify-center shrink-0"
                  style={{
                    background: isDark ? 'rgba(0,255,136,0.04)' : (d.content_type === 'image' ? 'linear-gradient(135deg, #ec489920, #f43f5e20)' : 'linear-gradient(135deg, #6366f120, #3b82f620)'),
                    border: isDark ? '1px solid rgba(0,255,136,0.1)' : 'none',
                    borderRadius: isDark ? '2px' : '12px',
                  }}
                >
                  {d.content_type === 'image'
                    ? <Image className="w-5 h-5" style={{ color: isDark ? 'var(--accent)' : '#ec4899' }} />
                    : <FileText className="w-5 h-5" style={{ color: isDark ? 'var(--accent)' : '#6366f1' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate group-hover:opacity-80 transition-opacity" style={{ color: 'var(--text-primary)' }}>{d.title}</div>
                  <div className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>
                    {isDark && <span className="opacity-50">[</span>}
                    {new Date(d.created_at).toLocaleDateString()}
                    {isDark && <span className="opacity-50">]</span>}
                  </div>
                </div>
                {d.chunk_count > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm" style={{ color: 'var(--accent)', background: 'var(--accent-soft)', border: '1px solid var(--border-hover)' }}>
                    {d.chunk_count} CHUNKS
                  </span>
                )}
                {d.has_faces && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm flex items-center gap-1" style={{ color: '#ff3366', background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.15)' }}>
                    <ScanFace className="w-3 h-3" />{d.face_count}
                  </span>
                )}
                {d.has_embeddings && (
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent-glow)' }} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <FileText className="w-12 h-12" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No documents yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
