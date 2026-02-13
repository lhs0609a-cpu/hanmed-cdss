import { Beaker, BookOpen, FlaskConical } from 'lucide-react'
import type { ScientificEvidenceData } from '@/types/clinical-evidence'
import { EvidenceTabSkeleton } from '../EvidenceTabSkeleton'

interface ScientificEvidenceTabProps {
  data?: ScientificEvidenceData
  isLoading: boolean
}

const levelColors = {
  A: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  B: 'bg-blue-100 text-blue-700 border-blue-300',
  C: 'bg-amber-100 text-amber-700 border-amber-300',
  D: 'bg-gray-100 text-gray-600 border-gray-300',
} as const

const levelLabels = {
  A: '높은 근거',
  B: '중등도 근거',
  C: '제한적 근거',
  D: '전문가 의견',
} as const

export function ScientificEvidenceTab({ data, isLoading }: ScientificEvidenceTabProps) {
  if (isLoading) return <EvidenceTabSkeleton />
  if (!data) return <p className="text-sm text-gray-500 p-4">데이터를 불러올 수 없습니다.</p>

  return (
    <div className="space-y-4 p-4">
      {/* 근거 수준 뱃지 */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${levelColors[data.evidenceLevel]}`}
        >
          Level {data.evidenceLevel}
        </span>
        <span className="text-xs text-gray-500">{levelLabels[data.evidenceLevel]}</span>
      </div>

      {/* 약리작용 */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
          <FlaskConical className="h-3.5 w-3.5" />
          약리작용
        </h4>
        <ul className="space-y-1">
          {data.pharmacologicalActions.map((action, i) => (
            <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
              <span className="text-teal-500 mt-0.5">•</span>
              {action}
            </li>
          ))}
        </ul>
      </div>

      {/* 활성 성분 */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
          <Beaker className="h-3.5 w-3.5" />
          주요 활성 성분
        </h4>
        <div className="space-y-2">
          {data.activeCompounds.map((compound) => (
            <div key={compound.herb} className="bg-gray-50 rounded-lg p-2.5">
              <span className="text-xs font-semibold text-teal-700">{compound.herb}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {compound.compounds.map((c) => (
                  <span key={c} className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] text-gray-600">
                    {c}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 mt-1">{compound.actions.join(', ')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 임상 연구 */}
      {data.clinicalStudies.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            관련 임상 연구
          </h4>
          <div className="space-y-2">
            {data.clinicalStudies.map((study, i) => (
              <div key={i} className="bg-blue-50/60 rounded-lg p-2.5">
                <p className="text-xs font-medium text-gray-800">{study.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-gray-500">{study.year}</span>
                  <span className="text-[10px] text-blue-600 font-medium">{study.result}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 환자 친화적 설명 */}
      <div className="bg-emerald-50/60 rounded-lg p-3 border border-emerald-100">
        <p className="text-xs text-gray-700 leading-relaxed">
          💡 {data.patientFriendlyExplanation}
        </p>
      </div>
    </div>
  )
}
