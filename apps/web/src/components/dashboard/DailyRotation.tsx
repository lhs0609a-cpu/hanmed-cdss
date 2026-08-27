import { useEffect, useRef, useState } from 'react'

/**
 * 매일 카드 셋(치험례·처방·약재)이 공유하는 회전 장치.
 *
 * 셋 다 같은 자리에서 같은 규칙으로 돈다 — 하루치 5건을 한 카드가 몇 초마다
 * 넘긴다. 한 건만 놓아두면 "사례 하나" 로 읽히고 다섯 건이 스치면 "쌓여 있다"
 * 로 읽힌다. 첫 화면에 머무는 시간은 몇 초뿐이라 이 차이가 크다.
 *
 * 대신 읽는 중에 글이 바뀌면 최악이므로 —
 *   · 마우스를 올리거나 카드 안에 포커스가 있는 동안 멈춘다
 *   · 사용자가 OS 에서 모션을 줄이도록 설정했으면 아예 돌지 않는다
 *   · 점을 눌러 직접 넘길 수 있고, 그 순간 타이머가 처음부터 다시 센다
 *
 * 셋이 제각각 돌면 오른쪽 열 전체가 산만해진다. 그래서 간격을 여기 한 곳에
 * 두고 셋이 같이 쓴다.
 */

/** 한 건이 머무는 시간. 요약 두세 줄을 읽기에 6초면 넉넉하다. */
export const ROTATE_MS = 6000

/** 사용자가 OS 에서 모션을 줄이도록 설정했는가 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}

/**
 * count 건을 몇 초마다 넘긴다.
 *
 * resetKey 는 목록 자체가 바뀌었을 때(자정, 재조회) 처음으로 돌리기 위한 것이다 —
 * 건수만 보면 5건이 다른 5건으로 바뀌어도 인덱스가 그대로 남는다.
 */
export function useDailyRotation(count: number, resetKey?: string) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setIndex(0)
  }, [count, resetKey])

  // 타이머를 index 에 걸어 두면 점을 눌러 수동으로 넘길 때마다 6초가 새로
  // 시작한다. 직접 넘긴 직후에 곧바로 또 자동으로 넘어가면 뺏긴 느낌이 든다.
  useEffect(() => {
    if (count < 2 || paused || reducedMotion) return
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % count), ROTATE_MS)
    return () => window.clearTimeout(t)
  }, [index, count, paused, reducedMotion])

  /** 카드 <section> 에 그대로 펼친다 — ref 와 멈춤 핸들러가 함께 붙어야 한다. */
  const holdProps = {
    ref: rootRef,
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocusCapture: () => setPaused(true),
    onBlurCapture: (e: React.FocusEvent) => {
      if (!rootRef.current?.contains(e.relatedTarget as Node)) setPaused(false)
    },
  }

  return {
    // 목록이 줄어든 직후 한 프레임 동안 index 가 범위를 벗어날 수 있다.
    index: count > 0 ? Math.min(index, count - 1) : 0,
    setIndex,
    holdProps,
  }
}

/** 카드 머리의 3/5 표시 — 몇 건 중 몇 번째인지 알아야 기다릴지 넘길지 정한다. */
export function RotationCounter({ index, count }: { index: number; count: number }) {
  if (count < 2) return null
  return (
    <span className="ml-auto text-[12px] tabular-nums text-neutral-400">
      {index + 1}/{count}
    </span>
  )
}

/** 점. 자동 회전을 기다리지 않고 직접 넘기는 유일한 손잡이다. */
export function RotationDots({
  count,
  index,
  onSelect,
  label,
}: {
  count: number
  index: number
  onSelect: (i: number) => void
  /** "치험례" → "3번째 치험례 보기" */
  label: string
}) {
  if (count < 2) return null

  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={`${i + 1}번째 ${label} 보기`}
          aria-current={i === index}
          className={
            i === index
              ? 'h-1.5 w-4 rounded-full bg-blue-500 transition-all'
              : 'h-1.5 w-1.5 rounded-full bg-neutral-300 transition-all hover:bg-neutral-400'
          }
        />
      ))}
    </div>
  )
}
