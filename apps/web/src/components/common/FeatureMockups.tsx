/**
 * 기능 카드용 실제 화면 미니 목업 컴포넌트들.
 *
 * 이모지·일러스트 대신 실제 제품 화면을 축소·정제해 보여줘 신뢰감을 높임.
 * 랜딩 페이지·통합 검색·기능 소개 등 여러 곳에서 재사용한다.
 */

interface MockupProps {
  /** sm = 카드 안 작은 자리, md = 랜딩 기본 */
  size?: 'sm' | 'md'
}

const heightClass = (size: 'sm' | 'md' = 'md') => (size === 'sm' ? 'h-24' : 'h-32')

/** 변증 추론 결과 — 검정 카드 */
export function MockupPatternDiagnosis({ size = 'md' }: MockupProps) {
  return (
    <div className={`w-full ${heightClass(size)} rounded-xl bg-neutral-900 p-3 text-white`}>
      <p className="text-[10px] text-white/50 mb-1">변증 추론 결과</p>
      <div className="flex items-baseline justify-between mb-1.5">
        <p className={size === 'sm' ? 'text-[14px] font-bold tracking-tight' : 'text-[18px] font-bold tracking-tight'}>
          혈허(血虛)
        </p>
        <span className="text-[10px] font-bold tabular bg-white/15 px-1.5 py-0.5 rounded">100%</span>
      </div>
      <div className="h-px bg-white/10 my-1.5" />
      <div className="flex items-center gap-1.5 text-[10px] text-white/70">
        <span className="px-1.5 py-0.5 rounded bg-white/10">보혈(補血)</span>
        <span className="px-1.5 py-0.5 rounded bg-white/10">사물탕</span>
      </div>
    </div>
  )
}

/** 치험례 검색 — 검색바 + 결과 리스트 */
export function MockupCaseSearch({ size = 'md' }: MockupProps) {
  return (
    <div className={`w-full ${heightClass(size)} rounded-xl bg-white border border-neutral-200 p-3`}>
      <div className="flex items-center gap-1.5 bg-neutral-50 rounded-md px-2 py-1.5 mb-2">
        <svg className="w-3 h-3 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3-3" />
        </svg>
        <span className="text-[11px] text-neutral-500">감기 오한 발열</span>
      </div>
      <div className="space-y-1">
        {[
          { name: '갈근탕', pct: 92 },
          { name: '소청룡탕', pct: 87 },
          { name: '천궁차조산', pct: 84 },
        ]
          .slice(0, size === 'sm' ? 2 : 3)
          .map((r) => (
            <div key={r.name} className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-700 font-medium">{r.name}</span>
              <span className="tabular font-bold text-neutral-900">{r.pct}%</span>
            </div>
          ))}
      </div>
    </div>
  )
}

/** 삭감 예측 — 게이지 */
export function MockupClaimCheck({ size = 'md' }: MockupProps) {
  return (
    <div className={`w-full ${heightClass(size)} rounded-xl bg-white border border-neutral-200 p-3 flex flex-col justify-center`}>
      <p className="text-[10px] text-neutral-500 mb-1">삭감 위험도</p>
      <p className={size === 'sm' ? 'text-[16px] font-bold tabular text-neutral-900' : 'text-[20px] font-bold tabular text-neutral-900'}>
        12%
      </p>
      <div className="mt-2 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
        <div className="h-full w-[12%] bg-emerald-500 rounded-full" />
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span className="text-[10px] text-neutral-600 font-medium">안전 — 청구 가능</span>
      </div>
    </div>
  )
}

/** 음성 차트 — 파형 + SOAP */
export function MockupVoiceChart({ size = 'md' }: MockupProps) {
  const bars = [3, 6, 9, 12, 8, 14, 10, 16, 11, 7, 13, 9, 5, 8, 11, 14, 10, 6, 4, 7]
  return (
    <div className={`w-full ${heightClass(size)} rounded-xl bg-white border border-neutral-200 p-3 flex flex-col`}>
      <div className={`flex items-end gap-[2px] ${size === 'sm' ? 'h-8' : 'h-12'} mb-2`}>
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-neutral-900 rounded-sm"
            style={{ height: `${(h / 16) * 100}%` }}
          />
        ))}
      </div>
      <div className="text-[10px] text-neutral-500 leading-relaxed border-t border-neutral-100 pt-2">
        <span className="font-bold text-neutral-900">S</span>: 두통 3일 ·{' '}
        <span className="font-bold text-neutral-900">O</span>: 맥부삭 ·{' '}
        <span className="font-bold text-neutral-900">A</span>: 풍열
      </div>
    </div>
  )
}

/** 약물 상호작용 — 양약+한약 CRITICAL */
export function MockupInteraction({ size = 'md' }: MockupProps) {
  return (
    <div className={`w-full ${heightClass(size)} rounded-xl bg-white border border-neutral-200 p-3 flex flex-col justify-center`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 bg-neutral-50 rounded-md px-2 py-1.5 text-center">
          <p className="text-[9px] text-neutral-500">양약</p>
          <p className="text-[12px] font-bold text-neutral-900">와파린</p>
        </div>
        <span className="text-neutral-400 text-[14px]">+</span>
        <div className="flex-1 bg-neutral-50 rounded-md px-2 py-1.5 text-center">
          <p className="text-[9px] text-neutral-500">한약</p>
          <p className="text-[12px] font-bold text-neutral-900">당귀</p>
        </div>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-md px-2 py-1.5 text-center">
        <p className="text-[10px] font-bold text-red-700">CRITICAL · 병용 금기</p>
      </div>
    </div>
  )
}

/** 처방 검색 — 처방명 + 약재 군신좌사 */
export function MockupFormulaSearch({ size = 'md' }: MockupProps) {
  const herbs = [
    '갈근 12g · 군',
    '마황 8g · 신',
    '계지 6g · 좌',
    '작약 6g · 좌',
    '감초 4g · 사',
    '생강 4g · 사',
  ]
  return (
    <div className={`w-full ${heightClass(size)} rounded-xl bg-white border border-neutral-200 p-3`}>
      <div className="flex items-baseline gap-2 mb-2">
        <p className="text-[14px] font-bold text-neutral-900">갈근탕</p>
        <p className="text-[10px] text-neutral-500">葛根湯</p>
      </div>
      <div className="h-px bg-neutral-100 mb-2" />
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-neutral-600">
        {herbs.slice(0, size === 'sm' ? 4 : 6).map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
    </div>
  )
}
