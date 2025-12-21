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
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const navigation = [
  { name: '대시보드', href: '/', icon: LayoutDashboard, description: '전체 현황' },
  { name: 'AI 진료', href: '/consultation', icon: Stethoscope, description: '처방 추천', badge: 'AI' },
  { name: '치험례', href: '/cases', icon: BookOpen, description: '6,000건 검색' },
  { name: '상호작용', href: '/interactions', icon: AlertTriangle, description: '안전성 검사' },
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
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              메인 메뉴
            </p>
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30'
                      : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                  )}
                >
                  <div className={cn(
                    'p-2 rounded-lg transition-colors',
                    isActive ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-gray-200/80'
                  )}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {item.name}
                      {item.badge && (
                        <span className={cn(
                          'px-1.5 py-0.5 text-[10px] font-bold rounded-md',
                          isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      'text-[11px] mt-0.5',
                      isActive ? 'text-white/70' : 'text-gray-400'
                    )}>
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight className={cn(
                    'h-4 w-4 opacity-0 -translate-x-2 transition-all',
                    isActive ? 'opacity-70' : 'group-hover:opacity-50 group-hover:translate-x-0'
                  )} />
                </Link>
              )
            })}
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
