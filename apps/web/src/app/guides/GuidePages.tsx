import { Link, useParams } from 'react-router-dom'
import { useSEO } from '@/hooks/useSEO'
import {
  GUIDES,
  findGuide,
  guideClusters,
  guideLinkHref,
  type Guide,
} from '@/data/guides'
import '../public/public-content.css'
import './guides.css'

/**
 * 검색해서 들어오는 글.
 *
 * 마크업은 scripts/prerender-public.mjs 가 굽는 HTML 과 같은 모양이어야
 * 한다. 크롤러는 구운 HTML 을, 사람은 이 화면을 보는데 둘이 다르면
 * 클로킹이고 색인에서 빠진다.
 */

function Sources({ sources }: { sources: Guide['sources'] }) {
  if (!sources.length) return null
  return (
    <section className="guide-sources">
      <h2>출처</h2>
      <ul>
        {sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.label}
            </a>
            {/*
              발행일이 아니라 우리가 확인한 날이다. 고시는 조용히 바뀌므로
              "언제 봤는지" 가 읽는 사람에게 필요한 정보다.
            */}
            <span className="guide-checked">확인 {s.checkedOn}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function GuideDetailPage() {
  const { slug = '' } = useParams()
  const guide = findGuide(decodeURIComponent(slug))
  useSEO({
    title: guide ? guide.title : '가이드',
    description: guide?.description,
    ogType: 'article',
  })
  if (!guide)
    return (
      <div className="public-teaser">
        <p className="public-index-lead">
          없는 글입니다. <Link to="/guides">가이드 목록으로</Link>
        </p>
      </div>
    )
  return (
    <article className="public-teaser prerender-teaser guide">
      <p className="public-kicker prerender-kicker">
        {guide.cluster} · {guide.audience}
      </p>
      <h1>{guide.title}</h1>
      <p className="public-summary">{guide.description}</p>
      {guide.sections.map((section) => (
        <section key={section.heading} className="guide-section">
          <h2>{section.heading}</h2>
          {section.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {section.caution ? (
            <p className="guide-caution">{section.caution}</p>
          ) : null}
          {section.links?.length ? (
            <ul className="public-list guide-links">
              {section.links.map((link) => (
                <li key={`${link.kind}-${link.slug}-${link.label}`}>
                  <Link to={guideLinkHref(link)}>
                    <strong>{link.label}</strong>
                    {link.note && !link.note.startsWith('/') ? (
                      <span>{link.note}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
      <Sources sources={guide.sources} />
      <p className="public-note prerender-note">
        제도와 수가는 해마다 바뀝니다. 본문의 숫자는 출처에 적힌 확인일 기준이며,
        청구 전에는 심평원 고시 원문을 다시 확인하십시오. 의료인을 위한 참고
        자료이며 진단·처방 지시가 아닙니다.
      </p>
    </article>
  )
}

export function GuidesIndexPage() {
  useSEO({
    title: '한의사를 위한 가이드 — 제도·개원·임상',
    description:
      '첩약 건강보험, 개원 절차, 청구 기준처럼 한의사가 실제로 찾는 것을 1차 출처와 함께 정리했습니다.',
  })
  const clusters = guideClusters()
  return (
    <div className="public-index">
      <h1>한의사를 위한 가이드</h1>
      <p className="public-index-lead">
        제도와 절차는 1차 출처 링크와 확인한 날짜를 함께 싣습니다. 임상 판단은
        글이 대신하지 않고, 처방·본초·의안·문헌 쪽으로 보냅니다. 현재{' '}
        {GUIDES.length}편.
      </p>
      {clusters.map(({ cluster, guides }) => (
        <section key={cluster}>
          <h2>{cluster}</h2>
          <ul className="public-list">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link to={`/guides/${encodeURIComponent(g.slug)}`}>
                  <strong>{g.title}</strong>
                  <span>{g.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
