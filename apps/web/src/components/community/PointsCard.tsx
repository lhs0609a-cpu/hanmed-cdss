import { cn } from '@/lib/utils'
import {
  TrendingUp,
  MessageSquare,
  FileText,
  CheckCircle,
  BookOpen,
  Heart,
} from 'lucide-react'

interface StatsData {
  contributionPoints: number
  postCount: number
  commentCount: number
  acceptedAnswerCount: number
  caseCount?: number
  likeReceived?: number
}

interface PointsCardProps {
  stats: StatsData
  compact?: boolean
  className?: string
}

export function PointsCard({ stats, compact = false, className }: PointsCardProps) {
  const statItems = [
    {
      label: '기여 포인트',
      value: stats.contributionPoints.toLocaleString(),
      icon: TrendingUp,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
    {
      label: '작성 글',
      value: stats.postCount,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: '작성 댓글',
      value: stats.commentCount,
      icon: MessageSquare,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: '채택된 답변',
      value: stats.acceptedAnswerCount,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ]

  // 선택적 통계
  if (stats.caseCount !== undefined) {
    statItems.push({
      label: '등록 치험례',
      value: stats.caseCount,
      icon: BookOpen,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    })
  }

  if (stats.likeReceived !== undefined) {
    statItems.push({
      label: '받은 추천',
      value: stats.likeReceived,
      icon: Heart,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
    })
  }

  if (compact) {
    return (
      <div className={cn('flex flex-wrap gap-3', className)}>
        {statItems.map((stat) => (
          <div
            key={stat.label}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg',
              stat.bgColor
            )}
          >
            <stat.icon className={cn('h-4 w-4', stat.color)} />
            <span className={cn('font-semibold', stat.color)}>{stat.value}</span>
            <span className="text-xs text-gray-500">{stat.label}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('bg-white rounded-2xl border border-gray-100 shadow-sm', className)}>
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">활동 통계</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {statItems.map((stat) => (
            <div
              key={stat.label}
              className={cn(
                'text-center p-4 rounded-xl transition-all hover:scale-105',
                stat.bgColor
              )}
            >
              <stat.icon className={cn('h-6 w-6 mx-auto mb-2', stat.color)} />
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 포인트 획득 이력 표시 컴포넌트
 */
interface PointHistoryItem {
  id: string
  action: string
  points: number
  description: string
  createdAt: string
}

interface PointsHistoryProps {
  history: PointHistoryItem[]
  className?: string
}

export function PointsHistory({ history, className }: PointsHistoryProps) {
  if (history.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-500', className)}>
        포인트 획득 이력이 없습니다
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {history.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                item.points > 0
                  ? 'bg-green-100 text-green-600'
                  : 'bg-red-100 text-red-600'
              )}
            >
              {item.points > 0 ? '+' : ''}
              {item.points}
            </div>
            <div>
              <p className="font-medium text-gray-900">{item.action}</p>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
          </div>
          <span className="text-sm text-gray-400">
            {new Date(item.createdAt).toLocaleDateString('ko-KR')}
          </span>
        </div>
      ))}
    </div>
  )
}

export default PointsCard
