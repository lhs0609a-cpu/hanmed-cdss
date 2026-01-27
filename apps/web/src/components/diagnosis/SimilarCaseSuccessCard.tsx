import { useState, useEffect } from 'react'
import {
  TrendingUp,
  Users,
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BarChart3,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/services/api'

interface SimilarCaseStats {
  totalSimilarCases: number
  successRate: number
  outcomeBreakdown: {
    cured: number
    improved: number
    noChange: number
    worsened: number
  }
  averageTreatmentDuration: string
  topSuccessfulFormulas: Array<{
    formulaName: string
    caseCount: number
    successRate: number
  }>
  confidenceLevel: 'high' | 'medium' | 'low'
  matchCriteria: string[]
}

interface SimilarCaseSuccessCardProps {
  chiefComplaint: string
  symptoms: Array<{ name: string; severity?: number }>
  diagnosis?: string
  bodyHeat?: string
  bodyStrength?: string
  className?: string
}

export function SimilarCaseSuccessCard({
  chiefComplaint,
  symptoms,
  diagnosis,
  bodyHeat,
  bodyStrength,
  className,
}: SimilarCaseSuccessCardProps) {
  const [stats, setStats] = useState<SimilarCaseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      if (!chiefComplaint || symptoms.length === 0) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await api.post('/cases/similar-success-stats', {
          chiefComplaint,
          symptoms: symptoms.map(s => ({ name: s.name, severity: s.severity })),
          diagnosis,
          bodyHeat,
          bodyStrength,
        })

        if (response.data.success) {
          setStats(response.data.data)
        }
      } catch (err) {
        console.error('유사 케이스 통계 로드 실패:', err)
        setError('통계를 불러오는데 실패했습니다')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [chiefComplaint, symptoms, diagnosis, bodyHeat, bodyStrength])

  if (loading) {
    return (
      <div className={cn('bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-6', className)}>
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-12 h-12 bg-emerald-200 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-emerald-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-emerald-100 rounded w-1/2" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !stats || stats.totalSimilarCases === 0) {
    return null // 데이터 없으면 표시하지 않음
  }

  const getConfidenceBadge = (level: string) => {
    switch (level) {
      case 'high':
        return { text: '높은 신뢰도', color: 'bg-green-100 text-green-700' }
      case 'medium':
        return { text: '보통 신뢰도', color: 'bg-amber-100 text-amber-700' }
      default:
        return { text: '참고용', color: 'bg-gray-100 text-gray-600' }
    }
  }

  const confidence = getConfidenceBadge(stats.confidenceLevel)
  const totalOutcome = stats.outcomeBreakdown.cured + stats.outcomeBreakdown.improved +
                        stats.outcomeBreakdown.noChange + stats.outcomeBreakdown.worsened

  return (
    <div className={cn('overflow-hidden rounded-2xl border', className)}>
      {/* Main Header - 킬러 피처 핵심 */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <p className="text-emerald-100 text-sm font-medium mb-1">유사 환자 데이터 분석</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{stats.totalSimilarCases}</span>
                <span className="text-emerald-100">명의 유사 환자</span>
              </div>
            </div>
          </div>
          <span className={cn('px-3 py-1 rounded-full text-xs font-medium', confidence.color)}>
            {confidence.text}
          </span>
        </div>

        {/* 성공률 하이라이트 */}
        <div className="mt-6 flex items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-emerald-200" />
              <span className="text-emerald-100 text-sm">치료 성공률</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold">{stats.successRate}%</span>
              <span className="text-emerald-200 text-sm">
                (완치 + 호전)
              </span>
            </div>
          </div>
          <div className="w-px h-16 bg-white/20" />
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-emerald-200" />
              <span className="text-emerald-100 text-sm">평균 치료 기간</span>
            </div>
            <span className="text-2xl font-bold">{stats.averageTreatmentDuration}</span>
          </div>
        </div>
      </div>

      {/* 치료 결과 분포 바 */}
      <div className="bg-white p-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">치료 결과 분포</span>
        </div>
        <div className="flex h-4 rounded-full overflow-hidden">
          {stats.outcomeBreakdown.cured > 0 && (
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${(stats.outcomeBreakdown.cured / totalOutcome) * 100}%` }}
              title={`완치: ${stats.outcomeBreakdown.cured}명`}
            />
          )}
          {stats.outcomeBreakdown.improved > 0 && (
            <div
              className="bg-emerald-400 transition-all"
              style={{ width: `${(stats.outcomeBreakdown.improved / totalOutcome) * 100}%` }}
              title={`호전: ${stats.outcomeBreakdown.improved}명`}
            />
          )}
          {stats.outcomeBreakdown.noChange > 0 && (
            <div
              className="bg-gray-300 transition-all"
              style={{ width: `${(stats.outcomeBreakdown.noChange / totalOutcome) * 100}%` }}
              title={`불변: ${stats.outcomeBreakdown.noChange}명`}
            />
          )}
          {stats.outcomeBreakdown.worsened > 0 && (
            <div
              className="bg-red-400 transition-all"
              style={{ width: `${(stats.outcomeBreakdown.worsened / totalOutcome) * 100}%` }}
              title={`악화: ${stats.outcomeBreakdown.worsened}명`}
            />
          )}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            완치 {stats.outcomeBreakdown.cured}명
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            호전 {stats.outcomeBreakdown.improved}명
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            불변 {stats.outcomeBreakdown.noChange}명
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            악화 {stats.outcomeBreakdown.worsened}명
          </div>
        </div>
      </div>

      {/* 상위 성공 처방 */}
      {stats.topSuccessfulFormulas.length > 0 && (
        <div className="bg-white p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-700">유사 케이스 상위 처방</span>
          </div>
          <div className="space-y-2">
            {stats.topSuccessfulFormulas.slice(0, 3).map((formula, index) => (
              <div
                key={formula.formulaName}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold',
                    index === 0 ? 'bg-amber-100 text-amber-700' :
                    index === 1 ? 'bg-gray-200 text-gray-600' :
                    'bg-orange-100 text-orange-600'
                  )}>
                    {index + 1}
                  </span>
                  <span className="font-medium text-gray-900">{formula.formulaName}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">{formula.caseCount}건</span>
                  <span className="font-medium text-emerald-600">
                    <CheckCircle2 className="h-3 w-3 inline mr-1" />
                    {formula.successRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 확장 섹션 토글 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 bg-gray-50 flex items-center justify-center gap-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
      >
        {expanded ? (
          <>
            접기 <ChevronUp className="h-4 w-4" />
          </>
        ) : (
          <>
            매칭 기준 및 상세 정보 <ChevronDown className="h-4 w-4" />
          </>
        )}
      </button>

      {/* 확장 콘텐츠 */}
      {expanded && (
        <div className="bg-white p-4 space-y-4">
          {/* 매칭 기준 */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">분석 기준</p>
            <div className="flex flex-wrap gap-2">
              {stats.matchCriteria.map((criteria, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                >
                  {criteria}
                </span>
              ))}
            </div>
          </div>

          {/* 안내 메시지 */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-sm text-amber-700">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              이 통계는 과거 {stats.totalSimilarCases}건의 유사 치험례를 기반으로 분석되었습니다.
              실제 치료 결과는 환자의 개별 상태에 따라 다를 수 있으며,
              이 데이터는 참고 목적으로만 사용해야 합니다.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// 컴팩트 버전 - 추천 결과 카드에 인라인으로 표시
export function SimilarCaseSuccessBadge({
  totalCases,
  successRate,
  onClick,
}: {
  totalCases: number
  successRate: number
  onClick?: () => void
}) {
  if (totalCases === 0) return null

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium transition-colors"
    >
      <Sparkles className="h-3.5 w-3.5" />
      유사 환자 {totalCases}명 중 {successRate}% 성공
    </button>
  )
}

export default SimilarCaseSuccessCard
