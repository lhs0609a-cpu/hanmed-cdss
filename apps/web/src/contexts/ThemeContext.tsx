import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'hanmed-theme'

/**
 * OS 설정을 따라가지 않는다 — 항상 라이트다.
 *
 * 대시보드에는 다크 스타일이 없다. dark: 유틸리티를 쓰는 파일이 9개뿐이고
 * 사이드바·카드·본문 글자는 전부 라이트 값으로 하드코딩돼 있다. 그런데
 * 기본값이 'system' 이라 OS 를 다크로 쓰는 사람은 토글을 건드린 적이 없어도
 * .dark 가 붙었다. 그러면 glass-surface 를 쓰는 사이드바·모바일 헤더·하단
 * 탭만 어두워지고(--glass-bg: 25 31 40 / 0.66) 나머지는 밝은 채로 남는다.
 * 어두운 사이드바 위에 어두운 글자가 얹혀 대비가 1.5:1 까지 떨어졌다.
 *
 * 다크를 제대로 구현하기 전까지는 켜지지 않게 둔다.
 */
function getSystemTheme(): 'light' | 'dark' {
  return 'light'
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

    const handleChange = () => {
      // getSystemTheme 과 같은 이유로 OS 가 다크로 바뀌어도 따라가지 않는다.
      const newTheme = getSystemTheme()
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
