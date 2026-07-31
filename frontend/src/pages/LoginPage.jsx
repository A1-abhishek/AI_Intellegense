import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { log } from '../logger'
import { Brain, Eye, EyeOff, Shield, Sun, Moon, Lock, User, Fingerprint } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_MESSAGES = [
  { text: '> INITIALIZING SECURE CHANNEL...', delay: 0 },
  { text: '> LOADING BIOMETRIC MODULE...', delay: 400 },
  { text: '> AWAITING CREDENTIALS...', delay: 800 },
]

const AUTH_MESSAGES = [
  '> VERIFYING CREDENTIALS...',
  '> CROSS-REFERENCING DATABASE...',
  '> DECRYPTING SESSION KEY...',
  '> ACCESS GRANTED // WELCOME, OPERATIVE',
]

function FingerprintSVG({ scanning, success, fail }) {
  return (
    <div className="relative w-24 h-24 mx-auto mb-6">
      <svg viewBox="0 0 100 100" className="w-full h-full" style={{ filter: success ? 'drop-shadow(0 0 12px var(--accent))' : fail ? 'drop-shadow(0 0 12px var(--danger))' : 'none' }}>
        {/* Fingerprint paths */}
        <g opacity={fail ? 0.3 : 0.6} style={{ transition: 'opacity 0.5s' }}>
          <ellipse cx="50" cy="50" rx="38" ry="42" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-[var(--text-muted)]" />
          <ellipse cx="50" cy="50" rx="30" ry="35" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-[var(--text-muted)]" />
          <ellipse cx="50" cy="50" rx="22" ry="28" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-[var(--text-muted)]" />
          <ellipse cx="50" cy="50" rx="15" ry="20" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-[var(--text-muted)]" />
          <ellipse cx="50" cy="50" rx="8" ry="12" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-[var(--text-muted)]" />
          <path d="M 20 30 Q 50 25 80 30" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-[var(--text-muted)]" />
          <path d="M 15 40 Q 50 35 85 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-[var(--text-muted)]" />
          <path d="M 15 60 Q 50 65 85 60" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-[var(--text-muted)]" />
          <path d="M 20 70 Q 50 75 80 70" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-[var(--text-muted)]" />
        </g>

        {/* Scan overlay */}
        {scanning && (
          <g>
            <defs>
              <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
                <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect x="5" y="0" width="90" height="15" fill="url(#scanGrad)" rx="2">
              <animateTransform attributeName="transform" type="translate" from="0 0" to="0 85" dur="1.5s" repeatCount="indefinite" />
            </rect>
          </g>
        )}

        {/* Success glow */}
        {success && (
          <g>
            <ellipse cx="50" cy="50" rx="38" ry="42" fill="none" stroke="var(--accent)" strokeWidth="2" opacity="0.8">
              <animate attributeName="rx" from="38" to="45" dur="0.5s" fill="freeze" />
              <animate attributeName="ry" from="42" to="49" dur="0.5s" fill="freeze" />
              <animate attributeName="opacity" from="0.8" to="0" dur="0.5s" fill="freeze" />
            </ellipse>
          </g>
        )}

        {/* Center indicator */}
        <circle cx="50" cy="50" r="3" fill={success ? 'var(--accent)' : fail ? 'var(--danger)' : 'var(--text-muted)'} opacity={scanning ? 0 : 0.8}>
          {scanning && <animate attributeName="opacity" values="0.8;0.2;0.8" dur="0.8s" repeatCount="indefinite" />}
        </circle>
      </svg>

      {/* Corner brackets */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--accent)] opacity-40" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--accent)] opacity-40" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--accent)] opacity-40" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--accent)] opacity-40" />
    </div>
  )
}

function TerminalLine({ text, delay, color }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  if (!visible) return null
  return (
    <div className="flex items-center gap-2 text-xs font-mono" style={{ color }}>
      <span className="opacity-50">[</span>
      <span>{new Date().toLocaleTimeString('en-US', { hour12: false })}</span>
      <span className="opacity-50">]</span>
      <span>{text}</span>
    </div>
  )
}

export default function LoginPage() {
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [success, setSuccess] = useState(false)
  const [fail, setFail] = useState(false)
  const [authLines, setAuthLines] = useState([])
  const termRef = useRef(null)

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight
  }, [authLines])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    setScanning(true)
    setAuthLines([])
    setSuccess(false)
    setFail(false)

    for (let i = 0; i < AUTH_MESSAGES.length; i++) {
      await new Promise(r => setTimeout(r, 500 + Math.random() * 300))
      setAuthLines(prev => [...prev, { text: AUTH_MESSAGES[i], color: i === AUTH_MESSAGES.length - 1 ? 'var(--accent)' : 'var(--text-secondary)' }])
    }

    try {
      log.info('auth', `Login attempt: ${username}`)
      await login(username, password)
      setSuccess(true)
      log.info('auth', `Login success: ${username}`)
      await new Promise(r => setTimeout(r, 800))
      toast.success('ACCESS GRANTED')
    } catch (err) {
      setFail(true)
      log.error('auth', `Login failed for ${username}: ${err.message || 'invalid credentials'}`)
      setAuthLines(prev => [...prev, { text: `> ACCESS DENIED // ${err.message || 'INVALID CREDENTIALS'}`, color: 'var(--danger)' }])
      await new Promise(r => setTimeout(r, 1500))
      toast.error(err.message || 'Invalid credentials')
      setFail(false)
    } finally {
      setLoading(false)
      setScanning(false)
    }
  }

  const isDark = theme === 'dark'

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${isDark ? 'hud-grid-bg' : ''}`}>
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2.5 rounded-xl z-20 transition-all duration-300"
        style={{ background: 'var(--surface-1)', color: 'var(--text-secondary)', border: '1px solid var(--border-0)' }}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Background orbs */}
      {!isDark && (
        <>
          <div className="absolute w-72 h-72 bg-blue-500/10 rounded-full top-[10%] left-[10%] animate-[orb-drift_15s_infinite] blur-3xl pointer-events-none" />
          <div className="absolute w-96 h-96 bg-indigo-500/8 rounded-full bottom-[10%] right-[10%] animate-[orb-drift-2_20s_infinite] blur-3xl pointer-events-none" />
        </>
      )}
      {isDark && (
        <>
          <div className="absolute w-96 h-96 rounded-full top-[20%] left-[15%] animate-[orb-drift_15s_infinite] blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,255,136,0.04), transparent 70%)' }} />
          <div className="absolute w-[500px] h-[500px] rounded-full bottom-[10%] right-[10%] animate-[orb-drift-2_20s_infinite] blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.03), transparent 70%)' }} />
        </>
      )}

      {/* Main container */}
      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          {isDark ? (
            <>
              <div className="relative w-16 h-16 mx-auto mb-5">
                <div className="w-16 h-16 rounded-sm border border-[rgba(0,255,136,0.2)] flex items-center justify-center relative" style={{ background: 'rgba(0,255,136,0.03)' }}>
                  <Brain className="w-7 h-7" style={{ color: 'var(--accent)' }} />
                  <div className="absolute -top-px -left-px w-3 h-3 border-t border-l" style={{ borderColor: 'var(--accent)' }} />
                  <div className="absolute -top-px -right-px w-3 h-3 border-t border-r" style={{ borderColor: 'var(--accent)' }} />
                  <div className="absolute -bottom-px -left-px w-3 h-3 border-b border-l" style={{ borderColor: 'var(--accent)' }} />
                  <div className="absolute -bottom-px -right-px w-3 h-3 border-b border-r" style={{ borderColor: 'var(--accent)' }} />
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-px" style={{ background: 'var(--accent)' }} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                DOC<span style={{ color: 'var(--accent)' }}>MIND</span>
              </h1>
              <p className="text-[10px] tracking-[0.3em] uppercase" style={{ color: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace" }}>
                CLASSIFIED // INTELLIGENCE PLATFORM
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-500/20">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Welcome to <span className="text-gradient">DocMind</span>
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>AI-Powered Intelligence Platform</p>
            </>
          )}
        </div>

        {/* Login card */}
        <form onSubmit={handleSubmit} className={isDark ? '' : 'glass p-8 space-y-5'} style={isDark ? {
          background: 'rgba(0,255,136,0.015)',
          border: '1px solid rgba(0,255,136,0.1)',
          borderRadius: '4px',
          padding: '2rem',
        } : undefined}>
          {/* Fingerprint */}
          <FingerprintSVG scanning={scanning} success={success} fail={fail} />

          {/* Terminal output */}
          {isDark && (
            <div
              ref={termRef}
              className="rounded-sm p-3 mb-4 max-h-28 overflow-auto space-y-1"
              style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,255,136,0.08)' }}
            >
              {STATUS_MESSAGES.map((msg, i) => (
                <TerminalLine key={i} text={msg.text} delay={msg.delay} color="var(--text-secondary)" />
              ))}
              {authLines.map((line, i) => (
                <div key={`auth-${i}`} className="flex items-center gap-2 text-xs font-mono" style={{ color: line.color }}>
                  <span className="opacity-50">[</span>
                  <span>{new Date().toLocaleTimeString('en-US', { hour12: false })}</span>
                  <span className="opacity-50">]</span>
                  <span>{line.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Username */}
          <div>
            <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: isDark ? 'var(--accent)' : 'var(--text-tertiary)', fontFamily: isDark ? "'JetBrains Mono', monospace" : undefined, letterSpacing: isDark ? '0.15em' : undefined, fontSize: isDark ? '0.6rem' : undefined }}>
              {isDark ? 'OPERATOR ID' : 'Username'}
            </label>
            <div className="relative">
              <input
                className={isDark ? 'terminal-input pl-10' : 'glass-input pl-10'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isDark ? 'Enter operator ID...' : 'Enter username'}
                autoFocus
              />
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: isDark ? 'rgba(0,255,136,0.3)' : 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: isDark ? 'var(--accent)' : 'var(--text-tertiary)', fontFamily: isDark ? "'JetBrains Mono', monospace" : undefined, letterSpacing: isDark ? '0.15em' : undefined, fontSize: isDark ? '0.6rem' : undefined }}>
              {isDark ? 'ACCESS CODE' : 'Password'}
            </label>
            <div className="relative">
              <input
                className={isDark ? 'terminal-input pl-10 pr-10' : 'glass-input pl-10 pr-12'}
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isDark ? 'Enter access code...' : 'Enter password'}
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: isDark ? 'rgba(0,255,136,0.3)' : 'var(--text-muted)' }} />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: isDark ? 'rgba(0,255,136,0.3)' : 'var(--text-muted)' }}
                onClick={() => setShowPw(!showPw)}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className={`w-full flex items-center justify-center gap-2 font-medium transition-all duration-300 ${isDark ? '' : 'btn-glow'}`}
            style={isDark ? {
              background: fail ? 'rgba(255,51,102,0.1)' : scanning ? 'rgba(0,255,136,0.06)' : 'rgba(0,255,136,0.1)',
              border: `1px solid ${fail ? 'rgba(255,51,102,0.3)' : scanning ? 'rgba(0,255,136,0.3)' : 'rgba(0,255,136,0.2)'}`,
              color: fail ? 'var(--danger)' : 'var(--accent)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              borderRadius: '2px',
              padding: '0.75rem',
            } : { borderRadius: '12px' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Fingerprint className="w-4 h-4 animate-pulse" />
                {scanning ? 'SCANNING...' : 'AUTHENTICATING...'}
              </>
            ) : (
              <>
                {isDark ? <Fingerprint className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                {isDark ? 'AUTHENTICATE' : 'Sign In'}
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          {isDark ? (
            <div className="flex items-center justify-center gap-3 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              <span>SECURE CONNECTION ESTABLISHED</span>
              <span className="opacity-30">|</span>
              <span>TLS 1.3</span>
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Default: admin / admin123</p>
          )}
        </div>
      </div>
    </div>
  )
}
