import { useEffect, useRef, useCallback } from 'react'
import { Lock, ShieldAlert } from 'lucide-react'
import { api } from '@/services/api'
import { toast } from '@/lib/toast'

/**
 * 치험례 본문 표시 — 복사·유출 억제 계층.
 *
 * 솔직하게 짚고 가는 한계:
 *   - 여기서 하는 모든 차단은 개발자면 우회한다. 우회를 막을 방법은 없다.
 *   - 화면을 보고 타이핑하거나 카메라로 찍는 것은 어떤 방법으로도 못 막는다.
 *   - 웹 브라우저에는 스크린샷을 막는 API 자체가 없다.
 *
 * 그래서 이 컴포넌트의 목적은 "차단"이 아니라 셋이다.
 *   1. 무심코 하는 복사·인쇄를 막는다 (대부분의 유출은 악의가 아니라 습관이다)
 *   2. 가시 워터마크로 스크린샷·촬영본에 열람자 정보를 박는다
 *   3. 우회 시도를 서버에 기록해 고의성의 증거를 남긴다
 *
 * 진짜 방어선은 서버에 있다 — 목록 API 에서 본문을 빼고, 열람에 속도제한을 걸고,
 * 본문에 제로폭 워터마크를 심는 것. 이 파일은 그 위에 얹는 마감재다.
 */

interface Watermark {
  label: string
  issuedAt: string
  traceId: string
}

interface ProtectedCaseTextProps {
  /** 서버가 준 본문 (제로폭 워터마크가 이미 심어져 있다 — 절대 정제하지 말 것) */
  text: string
  watermark: Watermark
  caseId: string
  className?: string
}

interface ProtectedRegionProps {
  watermark: Watermark
  caseId: string
  children: React.ReactNode
  className?: string
}

/** 서버에 시도를 기록한다. 실패해도 화면은 그대로 간다 — 기록은 부가 기능이다. */
function reportAttempt(caseId: string, kind: string) {
  api.post('/cases/copy-attempt', { caseId, kind }).catch(() => {
    /* 기록 실패가 열람을 막을 이유는 없다 */
  })
}

/** 같은 종류의 시도를 연달아 신고해 서버를 두드리지 않게 한다 */
function useThrottledReport(caseId: string) {
  const lastRef = useRef<Record<string, number>>({})
  return useCallback(
    (kind: string, warn = true) => {
      const now = Date.now()
      if (now - (lastRef.current[kind] || 0) < 3000) return
      lastRef.current[kind] = now
      reportAttempt(caseId, kind)
      if (warn) {
        toast.warning(
          '복사가 제한된 자료입니다',
          '이 치험례 원문은 재배포가 금지되어 있으며, 시도가 기록되었습니다.',
        )
      }
    },
    [caseId],
  )
}

/**
 * 복사 억제 이벤트를 컨테이너에 건다. 반환한 ref 를 보호할 요소에 달면 된다.
 *
 * 훅으로 뺀 이유: 보호할 것이 원문 하나가 아니다. 원문에서 뽑아낸 세부 관찰
 * 사항·경과도 같은 본문이라, 한 곳만 감싸면 옆에서 그대로 새어 나간다.
 */
function useCopyGuard(caseId: string, watermarkLabel: string) {
  const containerRef = useRef<HTMLDivElement>(null)
  const report = useThrottledReport(caseId)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      // 클립보드를 비우지 않고 경고 문구로 덮어쓴다. 빈 붙여넣기는 버그처럼 보이지만
      // 이렇게 두면 "왜 안 되는지"가 붙여넣는 순간에도 전달된다.
      e.clipboardData?.setData(
        'text/plain',
        `[온고지신] 이 치험례 원문은 복사·재배포가 금지된 자료입니다. (열람자: ${watermarkLabel})`,
      )
      report('copy')
    }
    const onCut = (e: ClipboardEvent) => {
      e.preventDefault()
      report('cut')
    }
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      report('contextmenu', false)
    }
    const onDragStart = (e: DragEvent) => {
      e.preventDefault()
      report('drag', false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      // c(복사) a(전체선택) x(잘라내기) s(저장) p(인쇄)
      if (['c', 'a', 'x', 's', 'p'].includes(k)) {
        e.preventDefault()
        report(`key:${k}`, k !== 'a')
      }
    }

    el.addEventListener('copy', onCopy)
    el.addEventListener('cut', onCut)
    el.addEventListener('contextmenu', onContextMenu)
    el.addEventListener('dragstart', onDragStart)
    document.addEventListener('keydown', onKeyDown)

    // 창에서 포커스가 빠지면(캡처 도구 실행, Alt+Tab) 본문을 흐린다.
    // 캡처를 막지는 못하지만 캡처 도구를 띄우는 흔한 경로에서는 실제로 걸린다.
    const onBlur = () => el.classList.add('ongo-protected--blurred')
    const onFocus = () => el.classList.remove('ongo-protected--blurred')
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)

    return () => {
      el.removeEventListener('copy', onCopy)
      el.removeEventListener('cut', onCut)
      el.removeEventListener('contextmenu', onContextMenu)
      el.removeEventListener('dragstart', onDragStart)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [report, watermarkLabel])

  return containerRef
}

/** 스크린샷·촬영본에 열람자 정보가 같이 박히도록 반복 표시하는 가시 워터마크 */
function WatermarkOverlay({ stamp }: { stamp: string }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 select-none overflow-hidden"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="whitespace-nowrap text-[11px] font-medium tracking-wide text-neutral-900/[0.07]"
          style={{
            transform: 'rotate(-24deg)',
            marginTop: i === 0 ? '1rem' : '4.5rem',
            marginLeft: `${(i % 2) * -3}rem`,
          }}
        >
          {`${stamp}    ${stamp}    ${stamp}`}
        </div>
      ))}
    </div>
  )
}

function stampOf(watermark: Watermark): string {
  const issued = new Date(watermark.issuedAt)
  return `${watermark.label} · ${issued.toLocaleString('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })}`
}

/**
 * 임의의 잠금 본문을 감싸는 보호 영역.
 *
 * 원문 자체가 아니라 원문에서 뽑아낸 조각(세부 관찰 사항, 경과)을 그릴 때 쓴다.
 * 복사 억제·가시 워터마크·인쇄 차단이 원문과 똑같이 걸린다 — 조각도 본문이다.
 */
export function ProtectedRegion({
  watermark,
  caseId,
  children,
  className = '',
}: ProtectedRegionProps) {
  const containerRef = useCopyGuard(caseId, watermark.label)

  return (
    <div ref={containerRef} className={`ongo-protected relative overflow-hidden ${className}`}>
      <WatermarkOverlay stamp={stampOf(watermark)} />
      <div className="ongo-protected__body relative">{children}</div>
    </div>
  )
}

export function ProtectedCaseText({
  text,
  watermark,
  caseId,
  className = '',
}: ProtectedCaseTextProps) {
  return (
    <div className={className}>
      {/* 경고 배너 — 이 화면이 나에게 발급된 사본임을 명시한다 */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 mb-3">
        <ShieldAlert className="h-4 w-4 flex-shrink-0 text-amber-600 mt-0.5" />
        <p className="text-[12px] leading-relaxed text-amber-900">
          이 사본은 <span className="font-bold">{watermark.label}</span> 님에게만 발급되었습니다.
          원문의 복사·촬영·재배포는 금지되며, 유출 시 열람 기록으로 추적됩니다.
        </p>
      </div>

      <ProtectedRegion
        watermark={watermark}
        caseId={caseId}
        className="rounded-lg border border-neutral-200 bg-neutral-50"
      >
        <pre className="max-h-[400px] overflow-y-auto whitespace-pre-wrap p-4 font-sans text-[13px] leading-relaxed text-neutral-700">
          {text}
        </pre>
      </ProtectedRegion>

      <p className="mt-2 flex items-center gap-1 text-[11px] text-neutral-400">
        <Lock className="h-3 w-3" />
        열람 기록 {watermark.traceId.slice(0, 8)}
      </p>
    </div>
  )
}

export default ProtectedCaseText
