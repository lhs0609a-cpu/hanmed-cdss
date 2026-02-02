import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'hanmed-theme'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system'
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
    return stored || 'system'
  })

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (theme === 'system') return getSystemTheme()
    return theme
  })

  // 테마 변경 시 DOM 및 localStorage 업데이트
  useEffect(() => {
    const root = window.document.documentElement

    // 이전 테마 클래스 제거
    root.classList.remove('light', 'dark')

    // 실제 적용할 테마 결정
    const effectiveTheme = theme === 'system' ? getSystemTheme() : theme
    setResolvedTheme(effectiveTheme)

    // 테마 클래스 추가
    root.classList.add(effectiveTheme)

    // localStorage 저장
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  // 시스템 테마 변경 감지
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light'
      setResolvedTheme(newTheme)

      const root = window.document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(newTheme)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  // 키보드 단축키 이벤트 리스너
  useEffect(() => {
    const handleToggleTheme = () => {
      setThemeState(() => {
        const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
        return newTheme
      })
    }

    window.addEventListener('toggle-theme', handleToggleTheme)
    return () => window.removeEventListener('toggle-theme', handleToggleTheme)
  }, [resolvedTheme])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
