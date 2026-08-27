import { Link } from 'react-router-dom'
import { BookOpen, ChevronRight } from 'lucide-react'
import { Toss3DIcon } from '@/components/common/Toss3DIcon'
import { useCorpusStats } from '@/hooks/useCorpusStats'
import { useDailyCases, type DailyCase } from '@/hooks/useDailyCase'
import {
  RotationCounter,
  RotationDots,
  useDailyRotation,
} from '@/components/dashboard/DailyRotation'

/**
 * 오늘의 치험례.
 *
 * 링크가 아니라 내용을 편다. 치험례 상세 라우트가 따로 없기도 하지만, 그보다
 * 매일 열 이유를 만들려면 클릭 전에 이미 읽을 것이 있어야 한다. 카드를 눌러야
 * 뭔가 나오는 구조면 "또 뭔가 시키는 화면" 이 된다.
 *
 * 한 자리에서 다섯 건이 돌아간다. 첫 화면에 머무는 시간은 몇 초뿐이라, 한 건만
 * 놓아두면 "사례 하나" 로 읽히고 다섯 건이 스치면 "사례가 쌓여 있다" 로 읽힌다.
 * 멈춤·간격·점 같은 회전 규칙은 처방·약재 카드와 똑같아야 해서 DailyRotation
 * 한 곳에 모아 두고 셋이 같이 쓴다.
 *
 * 사례가 없거나 못 불러오면 카드를 통째로 숨긴다. 첫 화면에서 "오늘의 치험례를
 * 불러오지 못했습니다" 는 빈 카드보다 나쁘다 — 매일 여는 자리에 매일 실패가
 * 보이면 그 자리가 죽는다.
 */

/** 40 → "40대", null → '' */
function ageLabel(age: number | null): string {
  if (typeof age !== 'number' || Number.isNaN(age) || age <= 0) return ''
  return `${Math.floor(age / 10) * 10}대`
}

function genderLabel(g: string | null): string {
  if (!g) return ''
  const v = String(g).toLowerCase()
  if (v === 'male' || v === 'm' || v === '남' || v === '남성') return '남성'
  if (v === 'female' || v === 'f' || v === '여' || v === '여성') return '여성'
  return ''
}

/** 카드 제목 — 정리된 요약이 있으면 그것부터. 원문 주소증은 문장 중간에서 잘려 시작한다. */
function headline(c: DailyCase): string {
  return c.summaryOneLine || c.title || c.chiefComplaint || '(주소증 미기재)'
}

/** 본문 — 제목이 요약이면 같은 문장을 두 번 보여주지 않도록 특징을 쓴다. */
function body(c: DailyCase): string {
  if (c.summaryOneLine && c.distinctive) return c.distinctive
  if (c.distinctive) return c.distinctive
  return c.chiefComplaint || ''
}

function chipsOf(c: DailyCase): string[] {
  return [
    [ageLabel(c.patientAge), genderLabel(c.patientGender)].filter(Boolean).join(' '),
    c.constitution,
    c.diagnosis,
    c.formulaName,
    c.outcome,
  ].filter((v): v is string => Boolean(v && String(v).trim()))
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-lg bg-neutral-100 px-2 py-1 text-[12px] font-medium text-neutral-600">
      {children}
    </span>
  )
}

export function DailyCaseCard() {
  const { data: corpus, isLoading: corpusLoading } = useCorpusStats()
  const { data: cases, isLoading } = useDailyCases(corpus?.cases)

  const count = cases?.length ?? 0
  const { index, setIndex, holdProps } = useDailyRotation(count, cases?.[0]?.id)

  // 코퍼스 건수를 알아야 어느 사례를 뽑을지 정해지므로, 그동안 daily 쿼리는
  // disabled 다. v5 에서 disabled 쿼리의 isLoading 은 false 라 이 조건을 빼면
  // 카드가 사라졌다 나타나는 깜빡임이 생긴다.
  if (corpusLoading || isLoading) {
    return (
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[var(--shadow-2)]">
        <div className="h-3 w-24 animate-pulse rounded bg-neutral-100" />
        <div className="mt-3 h-5 w-3/4 animate-pulse rounded bg-neutral-100" />
        <div className="mt-2 h-4 w-full animate-pulse rounded bg-neutral-100" />
        <div className="mt-3 flex gap-2">
          <div className="h-6 w-14 animate-pulse rounded-lg bg-neutral-100" />
          <div className="h-6 w-20 animate-pulse rounded-lg bg-neutral-100" />
        </div>
      </section>
    )
  }

  if (!cases || count === 0) return null

  const c = cases[index]
  const chips = chipsOf(c)
  const text = body(c)

  return (
    <section
      {...holdProps}
      className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[var(--shadow-2)]"
    >
      <div className="flex items-center gap-2">
        <Toss3DIcon icon={BookOpen} tone="amber" size="xs" />
        <p className="text-[13px] font-medium text-neutral-500">오늘의 치험례</p>
        <RotationCounter index={index} count={count} />
      </div>

      {/* 건마다 길이가 달라 카드 높이가 튀면 옆 카드까지 흔들린다 — 바닥을 잡아 둔다. */}
      <div key={c.id} className="mt-3 min-h-[148px] animate-fade-in">
        <p className="text-[16px] font-bold leading-snug tracking-tight text-neutral-900">
          {headline(c)}
        </p>

        {text && (
          <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-neutral-600">
            {text}
          </p>
        )}

        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {chips.slice(0, 5).map((v, i) => (
              <Chip key={`${v}-${i}`}>{v}</Chip>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <Link
          to="/dashboard/cases"
          className="group inline-flex items-center gap-1 text-[13px] font-semibold text-blue-600 hover:text-blue-700"
        >
          비슷한 사례 더 찾기
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <RotationDots count={count} index={index} onSelect={setIndex} label="치험례" />
      </div>
    </section>
  )
}
