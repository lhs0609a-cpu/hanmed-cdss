import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 스크린리더 공지사항 훅
 * 동적 콘텐츠 변경 시 스크린리더에 알림
 */
export function useAnnounce() {
  const announceRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // 공지사항 영역 생성 (페이지당 하나)
    let announcer = document.getElementById('sr-announcer') as HTMLDivElement
    if (!announcer) {
      announcer = document.createElement('div')
      announcer.id = 'sr-announcer'
      announcer.setAttribute('aria-live', 'polite')
      announcer.setAttribute('aria-atomic', 'true')
      announcer.className = 'sr-only'
      document.body.appendChild(announcer)
    }
    announceRef.current = announcer

    return () => {
      // 다른 컴포넌트가 사용 중일 수 있으므로 제거하지 않음
    }
  }, [])

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announceRef.current) return

    announceRef.current.setAttribute('aria-live', priority)
    // 같은 메시지 재공지를 위해 먼저 비움
    announceRef.current.textContent = ''
    // 약간의 딜레이 후 메시지 설정
    setTimeout(() => {
      if (announceRef.current) {
        announceRef.current.textContent = message
      }
    }, 100)
  }, [])

  return { announce }
}

/**
 * 포커스 트랩 훅
 * 모달/다이얼로그 내에서 포커스를 가둠
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive) {
      // 비활성화 시 이전 포커스로 복귀
      if (previousFocusRef.current) {
        previousFocusRef.current.focus()
        previousFocusRef.current = null
      }
      return
    }

    // 현재 포커스 저장
    previousFocusRef.current = document.activeElement as HTMLElement

    const container = containerRef.current
    if (!container) return

    // 포커스 가능한 요소들 찾기
    const getFocusableElements = () => {
      return container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    }

    // 첫 번째 요소로 포커스 이동
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }

    // Tab 키 처리
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        // Shift+Tab: 첫 번째 요소에서 마지막으로
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: 마지막 요소에서 첫 번째로
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isActive])

  return containerRef
}

/**
 * 키보드 단축키 설명 훅
 */
export function useKeyboardShortcutAnnounce() {
  const { announce } = useAnnounce()

  const announceShortcut = useCallback((action: string) => {
    announce(`${action} 완료`, 'polite')
  }, [announce])

  return { announceShortcut }
}

/**
 * 로딩 상태 공지 훅
 */
export function useLoadingAnnounce() {
  const { announce } = useAnnounce()

  const announceLoading = useCallback((isLoading: boolean, context?: string) => {
    if (isLoading) {
      announce(`${context || '콘텐츠'} 로딩 중입니다. 잠시만 기다려주세요.`, 'polite')
    } else {
      announce(`${context || '콘텐츠'} 로딩이 완료되었습니다.`, 'polite')
    }
  }, [announce])

  return { announceLoading }
}

/**
 * 리듀스드 모션 (애니메이션 제한) 지원 훅
 * 사용자가 시스템에서 애니메이션 제한을 설정한 경우 감지
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}

/**
 * 높은 대비 모드 감지 훅
 */
export function useHighContrast() {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: more)')
    setPrefersHighContrast(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setPrefersHighContrast(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersHighContrast
}

/**
 * 포커스 가능한 요소로 포커스 이동 훅
 */
export function useFocusFirst(containerRef: React.RefObject<HTMLElement>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )

    if (focusableElements.length > 0) {
      // 약간의 딜레이로 렌더링 완료 후 포커스
      requestAnimationFrame(() => {
        focusableElements[0].focus()
      })
    }
  }, [isActive, containerRef])
}

/**
 * 에러 발생 시 스크린리더 알림 훅
 */
export function useErrorAnnounce() {
  const { announce } = useAnnounce()

  const announceError = useCallback((errorMessage: string) => {
    announce(`오류: ${errorMessage}`, 'assertive')
  }, [announce])

  const announceSuccess = useCallback((message: string) => {
    announce(message, 'polite')
  }, [announce])

  return { announceError, announceSuccess }
}

/**
 * 양식 필드 접근성 ID 생성 훅
 */
export function useFormFieldId(prefix: string = 'field') {
  const idRef = useRef<string>()

  if (!idRef.current) {
    idRef.current = `${prefix}-${Math.random().toString(36).substr(2, 9)}`
  }

  return {
    inputId: idRef.current,
    labelId: `${idRef.current}-label`,
    descriptionId: `${idRef.current}-desc`,
    errorId: `${idRef.current}-error`,
  }
}

export default useAnnounce
