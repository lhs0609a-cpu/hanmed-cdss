import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api } from '@/services/api'
import { useSEO } from '@/hooks/useSEO'
import { trackGrowth } from '@/lib/growth'
import type { RelatedPaper } from '@/lib/relatedResearch'
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

type HerbTeaser = {
  slug: string
  name: string
  hanja: string | null
  aliases: string[]
  category: string
  scientificName: string | null
  latinName: string | null
  englishName: string | null
  medicinalPart: string | null
  pharmacopoeia: string | null
  taxonomy: string | null
  properties: { nature?: string; flavor?: string; text?: string } | null
  meridianTropism: string[]
  efficacy: string | null
  locked: string[]
}

type ReferenceTeaser = {
  slug: string
  source: string
  externalId: string
  title: string
  titleKo: string | null
  summaryKo: string | null
  authors: string[]
  journal: string | null
  publishedYear: number | null
  doi: string | null
  url: string
  keywords: string[]
  category: string
  evidenceType: string
  language: string
  locked: string[]
}

/**
 * 근거 유형·분류의 한국어 이름.
 *
 * 네이버는 한국어 본문이 없는 쪽을 색인하지 않는다. rct·systematic_review 를
 * 그대로 두면 영문 논문 쪽에는 한국어가 제목 한 줄뿐이다.
 */
export const EVIDENCE_LABEL: Record<string, string> = {
  systematic_review: '체계적 고찰·메타분석',
  rct: '무작위 대조 시험',
  observational: '관찰 연구',
  case_report: '증례 보고',
  guideline: '진료지침·고시',
  review: '종설',
  unknown: '유형 미상',
}

export const REFERENCE_CATEGORY_LABEL: Record<string, string> = {
  acupuncture: '침구',
  herbal: '한약·처방',
  diagnosis: '진단·변증',
  rehab: '추나·재활',
  safety: '안전성·상호작용',
  admin: '행정·청구·심사',
  other: '기타',
}

export const REFERENCE_SOURCE_LABEL: Record<string, string> = {
  kci: '한국학술지인용색인(KCI)',
  pubmed: 'PubMed',
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
  const related = useRelated('formulas', slug)
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
      <Related papers={related} />
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

/**
 * 관련 연구 — 빌드 때 짝지어 둔 것을 읽는다.
 *
 * API 에 묻지 않는 이유: 같은 일을 DB 에 시키면 LIKE '%이름%' 가 4만 행을
 * 훑어 24초가 걸린다. 인증 없는 경로에 둘 수 있는 질의가 아니다.
 * 프리렌더가 이미 맞춰 둔 것을 정적 파일로 받는다 — 구운 HTML 과 같은
 * 자료라서 크롤러와 사람이 같은 것을 본다.
 */
function useRelated(kind: 'formulas' | 'herbs', slug: string) {
  const [map, setMap] = useState<Record<string, RelatedPaper[]> | null>(null)
  useEffect(() => {
    let live = true
    fetch(`/data/related-${kind}.json`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((json) => live && setMap(json))
      // 이 칸은 없어도 쪽이 성립한다. 못 받으면 조용히 비운다.
      .catch(() => live && setMap({}))
    return () => {
      live = false
    }
  }, [kind])
  return map?.[slug] ?? []
}

/** 쪽 아래 관련 연구 목록. 프리렌더의 relatedHtml 과 같은 것을 그린다. */
function Related({ papers }: { papers: RelatedPaper[] }) {
  if (!papers.length) return null
  return (
    <section className="public-related">
      <h2>관련 연구</h2>
      <ul className="public-list">
        {papers.map((p) => (
          <li key={p.slug}>
            <Link to={`/references/${encodeURIComponent(p.slug)}`}>
              <strong>{p.title}</strong>
              <span>
                {EVIDENCE_LABEL[p.evidenceType] ?? ''}
                {p.journal ? ` · ${p.journal}` : ''}
                {p.publishedYear ? ` · ${p.publishedYear}` : ''}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="public-related-note">
        이름이 제목이나 요약에 나오는 문헌을 모은 것입니다. 해당 처방·약재를
        다룬 연구인지는 원문에서 확인하십시오.
      </p>
    </section>
  )
}

/**
 * 분류가 붙지 않은 약재의 category 값. 636종 중 490종이 여기 해당한다.
 * 머리글에 그대로 쓰면 대부분의 쪽이 "미분류" 로 시작한다.
 */
const HERB_CATEGORY_UNSET = '미분류'

/** 머리글 — 효능 분류가 없으면 과명, 그것도 없으면 약용부위를 쓴다. */
function herbKicker(herb: HerbTeaser): string {
  if (herb.category && herb.category !== HERB_CATEGORY_UNSET) return herb.category
  return herb.taxonomy ?? herb.medicinalPart ?? '한약재'
}

/**
 * 본초 한 건.
 *
 * 공정서 값(학명·라틴생약명·약용부위·수재 공정서)과 고전 기술을 정리한
 * 참고값(성미·귀경·효능)을 한 화면에 두되 출처를 갈라 적는다. 한의사가
 * 무엇을 믿고 무엇을 확인해야 하는지 스스로 판단할 수 있어야 한다.
 */
export function PublicHerbDetailPage() {
  const { slug = '' } = useParams()
  const { data, error } = useJson<HerbTeaser>(
    slug ? `/public/herbs/${encodeURIComponent(slug)}` : null,
  )
  const related = useRelated('herbs', slug)
  useSEO({
    title: data
      ? `${data.name}${data.hanja ? `(${data.hanja})` : ''} — 성미·귀경과 기원`
      : '본초 정보',
    description: data
      ? `${data.name} ${data.hanja ?? ''} ${data.latinName ?? ''}. ${data.category}. ${
          data.efficacy ?? ''
        }`.trim()
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
      <p className="public-kicker prerender-kicker">{herbKicker(data)}</p>
      <h1>
        {data.name}
        {data.hanja ? `(${data.hanja})` : ''}
      </h1>
      <dl>
        {data.latinName ? (
          <>
            <dt>라틴생약명</dt>
            <dd>{data.latinName}</dd>
          </>
        ) : null}
        {data.scientificName ? (
          <>
            <dt>기원 학명</dt>
            <dd>{data.scientificName}</dd>
          </>
        ) : null}
        {data.taxonomy ? (
          <>
            <dt>과명</dt>
            <dd>{data.taxonomy}</dd>
          </>
        ) : null}
        {data.medicinalPart ? (
          <>
            <dt>약용부위</dt>
            <dd>{data.medicinalPart}</dd>
          </>
        ) : null}
        {data.pharmacopoeia ? (
          <>
            <dt>수재 공정서</dt>
            <dd>{data.pharmacopoeia}</dd>
          </>
        ) : null}
        {data.englishName ? (
          <>
            <dt>영문명</dt>
            <dd>{data.englishName}</dd>
          </>
        ) : null}
        {data.aliases.length ? (
          <>
            <dt>이명</dt>
            <dd>{data.aliases.join(', ')}</dd>
          </>
        ) : null}
        {data.properties?.text || data.properties?.nature || data.properties?.flavor ? (
          <>
            <dt>성미</dt>
            <dd>
              {data.properties.text ??
                [data.properties.nature, data.properties.flavor]
                  .filter(Boolean)
                  .join(' · ')}
            </dd>
          </>
        ) : null}
        {data.meridianTropism.length ? (
          <>
            <dt>귀경</dt>
            <dd>{data.meridianTropism.join(', ')}</dd>
          </>
        ) : null}
        {data.efficacy ? (
          <>
            <dt>효능</dt>
            <dd>{data.efficacy}</dd>
          </>
        ) : null}
      </dl>
      <Related papers={related} />
      <Locked locked={data.locked} target="herb" />
      <p className="public-note prerender-note">
        학명·라틴생약명·약용부위·수재 공정서는 식품의약품안전처 생약 약재정보의
        공식 값입니다. 성미·귀경·효능은 고전 기술을 정리한 참고값이므로 임상
        적용 전 원전을 확인하십시오. 의료인을 위한 자료이며 일반인 대상 의학적
        조언의 근거로 쓸 수 없습니다.
      </p>
    </article>
  )
}

/**
 * 문헌 한 건.
 *
 * 초록 원문은 싣지 않는다 — 저작권이 대개 출판사에 있어 인증한 한의사에게만
 * 보인다. 여기 실리는 한국어 요약은 우리가 쓴 것이다. 원문으로 가는 링크를
 * 항상 함께 준다.
 */
export function PublicReferenceDetailPage() {
  const { slug = '' } = useParams()
  const { data, error } = useJson<ReferenceTeaser>(
    slug ? `/public/references/${encodeURIComponent(slug)}` : null,
  )
  const heading = data ? (data.titleKo ?? data.title) : ''
  useSEO({
    title: data
      ? `${heading} — ${EVIDENCE_LABEL[data.evidenceType] ?? '문헌'}`
      : '문헌 정보',
    description: data
      ? (data.summaryKo ??
        `${data.journal ?? ''} ${data.publishedYear ?? ''} · ${
          REFERENCE_CATEGORY_LABEL[data.category] ?? ''
        } ${heading}`.trim())
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
        {REFERENCE_CATEGORY_LABEL[data.category] ?? '문헌'} ·{' '}
        {EVIDENCE_LABEL[data.evidenceType] ?? '유형 미상'}
      </p>
      <h1>{heading}</h1>
      {data.titleKo && data.titleKo !== data.title ? (
        <p className="public-original-title">{data.title}</p>
      ) : null}
      {data.summaryKo ? <p className="public-summary">{data.summaryKo}</p> : null}
      <dl>
        {data.journal ? (
          <>
            <dt>학술지</dt>
            <dd>
              {data.journal}
              {data.publishedYear ? ` (${data.publishedYear})` : ''}
            </dd>
          </>
        ) : null}
        {data.authors.length ? (
          <>
            <dt>저자</dt>
            <dd>{data.authors.slice(0, 8).join(', ')}</dd>
          </>
        ) : null}
        <dt>수록</dt>
        <dd>{REFERENCE_SOURCE_LABEL[data.source] ?? data.source}</dd>
        {data.doi ? (
          <>
            <dt>DOI</dt>
            <dd>{data.doi}</dd>
          </>
        ) : null}
        {data.keywords.length ? (
          <>
            <dt>키워드</dt>
            <dd>{data.keywords.slice(0, 12).join(', ')}</dd>
          </>
        ) : null}
        <dt>원문</dt>
        <dd>
          <a href={data.url} target="_blank" rel="noopener noreferrer nofollow">
            원문 보기
          </a>
        </dd>
      </dl>
      <Locked locked={data.locked} target="reference" />
      <p className="public-note prerender-note">
        서지 정보와 원문 링크는 {REFERENCE_SOURCE_LABEL[data.source] ?? data.source}
        에서 수집했습니다. 한국어 요약은 기계가 만든 것이므로 임상 판단 전
        원문을 확인하십시오. 초록 원문은 저작권이 출판사에 있어 싣지 않습니다.
      </p>
    </article>
  )
}

export function PublicHerbsPage() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page')) || 1
  const category = params.get('category') || ''
  const { data, error } = useJson<Page<HerbTeaser>>(
    `/public/herbs?page=${page}&limit=20${
      category ? `&category=${encodeURIComponent(category)}` : ''
    }`,
  )
  const { data: categories } = useJson<{ category: string; count: number }[]>(
    '/public/herb-categories',
  )
  useSEO({
    title: category ? `${category} 본초` : '본초 사전 — 기원과 성미·귀경',
    description:
      '대한민국약전·약전외한약규격집에 수재된 한약재의 기원 학명, 라틴생약명, 약용부위, 성미와 귀경을 찾아봅니다.',
  })
  const move = (next: Record<string, string>) => {
    const merged = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) v ? merged.set(k, v) : merged.delete(k)
    setParams(merged)
  }
  return (
    <div className="public-index">
      <h1>{category ? `${category} 본초` : '본초 사전'}</h1>
      <p className="public-index-lead">
        공정서에 수재된 한약재의 기원 학명·라틴생약명·약용부위와 성미·귀경을
        공개합니다. 임상 용량과 배합 금기는 무료 계정으로 열람할 수 있습니다.
      </p>
      {categories ? (
        <div className="public-books">
          <button
            type="button"
            aria-current={!category}
            onClick={() => move({ category: '', page: '' })}
          >
            전체
          </button>
          {categories.map((c) => (
            <button
              key={c.category}
              type="button"
              aria-current={category === c.category}
              onClick={() => move({ category: c.category, page: '' })}
            >
              {c.category} {c.count}
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
                <Link to={`/herbs/${encodeURIComponent(item.slug)}`}>
                  <strong>
                    {item.name}
                    {item.hanja ? `(${item.hanja})` : ''}
                  </strong>
                  <span>
                    {herbKicker(item)}
                    {item.latinName ? ` · ${item.latinName}` : ''}
                    {item.medicinalPart ? ` · ${item.medicinalPart}` : ''}
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

export function PublicReferencesPage() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page')) || 1
  const source = params.get('source') || ''
  const evidenceType = params.get('evidenceType') || ''
  const { data, error } = useJson<Page<ReferenceTeaser>>(
    `/public/references?page=${page}&limit=20${
      source ? `&source=${encodeURIComponent(source)}` : ''
    }${evidenceType ? `&evidenceType=${encodeURIComponent(evidenceType)}` : ''}`,
  )
  useSEO({
    title: '한의학 문헌 — 침구·한약 임상 연구',
    description:
      'KCI 와 PubMed 에서 모은 침구·한약 임상 문헌의 서지와 한국어 요약. 근거 유형과 주제로 추려 봅니다.',
  })
  const move = (next: Record<string, string>) => {
    const merged = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) v ? merged.set(k, v) : merged.delete(k)
    setParams(merged)
  }
  return (
    <div className="public-index">
      <h1>한의학 문헌</h1>
      <p className="public-index-lead">
        침구·한약 임상 문헌의 서지와 한국어 요약을 공개합니다. 초록 원문과 구조
        요약은 무료 계정으로 열람할 수 있습니다.{' '}
        <Link to="/journals">학술지별로 보기</Link>
      </p>
      <div className="public-books">
        <button
          type="button"
          aria-current={!source}
          onClick={() => move({ source: '', page: '' })}
        >
          전체
        </button>
        {Object.entries(REFERENCE_SOURCE_LABEL).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-current={source === key}
            onClick={() => move({ source: key, page: '' })}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="public-books">
        <button
          type="button"
          aria-current={!evidenceType}
          onClick={() => move({ evidenceType: '', page: '' })}
        >
          모든 근거
        </button>
        {['systematic_review', 'rct', 'observational', 'case_report', 'guideline'].map(
          (key) => (
            <button
              key={key}
              type="button"
              aria-current={evidenceType === key}
              onClick={() => move({ evidenceType: key, page: '' })}
            >
              {EVIDENCE_LABEL[key]}
            </button>
          ),
        )}
      </div>
      {!data ? (
        <Status error={error} />
      ) : (
        <>
          <ul className="public-list">
            {data.items.map((item) => (
              <li key={item.slug}>
                <Link to={`/references/${encodeURIComponent(item.slug)}`}>
                  <strong>{item.titleKo ?? item.title}</strong>
                  <span>
                    {EVIDENCE_LABEL[item.evidenceType] ?? ''}
                    {item.journal ? ` · ${item.journal}` : ''}
                    {item.publishedYear ? ` · ${item.publishedYear}` : ''}
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

/**
 * 학술지 허브.
 *
 * 한의사는 "대한한방내과학회지" 를 통째로 검색한다. 논문을 한 편씩만 두면
 * 그 검색어에 닿을 쪽이 없다. 학술지 이름으로 묶은 목록이 그 자리를 맡는다.
 */
export function PublicJournalsPage() {
  const { data, error } = useJson<{ journal: string; slug: string; count: number }[]>(
    '/public/reference-journals',
  )
  useSEO({
    title: '학술지별 한의학 문헌',
    description:
      '대한한방내과학회지·동의생리병리학회지 등 학술지별로 수록된 침구·한약 임상 문헌을 찾아봅니다.',
  })
  return (
    <div className="public-index">
      <h1>학술지별 문헌</h1>
      <p className="public-index-lead">
        학술지 이름으로 침구·한약 문헌을 모아 봅니다. 다섯 편 이상 수록된
        학술지만 싣습니다.
      </p>
      {!data ? (
        <Status error={error} />
      ) : (
        <ul className="public-list">
          {data.map((j) => (
            <li key={j.slug}>
              <Link to={`/journals/${encodeURIComponent(j.slug)}`}>
                <strong>{j.journal}</strong>
                <span>{j.count.toLocaleString('ko-KR')}편</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function PublicJournalDetailPage() {
  const { slug = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page')) || 1
  const { data, error } = useJson<Page<ReferenceTeaser>>(
    slug
      ? `/public/references?page=${page}&limit=20&journal=${encodeURIComponent(slug)}`
      : null,
  )
  useSEO({
    title: `${slug} 수록 논문`,
    description: `${slug}에 실린 침구·한약 임상 문헌의 서지와 한국어 요약을 모았습니다.`,
  })
  return (
    <div className="public-index">
      <h1>{slug}</h1>
      <p className="public-index-lead">
        {slug}에 실린 문헌{data ? ` ${data.total.toLocaleString('ko-KR')}편` : ''}.
        초록 원문과 구조 요약은 무료 계정으로 열람할 수 있습니다.{' '}
        <Link to="/journals">다른 학술지 보기</Link>
      </p>
      {!data ? (
        <Status error={error} />
      ) : (
        <>
          <ul className="public-list">
            {data.items.map((item) => (
              <li key={item.slug}>
                <Link to={`/references/${encodeURIComponent(item.slug)}`}>
                  <strong>{item.titleKo ?? item.title}</strong>
                  <span>
                    {EVIDENCE_LABEL[item.evidenceType] ?? ''}
                    {item.publishedYear ? ` · ${item.publishedYear}` : ''}
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
