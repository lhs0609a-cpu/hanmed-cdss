import { CaseMatchListItem } from '@/components/case-match'
import type { SimilarCasesResult } from '@/types/clinical-evidence'
import { EvidenceTabSkeleton } from '../EvidenceTabSkeleton'

interface SimilarCasesTabProps {
  data?: SimilarCasesResult
  isLoading: boolean
}

export function SimilarCasesTab({ data, isLoading }: SimilarCasesTabProps) {
  if (isLoading) return <EvidenceTabSkeleton />
  if (!data || data.cases.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        해당 처방의 유사 치험례를 찾을 수 없습니다.
      </div>
    )
  }

  return (
    <div className="space-y-2 p-4">
      <p className="text-xs text-gray-500 mb-3">
        동일 처방을 사용한 유사 사례 <span className="font-semibold text-indigo-600">{data.totalFound}건</span> 발견
      </p>
      {data.cases.map((matchedCase, index) => (
        <CaseMatchListItem
          key={matchedCase.caseId}
          matchedCase={matchedCase}
          rank={index + 1}
          className="text-sm"
        />
      ))}
    </div>
  )
}
