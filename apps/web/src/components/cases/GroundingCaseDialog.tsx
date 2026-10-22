import { useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Loader2, X } from 'lucide-react'
import api from '@/services/api'
import { ProtectedRegion } from './ProtectedCaseText'

export interface CaseEvidence {
  caseId: string
  title: string
  summary: string
  formulaName: string
  outcome: string
}

interface FullContent {
  originalText: string
  patternReasoning: string | null
  modification: string | null
  courseSteps: Array<{ step: string; change: string }>
  distinctive: string | null
  clinicalNotes: string
  watermark: { label: string; issuedAt: string; traceId: string }
}

export function GroundingCaseDialog({ evidence, cited, onClose }: {
  evidence: CaseEvidence
  cited: boolean
  onClose: () => void
}) {
  const [content, setContent] = useState<FullContent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const returnFocus = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null)

  useEffect(() => {
    let active = true
    setContent(null)
    setError(null)
    api.get<FullContent>(`/cases/${encodeURIComponent(evidence.caseId)}/full`)
      .then(({ data }) => { if (active) setContent(data) })
      .catch((err) => {
        if (active) setError(typeof err?.response?.data?.message === 'string'
          ? err.response.data.message
          : '치험례 상세를 불러오지 못했습니다. 다시 시도해 주세요.')
      })
    return () => { active = false }
  }, [evidence.caseId, attempt])

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          aria-modal="true"
          onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus.current?.focus() }}
          className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl focus:outline-none"
        >
          <Dialog.Title className="pr-10 text-lg font-bold text-neutral-900">치험례 근거 상세</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-neutral-600">
            {cited ? '추천 처방이 직접 인용한 치험례입니다.' : '선택한 치험례의 상세 기록입니다.'} 원문과 치료 경과를 확인하세요.
          </Dialog.Description>
          <Dialog.Close aria-label="상세 닫기" className="absolute right-5 top-5 rounded p-1 focus-visible:ring-2 focus-visible:ring-blue-500">
            <X className="h-5 w-5" />
          </Dialog.Close>
          <div className="my-5 rounded-xl bg-blue-50 p-4">
            <h3 className="font-semibold">{evidence.title || '(제목 없음)'}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">{evidence.summary}</p>
            <p className="mt-2 text-sm text-neutral-600">처방: {evidence.formulaName || '기록 없음'} · 경과: {evidence.outcome || '기록 없음'}</p>
          </div>
          {!content && !error && <p role="status" className="flex items-center gap-2 py-6 text-sm"><Loader2 className="h-4 w-4 animate-spin" />치험례 상세를 불러오는 중입니다.</p>}
          {error && <div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm">
            <p>{error}</p>
            <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-3 font-semibold text-blue-700">다시 시도</button>
          </div>}
          {content && <ProtectedRegion watermark={content.watermark} caseId={evidence.caseId}>
            <div className="space-y-5">
              {[
                ['원문', content.originalText],
                ['변증 근거', content.patternReasoning],
                ['처방 가감', content.modification],
                ['감별 포인트', content.distinctive],
                ['임상 기록', content.clinicalNotes],
              ].map(([label, value]) => value ? <section key={label}>
                <h3 className="mb-2 text-sm font-bold">{label}</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">{value}</p>
              </section> : null)}
              {content.courseSteps?.length > 0 && <section>
                <h3 className="mb-2 text-sm font-bold">치료 경과</h3>
                <ol className="space-y-2 text-sm">{content.courseSteps.map((item, index) => <li key={index} className="whitespace-pre-wrap"><strong>{item.step}</strong> {item.change}</li>)}</ol>
              </section>}
              {!content.originalText && !content.patternReasoning && !content.modification && !content.distinctive && !content.clinicalNotes && !content.courseSteps?.length && <p className="text-sm text-neutral-500">등록된 상세 기록이 없습니다.</p>}
            </div>
          </ProtectedRegion>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
