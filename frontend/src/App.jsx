import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { useTheme } from './context/ThemeContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import DocumentsPage from './pages/DocumentsPage'
import UploadPage from './pages/UploadPage'
import SearchPage from './pages/SearchPage'
import VectorSearchPage from './pages/VectorSearchPage'
import SummarizePage from './pages/SummarizePage'
import AskPage from './pages/AskPage'
import TranslatePage from './pages/TranslatePage'
import ChatPage from './pages/ChatPage'
import UsersPage from './pages/UsersPage'
import FaceGalleryPage from './pages/FaceGalleryPage'
import {
  Brain, LayoutDashboard, FileText, Upload, Search, Dna,
  BookOpen, MessageCircle, Languages, Users, LogOut, Loader2, Menu, X,
  Sun, Moon, ScanFace, Shield, Radio, Activity
} from 'lucide-react'
import { useState, useEffect } from 'react'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'editor', 'viewer'] },
  { to: '/', label: 'Documents', icon: FileText, roles: ['admin', 'editor', 'viewer'] },
  { to: '/upload', label: 'Upload', icon: Upload, roles: ['admin', 'editor'] },
  { to: '/search', label: 'Search', icon: Search, roles: ['admin', 'editor', 'viewer'] },
  { to: '/vector-search', label: 'Vector Search', icon: Dna, roles: ['admin', 'editor', 'viewer'] },
  { divider: true, roles: ['admin', 'editor', 'viewer'], label: 'INTELLIGENCE' },
  { to: '/summarize', label: 'Summarize', icon: BookOpen, roles: ['admin', 'editor'] },
  { to: '/ask', label: 'Ask Question', icon: Brain, roles: ['admin', 'editor', 'viewer'] },
  { to: '/translate', label: 'Translate', icon: Languages, roles: ['admin', 'editor'] },
  { to: '/chat', label: 'Knowledge Base', icon: MessageCircle, roles: ['admin', 'editor', 'viewer'] },
  { to: '/faces', label: 'Face Gallery', icon: ScanFace, roles: ['admin', 'editor', 'viewer'] },
  { divider: true, roles: ['admin'], label: 'ADMIN' },
  { to: '/users', label: 'Users', icon: Users, roles: ['admin'] },
]

function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="font-mono tabular-nums">
      {time.toLocaleTimeString('en-US', { hour12: false })}
    </span>
  )
}

export default function App() {
  const { user, loading, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const isDark = theme === 'dark'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-body)' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            INITIALIZING
          </span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }

  const allowedItems = navItems.filter((item) => item.roles.includes(user.role))

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-0'} backdrop-blur-2xl border-r flex flex-col fixed h-full transition-all duration-300 overflow-hidden z-40`}
        style={{
          background: 'var(--sidebar-bg)',
          borderColor: isDark ? 'rgba(0,255,136,0.08)' : 'var(--border-1)',
        }}
        aria-hidden={!sidebarOpen}
      >
        {/* Logo */}
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-sm flex items-center justify-center relative"
              style={{
                background: isDark ? 'rgba(0,255,136,0.06)' : 'linear-gradient(135deg, var(--accent), #00d4ff)',
                border: isDark ? '1px solid rgba(0,255,136,0.2)' : 'none',
              }}
            >
              <Brain className="w-5 h-5" style={{ color: isDark ? 'var(--accent)' : '#fff' }} />
              {isDark && (
                <>
                  <div className="absolute -top-px -left-px w-2 h-2 border-t border-l" style={{ borderColor: 'var(--accent)' }} />
                  <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r" style={{ borderColor: 'var(--accent)' }} />
                </>
              )}
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: isDark ? "'JetBrains Mono', monospace" : undefined }}>
                {isDark ? 'DOC' : 'Doc'}<span style={{ color: 'var(--accent)' }}>{isDark ? 'MIND' : 'Mind'}</span>
              </h1>
              <p className="text-[9px] uppercase tracking-[0.2em]" style={{ color: isDark ? 'var(--accent)' : 'var(--text-muted)', fontFamily: isDark ? "'JetBrains Mono', monospace" : undefined }}>
                {isDark ? 'INTEL PLATFORM' : 'Intelligence Platform'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-auto">
          {allowedItems.map((item, i) => {
            if (item.divider) {
              return (
                <div key={i} className="mt-4 mb-2 mx-4 flex items-center gap-2">
                  <div className="flex-1 h-px" style={{ background: isDark ? 'rgba(0,255,136,0.08)' : 'var(--border-1)' }} />
                  <span className="text-[8px] uppercase tracking-[0.25em] font-mono" style={{ color: isDark ? 'rgba(0,255,136,0.25)' : 'var(--text-muted)' }}>
                    {item.label}
                  </span>
                  <div className="flex-1 h-px" style={{ background: isDark ? 'rgba(0,255,136,0.08)' : 'var(--border-1)' }} />
                </div>
              )
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(true)}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t" style={{ borderColor: isDark ? 'rgba(0,255,136,0.08)' : 'var(--border-1)' }}>
          <div className="flex items-center gap-3 px-2 mb-3">
            <div
              className="w-9 h-9 rounded-sm flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{
                backgroundColor: user.avatar_color || (isDark ? '#0a2e1a' : '#6366f1'),
                border: isDark ? '1px solid rgba(0,255,136,0.2)' : 'none',
              }}
            >
              {user.full_name?.[0]?.toUpperCase() || user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user.full_name || user.username}</div>
              <div className="text-[9px] uppercase tracking-[0.15em]" style={{ color: isDark ? 'var(--accent)' : 'var(--text-muted)', fontFamily: isDark ? "'JetBrains Mono', monospace" : undefined }}>
                {isDark ? `ROLE: ${user.role.toUpperCase()}` : user.role}
              </div>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="sidebar-item w-full"
            style={{ color: isDark ? 'rgba(255,51,102,0.6)' : undefined }}
          >
            <LogOut className="w-4 h-4" />
            <span>{isDark ? 'DISCONNECT' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`${sidebarOpen ? 'ml-64' : 'ml-0'} flex-1 transition-all duration-300`}>
        {/* Topbar */}
        <div
          className="sticky top-0 z-30 backdrop-blur-xl border-b px-6 py-3 flex items-center gap-4"
          style={{
            background: 'var(--topbar-bg)',
            borderColor: isDark ? 'rgba(0,255,136,0.08)' : 'var(--border-1)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <div className="flex-1" />

          {isDark ? (
            <div className="flex items-center gap-5 text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              <div className="flex items-center gap-1.5">
                <Clock />
              </div>
              <div className="w-px h-3" style={{ background: 'rgba(0,255,136,0.1)' }} />
              <div className="flex items-center gap-1.5">
                <Radio className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                <span>SYS:ONLINE</span>
              </div>
              <div className="w-px h-3" style={{ background: 'rgba(0,255,136,0.1)' }} />
              <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                <span>FRS:ACTIVE</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
              System Online
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl transition-all duration-300"
            style={{ color: 'var(--text-secondary)' }}
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {isDark && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-sm" style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.08)' }}>
              <Shield className="w-3 h-3" style={{ color: 'var(--accent)' }} />
              <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                {user.role}
              </span>
            </div>
          )}
        </div>

        {/* Page content */}
        <div className={`p-8 ${isDark ? 'hud-grid-bg' : ''}`}>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/" element={<DocumentsPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/vector-search" element={<VectorSearchPage />} />
            <Route path="/summarize" element={<SummarizePage />} />
            <Route path="/ask" element={<AskPage />} />
            <Route path="/translate" element={<TranslatePage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/faces" element={<FaceGalleryPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="*" element={<DashboardPage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
