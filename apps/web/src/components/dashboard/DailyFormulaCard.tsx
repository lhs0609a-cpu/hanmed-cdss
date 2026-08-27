import { Link } from 'react-router-dom'
import { ChevronRight, FlaskConical } from 'lucide-react'
import { Toss3DIcon } from '@/components/common/Toss3DIcon'
import { useCorpusStats } from '@/hooks/useCorpusStats'
import { useDailyFormulas } from '@/hooks/useDailyPicks'
import {
  RotationCounter,
  RotationDots,
  useDailyRotation,
} from '@/components/dashboard/DailyRotation'

/**
 * 오늘의 처방.
 *
 * 오늘의 치험례와 같은 자리에 두는 이유 — 대시보드 왼쪽 카드들(경과 확인·환자
 * 리포트·이탈 환자·최근 진료)은 전부 사용자 데이터에 의존해서 신규 한의사에게는
 * 동시에 빈다. 카탈로그는 가입 첫날에도 비지 않는 자산이라 그 구멍을 메운다.
 *
 * 하루 다섯 개가 한 자리에서 돌아간다(치험례·약재와 같은 규칙). 회전 규칙은
 * DailyRotation 한 곳에 있다 — 셋이 제각각 돌면 오른쪽 열이 산만해진다.
 *
 * 군신좌사로 묶으려 했다가 뺐다 — 카탈로그 404종 **전부** role 이 비어 있어서
 * 그리면 모든 처방이 '역할 없음' 한 줄로 나온다. 없는 것을 있는 것처럼 그리는
 * 자리를 만드느니 구성과 용량을 그대로 보여주는 편이 낫다. 용량은 고전 표기
 * (二錢半, 各一錢半)인데 한의사가 보는 화면이라 그대로 쓴다.
 *
 * 주치는 404종 중 41종에만 있다. 있으면 보여주고 없으면 그 줄이 없다.
 *
 * 못 불러오면 카드를 통째로 숨긴다 — 매일 여는 자리에 매일 실패가 보이면
 * 그 자리가 죽는다.
 */

/** 카드 안에 늘어놓을 약재 수. 넘치면 "외 N종" 한 줄로 접는다. */
const HERB_LINES = 6

export function DailyFormulaCard() {
  const { data: corpus, isLoading: corpusLoading } = useCorpusStats()
  const { data: formulas, isLoading } = useDailyFormulas(corpus?.formulas)

  const count = formulas?.length ?? 0
  const { index, setIndex, holdProps } = useDailyRotation(count, formulas?.[0]?.id)

  // 총 건수를 알아야 어느 처방을 뽑을지 정해지므로 그동안 daily 쿼리는 disabled 다.
  // v5 에서 disabled 쿼리의 isLoading 은 false 라 이 조건을 빼면 깜빡임이 생긴다.
  if (corpusLoading || isLoading) {
    return (
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[var(--shadow-2)]">
        <div className="h-3 w-20 animate-pulse rounded bg-neutral-100" />
        <div className="mt-3 h-5 w-2/3 animate-pulse rounded bg-neutral-100" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-neutral-100" />
        <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-neutral-100" />
      </section>
    )
  }

  if (!formulas || count === 0) return null

  const f = formulas[index]
  if (!f?.name) return null

  const herbs = (f.herbs ?? []).filter((h) => h?.name?.trim())

  return (
    <section
      {...holdProps}
      className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[var(--shadow-2)]"
    >
      <div className="flex items-center gap-2">
        <Toss3DIcon icon={FlaskConical} tone="blue" size="xs" />
        <p className="text-[13px] font-medium text-neutral-500">오늘의 처방</p>
        <RotationCounter index={index} count={count} />
      </div>

      {/* 처방마다 약재 수가 달라 높이가 튀면 아래 카드까지 흔들린다 — 바닥을 잡아 둔다. */}
      <div key={f.id} className="mt-3 min-h-[228px] animate-fade-in">
        <p className="text-[16px] font-bold leading-snug tracking-tight text-neutral-900">
          {f.name}
          {f.hanja && (
            <span className="ml-1.5 text-[14px] font-medium text-neutral-400">
              {f.hanja}
            </span>
          )}
        </p>

        {f.indication && (
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-neutral-600">
            {f.indication}
          </p>
        )}

        {herbs.length > 0 && (
          <ul className="mt-3 space-y-1">
            {herbs.slice(0, HERB_LINES).map((h, i) => (
              <li
                key={`${h.name}-${i}`}
                className="flex items-baseline justify-between gap-3 text-[13px] leading-relaxed"
              >
                <span className="text-neutral-700">{h.name}</span>
                {h.amount && (
                  <span className="shrink-0 text-neutral-400">{h.amount}</span>
                )}
              </li>
            ))}
            {herbs.length > HERB_LINES && (
              <li className="text-[12px] text-neutral-400">
                외 {herbs.length - HERB_LINES}종
              </li>
            )}
          </ul>
        )}

        {f.source && (
          <p className="mt-3 text-[12px] text-neutral-500">출전 {f.source}</p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <Link
          to={`/dashboard/formulas/${f.id}`}
          className="group inline-flex items-center gap-1 text-[13px] font-semibold text-blue-600 hover:text-blue-700"
        >
          이 처방 자세히 보기
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <RotationDots
          count={count}
          index={index}
          onSelect={setIndex}
          label="처방"
        />
      </div>
    </section>
  )
}

export default DailyFormulaCard
