import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import type {
  ClinicalEvidenceParams,
  AIReasoningData,
  ScientificEvidenceData,
  TreatmentStatsData,
  SimilarCasesResult,
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
      const { data } = await api.post('/ai/scientific-rationale/quick-summary', {
        formula_name: params.formulaName,
        chief_complaint: params.chiefComplaint,
        symptoms: params.symptoms.map(s => s.name),
        constitution: params.constitution,
      })
      return { ...data, _isDemo: false }
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
      const { data } = await api.post('/cases/search', {
        chief_complaint: params.chiefComplaint,
        symptoms: params.symptoms.map(s => ({ name: s.name, severity: s.severity })),
        formula: params.formulaName,
        options: { top_k: 3, min_confidence: 30 },
      })
      const transformed = transformCaseSearchResponse(data)
      return {
        cases: transformed.results,
        totalFound: transformed.totalFound,
        _isDemo: false,
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
      const { data } = await api.post('/ai/scientific-rationale/generate', {
        formula_name: params.formulaName,
        herbs: params.herbs.map(h => h.name),
      })
      return { ...data, _isDemo: false }
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
      const { data } = await api.post('/ai/statistics/similar-patients', {
        formula_name: params.formulaName,
        chief_complaint: params.chiefComplaint,
        symptoms: params.symptoms.map(s => s.name),
      })
      return { ...data, _isDemo: false }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}
