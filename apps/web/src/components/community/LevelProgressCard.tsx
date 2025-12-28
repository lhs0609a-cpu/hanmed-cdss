import { cn } from '@/lib/utils'
import { LevelBadge } from './LevelBadge'
import {
  CommunityLevel,
  LevelRequirement,
  LEVEL_STYLES,
  calculateProgress,
  getNextLevelInfo,
} from '@/types/level'
import { TrendingUp, CheckCircle, ChevronRight, Sparkles } from 'lucide-react'

interface LevelProgressCardProps {
  currentLevel: LevelRequirement
  currentPoints: number
  currentAccepted: number
  className?: string
}

export function LevelProgressCard({
  currentLevel,
  currentPoints,
  currentAccepted,
  className,
}: LevelProgressCardProps) {
  const nextLevel = getNextLevelInfo(currentLevel.level)
  const { pointsProgress, acceptedProgress } = calculateProgress(
    currentPoints,
    currentAccepted,
    currentLevel.level
  )

  const isMaxLevel = !nextLevel

  return (
    <div className={cn('bg-white rounded-2xl border border-gray-100 shadow-sm', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">내 레벨</h3>
          <LevelBadge level={currentLevel.level} size="lg" variant="gradient" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {isMaxLevel ? (
          // 최고 레벨 달성
          <div className="text-center py-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
            <Sparkles className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <p className="text-xl font-bold text-amber-600">최고 레벨 달성!</p>
            <p className="text-sm text-amber-700 mt-2">
              대가의 경지에 오르셨습니다
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {currentLevel.perks.map((perk) => (
                <span
                  key={perk}
                  className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full"
                >
                  {perk}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Next Level Info */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl">
              <div>
                <p className="text-sm text-gray-600">다음 레벨</p>
                <p className="text-lg font-bold text-teal-700 flex items-center gap-2">
                  {nextLevel.name}
                  <ChevronRight className="h-5 w-5" />
                </p>
              </div>
              <LevelBadge level={nextLevel.level} size="md" variant="outline" />
            </div>

            {/* Progress Bars */}
            <div className="space-y-4">
              {/* Points Progress */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="flex items-center gap-2 text-gray-600">
                    <TrendingUp className="h-4 w-4 text-teal-500" />
                    포인트
                  </span>
                  <span className="font-medium text-gray-900">
                    {currentPoints.toLocaleString()} / {nextLevel.requiredPoints.toLocaleString()}
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(pointsProgress, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {(nextLevel.requiredPoints - currentPoints).toLocaleString()}P 남음
                </p>
              </div>

              {/* Accepted Answers Progress */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="flex items-center gap-2 text-gray-600">
                    <CheckCircle className="h-4 w-4 text-purple-500" />
                    채택된 답변
                  </span>
                  <span className="font-medium text-gray-900">
                    {currentAccepted} / {nextLevel.requiredAcceptedAnswers}
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(acceptedProgress, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {nextLevel.requiredAcceptedAnswers - currentAccepted}개 남음
                </p>
              </div>
            </div>

            {/* Next Level Perks */}
            <div>
              <p className="text-sm text-gray-600 mb-2">다음 레벨 혜택</p>
              <div className="flex flex-wrap gap-2">
                {nextLevel.perks.map((perk) => (
                  <span
                    key={perk}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full"
                  >
                    {perk}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * 컴팩트 레벨 진행바 (사이드바용)
 */
interface CompactLevelProgressProps {
  level: CommunityLevel
  currentPoints: number
  currentAccepted: number
  className?: string
}

export function CompactLevelProgress({
  level,
  currentPoints,
  currentAccepted,
  className,
}: CompactLevelProgressProps) {
  const nextLevel = getNextLevelInfo(level)
  const { overallProgress } = calculateProgress(currentPoints, currentAccepted, level)
  const style = LEVEL_STYLES[level]

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <LevelBadge level={level} size="sm" />
        {nextLevel && (
          <span className="text-xs text-gray-500">
            {Math.round(overallProgress)}%
          </span>
        )}
      </div>
      {nextLevel && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              `bg-gradient-to-r ${style.gradientFrom} ${style.gradientTo}`
            )}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      )}
    </div>
  )
}

export default LevelProgressCard
