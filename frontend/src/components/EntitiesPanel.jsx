import { Users, Building2, MapPin, Phone, Mail, Calendar, DollarSign, CreditCard, Briefcase, Globe, FileText, AlertTriangle, Heart, Zap, Clock } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const ENTITY_CONFIG = {
  persons: { label: 'Persons', icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10', darkColor: '#818cf8', darkBg: 'rgba(129,140,248,0.08)' },
  organizations: { label: 'Organizations', icon: Building2, color: 'text-violet-400', bg: 'bg-violet-500/10', darkColor: '#a78bfa', darkBg: 'rgba(167,139,250,0.08)' },
  locations: { label: 'Locations', icon: MapPin, color: 'text-pink-400', bg: 'bg-pink-500/10', darkColor: '#f472b6', darkBg: 'rgba(244,114,182,0.08)' },
  phone_numbers: { label: 'Phone Numbers', icon: Phone, color: 'text-green-400', bg: 'bg-green-500/10', darkColor: '#4ade80', darkBg: 'rgba(74,222,128,0.08)' },
  emails: { label: 'Emails', icon: Mail, color: 'text-blue-400', bg: 'bg-blue-500/10', darkColor: '#60a5fa', darkBg: 'rgba(96,165,250,0.08)' },
  dates: { label: 'Dates', icon: Calendar, color: 'text-amber-400', bg: 'bg-amber-500/10', darkColor: '#fbbf24', darkBg: 'rgba(251,191,36,0.08)' },
  monetary_values: { label: 'Monetary Values', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', darkColor: '#34d399', darkBg: 'rgba(52,211,153,0.08)' },
  id_numbers: { label: 'ID Numbers', icon: CreditCard, color: 'text-red-400', bg: 'bg-red-500/10', darkColor: '#f87171', darkBg: 'rgba(248,113,113,0.08)' },
  job_titles: { label: 'Job Titles', icon: Briefcase, color: 'text-cyan-400', bg: 'bg-cyan-500/10', darkColor: '#22d3ee', darkBg: 'rgba(34,211,238,0.08)' },
  websites: { label: 'Websites', icon: Globe, color: 'text-teal-400', bg: 'bg-teal-500/10', darkColor: '#2dd4bf', darkBg: 'rgba(45,212,191,0.08)' },
}

const SENTIMENT_COLORS = {
  positive: 'text-green-400 bg-green-500/10 border-green-500/20',
  negative: 'text-red-400 bg-red-500/10 border-red-500/20',
  neutral: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
}

const SENTIMENT_DARK = {
  positive: { color: '#00ff88', bg: 'rgba(0,255,136,0.08)', border: 'rgba(0,255,136,0.2)' },
  negative: { color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
  neutral: { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' },
}

const URGENCY_COLORS = {
  high: 'text-red-400 bg-red-500/10 border-red-500/20',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  low: 'text-green-400 bg-green-500/10 border-green-500/20',
  none: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
}

const URGENCY_DARK = {
  high: { color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
  medium: { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
  low: { color: '#00ff88', bg: 'rgba(0,255,136,0.08)', border: 'rgba(0,255,136,0.2)' },
  none: { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' },
}

export default function EntitiesPanel({ entities, compact = false }) {
  const { isDark } = useTheme()
  if (!entities) return null

  const listFields = Object.entries(ENTITY_CONFIG).filter(([key]) => {
    const val = entities[key]
    return Array.isArray(val) && val.length > 0
  })

  const hasSummary = entities.summary
  const hasDocType = entities.document_type && entities.document_type !== 'other'
  const hasRiskFlags = entities.risk_flags?.length > 0
  const hasKeyFacts = entities.key_facts?.length > 0

  if (compact) {
    const totalCount = listFields.reduce((sum, [, cfg]) => {
      const key = Object.keys(ENTITY_CONFIG).find(k => ENTITY_CONFIG[k] === cfg)
      return sum + (entities[key]?.length || 0)
    }, 0)

    const compactBadgeStyle = isDark
      ? { fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', borderRadius: '2px' }
      : { borderRadius: '9999px' }

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {hasDocType && (
          isDark
            ? <span className="text-[10px] px-2 py-0.5 uppercase" style={{ ...compactBadgeStyle, color: 'var(--accent)', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.15)' }}>{entities.document_type}</span>
            : <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">{entities.document_type}</span>
        )}
        {entities.sentiment && entities.sentiment !== 'neutral' && (
          isDark
            ? (() => {
                const s = SENTIMENT_DARK[entities.sentiment] || SENTIMENT_DARK.neutral
                return <span className="text-[10px] px-2 py-0.5 uppercase" style={{ ...compactBadgeStyle, color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>{entities.sentiment}</span>
              })()
            : <span className={`text-[10px] px-2 py-0.5 rounded-full border ${SENTIMENT_COLORS[entities.sentiment] || SENTIMENT_COLORS.neutral}`}>{entities.sentiment}</span>
        )}
        {entities.urgency && entities.urgency !== 'none' && (
          isDark
            ? (() => {
                const u = URGENCY_DARK[entities.urgency] || URGENCY_DARK.none
                return <span className="text-[10px] px-2 py-0.5 uppercase" style={{ ...compactBadgeStyle, color: u.color, background: u.bg, border: `1px solid ${u.border}` }}><Zap className="w-2.5 h-2.5 inline mr-0.5" />{entities.urgency}</span>
              })()
            : <span className={`text-[10px] px-2 py-0.5 rounded-full border ${URGENCY_COLORS[entities.urgency] || URGENCY_COLORS.none}`}><Zap className="w-2.5 h-2.5 inline mr-0.5" />{entities.urgency}</span>
        )}
        {totalCount > 0 && (
          <span className="text-[10px]" style={isDark ? { fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)', letterSpacing: '0.05em' } : { color: 'var(--text-muted)' }}>{totalCount} entities</span>
        )}
      </div>
    )
  }

  const sectionHeaderStyle = isDark
    ? { fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--accent)' }
    : { color: 'var(--text-secondary)' }

  const cardStyle = isDark
    ? { background: 'rgba(0,255,136,0.015)', border: '1px solid rgba(0,255,136,0.08)', borderRadius: '2px' }
    : { background: 'var(--surface-1)', border: '1px solid var(--border-0)', borderRadius: '0.75rem' }

  const itemStyle = isDark
    ? { fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', letterSpacing: '0.05em', color: 'var(--text-primary)', background: 'rgba(0,255,136,0.03)', border: '1px solid rgba(0,255,136,0.06)', borderRadius: '2px' }
    : { color: 'var(--text-primary)', background: 'var(--surface-2)', border: '1px solid var(--border-0)', borderRadius: '0.375rem' }

  return (
    <div className="space-y-4">
      {hasSummary && (
        <div style={cardStyle} className="p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <FileText className="w-3.5 h-3.5" style={{ color: isDark ? 'var(--accent)' : 'text-indigo-400' }} />
            <span className="text-[10px] uppercase tracking-wider font-medium" style={sectionHeaderStyle}>
              {isDark ? 'AI ANALYSIS' : 'AI Summary'}
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={isDark ? { fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' } : { color: 'var(--text-primary)' }}>{entities.summary}</p>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {hasDocType && (
          isDark
            ? <span className="text-[10px] px-2.5 py-1 uppercase font-medium" style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', color: 'var(--accent)', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: '2px' }}>{entities.document_type}</span>
            : <span className="text-[10px] px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium uppercase tracking-wider">{entities.document_type}</span>
        )}
        {entities.sentiment && (
          isDark
            ? (() => {
                const s = SENTIMENT_DARK[entities.sentiment] || SENTIMENT_DARK.neutral
                return <span className="text-[10px] px-2.5 py-1 uppercase font-medium" style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: '2px' }}>SENTIMENT: {entities.sentiment}</span>
              })()
            : <span className={`text-[10px] px-2.5 py-1 rounded-lg border font-medium ${SENTIMENT_COLORS[entities.sentiment] || SENTIMENT_COLORS.neutral}`}>Sentiment: {entities.sentiment}</span>
        )}
        {entities.urgency && entities.urgency !== 'none' && (
          isDark
            ? (() => {
                const u = URGENCY_DARK[entities.urgency] || URGENCY_DARK.none
                return <span className="text-[10px] px-2.5 py-1 uppercase font-medium" style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', color: u.color, background: u.bg, border: `1px solid ${u.border}`, borderRadius: '2px' }}><Zap className="w-3 h-3 inline mr-0.5" />URGENCY: {entities.urgency}</span>
              })()
            : <span className={`text-[10px] px-2.5 py-1 rounded-lg border font-medium ${URGENCY_COLORS[entities.urgency] || URGENCY_COLORS.none}`}><Zap className="w-3 h-3 inline mr-0.5" />Urgency: {entities.urgency}</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {listFields.map(([key, cfg]) => {
          const Icon = cfg.icon
          const values = entities[key] || []
          return (
            <div key={key} className="flex items-start gap-2.5 p-2.5" style={cardStyle}>
              <div
                className={isDark
                  ? 'w-7 h-7 flex items-center justify-center shrink-0'
                  : 'w-7 h-7 rounded-lg flex items-center justify-center shrink-0'
                }
                style={isDark
                  ? { background: cfg.darkBg, borderRadius: '2px', border: `1px solid ${cfg.darkBg}` }
                  : { background: undefined }
                }
              >
                <Icon
                  className={isDark ? '' : `w-3.5 h-3.5 ${cfg.color}`}
                  style={isDark ? { width: '0.875rem', height: '0.875rem', color: cfg.darkColor } : undefined}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider mb-1" style={sectionHeaderStyle}>{cfg.label}</div>
                <div className="flex flex-wrap gap-1">
                  {values.map((v, i) => (
                    <span key={i} className="text-xs px-2 py-0.5" style={itemStyle}>{v}</span>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {hasKeyFacts && (
        <div className="p-3" style={cardStyle}>
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="w-3.5 h-3.5" style={{ color: isDark ? '#22d3ee' : 'text-cyan-400' }} />
            <span className="text-[10px] uppercase tracking-wider font-medium" style={sectionHeaderStyle}>
              {isDark ? 'KEY INTEL' : 'Key Facts'}
            </span>
          </div>
          <ul className="space-y-1">
            {entities.key_facts.map((fact, i) => (
              <li key={i} className="text-xs flex items-start gap-2" style={isDark ? { fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' } : { color: 'var(--text-secondary)' }}>
                <span className="mt-0.5 shrink-0" style={{ color: isDark ? 'var(--accent)' : '#06b6d4' }}>
                  {isDark ? '>' : '\u2022'}
                </span>
                {fact}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasRiskFlags && (
        <div
          className="p-3"
          style={isDark
            ? { background: 'rgba(248,113,113,0.03)', border: '1px solid rgba(248,113,113,0.12)', borderRadius: '2px' }
            : { background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.1)', borderRadius: '0.75rem' }
          }
        >
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: isDark ? 'var(--danger)' : 'text-red-400' }} />
            <span
              className="text-[10px] uppercase tracking-wider font-medium"
              style={isDark
                ? { fontFamily: "'JetBrains Mono', monospace", color: 'var(--danger)', letterSpacing: '0.1em' }
                : { color: 'rgba(248,113,113,0.8)' }
              }
            >
              {isDark ? 'THREAT INDICATORS' : 'Risk Flags'}
            </span>
          </div>
          <ul className="space-y-1">
            {entities.risk_flags.map((flag, i) => (
              <li key={i} className="text-xs flex items-start gap-2" style={isDark ? { fontFamily: "'JetBrains Mono', monospace", color: 'rgba(248,113,113,0.85)' } : { color: 'rgba(248,113,113,0.8)' }}>
                <span className="mt-0.5 shrink-0" style={{ color: isDark ? 'var(--danger)' : '#ef4444' }}>
                  {isDark ? '!' : '\u26A0'}
                </span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
