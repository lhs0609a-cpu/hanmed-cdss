import { useState } from 'react'
import { ChevronDown, Brain, BookOpen, FlaskConical, BarChart3, AlertTriangle } from 'lucide-react'
import type { ClinicalEvidenceParams } from '@/types/clinical-evidence'
import { useClinicalEvidence } from '@/hooks/useClinicalEvidence'
import { AIReasoningTab } from './tabs/AIReasoningTab'
import { SimilarCasesTab } from './tabs/SimilarCasesTab'
import { ScientificEvidenceTab } from './tabs/ScientificEvidenceTab'
import { TreatmentStatsTab } from './tabs/TreatmentStatsTab'

type TabId = 'reasoning' | 'cases' | 'scientific' | 'statistics'

const TABS: Array<{ id: TabId; label: string; icon: typeof Brain }> = [
  { id: 'reasoning', label: 'AI 근거', icon: Brain },
  { id: 'cases', label: '치험례', icon: BookOpen },
  { id: 'scientific', label: '과학적', icon: FlaskConical },
  { id: 'statistics', label: '통계', icon: BarChart3 },
]

export function ClinicalEvidencePanel(props: ClinicalEvidenceParams) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('reasoning')

  const { reasoning, similarCases, scientific, statistics } = useClinicalEvidence(props, isOpen)

  const isDemo =
    reasoning.data?._isDemo ||
    similarCases.data?._isDemo ||
    scientific.data?._isDemo ||
    statistics.data?._isDemo

  return (
    <div className="mt-3 border-t border-gray-100 pt-2">
      {/* 토글 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 rounded-lg transition-colors"
      >
        <FlaskConical className="h-3.5 w-3.5" />
        임상 근거 보기
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 패널 내용 */}
      {isOpen && (
        <div className="mt-2 border border-indigo-100 rounded-xl overflow-hidden bg-white">
          {/* 데모 배너 */}
          {isDemo && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border-b border-amber-100 text-[10px] text-amber-700">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              데모 데이터입니다. 실제 API 연동 시 실시간 분석 결과가 표시됩니다.
            </div>
          )}

          {/* 탭 헤더 */}
          <div className="flex border-b border-gray-100">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium transition-colors ${
                  activeTab === id
                    ? 'text-indigo-700 border-b-2 border-indigo-500 bg-indigo-50/30'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* 탭 내용 */}
          <div className="max-h-[400px] overflow-y-auto">
            {activeTab === 'reasoning' && (
              <AIReasoningTab data={reasoning.data} isLoading={reasoning.isLoading} />
            )}
            {activeTab === 'cases' && (
              <SimilarCasesTab data={similarCases.data} isLoading={similarCases.isLoading} />
            )}
            {activeTab === 'scientific' && (
              <ScientificEvidenceTab data={scientific.data} isLoading={scientific.isLoading} />
            )}
            {activeTab === 'statistics' && (
              <TreatmentStatsTab data={statistics.data} isLoading={statistics.isLoading} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
