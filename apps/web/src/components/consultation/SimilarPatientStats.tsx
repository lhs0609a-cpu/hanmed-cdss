import { Users, TrendingUp, Target, Percent, Activity, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SimilarPatientStatsProps {
  totalCases: number
  avgConfidence: number
  topFormulas: string[]
  patientDemographics?: {
    ageRange: string
    genderRatio: { male: number; female: number }
  }
  treatmentOutcomes?: {
    improved: number
    maintained: number
    noChange: number
  }
  className?: string
}

export function SimilarPatientStats({
  totalCases,
  avgConfidence,
  topFormulas,
  patientDemographics,
  treatmentOutcomes,
  className,
}: SimilarPatientStatsProps) {
  // Calculate improvement rate from real data only
  const improvementRate = treatmentOutcomes
    ? Math.round((treatmentOutcomes.improved / (treatmentOutcomes.improved + treatmentOutcomes.maintained + treatmentOutcomes.noChange)) * 100)
    : null

  return (
    <div className={cn('bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl border border-indigo-100 p-5', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg shadow-indigo-500/20">
          <Users className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">유사 환자 통계</h3>
          <p className="text-xs text-gray-500">
            비슷한 증상의 환자 <span className="font-semibold text-indigo-600">{totalCases.toLocaleString()}명</span> 분석 결과
          </p>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {/* Improvement Rate */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-white">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-gray-500">호전율</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{improvementRate !== null ? `${improvementRate}%` : '-'}</div>
          <div className="text-[10px] text-gray-400">{improvementRate !== null ? '치료 후 개선' : '데이터 수집중'}</div>
        </div>

        {/* Match Confidence */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-white">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-indigo-500" />
            <span className="text-xs text-gray-500">평균 일치도</span>
          </div>
          <div className="text-2xl font-bold text-indigo-600">{avgConfidence}%</div>
          <div className="text-[10px] text-gray-400">증상 패턴 매칭</div>
        </div>

        {/* Top Formula Usage */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-white">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-gray-500">주사용 처방</span>
          </div>
          <div className="text-lg font-bold text-amber-600 truncate">
            {topFormulas[0]?.split('(')[0] || '-'}
          </div>
          <div className="text-[10px] text-gray-400">
            외 {topFormulas.length > 1 ? `${topFormulas.length - 1}개` : '없음'}
          </div>
        </div>

        {/* Similar Cases */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-white">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="h-4 w-4 text-purple-500" />
            <span className="text-xs text-gray-500">분석 치험례</span>
          </div>
          <div className="text-2xl font-bold text-purple-600">{totalCases}</div>
          <div className="text-[10px] text-gray-400">유사 사례 수</div>
        </div>
      </div>

      {/* Demographics (if available) */}
      {patientDemographics && (
        <div className="flex items-center gap-4 pt-3 border-t border-indigo-100">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">연령대:</span>
            <span className="font-medium text-gray-700">{patientDemographics.ageRange}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">성비:</span>
            <div className="flex items-center gap-1">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                남 {patientDemographics.genderRatio.male}%
              </span>
              <span className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded text-xs font-medium">
                여 {patientDemographics.genderRatio.female}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Confidence Indicator */}
      <div className="mt-3 pt-3 border-t border-indigo-100">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-gray-500">AI 추천 신뢰도</span>
          <span className="font-semibold text-indigo-600">{avgConfidence}%</span>
        </div>
        <div className="h-2 bg-white rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
            style={{ width: `${avgConfidence}%` }}
          />
        </div>
        <p className="mt-2 text-[10px] text-gray-400 text-center">
          {totalCases.toLocaleString()}건의 유사 치험례를 기반으로 분석되었습니다
        </p>
      </div>
    </div>
  )
}

// Compact version for inline display
export function SimilarPatientStatsBadge({
  totalCases,
  improvementRate,
  className,
}: {
  totalCases: number
  improvementRate: number
  className?: string
}) {
  return (
    <div className={cn('inline-flex items-center gap-3 px-4 py-2 bg-indigo-50 rounded-full', className)}>
      <div className="flex items-center gap-1.5">
        <Users className="h-4 w-4 text-indigo-500" />
        <span className="text-sm font-medium text-indigo-700">
          유사 환자 {totalCases.toLocaleString()}명
        </span>
      </div>
      <div className="h-4 w-px bg-indigo-200" />
      <div className="flex items-center gap-1.5">
        <TrendingUp className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-medium text-emerald-700">
          {improvementRate}% 호전
        </span>
      </div>
    </div>
  )
}

// Highlight card for individual recommendations
export function RecommendationStatHighlight({
  matchedPatients,
  successRate,
  avgTreatmentDays,
  formulaName,
}: {
  matchedPatients: number
  successRate: number
  avgTreatmentDays?: number
  formulaName: string
}) {
  return (
    <div className="mt-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
      <div className="flex items-center gap-2 mb-2">
        <Percent className="h-4 w-4 text-emerald-600" />
        <span className="text-xs font-semibold text-emerald-700">유사 환자 데이터 기반</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-emerald-600">{matchedPatients}</div>
          <div className="text-[10px] text-gray-500">유사 환자</div>
        </div>
        <div>
          <div className="text-lg font-bold text-teal-600">{successRate}%</div>
          <div className="text-[10px] text-gray-500">호전율</div>
        </div>
        {avgTreatmentDays && (
          <div>
            <div className="text-lg font-bold text-blue-600">{avgTreatmentDays}일</div>
            <div className="text-[10px] text-gray-500">평균 치료</div>
          </div>
        )}
      </div>
      <p className="mt-2 text-[10px] text-gray-500 text-center">
        {formulaName} 처방 환자 {matchedPatients}명 중 {Math.round(matchedPatients * successRate / 100)}명 호전
      </p>
    </div>
  )
}

export default SimilarPatientStats
