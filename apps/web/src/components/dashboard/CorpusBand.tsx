import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useCorpusStats } from '@/hooks/useCorpusStats'

/**
 * 코퍼스 밴드 — 대시보드 오른쪽 '근거' 열의 맨 위.
 *
 * 허영 지표가 아니다. 카피를 "이 판단을 받치는 근거" 로 잡은 이유는, 한의사에게
 * 필요한 정보가 "우리 DB 큽니다" 가 아니라 "내가 낼 처방에 댈 근거가 이만큼 있다"
 * 이기 때문이다. 그래서 숫자마다 실제로 갈 수 있는 화면을 링크로 붙인다.
 *
 * 세지 못한 항목은 0 이나 '-' 로 채우지 않고 아예 뺀다. 근거의 규모를 말하는
 * 자리에서 모르는 값을 그럴듯하게 채우면 그 순간 신뢰가 깨진다.
 */

interface Figure {
  label: string
  value: number | null
  unit: string
  to: string
}

function formatCount(n: number): string {
  return n.toLocaleString('ko-KR')
}

export function CorpusBand() {
  // fetchCorpusStats 는 항목마다 자체 catch 해서 절대 reject 하지 않는다.
  // 그래서 isError 를 볼 필요가 없다 — 못 센 항목은 null 로 와서 아래에서 걸러진다.
  const { data, isLoading } = useCorpusStats()

  // 하나도 못 세면 밴드 자체를 숨긴다 — 빈 껍데기가 붙어 있는 게 없는 것보다 나쁘다.
  const figures: Figure[] = [
    { label: '치험례', value: data?.cases ?? null, unit: '건', to: '/dashboard/cases' },
    { label: '처방', value: data?.formulas ?? null, unit: '종', to: '/dashboard/formulas' },
    { label: '약재', value: data?.herbs ?? null, unit: '종', to: '/dashboard/herbs' },
  ].filter((f) => f.value !== null)

  if (!isLoading && figures.length === 0) return null

  // 살아남은 칸 수만큼만 나눈다 — 셋 중 하나만 세어졌는데 3단 그리드로 두면
  // 숫자 하나에 빈칸 둘이 붙는다. Tailwind JIT 때문에 클래스는 정적이어야 한다.
  const colsClass = figures.length === 1 ? 'grid-cols-1' : figures.length === 2 ? 'grid-cols-2' : 'grid-cols-3'

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[var(--shadow-2)]">
      <div className="flex items-center justify-between px-1">
        <p className="text-[13px] font-medium text-neutral-500">
          이 판단을 받치는 근거
        </p>
        <Link
          to="/dashboard/cases"
          className="group inline-flex items-center gap-0.5 text-[12px] font-medium text-neutral-400 hover:text-neutral-900"
        >
          모두 보기
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-3 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="px-1">
              <div className="h-7 w-20 animate-pulse rounded-md bg-neutral-100" />
              <div className="mt-2 h-3 w-10 animate-pulse rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      ) : (
        <dl className={`mt-3 grid ${colsClass} divide-x divide-neutral-100`}>
          {figures.map((f, i) => (
            <Link
              key={f.label}
              to={f.to}
              className={`group px-1 ${i > 0 ? 'pl-4' : ''} transition-opacity hover:opacity-70`}
            >
              <dd className="flex items-baseline gap-1">
                <span className="text-[26px] font-bold tracking-tight text-neutral-900 tabular-nums">
                  {formatCount(f.value as number)}
                </span>
                <span className="text-[13px] font-medium text-neutral-400">{f.unit}</span>
              </dd>
              <dt className="mt-0.5 text-[12px] text-neutral-500">{f.label}</dt>
            </Link>
          ))}
        </dl>
      )}
    </section>
  )
}
