import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PUBLIC_DATA } from '@/data/publicNav'

/**
 * 홈의 "공개 자료" 칸.
 *
 * 프리렌더가 굽는 홈 본문(scripts/page-builders.mjs 의 homeBodyHtml)과 같은
 * 것을 그린다. 여기만 없으면 React 가 붙는 순간 이 칸이 사라져서, 크롤러가
 * 본 것을 사람이 못 보게 된다 — 그게 클로킹이다.
 *
 * 수는 빌드 때 센 값을 `data/public-counts.json` 에서 읽는다. 화면에서 다시
 * 세지 않는 이유는, 세려면 공개 API 를 아홉 번 불러야 하고 그 수가 사이트맵·
 * 구운 홈과 어긋날 수 있어서다. 파일이 없거나 못 읽으면 수 없이 그린다 —
 * 숫자가 틀리게 나오는 것보다 안 나오는 쪽이 낫다.
 */
type Counts = Partial<Record<string, number>>

export default function PublicDataSection() {
  const [counts, setCounts] = useState<Counts>({})

  useEffect(() => {
    let alive = true
    fetch('/data/public-counts.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j && typeof j === 'object') setCounts(j as Counts)
      })
      .catch(() => {
        /* 수 없이 그린다 */
      })
    return () => {
      alive = false
    }
  }, [])

  const fmt = (v?: number) =>
    typeof v === 'number' && v > 0 ? v.toLocaleString('ko-KR') : null
  const total = fmt(
    PUBLIC_DATA.reduce((s, e) => s + (Number(counts[e.key]) || 0), 0),
  )

  return (
    <section
      aria-labelledby="public-data-title"
      className="border-t border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="mx-auto max-w-5xl px-5">
        <h2
          id="public-data-title"
          className="text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:text-3xl"
        >
          공개 자료{total ? <> {total}건</> : null}
        </h2>
        <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-400">
          아래는 가입하지 않아도 전부 열립니다. 고전 의안과 현대 문헌을 같은
          화면에서 잇고, 어느 문헌에서 온 말인지와 우리가 그것을 마지막으로
          확인한 날짜를 함께 보여 줍니다.
        </p>

        <ul className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {PUBLIC_DATA.map((e) => {
            const n = fmt(counts[e.key])
            return (
              <li key={e.key}>
                <Link
                  to={e.href}
                  className="font-semibold text-slate-900 underline-offset-4 hover:underline dark:text-slate-100"
                >
                  {e.label}
                </Link>
                {n ? (
                  <span className="ml-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    {n}건
                  </span>
                ) : null}
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {e.desc}
                </p>
              </li>
            )
          })}
        </ul>

        <div className="mt-10 grid gap-6 border-t border-slate-200 pt-8 dark:border-slate-800 sm:grid-cols-3">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            <strong className="text-slate-900 dark:text-slate-100">
              출처와 확인일을 답니다.
            </strong>{' '}
            수가·급여기준·개설 요건은 해마다 바뀝니다. 날짜 없는 숫자는 그대로
            청구했다가 삭감되는 경로가 됩니다.
          </p>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            <strong className="text-slate-900 dark:text-slate-100">
              글이 임상 주장을 만들지 않습니다.
            </strong>{' '}
            그 처방을 다룬 문헌이 몇 편 있는지 보여 주고 그리로 보냅니다.
          </p>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            <strong className="text-slate-900 dark:text-slate-100">
              로그인 없이 볼 수 있습니다.
            </strong>{' '}
            위 자료는 가입하지 않아도 전부 열립니다.
          </p>
        </div>
      </div>
    </section>
  )
}
