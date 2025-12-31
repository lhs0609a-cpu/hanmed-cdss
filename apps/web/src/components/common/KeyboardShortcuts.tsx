import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X,
  Keyboard,
  Search,
  Home,
  Stethoscope,
  BookOpen,
  Leaf,
  Shield,
  Users,
  FileText,
  ChevronRight,
  Command,
} from 'lucide-react'
import { formatShortcut, type KeyboardShortcut } from '@/hooks/useKeyboardShortcuts'

interface KeyboardShortcutsHelpProps {
  isOpen: boolean
  onClose: () => void
  groupedShortcuts: {
    navigation: KeyboardShortcut[]
    search: KeyboardShortcut[]
    action: KeyboardShortcut[]
  }
}

export function KeyboardShortcutsHelp({ isOpen, onClose, groupedShortcuts }: KeyboardShortcutsHelpProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
              <Keyboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">키보드 단축키</h2>
              <p className="text-xs text-gray-500">더 빠른 작업을 위한 단축키</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)] space-y-6">
          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              페이지 이동
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {groupedShortcuts.navigation.map((shortcut, idx) => (
                <ShortcutItem key={idx} shortcut={shortcut} />
              ))}
            </div>
          </div>

          {/* Search */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              검색
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {groupedShortcuts.search.filter(s => !s.key.includes('meta') || navigator.platform.toUpperCase().indexOf('MAC') >= 0).map((shortcut, idx) => (
                <ShortcutItem key={idx} shortcut={shortcut} />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              액션
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {groupedShortcuts.action.map((shortcut, idx) => (
                <ShortcutItem key={idx} shortcut={shortcut} />
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
            <p className="text-sm text-indigo-700">
              <span className="font-medium">팁:</span> 언제든지 <kbd className="px-1.5 py-0.5 bg-white rounded border text-xs">?</kbd> 키를 눌러 이 도움말을 열 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ShortcutItem({ shortcut }: { shortcut: KeyboardShortcut }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <span className="text-sm text-gray-700">{shortcut.description}</span>
      <kbd className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono text-gray-600 shadow-sm">
        {formatShortcut(shortcut)}
      </kbd>
    </div>
  )
}

// Command Palette
interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  action: () => void
  category: 'navigation' | 'action' | 'search'
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands: CommandItem[] = [
    { id: 'home', label: '홈', description: '대시보드로 이동', icon: <Home className="h-4 w-4" />, action: () => navigate('/'), category: 'navigation' },
    { id: 'consultation', label: 'AI 진료 어시스턴트', description: 'AI 처방 추천 받기', icon: <Stethoscope className="h-4 w-4" />, action: () => navigate('/consultation'), category: 'navigation' },
    { id: 'search', label: '통합 검색', description: '처방, 약재, 치험례 검색', icon: <Search className="h-4 w-4" />, action: () => navigate('/unified-search'), category: 'navigation' },
    { id: 'case-search', label: '치험례 검색', description: 'AI 기반 치험례 검색', icon: <FileText className="h-4 w-4" />, action: () => navigate('/case-search'), category: 'navigation' },
    { id: 'cases', label: '치험례 목록', description: '6,000건의 치험례 브라우징', icon: <BookOpen className="h-4 w-4" />, action: () => navigate('/cases'), category: 'navigation' },
    { id: 'formulas', label: '처방 목록', description: '한의학 처방 검색', icon: <BookOpen className="h-4 w-4" />, action: () => navigate('/formulas'), category: 'navigation' },
    { id: 'herbs', label: '약재 DB', description: '한약재 상세 정보', icon: <Leaf className="h-4 w-4" />, action: () => navigate('/herbs'), category: 'navigation' },
    { id: 'interactions', label: '상호작용 검사', description: '약물 상호작용 확인', icon: <Shield className="h-4 w-4" />, action: () => navigate('/interactions'), category: 'navigation' },
    { id: 'patients', label: '환자 관리', description: '환자 목록 및 차트', icon: <Users className="h-4 w-4" />, action: () => navigate('/patients'), category: 'navigation' },
    { id: 'byeongyang', label: '병양도표', description: '변증 패턴 분석', icon: <BookOpen className="h-4 w-4" />, action: () => navigate('/byeongyang'), category: 'navigation' },
    { id: 'constitution', label: '체질 진단', description: '사상체질 판별', icon: <Users className="h-4 w-4" />, action: () => navigate('/constitution'), category: 'navigation' },
  ]

  const filteredCommands = query
    ? commands.filter(cmd =>
        cmd.label.toLowerCase().includes(query.toLowerCase()) ||
        cmd.description?.toLowerCase().includes(query.toLowerCase())
      )
    : commands

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action()
          onClose()
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Command className="h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="검색 또는 명령 입력..."
            className="flex-1 text-base outline-none placeholder:text-gray-400"
          />
          <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs text-gray-500">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">"{query}"에 대한 결과가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCommands.map((cmd, idx) => (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action()
                    onClose()
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    idx === selectedIndex
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className={`p-1.5 rounded-lg ${
                    idx === selectedIndex ? 'bg-indigo-100' : 'bg-gray-100'
                  }`}>
                    {cmd.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{cmd.label}</div>
                    {cmd.description && (
                      <div className="text-xs text-gray-500 truncate">{cmd.description}</div>
                    )}
                  </div>
                  <ChevronRight className={`h-4 w-4 ${
                    idx === selectedIndex ? 'text-indigo-500' : 'text-gray-300'
                  }`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↑↓</kbd>
              이동
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Enter</kbd>
              선택
            </span>
          </div>
          <span>Ctrl+K로 열기</span>
        </div>
      </div>
    </div>
  )
}

// Keyboard Shortcuts Provider - 전역에서 사용
export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [showHelp, setShowHelp] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)

  // 그룹화된 단축키 (표시용)
  const groupedShortcuts: {
    navigation: KeyboardShortcut[]
    search: KeyboardShortcut[]
    action: KeyboardShortcut[]
  } = {
    navigation: [
      { key: 'h', modifiers: ['alt'], description: '홈 (대시보드)', category: 'navigation', action: () => navigate('/') },
      { key: 'c', modifiers: ['alt'], description: 'AI 진료 어시스턴트', category: 'navigation', action: () => navigate('/consultation') },
      { key: 's', modifiers: ['alt'], description: '통합 검색', category: 'navigation', action: () => navigate('/unified-search') },
      { key: 't', modifiers: ['alt'], description: '치험례 검색', category: 'navigation', action: () => navigate('/case-search') },
      { key: 'f', modifiers: ['alt'], description: '처방 목록', category: 'navigation', action: () => navigate('/formulas') },
      { key: 'b', modifiers: ['alt'], description: '약재 DB', category: 'navigation', action: () => navigate('/herbs') },
    ],
    search: [
      { key: 'k', modifiers: ['ctrl'], description: '빠른 검색 (Command Palette)', category: 'search', action: () => setShowCommandPalette(true) },
      { key: '/', modifiers: [], description: '검색창 포커스', category: 'search', action: () => {} },
    ],
    action: [
      { key: '?', modifiers: [], description: '단축키 도움말', category: 'action', action: () => setShowHelp(true) },
      { key: 'Escape', modifiers: [], description: '모달/팝업 닫기', category: 'action', action: () => {} },
    ],
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const isInputField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      const isContentEditable = target.isContentEditable

      // Escape는 항상 처리
      if (event.key === 'Escape') {
        setShowHelp(false)
        setShowCommandPalette(false)
        return
      }

      // Ctrl/Cmd+K: Command Palette
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        setShowCommandPalette(prev => !prev)
        return
      }

      // 입력 필드에서는 네비게이션 단축키 무시
      if (isInputField || isContentEditable) {
        return
      }

      // ?: 도움말
      if (event.key === '?' || (event.shiftKey && event.key === '/')) {
        event.preventDefault()
        setShowHelp(true)
        return
      }

      // /: 검색 포커스
      if (event.key === '/') {
        event.preventDefault()
        const searchInput = document.querySelector('input[type="text"][placeholder*="검색"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        } else {
          navigate('/unified-search')
        }
        return
      }

      // Alt+키 네비게이션
      if (event.altKey) {
        switch (event.key.toLowerCase()) {
          case 'h':
            event.preventDefault()
            navigate('/')
            break
          case 'c':
            event.preventDefault()
            navigate('/consultation')
            break
          case 's':
            event.preventDefault()
            navigate('/unified-search')
            break
          case 't':
            event.preventDefault()
            navigate('/case-search')
            break
          case 'f':
            event.preventDefault()
            navigate('/formulas')
            break
          case 'b':
            event.preventDefault()
            navigate('/herbs')
            break
          case 'i':
            event.preventDefault()
            navigate('/interactions')
            break
          case 'p':
            event.preventDefault()
            navigate('/patients')
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  return (
    <>
      {children}
      <KeyboardShortcutsHelp
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        groupedShortcuts={groupedShortcuts}
      />
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />
    </>
  )
}
