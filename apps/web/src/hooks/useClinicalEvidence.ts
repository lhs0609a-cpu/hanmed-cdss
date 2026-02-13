import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import type {
  ClinicalEvidenceParams,
  AIReasoningData,
  ScientificEvidenceData,
  TreatmentStatsData,
  SimilarCasesResult,
} from '@/types/clinical-evidence'
import {
  MOCK_REASONING,
  MOCK_SIMILAR_CASES,
  MOCK_SCIENTIFIC,
  MOCK_STATISTICS,
} from '@/types/clinical-evidence'
import { transformCaseSearchResponse } from '@/types/case-search'

/**
 * 임상 근거 패널용 통합 훅
 * enabled=true일 때만 API 호출 (lazy loading)
 */
export function useClinicalEvidence(params: ClinicalEvidenceParams, enabled: boolean) {
  const reasoning = useAIReasoning(params, enabled)
  const similarCases = useSimilarCases(params, enabled)
  const scientific = useScientificEvidence(params, enabled)
  const statistics = useTreatmentStatistics(params, enabled)

  return { reasoning, similarCases, scientific, statistics }
}

/** AI 추천 근거 */
function useAIReasoning(params: ClinicalEvidenceParams, enabled: boolean) {
  return useQuery({
    queryKey: ['clinical-evidence-reasoning', params.formulaName, params.chiefComplaint],
    queryFn: async (): Promise<AIReasoningData> => {
      try {
        const { data } = await api.post('/ai/scientific-rationale/quick-summary', {
          formula_name: params.formulaName,
          chief_complaint: params.chiefComplaint,
          symptoms: params.symptoms.map(s => s.name),
          constitution: params.constitution,
        })
        if (data && data.keyPoints) {
          return { ...data, _isDemo: false }
        }
        return MOCK_REASONING
      } catch {
        return MOCK_REASONING
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/** 유사 치험례 */
function useSimilarCases(params: ClinicalEvidenceParams, enabled: boolean) {
  return useQuery({
    queryKey: ['clinical-evidence-similar-cases', params.formulaName, params.chiefComplaint],
    queryFn: async (): Promise<SimilarCasesResult> => {
      try {
        const { data } = await api.post('/cases/search', {
          chief_complaint: params.chiefComplaint,
          symptoms: params.symptoms.map(s => ({ name: s.name, severity: s.severity })),
          formula: params.formulaName,
          options: { top_k: 3, min_confidence: 30 },
        })
        if (data && data.results) {
          const transformed = transformCaseSearchResponse(data)
          return {
            cases: transformed.results,
            totalFound: transformed.totalFound,
            _isDemo: false,
          }
        }
        return MOCK_SIMILAR_CASES
      } catch {
        return MOCK_SIMILAR_CASES
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/** 과학적 근거 */
function useScientificEvidence(params: ClinicalEvidenceParams, enabled: boolean) {
  return useQuery({
    queryKey: ['clinical-evidence-scientific', params.formulaName],
    queryFn: async (): Promise<ScientificEvidenceData> => {
      try {
        const { data } = await api.post('/ai/scientific-rationale/generate', {
          formula_name: params.formulaName,
          herbs: params.herbs.map(h => h.name),
        })
        if (data && data.pharmacologicalActions) {
          return { ...data, _isDemo: false }
        }
        return MOCK_SCIENTIFIC
      } catch {
        return MOCK_SCIENTIFIC
      }
    },
    enabled,
    staleTime: 10 * 60 * 1000,
  })
}

/** 치료 통계 */
function useTreatmentStatistics(params: ClinicalEvidenceParams, enabled: boolean) {
  return useQuery({
    queryKey: ['clinical-evidence-statistics', params.formulaName, params.chiefComplaint],
    queryFn: async (): Promise<TreatmentStatsData> => {
      try {
        const { data } = await api.post('/ai/statistics/similar-patients', {
          formula_name: params.formulaName,
          chief_complaint: params.chiefComplaint,
          symptoms: params.symptoms.map(s => s.name),
        })
        if (data && data.overallSuccessRate !== undefined) {
          return { ...data, _isDemo: false }
        }
        return MOCK_STATISTICS
      } catch {
        return MOCK_STATISTICS
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}
