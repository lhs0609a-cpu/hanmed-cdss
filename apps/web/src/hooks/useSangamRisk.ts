import { useCallback, useState } from 'react'
import api from '@/services/api'

/**
 * 청구 직전 삭감 위험도 평가 훅.
 *
 * 사용:
 *   const { evaluate, result, isLoading } = useSangamRisk(clinicId)
 *   await evaluate(['U23.0', 'M54.5'])  // 코드 배열
 *
 * 백엔드: /insurance/sangam/evaluate (POST)
 */

export interface SangamTrigger {
  kind: 'single' | 'pair'
  codes: string[]
  probability: number
  pastSampleSize: number
  suggestedAction?: string
}

export interface SangamRiskResult {
  riskLevel: 'low' | 'medium' | 'high'
  rejectionProbability: number
  triggers: SangamTrigger[]
  topReasons: Array<{ reason: string; count: number }>
}

export function useSangamRisk(clinicId: string | null | undefined) {
  const [result, setResult] = useState<SangamRiskResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const evaluate = useCallback(
    async (codes: string[]): Promise<SangamRiskResult | null> => {
      if (!clinicId || !codes.length) return null
      setIsLoading(true)
      setError(null)
      try {
        const res = await api.post<SangamRiskResult>('/insurance/sangam/evaluate', {
          clinicId,
          codes,
        })
        setResult(res.data)
        return res.data
      } catch (e) {
        setError(e as Error)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [clinicId],
  )

  return { result, isLoading, error, evaluate }
}
