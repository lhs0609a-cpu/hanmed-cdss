import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Award,
  Sparkles,
  TrendingUp,
  ChevronRight,
  BookOpen,
  Target,
  CheckCircle2,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MatchedCase } from '@/types/case-search'

interface PrescriptionStat {
  formulaName: string
  formulaHanja?: string
  count: number
  avgScore: number
  bestMatchGrade: 'S' | 'A' | 'B' | 'C' | 'D'
  symptoms: string[]
}

interface PrescriptionSummaryProps {
  results: MatchedCase[]
  className?: string
}

const GRADE_RANK: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 }
const GRADE_COLORS = {
  S: 'bg-purple-100 text-purple-700 border-purple-200',
  A: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  B: 'bg-blue-100 text-blue-700 border-blue-200',
  C: 'bg-amber-100 text-amber-700 border-amber-200',
  D: 'bg-gray-100 text-gray-600 border-gray-200',
}

export function PrescriptionSummary({ results, className }: PrescriptionSummaryProps) {
  const prescriptionStats = useMemo(() => {
    const stats = new Map<string, PrescriptionStat>()

    results.forEach((matchedCase) => {
      const { formulaName, formulaHanja, matchScore, symptoms } = matchedCase
      if (!formulaName) return

      const existing = stats.get(formulaName)
      if (existing) {
        existing.count++
        existing.avgScore = (existing.avgScore * (existing.count - 1) + matchScore.total) / existing.count
        if (GRADE_RANK[matchScore.grade] > GRADE_RANK[existing.bestMatchGrade]) {
          existing.bestMatchGrade = matchScore.grade
        }
        // Add unique symptoms
        symptoms.forEach((s) => {
          if (!existing.symptoms.includes(s)) {
            existing.symptoms.push(s)
          }
        })
      } else {
        stats.set(formulaName, {
          formulaName,
          formulaHanja: formulaHanja || undefined,
          count: 1,
          avgScore: matchScore.total,
          bestMatchGrade: matchScore.grade,
          symptoms: [...symptoms],
        })
      }
    })

    // Sort by count (most frequent), then by avg score
    return Array.from(stats.values())
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return b.avgScore - a.avgScore
      })
      .slice(0, 5)
  }, [results])

  if (results.length === 0 || prescriptionStats.length === 0) return null

  const topPrescription = prescriptionStats[0]
  const totalResults = results.length
  const topPrescriptionPercent = Math.round((topPrescription.count / totalResults) * 100)

  return (
    <div className={cn('bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 overflow-hidden', className)}>
      {/* Header with Gradient */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 px-6 py-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">AI 추천 처방</h3>
              <p className="text-white/80 text-sm">
                {totalResults}건의 유사 치험례 분석 결과
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full text-sm">
            <Sparkles className="h-4 w-4" />
            <span className="font-medium">성공률 기반 추천</span>
          </div>
        </div>
      </div>

      {/* Top Recommendation */}
      <div className="p-6 bg-white border-b border-slate-100">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-3">
          <Target className="h-3.5 w-3.5" />
          최다 사용 처방
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl font-bold text-gray-900">
                {topPrescription.formulaName}
              </span>
              {topPrescription.formulaHanja && (
                <span className="text-lg text-gray-400">
                  ({topPrescription.formulaHanja})
                </span>
              )}
              <span className={cn(
                'px-2 py-0.5 rounded text-xs font-semibold border',
                GRADE_COLORS[topPrescription.bestMatchGrade]
              )}>
                최고 등급 {topPrescription.bestMatchGrade}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4 text-gray-400" />
                {topPrescription.count}건의 유사 사례
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                매칭 {topPrescriptionPercent}% 점유
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-3xl font-bold text-indigo-600">
              {Math.round(topPrescription.avgScore)}
              <span className="text-lg font-normal text-gray-400">점</span>
            </div>
            <div className="text-xs text-gray-500">평균 매칭 점수</div>
          </div>
        </div>

        {/* Top Prescription Symptoms */}
        {topPrescription.symptoms.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-500 mb-2">관련 증상</div>
            <div className="flex flex-wrap gap-1.5">
              {topPrescription.symptoms.slice(0, 8).map((symptom, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs"
                >
                  {symptom}
                </span>
              ))}
              {topPrescription.symptoms.length > 8 && (
                <span className="px-2 py-1 text-gray-400 text-xs">
                  +{topPrescription.symptoms.length - 8}개
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Other Top Prescriptions */}
      {prescriptionStats.length > 1 && (
        <div className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <Award className="h-3.5 w-3.5" />
            기타 추천 처방
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {prescriptionStats.slice(1).map((stat, idx) => (
              <div
                key={stat.formulaName}
                className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-sm font-bold">
                    {idx + 2}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900">{stat.formulaName}</div>
                    <div className="text-xs text-gray-500">{stat.count}건 매칭</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-xs font-medium border',
                    GRADE_COLORS[stat.bestMatchGrade]
                  )}>
                    {stat.bestMatchGrade}
                  </span>
                  <span className="text-sm font-semibold text-gray-700">
                    {Math.round(stat.avgScore)}점
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-start gap-2 text-xs text-gray-500">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>이 추천은 유사 치험례 분석에 기반하며, 개별 환자 상태에 따라 달라질 수 있습니다.</span>
        </div>
        <Link
          to="/dashboard/consultation"
          className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
        >
          <CheckCircle2 className="h-4 w-4" />
          상세 분석
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

// Compact version for inline display
export function PrescriptionSummaryCompact({ results }: { results: MatchedCase[] }) {
  const prescriptionStats = useMemo(() => {
    const stats = new Map<string, { count: number; avgScore: number }>()

    results.forEach((matchedCase) => {
      const { formulaName, matchScore } = matchedCase
      if (!formulaName) return

      const existing = stats.get(formulaName)
      if (existing) {
        existing.count++
        existing.avgScore = (existing.avgScore * (existing.count - 1) + matchScore.total) / existing.count
      } else {
        stats.set(formulaName, { count: 1, avgScore: matchScore.total })
      }
    })

    return Array.from(stats.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
  }, [results])

  if (prescriptionStats.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500 font-medium">추천 처방:</span>
      {prescriptionStats.map(([name, stat], idx) => (
        <span
          key={name}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium',
            idx === 0
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-gray-100 text-gray-600'
          )}
        >
          {idx === 0 && <Award className="h-3 w-3" />}
          {name}
          <span className="text-gray-400">({stat.count})</span>
        </span>
      ))}
    </div>
  )
}

export default PrescriptionSummary
