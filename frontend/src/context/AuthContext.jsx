import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('docmind_token')
    if (token) {
      api.getMe()
        .then((data) => setUser(data.user))
        .catch(() => localStorage.removeItem('docmind_token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (username, password) => {
    const data = await api.login(username, password)
    localStorage.setItem('docmind_token', data.token)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('docmind_token')
    setUser(null)
  }

  const isAdmin = user?.role === 'admin'
  const isEditor = user?.role === 'admin' || user?.role === 'editor'

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isEditor }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
