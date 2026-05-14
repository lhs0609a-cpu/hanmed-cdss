import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { performLogout } from '@/services/auth-api'
import { useSidebarStore } from '@/stores/sidebarStore'
import { MedicalDisclaimer } from '@/components/common/MedicalDisclaimer'
import { ThemeToggle } from '@/components/common'
import { SessionWarningDialog } from '@/components/common/SessionWarningDialog'
import { OnboardingFlow, useOnboardingStatus } from '@/components/onboarding'
import { useState, useEffect, useMemo } from 'react'
import { useSessionManager } from '@/hooks/useSessionManager'
import {
  LayoutDashboard,
  Stethoscope,
  BookOpen,
  AlertTriangle,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  FlaskConical,
  Leaf,
  Calculator,
  User,
  MapPin,
  Activity,
  Users,
  FileText,
  Scale,
  ScrollText,
  Brain,
  Shield,
  Mic,
  ArrowLeftRight,
  MessageSquare,
  Library,
  Database,
  GitCompare,
  HeartPulse,
  DollarSign,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  Command,
  BarChart3,
  Receipt,
  Target,
  Share2,
  Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// 메뉴 아이템 — 단순화 시점엔 description/badge 제거(시각 노이즈 감소).
interface MenuItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

// 메뉴 정의 — Toss 식 단순화.
// Primary 6 개만 항상 노출, 나머지는 "더 보기"로 접어둔다.
// 모든 기능 도달은 ⌘K 검색 + 더보기로 가능 — 사이드바는 매일 쓰는 흐름만.
const PRIMARY_MENU: MenuItem[] = [
  { name: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { name: '새 진료', href: '/dashboard/consultation', icon: Stethoscope },
  { name: '환자', href: '/dashboard/patients', icon: Users },
  { name: '치험례', href: '/dashboard/cases', icon: BookOpen },
  { name: '청구', href: '/dashboard/insurance', icon: FileText },
  { name: '상호작용', href: '/dashboard/interactions', icon: AlertTriangle },
]

const MORE_MENU: MenuItem[] = [
  // 진료 보조
  { name: '통합 검색', href: '/dashboard/unified-search', icon: Search },
  { name: 'AI 변증', href: '/dashboard/pattern-diagnosis', icon: Brain },
  { name: 'AI 치험례', href: '/dashboard/case-search', icon: BookOpen },
  { name: '음성 차트', href: '/dashboard/voice-chart', icon: Mic },
  { name: '처방 비교', href: '/dashboard/formula-compare', icon: ArrowLeftRight },
  { name: 'Red Flag', href: '/dashboard/red-flag', icon: AlertTriangle },
  { name: '체질 진단', href: '/dashboard/constitution', icon: User },
  { name: '증상→처방', href: '/dashboard/symptom-search', icon: Search },
  { name: '경혈 검색', href: '/dashboard/acupoints', icon: MapPin },
  { name: '맥진 기록', href: '/dashboard/pulse', icon: Activity },
  { name: '용량 계산', href: '/dashboard/dosage', icon: Scale },
  // 자료
  { name: '처방 검색', href: '/dashboard/formulas', icon: FlaskConical },
  { name: '약재 검색', href: '/dashboard/herbs', icon: Leaf },
  { name: '본초 DB', href: '/dashboard/herbs-db', icon: Database },
  { name: '합방 계산기', href: '/dashboard/combo', icon: Calculator },
  { name: '고전 검색', href: '/dashboard/classics', icon: ScrollText },
  { name: '병양도표', href: '/dashboard/byeongyang', icon: Library },
  { name: '학파 비교', href: '/dashboard/school-compare', icon: GitCompare },
  { name: '통합의학', href: '/dashboard/integrated-diagnosis', icon: HeartPulse },
  // 청구·관리
  { name: '삭감 예측', href: '/dashboard/claim-check', icon: Shield },
  { name: '수가/상병', href: '/dashboard/insurance-fee', icon: DollarSign },
  { name: '문서 템플릿', href: '/dashboard/documents', icon: FileText },
  // 커뮤니티 / Pro
  { name: '커뮤니티', href: '/dashboard/community', icon: MessageSquare },
  { name: '진료 성과', href: '/dashboard/analytics', icon: BarChart3 },
  { name: '스마트 청구', href: '/dashboard/smart-insurance', icon: Receipt },
  { name: '환자 CRM', href: '/dashboard/crm', icon: Target },
  { name: '케이스 공유', href: '/dashboard/case-network', icon: Share2 },
  { name: '약재 재고', href: '/dashboard/inventory', icon: Package },
]

export default function DashboardLayout() {
  const location = useLocation()
  const { user, isGuest } = useAuthStore()
  const handleLogout = () => { void performLogout() }
  const {
    isMinimized,
    toggleMinimized,
    collapsedSections,
    toggleSection,
    addRecentPage,
  } = useSidebarStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { shouldShowOnboarding } = useOnboardingStatus()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const {
    isSessionWarningVisible,
    warningSecondsLeft,
    isRefreshing,
    dismissWarning,
    handleSessionExpired,
  } = useSessionManager()

  // "더 보기" 펼침 상태 — collapsedSections 의 토큰을 재사용해 영속화한다.
  // 기본값은 접힌 상태(=토큰 없음)이고, 한 번 펼치면 'more:open' 이 들어가서 펼침 유지.
  const isMoreOpen = collapsedSections.includes('more:open')

  // 모든 메뉴 항목 (페이지 방문 기록 / 검색용)
  const allMenuItems = useMemo(
    () => [...PRIMARY_MENU, ...MORE_MENU],
    [],
  )

  // 온보딩 표시 여부 결정 (게스트 모드가 아닌 신규 사용자)
  useEffect(() => {
    if (shouldShowOnboarding && !isGuest) {
      setShowOnboarding(true)
    }
  }, [shouldShowOnboarding, isGuest])

  // 페이지 방문 기록
  useEffect(() => {
    const currentItem = allMenuItems.find((item) => item.href === location.pathname)
    if (currentItem) {
      addRecentPage(currentItem.href, currentItem.name)
    }
  }, [location.pathname, addRecentPage, allMenuItems])

  // 검색 결과
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null
    const q = searchQuery.toLowerCase()
    return allMenuItems.filter((item) => item.name.toLowerCase().includes(q))
  }, [searchQuery, allMenuItems])

  // 즐겨찾기 / 최근 방문 섹션은 단순화 시점에는 노출하지 않는다.
  // 검색(⌘K)으로 빠른 도달 가능하고, 또 다른 시각 노이즈가 됨.

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* 온보딩 플로우 (신규 사용자) */}
      {showOnboarding && (
        <OnboardingFlow
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      {/* 세션 만료 경고 다이얼로그 */}
      <SessionWarningDialog
        isVisible={isSessionWarningVisible}
        secondsLeft={warningSecondsLeft}
        isRefreshing={isRefreshing}
        onExtend={dismissWarning}
        onLogout={handleSessionExpired}
      />

      {/* Skip to content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-teal-500 focus:text-white focus:rounded-lg"
      >
        본문으로 건너뛰기
      </a>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 glass border-b border-white/20">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-white/50 transition-colors"
            aria-label="메뉴 열기"
            aria-expanded={sidebarOpen}
          >
            <Menu className="h-5 w-5 text-gray-700" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[17px] tracking-tight text-neutral-900">온고지신</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 transform transition-all duration-300 ease-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          isMinimized ? 'lg:w-20' : 'lg:w-72'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Toggle */}
          <div className={cn('flex items-center justify-between px-4 py-4', isMinimized && 'lg:px-2 lg:justify-center')}>
            <div className={cn('flex items-center gap-2', isMinimized && 'lg:hidden')}>
              <h1 className="font-extrabold text-[18px] tracking-tight text-neutral-900">온고지신</h1>
            </div>

            {/* Mini logo for minimized state — 첫 글자 한 자만 */}
            <div className={cn('hidden', isMinimized && 'lg:flex')}>
              <div className="w-9 h-9 rounded-md bg-neutral-900 flex items-center justify-center text-white text-[14px] font-extrabold">
                온
              </div>
            </div>

            {/* Close button (mobile) */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
              aria-label="메뉴 닫기"
            >
              <X className="h-5 w-5 text-gray-500" aria-hidden="true" />
            </button>

            {/* Toggle minimize (desktop) */}
            <button
              onClick={toggleMinimized}
              className={cn(
                'hidden lg:flex p-2 rounded-xl hover:bg-gray-100 transition-colors',
                isMinimized && 'lg:hidden'
              )}
              aria-label={isMinimized ? '사이드바 확장' : '사이드바 축소'}
            >
              <PanelLeftClose className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {/* Expand button (minimized state) */}
          {isMinimized && (
            <button
              onClick={toggleMinimized}
              className="hidden lg:flex mx-auto p-2 rounded-xl hover:bg-gray-100 transition-colors mb-2"
              aria-label="사이드바 확장"
            >
              <PanelLeft className="h-4 w-4 text-gray-500" />
            </button>
          )}

          {/* Command Palette Hint */}
          {!isMinimized && (
            <div className="px-4 mb-2">
              <button
                onClick={() => {
                  const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })
                  document.dispatchEvent(event)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 bg-gray-100/80 hover:bg-gray-200/80 rounded-xl text-sm text-gray-500 transition-colors"
              >
                <Command className="h-4 w-4" />
                <span className="flex-1 text-left">빠른 검색...</span>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-white rounded border border-gray-200">
                  ⌘K
                </kbd>
              </button>
            </div>
          )}

          {/* Search (full mode only) */}
          {!isMinimized && (
            <div className="px-4 mb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="메뉴 검색..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-100/80 border-0 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          {/* HanjaToggle/GlossaryButton 은 사이드바에서 제거. 설정 페이지에서 토글. */}

          {/* Navigation — Toss 식 단순 구조: Primary 6 + 더 보기 */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" aria-label="주 메뉴">
            {/* 검색 결과 (메뉴 검색 입력 시) */}
            {searchResults && (
              <div className="space-y-0.5 mb-2">
                {searchResults.length === 0 ? (
                  <p className="px-3 py-2 text-[12px] text-neutral-500">검색 결과가 없습니다</p>
                ) : (
                  searchResults.map((item) => (
                    <MenuItemComponent
                      key={`search-${item.href}`}
                      item={item}
                      isActive={location.pathname === item.href}
                      isMinimized={false}
                      onClick={() => setSidebarOpen(false)}
                    />
                  ))
                )}
              </div>
            )}

            {/* Primary — 항상 노출 */}
            {!searchResults && (
              <div className="space-y-0.5">
                {PRIMARY_MENU.map((item) => (
                  <MenuItemComponent
                    key={item.href}
                    item={item}
                    isActive={location.pathname === item.href}
                    isMinimized={isMinimized}
                    onClick={() => setSidebarOpen(false)}
                  />
                ))}
              </div>
            )}

            {/* 더 보기 — 한 번 펼치면 영속화 */}
            {!searchResults && !isMinimized && (
              <div className="mt-3 pt-3 border-t border-neutral-100">
                <button
                  onClick={() => toggleSection('more:open')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[13px] font-medium text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                  aria-expanded={isMoreOpen}
                >
                  <span>더 보기</span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-neutral-400 transition-transform',
                      isMoreOpen && 'rotate-180',
                    )}
                  />
                </button>
                {isMoreOpen && (
                  <div className="space-y-0.5 mt-1">
                    {MORE_MENU.map((item) => (
                      <MenuItemComponent
                        key={item.href}
                        item={item}
                        isActive={location.pathname === item.href}
                        isMinimized={false}
                        onClick={() => setSidebarOpen(false)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 미니마이즈 상태에서는 Primary 만 — 더보기는 확장 후 보임 */}
            {!searchResults && isMinimized && (
              <div className="space-y-0.5 mt-2">
                {MORE_MENU.map((item) => (
                  <MenuItemComponent
                    key={item.href}
                    item={item}
                    isActive={location.pathname === item.href}
                    isMinimized={true}
                    onClick={() => setSidebarOpen(false)}
                  />
                ))}
              </div>
            )}
          </nav>

          {/* Pro 업그레이드 — 사이드바에서 제거. 결제 흐름은 설정·기능 막힘 시점에 in-context 안내 */}

          {/* User section */}
          <div className={cn('border-t border-gray-200/50 p-3', isMinimized && 'lg:p-2')}>
            <Link
              to="/dashboard/profile"
              className={cn(
                'flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100/80 transition-colors group',
                isMinimized && 'lg:justify-center'
              )}
            >
              <div className="w-9 h-9 rounded-md bg-neutral-100 flex items-center justify-center">
                <span className="text-neutral-900 font-bold text-[13px]">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              {!isMinimized && (
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-neutral-900 truncate">
                    {user?.name}
                  </p>
                  <p className="text-[12px] text-neutral-500 truncate">{user?.email}</p>
                </div>
              )}
            </Link>

            {!isMinimized && (
              <div className="flex gap-2 mt-2">
                <Link
                  to="/dashboard/settings"
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  설정
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </button>
              </div>
            )}

            {isMinimized && (
              <div className="hidden lg:flex flex-col gap-1 mt-2">
                <Link
                  to="/dashboard/settings"
                  className="p-2 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="설정"
                >
                  <Settings className="h-4 w-4" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  title="로그아웃"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          role="presentation"
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <main
        id="main-content"
        className={cn(
          'pt-16 lg:pt-0 pb-20 lg:pb-0 min-h-screen transition-all duration-300',
          isMinimized ? 'lg:pl-20' : 'lg:pl-72'
        )}
      >
        {/* Guest Banner — Toss 톤 (그라데이션 제거) */}
        {isGuest && (
          <div className="bg-neutral-900 text-white px-4 py-3">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm sm:text-base">
                <span className="font-medium">
                  체험 모드로 이용 중입니다. 모든 기능을 이용하려면 회원가입하세요!
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <button className="px-4 py-1.5 text-sm bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                    로그인
                  </button>
                </Link>
                <Link to="/register">
                  <button className="px-4 py-1.5 text-sm bg-white text-orange-600 font-medium rounded-lg hover:bg-gray-100 transition-colors">
                    무료 회원가입
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* 필수 의료 면책 동의 — 최초 1회만 모달. 동의 후엔 푸터에만 작게 표기. */}
        <MedicalDisclaimer variant="mandatory" />

        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>

        {/* 의료기기/면책 고정 푸터 — 모든 로그인 페이지에 노출 */}
        <footer
          data-print-hide
          className="mt-8 border-t border-neutral-200 bg-white/80 px-4 py-3 text-[11px] leading-relaxed text-neutral-500 lg:px-8"
        >
          <p className="max-w-7xl mx-auto">
            본 서비스는 임상 보조 도구이며, 의료기기 인증 신청 진행 중입니다.
            최종 진단 · 처방은 한의사의 판단에 따릅니다.
            <span className="ml-2 text-neutral-400">
              © {new Date().getFullYear()} 온고지신
            </span>
          </p>
        </footer>
      </main>

      {/* KeyboardHint·FloatingConsultButton 제거 — 대시보드 CTA 와 ⌘K 가 같은 역할,
          상시 떠 있는 보조 UI 가 시각 노이즈를 만듦 */}

      {/* Mobile Bottom Navigation */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 safe-area-bottom"
        aria-label="모바일 하단 메뉴"
      >
        <div className="flex items-center justify-around px-2 py-1">
          {[
            { name: '홈', href: '/dashboard', icon: LayoutDashboard },
            { name: '검색', href: '/dashboard/unified-search', icon: Search },
            { name: 'AI 진료', href: '/dashboard/consultation', icon: Stethoscope, primary: true },
            { name: '치험례', href: '/dashboard/cases', icon: BookOpen },
            { name: '더보기', href: '#', icon: Menu, isMenu: true },
          ].map((item) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon

            if (item.isMenu) {
              return (
                <button
                  key={item.name}
                  onClick={() => setSidebarOpen(true)}
                  className="flex flex-col items-center justify-center px-3 py-2 min-w-[60px] rounded-xl transition-colors text-gray-500 hover:text-gray-900"
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] mt-0.5 font-medium">{item.name}</span>
                </button>
              )
            }

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex flex-col items-center justify-center px-3 py-2 min-w-[60px] rounded-md transition-colors',
                  isActive ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900',
                )}
              >
                {item.primary ? (
                  <div
                    className={cn(
                      'w-12 h-12 -mt-6 rounded-md flex items-center justify-center transition-colors',
                      isActive ? 'bg-primary' : 'bg-neutral-900',
                    )}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                ) : (
                  <>
                    <Icon className="h-5 w-5" />
                    <span className="text-[11px] mt-0.5 font-medium">{item.name}</span>
                  </>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

// 메뉴 아이템 — 단정한 한 줄. 뱃지/디스크립션/즐겨찾기 별표 모두 제거.
function MenuItemComponent({
  item,
  isActive,
  isMinimized,
  onClick,
}: {
  item: MenuItem
  isActive: boolean
  isMinimized: boolean
  isFavorite?: boolean
  onToggleFavorite?: () => void
  onClick?: () => void
}) {
  return (
    <div className="group relative">
      <Link
        to={item.href}
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 px-3 h-10 rounded-md text-[14px] font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          isMinimized && 'lg:justify-center lg:px-2',
          isActive
            ? 'bg-neutral-900 text-white'
            : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
        )}
        title={isMinimized ? item.name : undefined}
        aria-current={isActive ? 'page' : undefined}
        aria-label={item.name}
      >
        <item.icon
          className={cn(
            'h-4 w-4 flex-shrink-0',
            isActive ? 'text-white' : 'text-neutral-400',
          )}
          aria-hidden="true"
        />
        {!isMinimized && <span className="flex-1 truncate">{item.name}</span>}
      </Link>

      {/* 미니마이즈 상태에서 호버 시 이름 툴팁 */}
      {isMinimized && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50">
          <div className="bg-neutral-900 text-white text-[12px] font-medium rounded-md py-1.5 px-2.5 shadow-soft whitespace-nowrap">
            {item.name}
          </div>
        </div>
      )}
    </div>
  )
}
