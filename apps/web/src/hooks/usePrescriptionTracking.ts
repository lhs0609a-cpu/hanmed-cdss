import { useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'

/**
 * 처방 발행 시 한의사 개인화 학습 + 삭감 위험도 평가를 동시에 트리거하는 훅.
 *
 * 흐름:
 *   1) 처방 저장 직후 trackPrescription({formula, herbs, pattern}) 호출.
 *   2) 백그라운드로 AI 엔진에 학습 데이터 적재 (best-effort, 실패해도 진료엔 영향 없음).
 *   3) 같은 한의사가 다음 추론 요청 시 본인 빈도가 자동 반영.
 */

const AI_ENGINE_URL = (import.meta.env.VITE_AI_ENGINE_URL as string | undefined) || ''

export interface TrackPayload {
  formulaName: string
  herbs?: string[]
  pattern?: string
}

export function usePrescriptionTracking() {
  const user = useAuthStore((s) => s.user) as { id?: string } | null

  const trackPrescription = useCallback(
    async (payload: TrackPayload): Promise<void> => {
      if (!user?.id || !payload.formulaName) return
      if (!AI_ENGINE_URL) return // dev 환경에서 미설정이면 조용히 패스
      try {
        await fetch(`${AI_ENGINE_URL}/api/v1/personalization/record`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-user-id': user.id,
          },
          body: JSON.stringify({
            formula_name: payload.formulaName,
            herbs: payload.herbs ?? [],
            pattern: payload.pattern ?? null,
          }),
          // 진료를 막지 않도록 keepalive — 페이지 이탈 중에도 전송 시도
          keepalive: true,
        })
      } catch {
        // best-effort
      }
    },
    [user?.id],
  )

  const forgetMyData = useCallback(async (): Promise<void> => {
    if (!user?.id || !AI_ENGINE_URL) return
    try {
      await fetch(`${AI_ENGINE_URL}/api/v1/personalization/forget`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.id },
      })
    } catch {
      // ignore
    }
  }, [user?.id])

  return { trackPrescription, forgetMyData }
}
