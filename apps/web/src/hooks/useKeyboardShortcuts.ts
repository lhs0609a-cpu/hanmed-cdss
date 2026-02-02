import { useEffect, useCallback, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// 단축키 정의
export interface KeyboardShortcut {
  key: string
  modifiers?: ('ctrl' | 'meta' | 'alt' | 'shift')[]
  description: string
  category: 'navigation' | 'action' | 'search'
  action: () => void
}

// 주요 페이지 라우트
const ROUTES = {
  dashboard: '/dashboard',
  consultation: '/dashboard/consultation',
  search: '/dashboard/unified-search',
  cases: '/dashboard/cases',
  caseSearch: '/dashboard/case-search',
  formulas: '/dashboard/formulas',
  herbs: '/dashboard/herbs',
  interactions: '/dashboard/interactions',
  patients: '/dashboard/patients',
  settings: '/dashboard/settings',
  subscription: '/dashboard/subscription',
  community: '/dashboard/community',
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const location = useLocation()
  const [showHelp, setShowHelp] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)

  // 단축키 목록 정의
  const shortcuts: KeyboardShortcut[] = [
    // 네비게이션 단축키
    {
      key: 'h',
      modifiers: ['alt'],
      description: '홈 (대시보드)',
      category: 'navigation',
      action: () => navigate(ROUTES.dashboard),
    },
    {
      key: 'c',
      modifiers: ['alt'],
      description: 'AI 진료 어시스턴트',
      category: 'navigation',
      action: () => navigate(ROUTES.consultation),
    },
    {
      key: 's',
      modifiers: ['alt'],
      description: '통합 검색',
      category: 'navigation',
      action: () => navigate(ROUTES.search),
    },
    {
      key: 't',
      modifiers: ['alt'],
      description: '치험례 검색',
      category: 'navigation',
      action: () => navigate(ROUTES.caseSearch),
    },
    {
      key: 'f',
      modifiers: ['alt'],
      description: '처방 목록',
      category: 'navigation',
      action: () => navigate(ROUTES.formulas),
    },
    {
      key: 'b',
      modifiers: ['alt'],
      description: '약재 DB',
      category: 'navigation',
      action: () => navigate(ROUTES.herbs),
    },
    {
      key: 'i',
      modifiers: ['alt'],
      description: '상호작용 검사',
      category: 'navigation',
      action: () => navigate(ROUTES.interactions),
    },
    {
      key: 'p',
      modifiers: ['alt'],
      description: '환자 관리',
      category: 'navigation',
      action: () => navigate(ROUTES.patients),
    },
    {
      key: 'g',
      modifiers: ['alt'],
      description: '설정',
      category: 'navigation',
      action: () => navigate(ROUTES.settings),
    },
    {
      key: 'm',
      modifiers: ['alt'],
      description: '커뮤니티',
      category: 'navigation',
      action: () => navigate(ROUTES.community),
    },
    // 검색 단축키
    {
      key: 'k',
      modifiers: ['ctrl'],
      description: '빠른 검색 (Command Palette)',
      category: 'search',
      action: () => setShowCommandPalette(true),
    },
    {
      key: 'k',
      modifiers: ['meta'],
      description: '빠른 검색 (Mac)',
      category: 'search',
      action: () => setShowCommandPalette(true),
    },
    {
      key: '/',
      description: '검색창 포커스',
      category: 'search',
      action: () => {
        const searchInput = document.querySelector('input[type="text"][placeholder*="검색"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        } else {
          navigate(ROUTES.search)
        }
      },
    },
    // 액션 단축키
    {
      key: 'n',
      modifiers: ['alt'],
      description: '새 진료 시작',
      category: 'action',
      action: () => navigate(ROUTES.consultation),
    },
    {
      key: 'e',
      modifiers: ['alt'],
      description: '데이터 내보내기',
      category: 'action',
      action: () => {
        // ExportDialog 열기 이벤트 발생
        window.dispatchEvent(new CustomEvent('open-export-dialog'))
      },
    },
    {
      key: 'd',
      modifiers: ['alt'],
      description: '다크/라이트 모드 전환',
      category: 'action',
      action: () => {
        // Theme toggle 이벤트 발생
        window.dispatchEvent(new CustomEvent('toggle-theme'))
      },
    },
    {
      key: '?',
      description: '단축키 도움말',
      category: 'action',
      action: () => setShowHelp(true),
    },
    {
      key: 'Escape',
      description: '모달/팝업 닫기',
      category: 'action',
      action: () => {
        setShowHelp(false)
        setShowCommandPalette(false)
      },
    },
  ]

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 입력 필드에서는 일부 단축키 무시
    const target = event.target as HTMLElement
    const isInputField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
    const isContentEditable = target.isContentEditable

    // Escape는 항상 처리
    if (event.key === 'Escape') {
      setShowHelp(false)
      setShowCommandPalette(false)
      return
    }

    // 입력 필드에서는 Ctrl/Meta 조합만 처리
    if (isInputField || isContentEditable) {
      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        return
      }
    }

    // 단축키 매칭
    for (const shortcut of shortcuts) {
      const modifiersMatch = (shortcut.modifiers || []).every(mod => {
        switch (mod) {
          case 'ctrl': return event.ctrlKey
          case 'meta': return event.metaKey
          case 'alt': return event.altKey
          case 'shift': return event.shiftKey
          default: return false
        }
      })

      // 수정자 키가 없는 단축키는 수정자가 눌리지 않아야 함
      const noExtraModifiers = !shortcut.modifiers?.length
        ? !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey
        : true

      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase() ||
        (shortcut.key === '?' && event.shiftKey && event.key === '/')

      if (modifiersMatch && noExtraModifiers && keyMatch) {
        event.preventDefault()
        shortcut.action()
        return
      }
    }
  }, [navigate, location.pathname])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // 카테고리별 그룹화
  const groupedShortcuts = {
    navigation: shortcuts.filter(s => s.category === 'navigation'),
    search: shortcuts.filter(s => s.category === 'search'),
    action: shortcuts.filter(s => s.category === 'action'),
  }

  return {
    shortcuts,
    groupedShortcuts,
    showHelp,
    setShowHelp,
    showCommandPalette,
    setShowCommandPalette,
  }
}

// 단축키를 문자열로 포맷
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const modifierSymbols: Record<string, string> = {
    ctrl: isMac ? '⌃' : 'Ctrl',
    meta: isMac ? '⌘' : 'Win',
    alt: isMac ? '⌥' : 'Alt',
    shift: isMac ? '⇧' : 'Shift',
  }

  const parts = (shortcut.modifiers || []).map(m => modifierSymbols[m])
  parts.push(shortcut.key.toUpperCase())

  return parts.join(isMac ? '' : '+')
}
