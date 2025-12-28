import { cn } from '@/lib/utils'
import type { MatchScore } from '@/types/case-search'

interface ScoreBreakdownProps {
  score: MatchScore
  showLabels?: boolean
  compact?: boolean
  className?: string
}

interface ProgressBarProps {
  value: number
  label: string
  color: string
  showLabel?: boolean
  compact?: boolean
}

function ProgressBar({ value, label, color, showLabel = true, compact = false }: ProgressBarProps) {
  return (
    <div className={cn('space-y-1', compact ? 'space-y-0.5' : '')}>
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">{label}</span>
          <span className="font-medium text-gray-900">{Math.round(value)}%</span>
        </div>
      )}
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', compact ? 'h-1.5' : 'h-2')}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export function ScoreBreakdown({
  score,
  showLabels = true,
  compact = false,
  className,
}: ScoreBreakdownProps) {
  const breakdowns = [
    {
      key: 'vector',
      label: '의미 유사도',
      value: score.vectorSimilarity,
      color: 'bg-purple-500',
      weight: 40,
    },
    {
      key: 'keyword',
      label: '키워드 매칭',
      value: score.keywordMatch,
      color: 'bg-blue-500',
      weight: 30,
    },
    {
      key: 'metadata',
      label: '메타데이터',
      value: score.metadataMatch,
      color: 'bg-green-500',
      weight: 30,
    },
  ]

  return (
    <div className={cn('space-y-3', compact ? 'space-y-2' : '', className)}>
      {breakdowns.map((item) => (
        <div key={item.key}>
          <ProgressBar
            value={item.value}
            label={`${item.label} (${item.weight}%)`}
            color={item.color}
            showLabel={showLabels}
            compact={compact}
          />
        </div>
      ))}
    </div>
  )
}

// Compact horizontal version
interface ScoreBreakdownMiniProps {
  score: MatchScore
  className?: string
}

export function ScoreBreakdownMini({ score, className }: ScoreBreakdownMiniProps) {
  const items = [
    { label: '벡터', value: score.vectorSimilarity, color: 'bg-purple-500' },
    { label: '키워드', value: score.keywordMatch, color: 'bg-blue-500' },
    { label: '메타', value: score.metadataMatch, color: 'bg-green-500' },
  ]

  return (
    <div className={cn('flex gap-2 text-xs', className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1">
          <div className={cn('w-2 h-2 rounded-full', item.color)} />
          <span className="text-gray-500">{item.label}</span>
          <span className="font-medium">{Math.round(item.value)}</span>
        </div>
      ))}
    </div>
  )
}

// Detailed score card with weights explained
interface ScoreDetailsCardProps {
  score: MatchScore
  className?: string
}

export function ScoreDetailsCard({ score, className }: ScoreDetailsCardProps) {
  const items = [
    {
      label: '의미 유사도 (벡터)',
      description: 'AI가 증상 텍스트의 의미적 유사성을 분석',
      value: score.vectorSimilarity,
      weight: 40,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
    },
    {
      label: '키워드 매칭',
      description: '주소증, 증상, 진단, 처방명 일치 여부',
      value: score.keywordMatch,
      weight: 30,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      label: '메타데이터',
      description: '체질, 연령대, 성별 일치 여부',
      value: score.metadataMatch,
      weight: 30,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
    },
  ]

  return (
    <div className={cn('space-y-4', className)}>
      <div className="text-sm text-gray-600 mb-4">
        <span className="font-medium">종합 점수: </span>
        <span className="font-bold text-lg">{Math.round(score.total)}점</span>
        <span className="text-gray-400 ml-2">/ 100</span>
      </div>

      {items.map((item) => (
        <div key={item.label} className={cn('p-3 rounded-lg', item.bgColor)}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className={cn('font-medium', item.textColor)}>{item.label}</div>
              <div className="text-xs text-gray-500">{item.description}</div>
            </div>
            <div className="text-right">
              <div className={cn('font-bold', item.textColor)}>{Math.round(item.value)}%</div>
              <div className="text-xs text-gray-400">가중치 {item.weight}%</div>
            </div>
          </div>
          <div className="w-full bg-white/50 rounded-full h-2 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', item.color)}
              style={{ width: `${item.value}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1 text-right">
            기여도: +{((item.value / 100) * item.weight).toFixed(1)}점
          </div>
        </div>
      ))}
    </div>
  )
}

export default ScoreBreakdown
