import { CheckCircle, XCircle, Brain, Zap } from 'lucide-react'
import type { AIReasoningData } from '@/types/clinical-evidence'
import { EvidenceTabSkeleton } from '../EvidenceTabSkeleton'

interface AIReasoningTabProps {
  data?: AIReasoningData
  isLoading: boolean
}

const relevanceColors = {
  high: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
} as const

export function AIReasoningTab({ data, isLoading }: AIReasoningTabProps) {
  if (isLoading) return <EvidenceTabSkeleton />
  if (!data) return <p className="text-sm text-gray-500 p-4">데이터를 불러올 수 없습니다.</p>

  return (
    <div className="space-y-4 p-4">
      {/* 증상 매칭 현황 */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5" />
          증상 매칭 현황
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {data.symptomMatches.map((match) => (
            <span
              key={match.symptom}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
                match.matched ? relevanceColors[match.relevance] : 'bg-red-50 text-red-500 border-red-200'
              }`}
            >
              {match.matched ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              {match.symptom}
            </span>
          ))}
        </div>
      </div>

      {/* 체질 적합성 */}
      <div className="bg-indigo-50/60 rounded-lg p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-indigo-700">체질 적합성</span>
          <span className="text-sm font-bold text-indigo-600">{data.constitutionFit.score}점</span>
        </div>
        <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-700"
            style={{ width: `${data.constitutionFit.score}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">{data.constitutionFit.explanation}</p>
      </div>

      {/* 병기 분석 */}
      <div className="bg-slate-50 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Brain className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
          <div>
            <span className="text-xs font-semibold text-slate-600">병기 분석</span>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">{data.pathogenesisAnalysis}</p>
          </div>
        </div>
      </div>

      {/* 핵심 포인트 */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 mb-2">핵심 포인트</h4>
        <ul className="space-y-1.5">
          {data.keyPoints.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
