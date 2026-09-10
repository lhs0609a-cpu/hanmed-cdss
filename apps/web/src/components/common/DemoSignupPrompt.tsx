import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

/**
 * 체험을 한 바퀴 돌린 직후 띄우는 회원가입 안내.
 *
 * 왜 이 자리인가 — 가치를 확인한 직후가 가장 설득력 있는 순간이다. 들어오자마자
 * 띄우면 아직 뭘 얻는지 모르는 사람에게 가입을 조르는 것이고, 나갈 때 띄우면
 * 이미 마음이 떠난 뒤다. 처방과 근거가 화면에 뜬 그 자리에서 묻는다.
 *
 * 한 번만 띄운다 — 체험 중에 진단을 두세 번 돌려보는 사람이 있는데, 그때마다
 * 막아서면 체험이 아니라 방해가 된다. 닫으면 그 세션에서는 다시 뜨지 않는다.
 * sessionStorage 를 쓰는 이유도 같다. 브라우저를 닫고 다시 온 사람은 다시
 * 볼 만하지만, 같은 방문 안에서 두 번 볼 이유는 없다.
 *
 * 체험 계정이 아니면 아무것도 그리지 않는다.
 */

const SEEN_KEY = 'demo-signup-prompt-seen'

/** 가입하면 열리는 것 — 체험에서 잠겨 있던 것들과 짝을 맞춘다. */
const UNLOCKS = [
  '치험례 16,000건 전체 검색·열람',
  '내 환자로 기록하고 다음 진료에서 이어보기',
  '한약재·DUR 병용금기 조회',
  '침구 혈자리, 커뮤니티, AI 상담',
] as const

export function DemoSignupPrompt({
  /** 체험 한 바퀴가 끝났는가 — 결과가 화면에 뜬 시점에 true 로 준다 */
  triggered,
}: {
  triggered: boolean
}) {
  const isDemo = useAuthStore((s) => s.user?.isDemo === true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!isDemo || !triggered) return
    let seen = false
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === '1'
    } catch {
      // 시크릿 모드 등에서 막힌다. 못 읽으면 안 본 것으로 치고 한 번 띄운다.
      seen = false
    }
    if (seen) return
    // 결과가 그려지고 눈이 한 번 훑을 틈을 준 뒤에 띄운다. 결과와 동시에
    // 덮으면 무엇을 얻었는지 보기도 전에 가입을 조르는 꼴이 된다.
    const timer = window.setTimeout(() => setOpen(true), 2200)
    return () => window.clearTimeout(timer)
  }, [isDemo, triggered])

  if (!isDemo || !open) return null

  const dismiss = () => {
    setOpen(false)
    try {
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      // 저장 못 해도 닫히기는 해야 한다.
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-signup-title"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="닫기"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-[12px] font-semibold text-blue-700">체험판</p>
        <h3
          id="demo-signup-title"
          className="mt-1 text-[19px] font-bold leading-snug text-neutral-900"
        >
          여기까지가 체험입니다
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">
          방금 보신 처방과 근거는 실제 분석 결과입니다. 체험은 여기까지 보여드리고,
          나머지는 회원가입하면 열립니다.
        </p>

        <ul className="mt-4 space-y-2">
          {UNLOCKS.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
              <span className="text-[13.5px] text-neutral-700">{item}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-[12.5px] text-neutral-500">
          체험 계정은 여러 사람이 함께 쓰기 때문에 아무것도 저장되지 않습니다.
          가입하시면 이 진료를 내 기록으로 남길 수 있습니다.
        </p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-[14px] font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            체험 계속하기
          </button>
          <Link
            to="/register"
            onClick={dismiss}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-blue-700"
          >
            무료로 회원가입
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default DemoSignupPrompt
