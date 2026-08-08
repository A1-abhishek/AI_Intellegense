import { createContext, useContext } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  return (
    <ThemeContext.Provider value={{ theme: 'light', isDark: false }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
