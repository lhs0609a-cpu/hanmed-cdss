import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
  Clock,
  Star,
  Plus,
  Brain,
  Mic,
  Calculator,
  ArrowUpRight,
  Sparkles,
  History,
  Zap,
  FlaskConical,
  MapPin,
  Activity,
  MessageSquare,
  Settings,
  Hash,
} from 'lucide-react'
import { formatShortcut, type KeyboardShortcut } from '@/hooks/useKeyboardShortcuts'

// 최근 검색/방문 저장 스토어
interface RecentItem {
  id: string
  label: string
  type: 'page' | 'formula' | 'herb' | 'case' | 'patient'
  href: string
  timestamp: number
}

interface RecentStore {
  recentItems: RecentItem[]
  addRecentItem: (item: Omit<RecentItem, 'timestamp'>) => void
  clearRecentItems: () => void
}

const useRecentStore = create<RecentStore>()(
  persist(
    (set) => ({
      recentItems: [],
      addRecentItem: (item) =>
        set((state) => {
          const filtered = state.recentItems.filter((i) => i.id !== item.id)
          return {
            recentItems: [
              { ...item, timestamp: Date.now() },
              ...filtered,
            ].slice(0, 10),
          }
        }),
      clearRecentItems: () => set({ recentItems: [] }),
    }),
    { name: 'recent-items-storage' }
  )
)

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-scale-in">
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
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <span className="text-sm text-gray-700">{shortcut.description}</span>
      <kbd className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono text-gray-600 shadow-sm">
        {formatShortcut(shortcut)}
      </kbd>
    </div>
  )
}

// Command Palette - 대폭 개선된 버전
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
  category: 'quick-action' | 'navigation' | 'search' | 'recent'
  keywords?: string[]
  shortcut?: string
}

// 하이라이트 헬퍼 함수
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text
  const regex = new RegExp(`(${query})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-amber-200 text-amber-900 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeCategory, setActiveCategory] = useState<'all' | 'pages' | 'actions'>('all')
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const { recentItems, addRecentItem } = useRecentStore()

  // 빠른 액션
  const quickActions: CommandItem[] = useMemo(() => [
    {
      id: 'new-consultation',
      label: '새 진료 시작',
      description: 'AI 처방 추천 받기',
      icon: <Plus className="h-4 w-4" />,
      action: () => {
        navigate('/dashboard/consultation')
        addRecentItem({ id: 'consultation', label: 'AI 진료', type: 'page', href: '/dashboard/consultation' })
      },
      category: 'quick-action',
      keywords: ['진료', 'consultation', 'new', '새'],
      shortcut: 'Alt+C',
    },
    {
      id: 'new-patient',
      label: '새 환자 등록',
      description: '환자 정보 입력',
      icon: <Users className="h-4 w-4" />,
      action: () => {
        navigate('/dashboard/patients?new=true')
        addRecentItem({ id: 'patients', label: '환자 관리', type: 'page', href: '/dashboard/patients' })
      },
      category: 'quick-action',
      keywords: ['환자', 'patient', 'new', '등록'],
    },
    {
      id: 'quick-search',
      label: '처방 빠른 검색',
      description: '처방/약재 통합 검색',
      icon: <Search className="h-4 w-4" />,
      action: () => {
        navigate('/dashboard/unified-search')
        addRecentItem({ id: 'unified-search', label: '통합 검색', type: 'page', href: '/dashboard/unified-search' })
      },
      category: 'quick-action',
      keywords: ['검색', 'search', '통합'],
      shortcut: 'Alt+S',
    },
  ], [navigate, addRecentItem])

  // 네비게이션 명령
  const navigationCommands: CommandItem[] = useMemo(() => [
    { id: 'home', label: '대시보드', description: '홈으로 이동', icon: <Home className="h-4 w-4" />, action: () => navigate('/dashboard'), category: 'navigation', keywords: ['home', '홈', '대시보드'], shortcut: 'Alt+H' },
    { id: 'consultation', label: 'AI 진료 어시스턴트', description: 'AI 처방 추천', icon: <Stethoscope className="h-4 w-4" />, action: () => navigate('/dashboard/consultation'), category: 'navigation', keywords: ['ai', '진료', '처방', '추천'] },
    { id: 'pattern-diagnosis', label: 'AI 변증 분석', description: '팔강/장부변증', icon: <Brain className="h-4 w-4" />, action: () => navigate('/dashboard/pattern-diagnosis'), category: 'navigation', keywords: ['변증', '팔강', '장부'] },
    { id: 'case-search', label: 'AI 치험례 검색', description: '유사사례 찾기', icon: <Sparkles className="h-4 w-4" />, action: () => navigate('/dashboard/case-search'), category: 'navigation', keywords: ['치험례', 'case', '사례'] },
    { id: 'unified-search', label: '통합 검색', description: '처방/증상/병증', icon: <Search className="h-4 w-4" />, action: () => navigate('/dashboard/unified-search'), category: 'navigation', keywords: ['검색', 'search'] },
    { id: 'cases', label: '치험례 목록', description: '6,000건 브라우징', icon: <BookOpen className="h-4 w-4" />, action: () => navigate('/dashboard/cases'), category: 'navigation', keywords: ['치험례', 'cases'] },
    { id: 'formulas', label: '처방 검색', description: '방제 정보', icon: <FlaskConical className="h-4 w-4" />, action: () => navigate('/dashboard/formulas'), category: 'navigation', keywords: ['처방', 'formula', '방제'] },
    { id: 'herbs', label: '약재 검색', description: '성분 정보', icon: <Leaf className="h-4 w-4" />, action: () => navigate('/dashboard/herbs'), category: 'navigation', keywords: ['약재', 'herb', '본초'] },
    { id: 'interactions', label: '상호작용 검사', description: '약물 안전성', icon: <Shield className="h-4 w-4" />, action: () => navigate('/dashboard/interactions'), category: 'navigation', keywords: ['상호작용', 'interaction', '안전'] },
    { id: 'patients', label: '환자 관리', description: 'EMR/차트', icon: <Users className="h-4 w-4" />, action: () => navigate('/dashboard/patients'), category: 'navigation', keywords: ['환자', 'patient'] },
    { id: 'claim-check', label: '삭감 예측', description: '보험 청구', icon: <FileText className="h-4 w-4" />, action: () => navigate('/dashboard/claim-check'), category: 'navigation', keywords: ['삭감', '보험', 'claim'] },
    { id: 'voice-chart', label: '음성 차트', description: 'STT→SOAP', icon: <Mic className="h-4 w-4" />, action: () => navigate('/dashboard/voice-chart'), category: 'navigation', keywords: ['음성', 'voice', 'stt'] },
    { id: 'constitution', label: '체질 진단', description: '사상체질', icon: <Users className="h-4 w-4" />, action: () => navigate('/dashboard/constitution'), category: 'navigation', keywords: ['체질', '사상'] },
    { id: 'acupoints', label: '경혈 검색', description: '경락/혈위', icon: <MapPin className="h-4 w-4" />, action: () => navigate('/dashboard/acupoints'), category: 'navigation', keywords: ['경혈', '혈위', '경락'] },
    { id: 'pulse', label: '맥진 기록', description: '육부위 맥진', icon: <Activity className="h-4 w-4" />, action: () => navigate('/dashboard/pulse'), category: 'navigation', keywords: ['맥진', 'pulse'] },
    { id: 'dosage', label: '용량 계산기', description: '소아/임산부', icon: <Calculator className="h-4 w-4" />, action: () => navigate('/dashboard/dosage'), category: 'navigation', keywords: ['용량', 'dosage', '계산'] },
    { id: 'byeongyang', label: '병양도표', description: '병증별 변증', icon: <BookOpen className="h-4 w-4" />, action: () => navigate('/dashboard/byeongyang'), category: 'navigation', keywords: ['병양', '도표'] },
    { id: 'community', label: '커뮤니티', description: '전문가 토론', icon: <MessageSquare className="h-4 w-4" />, action: () => navigate('/dashboard/community'), category: 'navigation', keywords: ['커뮤니티', 'community'] },
    { id: 'settings', label: '설정', description: '계정 설정', icon: <Settings className="h-4 w-4" />, action: () => navigate('/dashboard/settings'), category: 'navigation', keywords: ['설정', 'settings'] },
  ], [navigate])

  // 최근 항목을 CommandItem으로 변환
  const recentCommands: CommandItem[] = useMemo(() =>
    recentItems.slice(0, 5).map((item) => ({
      id: `recent-${item.id}`,
      label: item.label,
      description: '최근 방문',
      icon: <Clock className="h-4 w-4" />,
      action: () => {
        navigate(item.href)
        addRecentItem(item)
      },
      category: 'recent' as const,
      keywords: [item.label],
    })),
    [recentItems, navigate, addRecentItem]
  )

  // 모든 명령 합치기
  const allCommands = useMemo(() => {
    if (activeCategory === 'pages') {
      return navigationCommands
    } else if (activeCategory === 'actions') {
      return quickActions
    }
    return [...quickActions, ...navigationCommands]
  }, [activeCategory, quickActions, navigationCommands])

  // 필터링된 명령
  const filteredCommands = useMemo(() => {
    if (!query) {
      // 쿼리가 없으면 최근 항목 + 빠른 액션 + 네비게이션 순
      if (activeCategory === 'all') {
        return [...recentCommands.slice(0, 3), ...quickActions, ...navigationCommands.slice(0, 6)]
      }
      return allCommands
    }

    const lowerQuery = query.toLowerCase()
    return allCommands.filter((cmd) => {
      const matchLabel = cmd.label.toLowerCase().includes(lowerQuery)
      const matchDesc = cmd.description?.toLowerCase().includes(lowerQuery)
      const matchKeywords = cmd.keywords?.some((k) => k.toLowerCase().includes(lowerQuery))
      return matchLabel || matchDesc || matchKeywords
    })
  }, [query, allCommands, recentCommands, quickActions, navigationCommands, activeCategory])

  // 스크롤 처리
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setActiveCategory('all')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, activeCategory])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
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
      case 'Tab':
        e.preventDefault()
        // 카테고리 순환
        setActiveCategory((prev) => {
          if (prev === 'all') return 'pages'
          if (prev === 'pages') return 'actions'
          return 'all'
        })
        break
    }
  }, [filteredCommands, selectedIndex, onClose])

  const executeCommand = useCallback((cmd: CommandItem) => {
    cmd.action()
    onClose()
  }, [onClose])

  if (!isOpen) return null

  // 그룹별로 명령 분류
  const groupedCommands = {
    recent: filteredCommands.filter((c) => c.category === 'recent'),
    quickAction: filteredCommands.filter((c) => c.category === 'quick-action'),
    navigation: filteredCommands.filter((c) => c.category === 'navigation'),
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-scale-in border border-gray-200">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <div className="p-1.5 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-lg">
            <Command className="h-4 w-4 text-white" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="검색 또는 명령 입력..."
            className="flex-1 text-base outline-none placeholder:text-gray-400 bg-transparent"
          />
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] text-gray-500 font-medium">
              ESC
            </kbd>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 bg-gray-50">
          {[
            { key: 'all', label: '전체' },
            { key: 'pages', label: '페이지' },
            { key: 'actions', label: '액션' },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key as typeof activeCategory)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeCategory === cat.key
                  ? 'bg-white text-teal-700 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-gray-400">Tab으로 전환</span>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Search className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">"{query}"에 대한 결과가 없습니다</p>
              <p className="text-sm text-gray-400 mt-1">다른 키워드로 검색해보세요</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Recent Items */}
              {groupedCommands.recent.length > 0 && !query && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <History className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">최근 방문</span>
                  </div>
                  <div className="space-y-0.5">
                    {groupedCommands.recent.map((cmd, idx) => (
                      <CommandButton
                        key={cmd.id}
                        cmd={cmd}
                        isSelected={filteredCommands.indexOf(cmd) === selectedIndex}
                        onClick={() => executeCommand(cmd)}
                        query={query}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              {groupedCommands.quickAction.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">빠른 액션</span>
                  </div>
                  <div className="space-y-0.5">
                    {groupedCommands.quickAction.map((cmd) => (
                      <CommandButton
                        key={cmd.id}
                        cmd={cmd}
                        isSelected={filteredCommands.indexOf(cmd) === selectedIndex}
                        onClick={() => executeCommand(cmd)}
                        query={query}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation */}
              {groupedCommands.navigation.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <Hash className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">페이지 이동</span>
                  </div>
                  <div className="space-y-0.5">
                    {groupedCommands.navigation.map((cmd) => (
                      <CommandButton
                        key={cmd.id}
                        cmd={cmd}
                        isSelected={filteredCommands.indexOf(cmd) === selectedIndex}
                        onClick={() => executeCommand(cmd)}
                        query={query}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px]">↑↓</kbd>
              <span>이동</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px]">Enter</kbd>
              <span>선택</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px]">Tab</kbd>
              <span>카테고리</span>
            </span>
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            <Command className="h-3 w-3" />
            <span>+</span>
            <span>K</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// 명령 버튼 컴포넌트
function CommandButton({
  cmd,
  isSelected,
  onClick,
  query,
}: {
  cmd: CommandItem
  isSelected: boolean
  onClick: () => void
  query: string
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
        isSelected
          ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-200'
          : 'hover:bg-gray-50 text-gray-700'
      }`}
    >
      <span
        className={`p-2 rounded-lg transition-colors ${
          isSelected ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-500'
        }`}
      >
        {cmd.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{highlightMatch(cmd.label, query)}</div>
        {cmd.description && (
          <div className="text-xs text-gray-500 truncate">
            {highlightMatch(cmd.description, query)}
          </div>
        )}
      </div>
      {cmd.shortcut ? (
        <kbd className="hidden sm:inline-flex px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] text-gray-500">
          {cmd.shortcut}
        </kbd>
      ) : (
        <ArrowUpRight
          className={`h-4 w-4 ${isSelected ? 'text-teal-500' : 'text-gray-300'}`}
        />
      )}
    </button>
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
      { key: 'h', modifiers: ['alt'], description: '홈 (대시보드)', category: 'navigation', action: () => navigate('/dashboard') },
      { key: 'c', modifiers: ['alt'], description: 'AI 진료 어시스턴트', category: 'navigation', action: () => navigate('/dashboard/consultation') },
      { key: 's', modifiers: ['alt'], description: '통합 검색', category: 'navigation', action: () => navigate('/dashboard/unified-search') },
      { key: 't', modifiers: ['alt'], description: '치험례 검색', category: 'navigation', action: () => navigate('/dashboard/case-search') },
      { key: 'f', modifiers: ['alt'], description: '처방 목록', category: 'navigation', action: () => navigate('/dashboard/formulas') },
      { key: 'b', modifiers: ['alt'], description: '약재 DB', category: 'navigation', action: () => navigate('/dashboard/herbs') },
    ],
    search: [
      { key: 'k', modifiers: ['ctrl'], description: '커맨드 팔레트 열기', category: 'search', action: () => setShowCommandPalette(true) },
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
        setShowCommandPalette((prev) => !prev)
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
        setShowCommandPalette(true)
        return
      }

      // Alt+키 네비게이션
      if (event.altKey) {
        switch (event.key.toLowerCase()) {
          case 'h':
            event.preventDefault()
            navigate('/dashboard')
            break
          case 'c':
            event.preventDefault()
            navigate('/dashboard/consultation')
            break
          case 's':
            event.preventDefault()
            navigate('/dashboard/unified-search')
            break
          case 't':
            event.preventDefault()
            navigate('/dashboard/case-search')
            break
          case 'f':
            event.preventDefault()
            navigate('/dashboard/formulas')
            break
          case 'b':
            event.preventDefault()
            navigate('/dashboard/herbs')
            break
          case 'i':
            event.preventDefault()
            navigate('/dashboard/interactions')
            break
          case 'p':
            event.preventDefault()
            navigate('/dashboard/patients')
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
