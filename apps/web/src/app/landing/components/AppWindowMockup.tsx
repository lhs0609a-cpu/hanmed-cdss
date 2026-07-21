/**
 * 대형 제품 목업 — 실사 스크린샷 대신 실제 UI를 코드로 재현한다.
 *
 * 스크린샷 이미지 대비 장점: 어떤 해상도에서도 선명하고, 다크/라이트 대응이 되며,
 * 제품이 바뀌면 여기만 고치면 된다. 번들 크기도 이미지보다 작다.
 *
 * 내용은 실제 화면 구조(좌측 내비 · 변증 결과 · 처방 후보 · 삭감 점검)를 따른다.
 */

function TrafficLights() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
    </div>
  )
}

const NAV_ITEMS = [
  { label: '대시보드', active: false },
  { label: 'AI 변증', active: true },
  { label: '환자 관리', active: false },
  { label: '치험례', active: false },
  { label: '보험청구', active: false },
]

/** 신뢰도 막대 */
function ConfidenceBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium text-white/80">{label}</span>
        <span className="text-[11px] font-bold tabular-nums text-white">{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            background: 'linear-gradient(90deg, #3182F6 0%, #7856FF 100%)',
          }}
        />
      </div>
    </div>
  )
}

export function AppWindowMockup() {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-white/12 backdrop-blur-2xl"
      style={{
        background: 'linear-gradient(160deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%)',
        boxShadow: '0 40px 120px -30px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.14)',
      }}
    >
      {/* 타이틀바 */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <TrafficLights />
        <div className="mx-auto flex items-center gap-2 rounded-md bg-white/8 px-3 py-1">
          <svg className="h-3 w-3 text-white/45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 1 1 8 0v3" />
          </svg>
          <span className="text-[11px] text-white/50">ongojisin.ai</span>
        </div>
      </div>

      <div className="flex min-h-[19rem]">
        {/* 좌측 내비 */}
        <aside className="hidden w-40 shrink-0 border-r border-white/10 p-3 sm:block">
          <div className="mb-4 flex items-center gap-2 px-1">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-black text-white"
              style={{ background: 'linear-gradient(135deg, #3182F6, #7856FF)' }}
            >
              온
            </div>
            <span className="text-[12px] font-bold text-white/90">온고지신</span>
          </div>
          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <div
                key={item.label}
                className={`rounded-md px-2.5 py-1.5 text-[11px] ${
                  item.active
                    ? 'bg-white/12 font-semibold text-white'
                    : 'text-white/45'
                }`}
              >
                {item.label}
              </div>
            ))}
          </nav>
        </aside>

        {/* 본문 */}
        <div className="flex-1 space-y-3 p-4">
          {/* 입력 */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="mb-1.5 text-[10px] uppercase tracking-wide text-white/40">환자 증상</p>
            <p className="text-[12px] leading-relaxed text-white/85">
              40대 여성, 어지럼과 피로 · 안색 창백 · 월경량 감소 · 설담백 · 맥세약
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* 변증 결과 */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="mb-2.5 text-[10px] uppercase tracking-wide text-white/40">변증 추론</p>
              <div className="space-y-2.5">
                <ConfidenceBar value={92} label="혈허(血虛)" />
                <ConfidenceBar value={54} label="기혈양허(氣血兩虛)" />
                <ConfidenceBar value={21} label="간혈허(肝血虛)" />
              </div>
            </div>

            {/* 처방 후보 */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="mb-2.5 text-[10px] uppercase tracking-wide text-white/40">처방 후보</p>
              <div className="space-y-1.5">
                {[
                  { name: '사물탕', note: '補血 기본방' },
                  { name: '팔물탕', note: '氣血 동시 보강' },
                  { name: '귀비탕', note: '心脾 겸허 시' },
                ].map((f, i) => (
                  <div
                    key={f.name}
                    className={`flex items-center justify-between rounded-md px-2 py-1.5 ${
                      i === 0 ? 'bg-white/12' : 'bg-white/[0.04]'
                    }`}
                  >
                    <span className="text-[11px] font-semibold text-white/90">{f.name}</span>
                    <span className="text-[10px] text-white/45">{f.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 안전 점검 바 */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-[10px] font-medium text-emerald-300">
              ✓ 병용 양약 상호작용 없음
            </span>
            <span className="rounded-md border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-[10px] font-medium text-amber-300">
              ! 삭감 위험 1건 — 상병 코드 확인
            </span>
          </div>

          {/* 면책 */}
          <p className="pt-0.5 text-[10px] leading-relaxed text-white/35">
            AI 추론 결과는 참고용 후보이며, 최종 진단과 처방은 한의사가 결정합니다.
          </p>
        </div>
      </div>
    </div>
  )
}
