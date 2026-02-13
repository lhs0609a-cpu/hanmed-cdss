import { TrendingUp, Clock, Target } from 'lucide-react'
import type { TreatmentStatsData } from '@/types/clinical-evidence'
import { EvidenceTabSkeleton } from '../EvidenceTabSkeleton'

interface TreatmentStatsTabProps {
  data?: TreatmentStatsData
  isLoading: boolean
}

const outcomeLabels = [
  { key: 'cured', label: '완치', color: 'bg-emerald-500' },
  { key: 'significantlyImproved', label: '현저호전', color: 'bg-teal-400' },
  { key: 'improved', label: '호전', color: 'bg-blue-400' },
  { key: 'noChange', label: '불변', color: 'bg-gray-400' },
  { key: 'worsened', label: '악화', color: 'bg-red-400' },
] as const

export function TreatmentStatsTab({ data, isLoading }: TreatmentStatsTabProps) {
  if (isLoading) return <EvidenceTabSkeleton />
  if (!data) return <p className="text-sm text-gray-500 p-4">데이터를 불러올 수 없습니다.</p>

  const dist = data.outcomeDistribution
  const total = dist.cured + dist.significantlyImproved + dist.improved + dist.noChange + dist.worsened

  return (
    <div className="space-y-4 p-4">
      {/* 성공률 대형 숫자 */}
      <div className="text-center">
        <div className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
          {data.overallSuccessRate}%
        </div>
        <p className="text-xs text-gray-500 mt-1">
          전체 성공률 (완치 + 호전) · {data.totalCases}건 기반
        </p>
      </div>

      {/* 치료 결과 분포 바 */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 mb-2">치료 결과 분포</h4>
        <div className="flex h-4 rounded-full overflow-hidden">
          {outcomeLabels.map(({ key, color }) => {
            const value = dist[key]
            const pct = total > 0 ? (value / total) * 100 : 0
            if (pct === 0) return null
            return (
              <div
                key={key}
                className={`${color} transition-all duration-700`}
                style={{ width: `${pct}%` }}
                title={`${key}: ${value}건 (${pct.toFixed(1)}%)`}
              />
            )
          })}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {outcomeLabels.map(({ key, label, color }) => {
            const value = dist[key]
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
            return (
              <div key={key} className="flex items-center gap-1 text-[10px] text-gray-600">
                <span className={`w-2 h-2 rounded-full ${color}`} />
                {label} {value}건 ({pct}%)
              </div>
            )
          })}
        </div>
      </div>

      {/* 평균 치료 기간 + 예후 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50/60 rounded-lg p-3 text-center">
          <Clock className="h-4 w-4 text-blue-500 mx-auto mb-1" />
          <div className="text-lg font-bold text-blue-700">{data.avgTreatmentDays}일</div>
          <p className="text-[10px] text-gray-500">평균 치료 기간</p>
        </div>
        <div className="bg-emerald-50/60 rounded-lg p-3 text-center">
          <TrendingUp className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
          <div className="text-lg font-bold text-emerald-700">{data.prognosis.expectedImprovementWeeks}주</div>
          <p className="text-[10px] text-gray-500">호전 예상 시기</p>
        </div>
      </div>

      {/* 예후 예측 */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-3 border border-indigo-100">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-indigo-600" />
          <span className="text-xs font-semibold text-indigo-700">예후 예측</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-800">{data.prognosis.expectedOutcome}</span>
          <span className="text-xs font-semibold text-indigo-600">신뢰도 {data.prognosis.confidence}%</span>
        </div>
        <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full transition-all duration-700"
            style={{ width: `${data.prognosis.confidence}%` }}
          />
        </div>
      </div>
    </div>
  )
}
