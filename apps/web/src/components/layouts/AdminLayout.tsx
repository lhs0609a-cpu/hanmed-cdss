import { Outlet, Link, useLocation, Navigate } from 'react-router-dom'
import { useAuthStore, isAdminRole } from '@/stores/authStore'
import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronLeft,
  FileText,
  Activity,
  Building,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MenuItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  requiredRole?: 'super_admin' | 'admin' | 'support' | 'content_manager'
}

const menuItems: MenuItem[] = [
  { name: '대시보드', href: '/admin', icon: LayoutDashboard },
  { name: '사용자 관리', href: '/admin/users', icon: Users },
  { name: '구독 관리', href: '/admin/subscriptions', icon: CreditCard },
  { name: '한의원 관리', href: '/admin/clinics', icon: Building },
  { name: '감사 로그', href: '/admin/audit-logs', icon: FileText, requiredRole: 'super_admin' },
]

export default function AdminLayout() {
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // 관리자가 아니면 접근 불가
  if (!user || !isAdminRole(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  // 역할 확인 함수
  const hasAccess = (requiredRole?: string) => {
    if (!requiredRole) return true
    const hierarchy = {
      super_admin: 100,
      admin: 80,
      content_manager: 60,
      support: 40,
      user: 0,
    }
    return hierarchy[user.role || 'user'] >= hierarchy[requiredRole as keyof typeof hierarchy]
  }

  const accessibleMenuItems = menuItems.filter((item) => hasAccess(item.requiredRole))

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            <span className="font-bold text-gray-900">관리자</span>
          </div>
          <Link
            to="/dashboard"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </Link>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300 ease-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-4 py-5 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white">관리자 패널</h1>
                <p className="text-xs text-gray-400">온고지신 CDSS</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Back to Dashboard */}
          <div className="px-3 py-3 border-b border-gray-800">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              대시보드로 돌아가기
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {accessibleMenuItems.map((item) => {
              const isActive = location.pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-red-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-800 p-3">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.name?.charAt(0) || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate capitalize">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <Link
                to="/admin/settings"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Settings className="h-4 w-4" />
                설정
              </Link>
              <button
                onClick={logout}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
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
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="pt-16 lg:pt-0 lg:pl-64 min-h-screen">
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
