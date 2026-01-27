import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Sparkles,
  X,
  TrendingUp,
  Zap,
  Calendar,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface UsageLimitModalProps {
  isOpen: boolean
  onClose: () => void
  currentUsage: number
  limit: number
  resetDate?: string
  currentPlan?: string
}

export function UsageLimitModal({
  isOpen,
  onClose,
  currentUsage,
  limit,
  resetDate,
  currentPlan = 'Free',
}: UsageLimitModalProps) {
  if (!isOpen) return null

  const usagePercent = Math.min((currentUsage / limit) * 100, 100)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="usage-limit-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h2 id="usage-limit-title" className="text-xl font-bold">
                  AI 쿼리 한도 도달
                </h2>
                <p className="text-amber-100 text-sm">이번 달 사용량을 모두 소진했습니다</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Usage Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">이번 달 사용량</span>
              <span className="font-bold text-gray-900">
                {currentUsage} / {limit}회
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  usagePercent >= 100
                    ? 'bg-gradient-to-r from-red-500 to-orange-500'
                    : usagePercent >= 80
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                    : 'bg-gradient-to-r from-teal-500 to-emerald-500'
                )}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            {resetDate && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Calendar className="h-3.5 w-3.5" />
                <span>다음 갱신일: {new Date(resetDate).toLocaleDateString('ko-KR')}</span>
              </div>
            )}
          </div>

          {/* Current Plan Info */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">현재 플랜</p>
                <p className="font-bold text-gray-900">{currentPlan}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">포함 쿼리</p>
                <p className="font-bold text-gray-900">{limit}회/월</p>
              </div>
            </div>
          </div>

          {/* Upgrade Benefits */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">업그레이드 시 혜택</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-lg border border-teal-200">
                <Zap className="h-5 w-5 text-teal-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-teal-900">Professional 플랜</p>
                  <p className="text-xs text-teal-700">AI 쿼리 300회/월 + 초과 시 건당 300원</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-purple-900">Clinic 플랜</p>
                  <p className="text-xs text-purple-700">AI 쿼리 무제한 + 전담 지원</p>
                </div>
              </div>
            </div>
          </div>

          {/* Value Proposition */}
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  AI 검색 1회 = 평균 3분 절약
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Professional 플랜 기준 월 300회 = 15시간 절약
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            나중에
          </button>
          <Link
            to="/dashboard/subscription"
            className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:shadow-teal-500/30 transition-all font-medium flex items-center justify-center gap-2"
            onClick={onClose}
          >
            플랜 업그레이드
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default UsageLimitModal
