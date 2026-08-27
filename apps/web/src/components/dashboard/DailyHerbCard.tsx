import { Link } from 'react-router-dom'
import { ChevronRight, Leaf } from 'lucide-react'
import { Toss3DIcon } from '@/components/common/Toss3DIcon'
import { useCorpusStats } from '@/hooks/useCorpusStats'
import { useDailyHerbs, type DailyHerb } from '@/hooks/useDailyPicks'
import {
  RotationCounter,
  RotationDots,
  useDailyRotation,
} from '@/components/dashboard/DailyRotation'

/**
 * 오늘의 약재.
 *
 * 처방보다 단위가 작아 가볍게 읽힌다. 성미귀경은 한 줄로 묶어 보여준다 —
 * 표로 만들면 자리를 많이 먹고, 어차피 여기서 하는 일은 "아, 이 약재가
 * 이런 거였지" 를 되살리는 것까지다.
 *
 * 하루 다섯 종이 한 자리에서 돌아간다(치험례·처방과 같은 규칙, DailyRotation).
 *
 * 효능은 자유 텍스트라 길이가 들쭉날쭉하다. 첫 문장만 쓴다 — 카드가 길어지면
 * 오른쪽 열 전체가 스크롤 덩어리가 된다.
 */

/** 감·신·온 / 간·심·비경 같은 한 줄. 없는 값은 조용히 빠진다. */
function propertyLine(h: DailyHerb): string {
  const p = h.properties ?? {}
  const taste = Array.isArray(p.taste) ? p.taste.join('·') : p.taste || ''
  const left = [taste, p.nature].filter(Boolean).join('·')

  const meridian = (h.meridianTropism ?? []).filter(Boolean)
  const right = meridian.length > 0 ? `${meridian.join('·')}경` : ''

  return [left, right].filter(Boolean).join(' / ')
}

/**
 * 효능 첫 문장.
 *
 * 원자료가 "조각자(皂角刺)-消腫排膿, 治風殺蟲" 처럼 약재 이름을 앞에 다시 달고
 * 오는 경우가 많다. 바로 위에 이름을 크게 써 두고 그 아래 같은 이름을 또 쓰면
 * 읽는 사람이 두 번 읽어야 한다. 앞머리가 이름이면 떼어 낸다.
 */
function efficacyLine(h: DailyHerb): string {
  const raw = (h.efficacy ?? '').trim()
  if (!raw) return ''

  let text = raw
  const name = (h.standardName ?? '').trim()
  if (name && text.startsWith(name)) {
    // 이름 뒤의 (한자) 와 구분자(- : ·) 까지 함께 떼어 낸다.
    const stripped = text
      .slice(name.length)
      .replace(/^\s*\([^)]*\)\s*/, '')
      .replace(/^\s*[-–—:·]\s*/, '')
    if (stripped) text = stripped
  }

  return text.split('.')[0].trim()
}

export function DailyHerbCard() {
  const { data: corpus, isLoading: corpusLoading } = useCorpusStats()
  const { data: herbs, isLoading } = useDailyHerbs(corpus?.herbs)

  const count = herbs?.length ?? 0
  const { index, setIndex, holdProps } = useDailyRotation(count, herbs?.[0]?.id)

  if (corpusLoading || isLoading) {
    return (
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[var(--shadow-2)]">
        <div className="h-3 w-20 animate-pulse rounded bg-neutral-100" />
        <div className="mt-3 h-5 w-1/2 animate-pulse rounded bg-neutral-100" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-neutral-100" />
      </section>
    )
  }

  if (!herbs || count === 0) return null

  const h = herbs[index]
  if (!h?.standardName) return null

  const props = propertyLine(h)
  const efficacy = efficacyLine(h)

  return (
    <section
      {...holdProps}
      className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[var(--shadow-2)]"
    >
      <div className="flex items-center gap-2">
        <Toss3DIcon icon={Leaf} tone="green" size="xs" />
        <p className="text-[13px] font-medium text-neutral-500">오늘의 약재</p>
        <RotationCounter index={index} count={count} />
      </div>

      {/* 효능 길이가 종마다 달라 카드 높이가 튀면 아래 카드까지 흔들린다. */}
      <div key={h.id} className="mt-3 min-h-[104px] animate-fade-in">
        <p className="text-[16px] font-bold leading-snug tracking-tight text-neutral-900">
          {h.standardName}
          {h.hanjaName && (
            <span className="ml-1.5 text-[14px] font-medium text-neutral-400">
              {h.hanjaName}
            </span>
          )}
        </p>

        {props && <p className="mt-1 text-[13px] text-neutral-500">{props}</p>}

        {efficacy && (
          <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-neutral-700">
            {efficacy}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <Link
          to={`/dashboard/herbs/${h.id}`}
          className="group inline-flex items-center gap-1 text-[13px] font-semibold text-blue-600 hover:text-blue-700"
        >
          이 약재 자세히 보기
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <RotationDots count={count} index={index} onSelect={setIndex} label="약재" />
      </div>
    </section>
  )
}

export default DailyHerbCard
