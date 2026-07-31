import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { usePageLog } from '../logger'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  Users, Plus, Trash2, Edit2, X, Loader2, Shield, UserCheck, UserX, Crown
} from 'lucide-react'

export default function UsersPage() {
  usePageLog('Users')
  const { user: currentUser } = useAuth()
  const { isDark } = useTheme()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)

  const loadUsers = async () => {
    try {
      const data = await api.listUsers()
      setUsers(data.users)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  const handleDelete = async (id, username) => {
    if (!confirm(`Delete user "${username}"?`)) return
    try {
      await api.deleteUser(id)
      toast.success(`Deleted ${username}`)
      loadUsers()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const roleBadges = isDark
    ? {
        admin: { color: '#00ff88', bg: 'rgba(0,255,136,0.1)', border: 'rgba(0,255,136,0.25)' },
        editor: { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.25)' },
        viewer: { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)' },
      }
    : {
        admin: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
        editor: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
        viewer: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
      }

  const roleIcons = { admin: Crown, editor: Shield, viewer: Users }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2
            className="text-2xl font-bold"
            style={isDark
              ? { fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent)', letterSpacing: '0.05em' }
              : { color: 'var(--text-primary)' }
            }
          >
            {isDark ? '// ACCESS CONTROL' : 'User Management'}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {isDark
              ? <>{users.length} OPERATORS REGISTERED</>
              : <>{users.length} users registered</>
            }
          </p>
        </div>
        <button
          className={isDark ? 'btn-glow flex items-center gap-2 font-mono uppercase tracking-wider text-xs' : 'btn-glow flex items-center gap-2'}
          onClick={() => { setEditing(null); setShowModal(true) }}
        >
          <Plus className="w-4 h-4" /> {isDark ? 'ENLIST' : 'Add User'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-[var(--accent)]' : 'text-indigo-500'}`} />
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const RoleIcon = roleIcons[u.role] || Users
            return (
              <div
                key={u.id}
                className={isDark ? 'hud-panel flex items-center gap-4 group' : 'glass-card flex items-center gap-4 group'}
              >
                <div
                  className={isDark
                    ? 'w-11 h-11 flex items-center justify-center font-bold text-sm shrink-0'
                    : 'w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0'
                  }
                  style={{
                    color: isDark ? 'var(--accent)' : 'var(--text-primary)',
                    backgroundColor: u.avatar_color || '#6366f1',
                    ...(isDark && { borderRadius: '2px', border: '1px solid rgba(0,255,136,0.15)' }),
                  }}
                >
                  {u.full_name?.[0]?.toUpperCase() || u.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-semibold"
                      style={isDark
                        ? { fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-primary)', fontSize: '0.9rem' }
                        : { color: 'var(--text-primary)' }
                      }
                    >
                      {u.full_name || u.username}
                    </span>
                    {u.id === currentUser?.id && (
                      isDark
                        ? <span className="text-[10px] px-2 py-0.5" style={{ color: 'var(--accent)', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '2px', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>SELF</span>
                        : <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">you</span>
                    )}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {u.email} &middot; @{u.username}
                  </div>
                </div>
                {isDark ? (
                  <span
                    className="border text-[10px] px-2.5 py-1 uppercase font-medium"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      letterSpacing: '0.1em',
                      color: roleBadges[u.role]?.color,
                      background: roleBadges[u.role]?.bg,
                      border: `1px solid ${roleBadges[u.role]?.border}`,
                      borderRadius: '2px',
                    }}
                  >
                    {u.role === 'admin' && <Crown className="w-3 h-3 inline mr-1" />}
                    {u.role === 'editor' && <Shield className="w-3 h-3 inline mr-1" />}
                    {u.role === 'viewer' && <Users className="w-3 h-3 inline mr-1" />}
                    {u.role.toUpperCase()}
                  </span>
                ) : (
                  <span className={`badge border ${roleBadges[u.role]}`}>
                    <RoleIcon className="w-3 h-3 inline mr-1" />
                    {u.role}
                  </span>
                )}
                {isDark ? (
                  <span
                    className="w-2 h-2"
                    style={{
                      borderRadius: '1px',
                      backgroundColor: u.is_active ? 'var(--accent)' : 'var(--danger)',
                      boxShadow: u.is_active
                        ? '0 0 8px rgba(0,255,136,0.5)'
                        : '0 0 8px rgba(239,68,68,0.5)',
                    }}
                  />
                ) : (
                  <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                )}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditing(u); setShowModal(true) }}
                    className={isDark
                      ? 'p-2 transition-colors'
                      : 'p-2 hover:bg-white/[0.06] rounded-lg transition-colors'
                    }
                    style={isDark ? { borderRadius: '2px' } : undefined}
                    onMouseEnter={(e) => isDark && (e.currentTarget.style.background = 'rgba(0,255,136,0.06)')}
                    onMouseLeave={(e) => isDark && (e.currentTarget.style.background = 'transparent')}
                  >
                    <Edit2 className="w-3.5 h-3.5" style={{ color: isDark ? 'var(--accent)' : 'var(--text-secondary)' }} />
                  </button>
                  {u.id !== currentUser?.id && (
                    <button
                      onClick={() => handleDelete(u.id, u.username)}
                      className={isDark
                        ? 'p-2 transition-colors'
                        : 'p-2 hover:bg-red-500/10 rounded-lg transition-colors'
                      }
                      style={isDark ? { borderRadius: '2px' } : undefined}
                      onMouseEnter={(e) => isDark && (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                      onMouseLeave={(e) => isDark && (e.currentTarget.style.background = 'transparent')}
                    >
                      <Trash2 className="w-3.5 h-3.5" style={{ color: isDark ? 'var(--danger)' : '#f87171' }} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <UserModal
          user={editing}
          isDark={isDark}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null); loadUsers() }}
        />
      )}
    </div>
  )
}

function UserModal({ user, isDark, onClose, onSaved }) {
  const modalRoleBadges = {
    admin: { color: '#00ff88', bg: 'rgba(0,255,136,0.1)', border: 'rgba(0,255,136,0.25)' },
    editor: { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.25)' },
    viewer: { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)' },
  }

  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    full_name: user?.full_name || '',
    password: '',
    role: user?.role || 'viewer',
  })
  const [saving, setSaving] = useState(false)
  const isEdit = !!user

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))

  const handleSave = async () => {
    if (!form.username || !form.email || (!isEdit && !form.password)) {
      toast.error('Fill all required fields')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        const data = { email: form.email, full_name: form.full_name, role: form.role }
        if (form.password) data.password = form.password
        await api.updateUser(user.id, data)
        toast.success('User updated')
      } else {
        await api.createUser(form)
        toast.success('User created')
      }
      onSaved()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const modalOverlayStyle = isDark
    ? { background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }
    : { background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }

  const modalPanelStyle = isDark
    ? {
        width: '100%', maxWidth: '28rem', padding: '1.5rem',
        background: 'rgba(0,20,12,0.95)', border: '1px solid rgba(0,255,136,0.15)',
        borderRadius: '2px', boxShadow: '0 0 40px rgba(0,255,136,0.05)',
      }
    : { width: '100%', maxWidth: '28rem', padding: '1.5rem' }

  const inputClass = isDark ? 'terminal-input' : 'glass-input'

  const labelStyle = isDark
    ? { fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', fontSize: '0.65rem', color: 'var(--accent)' }
    : { color: 'var(--text-secondary)' }

  const sectionTitle = isEdit ? (isEdit ? 'MODIFY OPERATOR' : 'ENLIST OPERATOR') : 'ENLIST OPERATOR'

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={modalOverlayStyle}>
      <div className={isDark ? '' : 'glass w-full max-w-md p-6 border-glow'} style={isDark ? modalPanelStyle : undefined}>
        <div className="flex items-center justify-between mb-6">
          <h3
            className="text-lg font-semibold"
            style={isDark
              ? { fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent)', letterSpacing: '0.05em' }
              : { color: 'var(--text-primary)' }
            }
          >
            {isDark ? `// ${sectionTitle}` : (isEdit ? 'Edit User' : 'Create User')}
          </h3>
          <button
            onClick={onClose}
            style={isDark ? { borderRadius: '2px', color: 'var(--text-secondary)' } : { color: 'var(--text-secondary)' }}
            className={isDark ? 'p-1 hover:bg-white/[0.06]' : 'text-gray-500 hover:text-white'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          {!isEdit && (
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1.5" style={labelStyle}>
                {isDark ? 'DESIGNATION' : 'Username'}
              </label>
              <input className={inputClass} value={form.username} onChange={(e) => set('username', e.target.value)} />
            </div>
          )}
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={labelStyle}>
              {isDark ? 'FULL DESIGNATION' : 'Full Name'}
            </label>
            <input className={inputClass} value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={labelStyle}>
              {isDark ? 'COMM CHANNEL' : 'Email'}
            </label>
            <input className={inputClass} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={labelStyle}>
              {isEdit ? (isDark ? 'CREDENTIALS (BLANK TO RETAIN)' : 'New Password (leave blank to keep)') : (isDark ? 'CREDENTIALS' : 'Password')}
            </label>
            <input className={inputClass} type="password" value={form.password} onChange={(e) => set('password', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={labelStyle}>
              {isDark ? 'CLEARANCE LEVEL' : 'Role'}
            </label>
            <div className="flex gap-2">
              {['admin', 'editor', 'viewer'].map((r) => {
                const isActive = form.role === r
                if (isDark) {
                  const badge = modalRoleBadges[r]
                  return (
                    <button
                      key={r}
                      type="button"
                      className="flex-1 py-2.5 text-sm font-medium border transition-all"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: '0.1em',
                        borderRadius: '2px',
                        textTransform: 'uppercase',
                        fontSize: '0.75rem',
                        color: isActive ? badge.color : 'var(--text-muted)',
                        background: isActive ? badge.bg : 'transparent',
                        border: `1px solid ${isActive ? badge.border : 'rgba(255,255,255,0.06)'}`,
                      }}
                      onClick={() => set('role', r)}
                    >
                      {r.toUpperCase()}
                    </button>
                  )
                }
                return (
                  <button
                    key={r}
                    type="button"
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      isActive
                        ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                        : 'border-white/[0.06] hover:text-gray-300'
                    }`}
                    style={!isActive ? { color: 'var(--text-secondary)' } : undefined}
                    onClick={() => set('role', r)}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            className={isDark ? 'btn-ghost font-mono uppercase tracking-wider text-xs' : 'btn-ghost'}
            onClick={onClose}
          >
            {isDark ? 'ABORT' : 'Cancel'}
          </button>
          <button
            className={isDark ? 'btn-glow font-mono uppercase tracking-wider text-xs' : 'btn-glow'}
            onClick={handleSave} disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
            {isDark ? (isEdit ? 'UPDATE' : 'DEPLOY') : (isEdit ? 'Update' : 'Create')}
          </button>
        </div>
      </div>
    </div>
  )
}


