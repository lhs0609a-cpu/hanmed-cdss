import { cn } from '@/lib/utils'
import type { MatchGrade, MatchScore } from '@/types/case-search'
import { MATCH_GRADE_COLORS, MATCH_GRADE_LABELS } from '@/types/case-search'

interface ConfidenceBadgeProps {
  score: MatchScore
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  showScore?: boolean
  className?: string
}

const sizeClasses = {
  sm: {
    badge: 'text-xs px-2 py-0.5',
    score: 'text-sm font-bold',
    container: 'gap-1',
  },
  md: {
    badge: 'text-sm px-2.5 py-1',
    score: 'text-lg font-bold',
    container: 'gap-1.5',
  },
  lg: {
    badge: 'text-base px-3 py-1.5',
    score: 'text-2xl font-bold',
    container: 'gap-2',
  },
}

export function ConfidenceBadge({
  score,
  size = 'md',
  showLabel = true,
  showScore = true,
  className,
}: ConfidenceBadgeProps) {
  const colors = MATCH_GRADE_COLORS[score.grade]
  const label = MATCH_GRADE_LABELS[score.grade]
  const sizeClass = sizeClasses[size]

  return (
    <div className={cn('inline-flex items-center', sizeClass.container, className)}>
      {showScore && (
        <span className={cn(sizeClass.score, colors.text)}>
          {Math.round(score.total)}%
        </span>
      )}
      <span
        className={cn(
          'inline-flex items-center rounded-full border font-semibold',
          colors.bg,
          colors.text,
          colors.border,
          sizeClass.badge
        )}
      >
        {score.grade}
        {showLabel && (
          <span className="ml-1 opacity-80 font-normal">
            {label}
          </span>
        )}
      </span>
    </div>
  )
}

// Compact version for list items
interface GradeBadgeProps {
  grade: MatchGrade
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function GradeBadge({ grade, size = 'sm', className }: GradeBadgeProps) {
  const colors = MATCH_GRADE_COLORS[grade]
  const sizeClass = sizeClasses[size]

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full border font-bold min-w-[1.5rem]',
        colors.bg,
        colors.text,
        colors.border,
        sizeClass.badge,
        className
      )}
    >
      {grade}
    </span>
  )
}

// Score circle for visual representation
interface ScoreCircleProps {
  score: number
  grade: MatchGrade
  size?: number
  className?: string
}

export function ScoreCircle({ score, grade, size = 60, className }: ScoreCircleProps) {
  const colors = MATCH_GRADE_COLORS[grade]
  const circumference = 2 * Math.PI * 45
  const progress = (score / 100) * circumference

  // Map tailwind colors to actual colors for SVG
  const strokeColors: Record<MatchGrade, string> = {
    S: '#9333ea', // purple-600
    A: '#2563eb', // blue-600
    B: '#16a34a', // green-600
    C: '#ca8a04', // yellow-600
    D: '#6b7280', // gray-500
  }

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={strokeColors[grade]}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold', colors.text)} style={{ fontSize: size * 0.25 }}>
          {Math.round(score)}%
        </span>
        <span className={cn('font-semibold', colors.text)} style={{ fontSize: size * 0.18 }}>
          {grade}
        </span>
      </div>
    </div>
  )
}

export default ConfidenceBadge
