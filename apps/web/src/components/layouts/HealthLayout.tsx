import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  Home,
  ClipboardCheck,
  MessageCircle,
  Sparkles,
  Star,
  Menu,
  X,
} from 'lucide-react'

const navLinks = [
  { label: '건강체크', href: '/health#checks' },
  { label: '체질TMI', href: '/health/tmi' },
  { label: '건강사주', href: '/health/saju' },
  { label: '커뮤니티', href: '/health/community' },
  { label: 'QnA', href: '/health/qna' },
]

const mobileTabItems = [
  { label: '홈', href: '/health', icon: Home },
  { label: '체크', href: '/health#checks', icon: ClipboardCheck },
  { label: 'TMI', href: '/health/tmi', icon: Sparkles },
  { label: '사주', href: '/health/saju', icon: Star },
  { label: '커뮤니티', href: '/health/community', icon: MessageCircle },
]

export default function HealthLayout() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (href: string) => {
    if (href.includes('#')) return location.pathname === '/health'
    if (href === '/health/tmi') return location.pathname.startsWith('/health/tmi')
    if (href === '/health/saju') return location.pathname.startsWith('/health/saju')
    return location.pathname === href
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFF8F0' }}>
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/health" className="flex items-center gap-2">
            <span className="text-2xl">🫀</span>
            <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-rose-400 bg-clip-text text-transparent">
              몸이알려줌
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'text-orange-600'
                    : 'text-gray-600 hover:text-orange-500'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden md:inline-flex text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors"
            >
              로그인
            </Link>
            <Link
              to="/register"
              className="hidden md:inline-flex px-4 py-2 bg-gradient-to-r from-orange-500 to-rose-400 text-white text-sm font-medium rounded-full hover:shadow-lg hover:shadow-orange-200 transition-all"
            >
              시작하기
            </Link>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-orange-500"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-orange-100 bg-white px-4 py-3 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-gray-600 hover:text-orange-500"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-orange-50 flex gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-full"
              >
                로그인
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-rose-400 rounded-full"
              >
                시작하기
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Footer - Desktop */}
      <footer className="hidden md:block border-t border-orange-100 bg-white/60">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🫀</span>
                <span className="font-bold text-gray-800">몸이알려줌</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                당신의 몸이 보내는 신호를 한의학으로 읽어드립니다
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-3 text-sm">서비스</h4>
              <div className="space-y-2">
                <Link to="/health#checks" className="block text-sm text-gray-500 hover:text-orange-500">건강체크</Link>
                <Link to="/health/tmi" className="block text-sm text-gray-500 hover:text-orange-500">체질TMI</Link>
                <Link to="/health/saju" className="block text-sm text-gray-500 hover:text-orange-500">건강사주</Link>
                <Link to="/health/community" className="block text-sm text-gray-500 hover:text-orange-500">커뮤니티</Link>
                <Link to="/health/qna" className="block text-sm text-gray-500 hover:text-orange-500">한의사 QnA</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-3 text-sm">한의사이신가요?</h4>
              <div className="space-y-2">
                <Link to="/" className="block text-sm text-gray-500 hover:text-orange-500">온고지신 CDSS</Link>
                <Link to="/register" className="block text-sm text-gray-500 hover:text-orange-500">한의사 등록</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-3 text-sm">법적 고지</h4>
              <div className="space-y-2">
                <Link to="/terms" className="block text-sm text-gray-500 hover:text-orange-500">이용약관</Link>
                <Link to="/privacy" className="block text-sm text-gray-500 hover:text-orange-500">개인정보처리방침</Link>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-orange-100">
            <p className="text-xs text-gray-400 leading-relaxed">
              본 서비스의 건강체크 결과는 의학적 진단이 아니며, 참고용 건강 정보입니다.
              정확한 진단과 치료는 반드시 한의사 또는 의료 전문가와 상담하시기 바랍니다.
            </p>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              셀럽 프로필 이미지는{' '}
              <a href="https://commons.wikimedia.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-orange-400">
                Wikimedia Commons
              </a>
              에서 제공되며, CC BY-SA 또는 퍼블릭 도메인 라이선스에 따라 사용됩니다.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              &copy; {new Date().getFullYear()} 온고지신 AI &middot; 몸이알려줌. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Tab */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-orange-100 safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {mobileTabItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                  active ? 'text-orange-500' : 'text-gray-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
