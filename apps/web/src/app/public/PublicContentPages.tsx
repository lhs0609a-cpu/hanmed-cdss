import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api } from '@/services/api'
import { useSEO } from '@/hooks/useSEO'
import { trackGrowth } from '@/lib/growth'
import './public-content.css'

/**
 * 로그인 전에 읽히는 화면.
 *
 * 마크업은 scripts/prerender-public.mjs 가 굽는 HTML 과 같은 모양이어야
 * 한다. 크롤러는 구운 HTML 을, 사람은 이 화면을 보는데 둘이 다르면
 * 클로킹이고 색인에서 빠진다. 가려진 부분은 양쪽 모두에서 똑같이 가린다.
 *
 * 무엇을 가릴지는 여기서 정하지 않는다. 서버가 티저 칼럼만 보내므로
 * 애초에 가릴 내용이 응답에 없다.
 */

type CaseTeaser = {
  slug: string
  book: string
  title: string
  chiefComplaint: string
  recordedYear: number
  sourceEdition: string
  locked: string[]
}

type FormulaTeaser = {
  slug: string
  name: string
  hanja: string | null
  aliases: string[]
  category: string
  source: string | null
  indication: string | null
  locked: string[]
}

type Page<T> = { items: T[]; total: number; page: number; limit: number }

function useJson<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!path) return
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

/** 잠긴 자리 — 무엇이 있는지 알려주고 들어올 이유를 준다. */
function Locked({ locked, target }: { locked: string[]; target: string }) {
  return (
    <section className="public-locked prerender-locked">
      <h2>이어서 보려면 로그인이 필요합니다</h2>
      <ul>
        {locked.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        <Link
          to="/register"
          className="public-cta"
          data-growth={`public_signup_${target}`}
          onClick={() => trackGrowth('click', { target: `public_signup_${target}` })}
        >
          무료 계정 만들기
        </Link>
        <span className="public-secondary">
          이미 계정이 있으면 <Link to="/login">로그인</Link>
        </span>
      </p>
    </section>
  )
}

function Status({ error }: { error: string | null }) {
  if (!error) return <p className="public-index-lead">불러오는 중입니다…</p>
  return (
    <p className="public-index-lead">
      {error === '404'
        ? '공개된 기록이 아닙니다.'
        : '지금은 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.'}{' '}
      <Link to="/cases">공개 치험례 목록으로</Link>
    </p>
  )
}

export function PublicCaseDetailPage() {
  const { slug = '' } = useParams()
  const { data, error } = useJson<CaseTeaser>(
    slug ? `/public/cases/${encodeURIComponent(slug)}` : null,
  )
  useSEO({
    title: data ? `${data.title} — ${data.book} 치험례` : '공개 치험례',
    description: data
      ? `${data.book}(${data.recordedYear}) 수록 의안. 주소증 ${data.chiefComplaint}. ${data.title}`
      : undefined,
    ogType: 'article',
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
        {data.book} · {data.recordedYear}년
      </p>
      <h1>{data.title}</h1>
      <dl>
        <dt>주소증</dt>
        <dd>{data.chiefComplaint}</dd>
        <dt>출처</dt>
        <dd>{data.sourceEdition}</dd>
      </dl>
      <Locked locked={data.locked} target="case" />
      <p className="public-note prerender-note">
        공개 문헌(中醫笈成, CC0)에 수록된 청대 이전 의안입니다. 단일 증례
        기록이며 개별 처방의 효과를 입증하지 않습니다.
      </p>
    </article>
  )
}

export function PublicFormulaDetailPage() {
  const { slug = '' } = useParams()
  const { data, error } = useJson<FormulaTeaser>(
    slug ? `/public/formulas/${encodeURIComponent(slug)}` : null,
  )
  useSEO({
    title: data
      ? `${data.name}${data.hanja ? `(${data.hanja})` : ''} 주치와 출전`
      : '처방 정보',
    description: data
      ? `${data.name} — ${data.category}. ${data.source ? `출전 ${data.source}. ` : ''}${data.indication ?? ''}`
      : undefined,
    ogType: 'article',
  })
  if (!data)
    return (
      <div className="public-teaser">
        <Status error={error} />
      </div>
    )
  return (
    <article className="public-teaser prerender-teaser">
      <p className="public-kicker prerender-kicker">{data.category}</p>
      <h1>
        {data.name}
        {data.hanja ? `(${data.hanja})` : ''}
      </h1>
      <dl>
        {data.source ? (
          <>
            <dt>출전</dt>
            <dd>{data.source}</dd>
          </>
        ) : null}
        {data.indication ? (
          <>
            <dt>주치</dt>
            <dd>{data.indication}</dd>
          </>
        ) : null}
        {data.aliases.length ? (
          <>
            <dt>이명</dt>
            <dd>{data.aliases.join(', ')}</dd>
          </>
        ) : null}
      </dl>
      <Locked locked={data.locked} target="formula" />
      <p className="public-note prerender-note">
        의료인을 위한 임상 참고 자료입니다. 일반인 대상 의학적 조언의 근거로
        쓸 수 없습니다.
      </p>
    </article>
  )
}

function Pager({
  page,
  total,
  limit,
  onChange,
}: {
  page: number
  total: number
  limit: number
  onChange: (next: number) => void
}) {
  const last = Math.max(1, Math.ceil(total / limit))
  return (
    <nav className="public-pager" aria-label="쪽 이동">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        이전
      </button>
      <span>
        {page} / {last}
      </span>
      <button type="button" disabled={page >= last} onClick={() => onChange(page + 1)}>
        다음
      </button>
    </nav>
  )
}

export function PublicCasesPage() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page')) || 1
  const book = params.get('book') || ''
  const { data, error } = useJson<Page<CaseTeaser>>(
    `/public/cases?page=${page}&limit=20${book ? `&book=${encodeURIComponent(book)}` : ''}`,
  )
  const { data: books } = useJson<{ hanja: string; korean: string }[]>('/public/books')
  useSEO({
    title: book ? `${book} 치험례` : '공개 치험례 — 청대 이전 의안',
    description:
      '공개 문헌에 수록된 청대 이전 의안을 주소증과 출처까지 열람합니다. 처방과 경과는 무료 계정으로 확인할 수 있습니다.',
  })
  const move = (next: Record<string, string>) => {
    const merged = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) v ? merged.set(k, v) : merged.delete(k)
    setParams(merged)
  }
  return (
    <div className="public-index">
      <h1>{book ? `${book} 치험례` : '공개 치험례'}</h1>
      <p className="public-index-lead">
        청대 이전 의안(中醫笈成, CC0)에서 주소증과 출처를 공개합니다. 처방·경과·
        원문 국역은 무료 계정으로 열람할 수 있습니다.
      </p>
      {books ? (
        <div className="public-books">
          <button
            type="button"
            aria-current={!book}
            onClick={() => move({ book: '', page: '' })}
          >
            전체
          </button>
          {books.map((b) => (
            <button
              key={b.korean}
              type="button"
              aria-current={book === b.korean}
              onClick={() => move({ book: b.korean, page: '' })}
            >
              {b.korean}
            </button>
          ))}
        </div>
      ) : null}
      {!data ? (
        <Status error={error} />
      ) : (
        <>
          <ul className="public-list">
            {data.items.map((item) => (
              <li key={item.slug}>
                <Link to={`/cases/${encodeURIComponent(item.slug)}`}>
                  <strong>{item.title}</strong>
                  <span>
                    {item.book} · {item.recordedYear}년 · 주소증 {item.chiefComplaint}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Pager
            page={data.page}
            total={data.total}
            limit={data.limit}
            onChange={(next) => move({ page: String(next) })}
          />
        </>
      )}
    </div>
  )
}

export function PublicFormulasPage() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page')) || 1
  const { data, error } = useJson<Page<FormulaTeaser>>(
    `/public/formulas?page=${page}&limit=20`,
  )
  useSEO({
    title: '처방 사전 — 출전과 주치',
    description:
      '한의학 처방의 출전과 주치를 공개합니다. 구성 약재와 가감·금기는 무료 계정으로 확인할 수 있습니다.',
  })
  return (
    <div className="public-index">
      <h1>처방 사전</h1>
      <p className="public-index-lead">
        처방의 출전과 주치를 공개합니다. 구성 약재·병기 해설·가감 운용·금기는
        무료 계정으로 열람할 수 있습니다.
      </p>
      {!data ? (
        <Status error={error} />
      ) : (
        <>
          <ul className="public-list">
            {data.items.map((item) => (
              <li key={item.slug}>
                <Link to={`/formulas/${encodeURIComponent(item.slug)}`}>
                  <strong>
                    {item.name}
                    {item.hanja ? `(${item.hanja})` : ''}
                  </strong>
                  <span>
                    {item.category}
                    {item.source ? ` · ${item.source}` : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Pager
            page={data.page}
            total={data.total}
            limit={data.limit}
            onChange={(next) => {
              const merged = new URLSearchParams(params)
              merged.set('page', String(next))
              setParams(merged)
            }}
          />
        </>
      )}
    </div>
  )
}
