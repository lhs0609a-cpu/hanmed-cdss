import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

/**
 * 접근성 컨텍스트.
 *
 * 한의사 사용 환경 가정:
 *   - 60대+ 사용자가 진료실 태블릿/노트북에서 글자 크기를 키워야 한다.
 *   - 색약자(전체 인구 5-7%)는 색상만으로 상태를 구분할 수 없다.
 *   - 환자 응대 중 손이 더러우면 타이트한 클릭 영역은 스트레스다.
 *
 * 제공:
 *   - fontScale: 'normal' | 'large' | 'xlarge'
 *   - reduceMotion: boolean (애니메이션 최소화)
 *   - highContrast: boolean (고대비 모드)
 *   - focusVisible: boolean (포커스 링 항상 표시)
 */

export type FontScale = 'normal' | 'large' | 'xlarge'

interface AccessibilityState {
  fontScale: FontScale
  reduceMotion: boolean
  highContrast: boolean
  focusVisible: boolean
}

interface AccessibilityContextType extends AccessibilityState {
  setFontScale: (scale: FontScale) => void
  setReduceMotion: (v: boolean) => void
  setHighContrast: (v: boolean) => void
  setFocusVisible: (v: boolean) => void
}

const STORAGE_KEY = 'ongojisin:a11y:v1'

const DEFAULT_STATE: AccessibilityState = {
  fontScale: 'normal',
  reduceMotion: false,
  highContrast: false,
  focusVisible: false,
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

function loadState(): AccessibilityState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_STATE, ...parsed }
  } catch {
    return DEFAULT_STATE
  }
}

function applyToDocument(state: AccessibilityState) {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  // CSS 변수로 글자 크기 스케일 노출 → tailwind 의 text-* 도 함께 커지도록 한다.
  // (선택: tailwind.config 의 fontSize 토큰을 var(--ongojisin-text-scale) * x 로 전환)
  const scaleMap: Record<FontScale, string> = {
    normal: '1',
    large: '1.15',
    xlarge: '1.3',
  }
  root.style.setProperty('--ongojisin-text-scale', scaleMap[state.fontScale])
  // body 자체의 base font-size 도 함께 키워 하드코딩된 px 도 영향받게 한다.
  root.style.fontSize = `${100 * Number(scaleMap[state.fontScale])}%`

  root.dataset.fontScale = state.fontScale
  root.dataset.reduceMotion = state.reduceMotion ? 'true' : 'false'
  root.dataset.highContrast = state.highContrast ? 'true' : 'false'
  root.dataset.focusVisible = state.focusVisible ? 'true' : 'false'

  // 모션 감소: 전역 transition 제거
  if (state.reduceMotion) {
    root.classList.add('reduce-motion')
  } else {
    root.classList.remove('reduce-motion')
  }
  if (state.highContrast) {
    root.classList.add('high-contrast')
  } else {
    root.classList.remove('high-contrast')
  }
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccessibilityState>(() => loadState())

  useEffect(() => {
    applyToDocument(state)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore
    }
  }, [state])

  const value: AccessibilityContextType = {
    ...state,
    setFontScale: (fontScale) => setState((s) => ({ ...s, fontScale })),
    setReduceMotion: (reduceMotion) => setState((s) => ({ ...s, reduceMotion })),
    setHighContrast: (highContrast) => setState((s) => ({ ...s, highContrast })),
    setFocusVisible: (focusVisible) => setState((s) => ({ ...s, focusVisible })),
  }

  return (
    <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext)
  if (!ctx) {
    throw new Error('useAccessibility must be used within AccessibilityProvider')
  }
  return ctx
}
