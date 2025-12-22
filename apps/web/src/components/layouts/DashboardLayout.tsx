import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const mainNavigation = [
  { name: '대시보드', href: '/', icon: LayoutDashboard, description: '전체 현황' },
  { name: 'AI 진료', href: '/consultation', icon: Stethoscope, description: '처방 추천', badge: 'AI' },
  { name: '환자 관리', href: '/patients', icon: Users, description: 'EMR/차트' },
  { name: '치험례', href: '/cases', icon: BookOpen, description: '6,000건 검색' },
]

const coreFeatures = [
  { name: 'AI 변증', href: '/pattern-diagnosis', icon: Brain, description: '변증 분석', badge: 'HOT' },
  { name: '삭감 예측', href: '/claim-check', icon: Shield, description: '보험 청구', badge: 'NEW' },
  { name: '처방 비교', href: '/formula-compare', icon: ArrowLeftRight, description: '유사 처방' },
  { name: 'Red Flag', href: '/red-flag', icon: AlertTriangle, description: '위험 신호' },
  { name: '음성 차트', href: '/voice-chart', icon: Mic, description: 'STT→SOAP', badge: 'NEW' },
]

const clinicalTools: Array<{ name: string; href: string; icon: React.ComponentType<{ className?: string }>; description: string; badge?: string }> = [
  { name: '체질 진단', href: '/constitution', icon: User, description: '사상체질' },
  { name: '증상→처방', href: '/symptom-search', icon: Search, description: '역검색' },
  { name: '경혈 검색', href: '/acupoints', icon: MapPin, description: '경락/혈위' },
  { name: '맥진 기록', href: '/pulse', icon: Activity, description: '육부위 맥진' },
  { name: '용량 계산', href: '/dosage', icon: Scale, description: '소아/임산부' },
]

const referenceTools = [
  { name: '처방 검색', href: '/formulas', icon: FlaskConical, description: '방제 정보' },
  { name: '약재 검색', href: '/herbs', icon: Leaf, description: '성분 정보' },
  { name: '합방 계산기', href: '/combo', icon: Calculator, description: '처방 조합' },
  { name: '상호작용', href: '/interactions', icon: AlertTriangle, description: '안전성 검사' },
  { name: '고전 검색', href: '/classics', icon: ScrollText, description: '원문/해석' },
]

const adminTools = [
  { name: '보험 코드', href: '/insurance', icon: FileText, description: '청구 코드' },
  { name: '문서 템플릿', href: '/documents', icon: FileText, description: '동의서/안내문' },
]

export default function DashboardLayout() {
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 glass border-b border-white/20">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-white/50 transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">온고지신</span>
          </div>
          <button className="p-2 rounded-xl hover:bg-white/50 transition-colors relative">
            <Bell className="h-5 w-5 text-gray-700" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-white/80 backdrop-blur-2xl border-r border-gray-200/50 transform transition-all duration-300 ease-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/30">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-xl text-gray-900">온고지신</h1>
                <p className="text-xs text-gray-500 font-medium">AI 한의학 CDSS</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 mb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="빠른 검색..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100/80 border-0 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-white rounded border border-gray-200">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
            {/* Main Navigation */}
            <div>
              <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                메인 메뉴
              </p>
              <div className="space-y-1">
                {mainNavigation.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30'
                          : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                      )}
                    >
                      <item.icon className={cn('h-4 w-4', isActive ? '' : 'text-gray-400')} />
                      <span className="flex-1">{item.name}</span>
                      {item.badge && (
                        <span className={cn(
                          'px-1.5 py-0.5 text-[10px] font-bold rounded-md',
                          isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Core Features - 핵심 기능 */}
            <div>
              <p className="px-3 mb-2 text-[10px] font-semibold text-red-500 uppercase tracking-wider">
                🔥 핵심 기능
              </p>
              <div className="space-y-1">
                {coreFeatures.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                          : 'text-gray-600 hover:bg-purple-50 hover:text-purple-900'
                      )}
                    >
                      <item.icon className={cn('h-4 w-4', isActive ? '' : 'text-purple-400')} />
                      <span className="flex-1">{item.name}</span>
                      {item.badge && (
                        <span className={cn(
                          'px-1.5 py-0.5 text-[10px] font-bold rounded-md',
                          isActive ? 'bg-white/20 text-white' : item.badge === 'HOT' ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Clinical Tools */}
            <div>
              <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                진료 도구
              </p>
              <div className="space-y-1">
                {clinicalTools.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30'
                          : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                      )}
                    >
                      <item.icon className={cn('h-4 w-4', isActive ? '' : 'text-gray-400')} />
                      <span className="flex-1">{item.name}</span>
                      {item.badge && (
                        <span className={cn(
                          'px-1.5 py-0.5 text-[10px] font-bold rounded-md',
                          isActive ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-700'
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Reference Tools */}
            <div>
              <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                참고 자료
              </p>
              <div className="space-y-1">
                {referenceTools.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30'
                          : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                      )}
                    >
                      <item.icon className={cn('h-4 w-4', isActive ? '' : 'text-gray-400')} />
                      <span className="flex-1">{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Admin Tools */}
            <div>
              <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                관리
              </p>
              <div className="space-y-1">
                {adminTools.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30'
                          : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                      )}
                    >
                      <item.icon className={cn('h-4 w-4', isActive ? '' : 'text-gray-400')} />
                      <span className="flex-1">{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </nav>

          {/* Upgrade banner */}
          {user?.subscriptionTier === 'starter' && (
            <div className="mx-4 mb-4 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/50">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-xl">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900">Pro로 업그레이드</p>
                  <p className="text-xs text-amber-700 mt-0.5">무제한 AI 추천 사용</p>
                </div>
              </div>
              <button className="w-full mt-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-amber-500/30 transition-all">
                플랜 보기
              </button>
            </div>
          )}

          {/* User section */}
          <div className="border-t border-gray-200/50 p-4">
            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100/80 transition-colors cursor-pointer">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-md shadow-teal-500/20">
                <span className="text-white font-semibold text-sm">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <Link
                to="/settings"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Settings className="h-4 w-4" />
                설정
              </Link>
              <button
                onClick={logout}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </button>
            </div>
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
      <main className="lg:pl-72 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
