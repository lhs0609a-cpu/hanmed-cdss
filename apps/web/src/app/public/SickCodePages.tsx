import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '@/services/api'
import { useSEO } from '@/hooks/useSEO'
import './public-content.css'

/**
 * 한의과 상병(KCD) 공개 쪽.
 *
 * 마크업은 scripts/page-builders.mjs 가 굽는 HTML 과 같은 모양이어야 한다.
 * 크롤러는 구운 HTML 을, 사람은 이 화면을 보는데 둘이 다르면 클로킹이다.
 *
 * 가리는 것이 없다. 심평원이 공개한 분류이고, 가리면 청구 코드를 찾아온
 * 사람이 아무것도 못 얻고 돌아간다.
 */

interface SickCategory {
  code: string
  nameKo: string
  nameEn: string
}

interface SickRef {
  code: string
  nameKo: string
}

interface SickDetail {
  code: string
  nameKo: string
  nameEn: string
  depth: number
  parent: SickRef | null
  children: SickRef[]
  siblings: SickRef[]
  papers: { slug: string; title: string }[]
}

function useJson<T>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    setData(null)
    setError(null)
    api
      .get<T>(path)
      .then((res) => live && setData(res.data))
      .catch((e) => live && setError(e?.response?.status === 404 ? '404' : 'error'))
    return () => {
      live = false
    }
  }, [path])
  return { data, error }
}

function Status({ error }: { error: string | null }) {
  return (
    <p className="public-index-lead">
      {error === '404'
        ? '공개된 상병이 아닙니다.'
        : error
          ? '지금은 불러올 수 없습니다.'
          : '불러오는 중입니다…'}{' '}
      <Link to="/sick-codes">상병 분류 목록으로</Link>
    </p>
  )
}

/** 코드 목록을 칩으로. 한 분류에 세부가 수십 개라 카드로는 화면을 다 먹는다. */
function CodeChips({ items, label }: { items: SickRef[]; label: string }) {
  if (items.length === 0) return null
  return (
    <>
      <h2>{label}</h2>
      <ul className="public-list public-chips">
        {items.map((c) => (
          <li key={c.code}>
            <Link to={`/sick-codes/${c.code}`}>
              <strong>{c.code}</strong> {c.nameKo}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

/**
 * 첫 글자가 KCD 의 장(章)이다. 2,203개를 한 줄로 늘어놓으면 찾을 수 없어
 * 장별로 묶는다. 장 이름은 우리가 지어내지 않는다 — 원자료가 주지 않으므로
 * 글자만 적고, 뜻은 그 아래 상병명이 말한다.
 */
function byChapter(rows: SickCategory[]) {
  const map = new Map<string, SickCategory[]>()
  for (const r of rows) {
    const key = r.code[0]
    const list = map.get(key) ?? []
    list.push(r)
    map.set(key, list)
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

export function SickCodesIndexPage() {
  const { data, error } = useJson<SickCategory[]>('/public/sick-codes')
  useSEO({
    title: '한의과 상병코드 — KCD 분류',
    description:
      '한의과에서 쓰는 한국표준질병사인분류(KCD) 상병코드를 분류별로 찾아봅니다. 코드와 한글·영문 상병명, 관련 한의학 문헌을 함께 봅니다.',
  })
  const chapters = useMemo(() => (data ? byChapter(data) : []), [data])
  if (!data)
    return (
      <div className="public-index">
        <Status error={error} />
      </div>
    )
  return (
    <div className="public-index">
      <h1>한의과 상병코드</h1>
      <p className="public-index-lead">
        한의과에서 쓰는 한국표준질병사인분류(KCD) 상병입니다. 분류{' '}
        {data.length.toLocaleString('ko-KR')}개를 싣고, 각 분류 쪽에서 그 아래
        세부 상병을 봅니다.
      </p>
      {chapters.map(([chapter, rows]) => (
        <section key={chapter}>
          <h2>{chapter} 코드</h2>
          <ul className="public-list">
            {rows.map((r) => (
              <li key={r.code}>
                <Link to={`/sick-codes/${r.code}`}>
                  <strong>
                    {r.code} {r.nameKo}
                  </strong>
                  <span>{r.nameEn}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="public-note prerender-note">
        건강보험심사평가원 질병정보서비스의 한의과 상병 목록입니다. 청구에
        쓰기 전에 심사기준과 고시 원문을 반드시 확인해야 합니다.
      </p>
    </div>
  )
}

export function SickCodeDetailPage() {
  const { code = '' } = useParams()
  const { data, error } = useJson<SickDetail>(
    `/public/sick-codes/${encodeURIComponent(code)}`,
  )
  useSEO({
    title: data ? `${data.nameKo} 상병코드 ${data.code}` : '한의과 상병코드',
    description: data
      ? `${data.code} ${data.nameKo}${data.nameEn ? ` (${data.nameEn})` : ''}. 한의과 상병코드와 같은 분류의 상병, 관련 한의학 문헌.`
      : undefined,
  })
  if (!data)
    return (
      <div className="public-teaser">
        <Status error={error} />
      </div>
    )
  return (
    <article className="public-teaser prerender-teaser">
      <p className="public-kicker prerender-kicker">
        한의과 상병코드
        {data.parent ? (
          <>
            {' · '}
            <Link to={`/sick-codes/${data.parent.code}`}>
              {data.parent.code} {data.parent.nameKo}
            </Link>
          </>
        ) : null}
      </p>
      <h1>
        {data.code} {data.nameKo}
      </h1>
      <dl>
        <dt>코드</dt>
        <dd>{data.code}</dd>
        <dt>한글명</dt>
        <dd>{data.nameKo}</dd>
        {data.nameEn ? (
          <>
            <dt>영문명</dt>
            <dd>{data.nameEn}</dd>
          </>
        ) : null}
        <dt>구분</dt>
        <dd>{data.depth === 3 ? '분류' : '세부 상병'}</dd>
      </dl>

      <CodeChips items={data.children} label="이 분류의 세부 상병" />
      <CodeChips items={data.siblings} label="같은 분류의 다른 상병" />

      {data.papers.length > 0 ? (
        <>
          <h2>이 상병을 다룬 문헌</h2>
          <ul className="public-list">
            {data.papers.map((p) => (
              <li key={p.slug}>
                <Link to={`/references/${encodeURIComponent(p.slug)}`}>
                  <strong>{p.title}</strong>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p>
        <Link to="/sick-codes">다른 상병 보기</Link>
      </p>
      <p className="public-note prerender-note">
        건강보험심사평가원 질병정보서비스의 한의과 상병입니다. 청구에 쓰기
        전에 심사기준과 고시 원문을 반드시 확인해야 합니다. 이 쪽은 코드와
        이름을 알려줄 뿐 급여 여부를 말하지 않습니다.
      </p>
    </article>
  )
}
