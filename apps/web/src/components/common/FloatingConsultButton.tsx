import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Stethoscope } from 'lucide-react'

export function FloatingConsultButton() {
  const navigate = useNavigate()
  const location = useLocation()

  // consultation 페이지에서는 숨김
  const isConsultationPage = location.pathname.includes('/consultation')

  // Ctrl+N / Cmd+N 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        navigate('/dashboard/consultation')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  if (isConsultationPage) return null

  return (
    <button
      onClick={() => navigate('/dashboard/consultation')}
      title="AI 진료 시작 (Ctrl+N)"
      className="fixed bottom-24 lg:bottom-6 right-6 z-30 group flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-200"
    >
      <Stethoscope className="h-5 w-5" />
      <span className="text-sm font-semibold">새 진료</span>
    </button>
  )
}
