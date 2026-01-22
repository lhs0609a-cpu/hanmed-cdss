import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useSidebarStore } from '@/stores/sidebarStore'
import { HanjaToggle } from '@/components/hanja'
import { MedicalDisclaimer } from '@/components/common/MedicalDisclaimer'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Stethoscope,
  BookOpen,
  AlertTriangle,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  Sparkles,
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
  Star,
  Clock,
  PanelLeftClose,
  PanelLeft,
  Command,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// 메뉴 아이템 타입
interface MenuItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description?: string
  badge?: string
}

interface MenuSection {
  id: string
  title: string
  icon?: React.ReactNode
  color?: string
  items: MenuItem[]
}

// 메뉴 섹션 정의
const menuSections: MenuSection[] = [
  {
    id: 'main',
    title: '메인 메뉴',
    items: [
      { name: '대시보드', href: '/dashboard', icon: LayoutDashboard, description: '전체 현황' },
      { name: '통합 검색', href: '/dashboard/unified-search', icon: Search, description: '처방/증상/병증', badge: 'NEW' },
      { name: 'AI 진료', href: '/dashboard/consultation', icon: Stethoscope, description: '처방 추천', badge: 'AI' },
      { name: '환자 관리', href: '/dashboard/patients', icon: Users, description: 'EMR/차트' },
      { name: '치험례', href: '/dashboard/cases', icon: BookOpen, description: '6,000건 검색' },
      { name: '커뮤니티', href: '/dashboard/community', icon: MessageSquare, description: '전문가 토론' },
    ],
  },
  {
    id: 'core',
    title: '핵심 기능',
    icon: <Sparkles className="h-3 w-3" />,
    color: 'text-red-500',
    items: [
      { name: 'AI 변증', href: '/dashboard/pattern-diagnosis', icon: Brain, description: '변증 분석', badge: 'HOT' },
      { name: 'AI 치험례', href: '/dashboard/case-search', icon: BookOpen, description: '유사사례 검색', badge: 'NEW' },
      { name: '삭감 예측', href: '/dashboard/claim-check', icon: Shield, description: '보험 청구', badge: 'NEW' },
      { name: '처방 비교', href: '/dashboard/formula-compare', icon: ArrowLeftRight, description: '유사 처방' },
      { name: 'Red Flag', href: '/dashboard/red-flag', icon: AlertTriangle, description: '위험 신호' },
      { name: '음성 차트', href: '/dashboard/voice-chart', icon: Mic, description: 'STT→SOAP', badge: 'NEW' },
    ],
  },
  {
    id: 'clinical',
    title: '진료 도구',
    items: [
      { name: '체질 진단', href: '/dashboard/constitution', icon: User, description: '사상체질' },
      { name: '증상→처방', href: '/dashboard/symptom-search', icon: Search, description: '역검색' },
      { name: '경혈 검색', href: '/dashboard/acupoints', icon: MapPin, description: '경락/혈위' },
      { name: '맥진 기록', href: '/dashboard/pulse', icon: Activity, description: '육부위 맥진' },
      { name: '용량 계산', href: '/dashboard/dosage', icon: Scale, description: '소아/임산부' },
    ],
  },
  {
    id: 'reference',
    title: '참고 자료',
    items: [
      { name: '처방 검색', href: '/dashboard/formulas', icon: FlaskConical, description: '방제 정보' },
      { name: '약재 검색', href: '/dashboard/herbs', icon: Leaf, description: '성분 정보' },
      { name: '본초 DB', href: '/dashboard/herbs-db', icon: Database, description: '공공데이터', badge: 'NEW' },
      { name: '합방 계산기', href: '/dashboard/combo', icon: Calculator, description: '처방 조합' },
      { name: '상호작용', href: '/dashboard/interactions', icon: AlertTriangle, description: '안전성 검사' },
      { name: '고전 검색', href: '/dashboard/classics', icon: ScrollText, description: '원문/해석' },
    ],
  },
  {
    id: 'theory',
    title: '의학 이론',
    icon: <Library className="h-3 w-3" />,
    color: 'text-amber-600',
    items: [
      { name: '병양도표', href: '/dashboard/byeongyang', icon: Library, description: '병증별 변증', badge: 'NEW' },
      { name: '학파 비교', href: '/dashboard/school-compare', icon: GitCompare, description: '고방/후세방', badge: 'NEW' },
      { name: '통합의학', href: '/dashboard/integrated-diagnosis', icon: HeartPulse, description: 'ICD-10 연계', badge: 'NEW' },
    ],
  },
  {
    id: 'admin',
    title: '관리',
    items: [
      { name: '보험 코드', href: '/dashboard/insurance', icon: FileText, description: '청구 코드' },
      { name: '수가/상병 검색', href: '/dashboard/insurance-fee', icon: DollarSign, description: '심평원 API', badge: 'NEW' },
      { name: '문서 템플릿', href: '/dashboard/documents', icon: FileText, description: '동의서/안내문' },
    ],
  },
]

// 모든 메뉴 아이템을 플랫하게
const allMenuItems = menuSections.flatMap((section) =>
  section.items.map((item) => ({ ...item, sectionId: section.id }))
)

export default function DashboardLayout() {
  const location = useLocation()
  const { user, logout, isGuest } = useAuthStore()
  const {
    isMinimized,
    toggleMinimized,
    collapsedSections,
    toggleSection,
    favorites,
    toggleFavorite,
    recentPages,
    addRecentPage,
  } = useSidebarStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // 페이지 방문 기록
  useEffect(() => {
    const currentItem = allMenuItems.find((item) => item.href === location.pathname)
    if (currentItem) {
      addRecentPage(currentItem.href, currentItem.name)
    }
  }, [location.pathname, addRecentPage])

  // 즐겨찾기 아이템
  const favoriteItems = allMenuItems.filter((item) => favorites.includes(item.href))

  // 최근 방문 아이템 (최대 5개)
  const recentItems = recentPages
    .slice(0, 5)
    .map((recent) => allMenuItems.find((item) => item.href === recent.href))
    .filter(Boolean) as (MenuItem & { sectionId: string })[]

  // 검색 필터링
  const filteredSections = searchQuery
    ? menuSections
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) =>
              item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.description?.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((section) => section.items.length > 0)
    : menuSections

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
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
            <div className="w-8 h-8 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Sparkles className="h-4 w-4 text-white" aria-hidden="true" />
            </div>
            <span className="font-bold text-gray-900">온고지신</span>
          </div>
          <div className="flex items-center gap-1">
            <HanjaToggle compact />
            <button
              className="p-2 rounded-xl hover:bg-white/50 transition-colors relative"
              aria-label="알림"
            >
              <Bell className="h-5 w-5 text-gray-700" aria-hidden="true" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" aria-label="새 알림 있음" />
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 transform transition-all duration-300 ease-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          isMinimized ? 'lg:w-20' : 'lg:w-72'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Toggle */}
          <div className={cn('flex items-center justify-between px-4 py-4', isMinimized && 'lg:px-2 lg:justify-center')}>
            <div className={cn('flex items-center gap-3', isMinimized && 'lg:hidden')}>
              <div className="w-10 h-10 gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/30">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-gray-900">온고지신</h1>
                <p className="text-xs text-gray-500 font-medium">AI 한의학 CDSS</p>
              </div>
            </div>

            {/* Mini logo for minimized state */}
            <div className={cn('hidden', isMinimized && 'lg:flex')}>
              <div className="w-10 h-10 gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/30">
                <Sparkles className="h-5 w-5 text-white" />
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

          {/* Hanja Toggle (full mode only) */}
          {!isMinimized && (
            <div className="px-4 mb-2">
              <HanjaToggle />
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 space-y-2 overflow-y-auto" aria-label="주 메뉴">
            {/* Favorites Section */}
            {!searchQuery && favoriteItems.length > 0 && !isMinimized && (
              <div className="mb-3">
                <div className="flex items-center gap-2 px-3 mb-2">
                  <Star className="h-3 w-3 text-amber-500" />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    즐겨찾기
                  </span>
                </div>
                <div className="space-y-0.5">
                  {favoriteItems.map((item) => (
                    <MenuItemComponent
                      key={`fav-${item.href}`}
                      item={item}
                      isActive={location.pathname === item.href}
                      isMinimized={false}
                      isFavorite={true}
                      onToggleFavorite={() => toggleFavorite(item.href)}
                      onClick={() => setSidebarOpen(false)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Recent Section */}
            {!searchQuery && recentItems.length > 0 && !isMinimized && (
              <div className="mb-3">
                <div className="flex items-center gap-2 px-3 mb-2">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    최근 방문
                  </span>
                </div>
                <div className="space-y-0.5">
                  {recentItems.slice(0, 3).map((item) => (
                    <MenuItemComponent
                      key={`recent-${item.href}`}
                      item={item}
                      isActive={location.pathname === item.href}
                      isMinimized={false}
                      isFavorite={favorites.includes(item.href)}
                      onToggleFavorite={() => toggleFavorite(item.href)}
                      onClick={() => setSidebarOpen(false)}
                      isRecent
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Menu Sections */}
            {filteredSections.map((section) => {
              const isCollapsed = collapsedSections.includes(section.id)
              const sectionColor = section.id === 'core' ? 'purple' : section.id === 'theory' ? 'amber' : 'teal'

              return (
                <div key={section.id} className="mb-2">
                  {/* Section Header */}
                  <button
                    onClick={() => !isMinimized && toggleSection(section.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 text-left',
                      isMinimized && 'lg:justify-center'
                    )}
                  >
                    {!isMinimized && (
                      <>
                        {section.icon ? (
                          <span className={section.color}>{section.icon}</span>
                        ) : (
                          <ChevronDown
                            className={cn(
                              'h-3 w-3 text-gray-400 transition-transform',
                              isCollapsed && '-rotate-90'
                            )}
                          />
                        )}
                        <span className={cn(
                          'text-[10px] font-semibold uppercase tracking-wider',
                          section.color || 'text-gray-400'
                        )}>
                          {section.title}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Section Items */}
                  {(!isCollapsed || isMinimized) && (
                    <div className="space-y-0.5 mt-1">
                      {section.items.map((item) => (
                        <MenuItemComponent
                          key={item.href}
                          item={item}
                          isActive={location.pathname === item.href}
                          isMinimized={isMinimized}
                          isFavorite={favorites.includes(item.href)}
                          onToggleFavorite={() => toggleFavorite(item.href)}
                          onClick={() => setSidebarOpen(false)}
                          sectionColor={sectionColor}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Upgrade banner (full mode only) */}
          {!isMinimized && (user?.subscriptionTier === 'free' || user?.subscriptionTier === 'basic') && (
            <div className="mx-3 mb-3 p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200/50">
              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-amber-100 rounded-lg">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-amber-900">Pro 업그레이드</p>
                  <p className="text-[10px] text-amber-700 mt-0.5">무제한 AI 기능</p>
                </div>
              </div>
              <Link
                to="/subscription"
                className="block w-full mt-2 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium rounded-lg hover:shadow-lg hover:shadow-amber-500/30 transition-all text-center"
              >
                플랜 보기
              </Link>
            </div>
          )}

          {/* User section */}
          <div className={cn('border-t border-gray-200/50 p-3', isMinimized && 'lg:p-2')}>
            <Link
              to="/profile"
              className={cn(
                'flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100/80 transition-colors group',
                isMinimized && 'lg:justify-center'
              )}
            >
              <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center shadow-md shadow-teal-500/20">
                <span className="text-white font-semibold text-sm">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              {!isMinimized && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-teal-600 transition-colors">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              )}
            </Link>

            {!isMinimized && (
              <div className="flex gap-2 mt-2">
                <Link
                  to="/settings"
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  설정
                </Link>
                <button
                  onClick={logout}
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
                  to="/settings"
                  className="p-2 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="설정"
                >
                  <Settings className="h-4 w-4" />
                </Link>
                <button
                  onClick={logout}
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
        {/* Guest Banner */}
        {isGuest && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm sm:text-base">
                <Sparkles className="w-5 h-5" />
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

        {/* 의료 면책조항 배너 (하루 1회) */}
        <MedicalDisclaimer variant="banner" />

        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-gray-200/50 safe-area-bottom">
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
                  'flex flex-col items-center justify-center px-3 py-2 min-w-[60px] rounded-xl transition-all',
                  item.primary && !isActive
                    ? 'text-teal-600'
                    : isActive
                    ? 'text-teal-600'
                    : 'text-gray-500 hover:text-gray-900'
                )}
              >
                {item.primary ? (
                  <div className={cn(
                    'w-12 h-12 -mt-6 rounded-2xl flex items-center justify-center shadow-lg transition-all',
                    isActive
                      ? 'bg-gradient-to-br from-teal-500 to-emerald-500 shadow-teal-500/40'
                      : 'bg-gradient-to-br from-teal-400 to-emerald-400 shadow-teal-400/30'
                  )}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                ) : (
                  <>
                    <Icon className={cn('h-5 w-5', isActive && 'text-teal-600')} />
                    <span className={cn(
                      'text-[10px] mt-0.5 font-medium',
                      isActive && 'text-teal-600'
                    )}>{item.name}</span>
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

// 메뉴 아이템 컴포넌트
function MenuItemComponent({
  item,
  isActive,
  isMinimized,
  isFavorite,
  onToggleFavorite,
  onClick,
  sectionColor = 'teal',
  isRecent: _isRecent = false,
}: {
  item: MenuItem
  isActive: boolean
  isMinimized: boolean
  isFavorite: boolean
  onToggleFavorite: () => void
  onClick?: () => void
  sectionColor?: 'teal' | 'purple' | 'amber'
  isRecent?: boolean
}) {
  const gradients = {
    teal: 'from-teal-500 to-emerald-500',
    purple: 'from-purple-500 to-pink-500',
    amber: 'from-amber-500 to-orange-500',
  }

  const hoverBg = {
    teal: 'hover:bg-gray-100/80',
    purple: 'hover:bg-purple-50',
    amber: 'hover:bg-amber-50',
  }

  const iconColors = {
    teal: 'text-gray-400',
    purple: 'text-purple-400',
    amber: 'text-amber-500',
  }

  return (
    <div className="group relative">
      <Link
        to={item.href}
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
          isMinimized && 'lg:justify-center lg:px-2',
          isActive
            ? `bg-gradient-to-r ${gradients[sectionColor]} text-white shadow-lg shadow-${sectionColor}-500/30`
            : `text-gray-600 ${hoverBg[sectionColor]} hover:text-gray-900`
        )}
        title={isMinimized ? item.name : undefined}
      >
        <item.icon className={cn('h-4 w-4 flex-shrink-0', isActive ? '' : iconColors[sectionColor])} />
        {!isMinimized && (
          <>
            <span className="flex-1 truncate">{item.name}</span>
            {item.badge && (
              <span className={cn(
                'px-1.5 py-0.5 text-[10px] font-bold rounded-md',
                isActive
                  ? 'bg-white/20 text-white'
                  : item.badge === 'HOT'
                  ? 'bg-red-100 text-red-700'
                  : item.badge === 'AI'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-teal-100 text-teal-700'
              )}>
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>

      {/* Favorite toggle - show on hover (full mode only) */}
      {!isMinimized && (
        <button
          onClick={(e) => {
            e.preventDefault()
            onToggleFavorite()
          }}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-all',
            isFavorite
              ? 'text-amber-500 opacity-100'
              : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:text-amber-500'
          )}
          title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
        >
          <Star className={cn('h-3.5 w-3.5', isFavorite && 'fill-current')} />
        </button>
      )}
    </div>
  )
}
