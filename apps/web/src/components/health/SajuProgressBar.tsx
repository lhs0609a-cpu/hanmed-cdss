import { motion } from 'framer-motion'

interface SajuProgressBarProps {
  completedSections: number
  totalSections: number
  status: string
}

const STATUS_TEXT: Record<string, string> = {
  pending_payment: '결제 대기 중...',
  generating: 'AI가 리포트를 작성하고 있어요',
  completed: '리포트가 완성되었어요!',
  failed: '리포트 생성에 실패했어요',
}

export default function SajuProgressBar({
  completedSections,
  totalSections,
  status,
}: SajuProgressBarProps) {
  const progress =
    totalSections > 0
      ? Math.round((completedSections / totalSections) * 100)
      : 0

  const isGenerating = status === 'generating'
  const isCompleted = status === 'completed'

  return (
    <div className="bg-white rounded-2xl p-6 border border-orange-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">
          {STATUS_TEXT[status] || '준비 중...'}
        </span>
        <span className="text-sm font-bold text-orange-500">{progress}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            isCompleted
              ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
              : 'bg-gradient-to-r from-orange-400 to-rose-400'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Section progress */}
      {isGenerating && (
        <div className="mt-3 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          <span className="text-xs text-gray-500">
            {completedSections} / {totalSections} 섹션 완료
          </span>
        </div>
      )}

      {isCompleted && (
        <p className="mt-3 text-xs text-emerald-600 font-medium">
          모든 섹션이 완성되었습니다
        </p>
      )}
    </div>
  )
}
