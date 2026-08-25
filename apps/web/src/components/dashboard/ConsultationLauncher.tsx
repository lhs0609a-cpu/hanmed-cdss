import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Stethoscope } from 'lucide-react'
import { Toss3DIcon } from '@/components/common/Toss3DIcon'

/**
 * 진료 진입 — 카드가 아니라 입력창이다.
 *
 * 전에는 "증상 입력하고 처방 후보 받기" 라는 카드였다. 동작을 설명만 하고
 * 실제 입력은 다음 화면에서 받으니, 매일 제일 많이 하는 일에 클릭이 한 번 더
 * 붙어 있었다. 입력창을 여기 두면 그 한 번이 사라진다.
 *
 * 예시 칩은 장식이 아니다. 처음 온 한의사는 "여기 뭘 어떻게 적어야 하나" 에서
 * 멈춘다. 눌러서 바로 결과까지 가 보게 해서 그 멈춤을 없앤다.
 */

const EXAMPLES = ['소화불량, 복부냉감', '견비통', '불면', '만성 피로'] as const

export function ConsultationLauncher() {
  const [value, setValue] = useState('')
  const navigate = useNavigate()

  const go = (cc: string) => {
    const q = cc.trim()
    // 비어 있으면 그냥 진료 화면으로 — 입력은 거기서 받는다.
    navigate(q ? `/dashboard/consultation?cc=${encodeURIComponent(q)}` : '/dashboard/consultation')
  }

  return (
    <section
      className="relative overflow-hidden rounded-2xl p-6 text-white accent-gradient accent-glow"
      aria-labelledby="consultation-launcher-title"
    >
      {/* 유리 광택 — 좌상단 하이라이트 */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-24 h-56 w-56 rounded-full"
        style={{
          background: 'radial-gradient(circle at center, rgba(255,255,255,0.30), transparent 68%)',
          filter: 'blur(8px)',
        }}
      />

      <div className="relative">
        <div className="flex items-center gap-2">
          <Toss3DIcon icon={Stethoscope} tone="teal" size="sm" />
          <span className="text-[13px] font-medium text-white/75">진료 시작</span>
        </div>

        <h2
          id="consultation-launcher-title"
          className="mt-2 text-[22px] font-bold tracking-tight"
        >
          환자 주소증을 입력하세요
        </h2>
        <p className="mt-1 text-[13px] text-white/75">
          변증 후보와 유사 치험례를 근거와 함께 정리해 드립니다.
        </p>

        <form
          className="mt-4 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            go(value)
          }}
        >
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="예: 소화불량, 복부냉감"
            aria-label="환자 주소증"
            className="min-w-0 flex-1 rounded-xl border border-white/25 bg-white/15 px-4 py-3 text-[15px] text-white placeholder:text-white/60 outline-none backdrop-blur-sm transition-colors focus:border-white/50 focus:bg-white/20"
          />
          <button
            type="submit"
            aria-label="진료 시작"
            className="flex-shrink-0 rounded-xl bg-white/95 p-3 text-neutral-900 transition-transform hover:scale-105 active:scale-95"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => go(ex)}
              className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-[12px] font-medium text-white/85 transition-colors hover:bg-white/20"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
