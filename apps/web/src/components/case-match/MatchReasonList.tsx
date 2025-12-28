import { cn } from '@/lib/utils'
import type { MatchReason, MatchReasonType } from '@/types/case-search'

interface MatchReasonListProps {
  reasons: MatchReason[]
  maxItems?: number
  compact?: boolean
  className?: string
}

// Icons for each reason type
const reasonIcons: Record<MatchReasonType, string> = {
  chief_complaint: '!',
  symptom: '!',
  constitution: '!',
  age: '!',
  gender: '!',
  diagnosis: '!',
  formula: '!',
}

// Labels for each reason type
const reasonLabels: Record<MatchReasonType, string> = {
  chief_complaint: '주소증',
  symptom: '증상',
  constitution: '체질',
  age: '연령',
  gender: '성별',
  diagnosis: '진단',
  formula: '처방',
}

// Colors for each reason type
const reasonColors: Record<MatchReasonType, { bg: string; text: string; border: string }> = {
  chief_complaint: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  symptom: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  constitution: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  age: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  gender: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  diagnosis: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  formula: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
}

export function MatchReasonList({
  reasons,
  maxItems,
  compact = false,
  className,
}: MatchReasonListProps) {
  const displayReasons = maxItems ? reasons.slice(0, maxItems) : reasons
  const hiddenCount = maxItems && reasons.length > maxItems ? reasons.length - maxItems : 0

  return (
    <div className={cn('space-y-2', compact ? 'space-y-1' : '', className)}>
      {displayReasons.map((reason, idx) => (
        <MatchReasonItem key={idx} reason={reason} compact={compact} />
      ))}
      {hiddenCount > 0 && (
        <div className="text-xs text-gray-400">
          +{hiddenCount}개 추가 근거
        </div>
      )}
    </div>
  )
}

interface MatchReasonItemProps {
  reason: MatchReason
  compact?: boolean
  className?: string
}

export function MatchReasonItem({ reason, compact = false, className }: MatchReasonItemProps) {
  const colors = reasonColors[reason.type]
  const label = reasonLabels[reason.type]

  return (
    <div
      className={cn(
        'flex items-start gap-2',
        compact ? 'text-xs' : 'text-sm',
        className
      )}
    >
      <span
        className={cn(
          'inline-flex items-center justify-center rounded px-1.5 py-0.5 font-medium whitespace-nowrap',
          colors.bg,
          colors.text,
          compact ? 'text-xs' : 'text-xs'
        )}
      >
        {label}
      </span>
      <span className="text-gray-700 flex-1">{reason.description}</span>
      <span className={cn('font-medium whitespace-nowrap', colors.text)}>
        +{reason.contribution}
      </span>
    </div>
  )
}

// Compact badges for inline display
interface MatchReasonBadgesProps {
  reasons: MatchReason[]
  maxItems?: number
  className?: string
}

export function MatchReasonBadges({ reasons, maxItems = 3, className }: MatchReasonBadgesProps) {
  const displayReasons = reasons.slice(0, maxItems)
  const hiddenCount = reasons.length > maxItems ? reasons.length - maxItems : 0

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {displayReasons.map((reason, idx) => {
        const colors = reasonColors[reason.type]
        const label = reasonLabels[reason.type]

        return (
          <span
            key={idx}
            className={cn(
              'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
              colors.bg,
              colors.text
            )}
            title={reason.description}
          >
            {label} +{reason.contribution}
          </span>
        )
      })}
      {hiddenCount > 0 && (
        <span className="text-xs text-gray-400 flex items-center">
          +{hiddenCount}
        </span>
      )}
    </div>
  )
}

// Summary showing total contribution by type
interface MatchReasonSummaryProps {
  reasons: MatchReason[]
  className?: string
}

export function MatchReasonSummary({ reasons, className }: MatchReasonSummaryProps) {
  // Group reasons by type and sum contributions
  const grouped = reasons.reduce<Record<MatchReasonType, number>>((acc, reason) => {
    acc[reason.type] = (acc[reason.type] || 0) + reason.contribution
    return acc
  }, {} as Record<MatchReasonType, number>)

  const sortedTypes = (Object.entries(grouped) as [MatchReasonType, number][])
    .sort((a, b) => b[1] - a[1])

  return (
    <div className={cn('space-y-1', className)}>
      <div className="text-xs font-medium text-gray-500 mb-2">매칭 요소별 기여도</div>
      {sortedTypes.map(([type, contribution]) => {
        const colors = reasonColors[type]
        const label = reasonLabels[type]

        return (
          <div key={type} className="flex items-center gap-2 text-sm">
            <span className={cn('w-2 h-2 rounded-full', colors.bg.replace('50', '500'))} />
            <span className="text-gray-600 flex-1">{label}</span>
            <span className={cn('font-medium', colors.text)}>+{contribution}</span>
          </div>
        )
      })}
    </div>
  )
}

export default MatchReasonList
