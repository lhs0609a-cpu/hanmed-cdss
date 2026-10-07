/**
 * 공개 쪽의 HTML 을 만드는 곳. 빌드 때와 요청 때가 같은 것을 쓴다.
 *
 * 원래 프리렌더 스크립트 안에만 있었다. 그때는 모든 쪽을 미리 구웠으니
 * 그래도 됐는데, 문헌이 수만 건으로 늘면서 전부 굽는 것이 배포 용량에서
 * 막혔다. 굽지 않은 쪽은 요청이 올 때 서버리스 함수가 만든다(api/render.mjs).
 *
 * 그 둘이 다른 HTML 을 내면 같은 주소가 언제 받았느냐에 따라 다른 쪽이 된다.
 * 크롤러에게는 그것이 클로킹으로 읽힌다. 그래서 만드는 일은 여기 한 곳에만
 * 둔다 — 고칠 일이 생기면 여기만 고치면 양쪽이 같이 바뀐다.
 */
import { ORIGIN, staticRouteMeta } from './public-routes.mjs'

export const escape = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/**
 * 공개 자료로 들어가는 입구. src/data/publicNav.ts 의 PUBLIC_NAV 와 짝이다.
 *
 * 빌드 스크립트는 TS 를 바로 읽지 못해 한 벌이 더 있다. 홈 푸터·공개 쪽
 * 푸터·구운 HTML 셋이 같은 목록을 보여야 하므로, 고칠 때는 같이 고친다.
 */
const PUBLIC_NAV = [
  ['/cases', '고전 의안'],
  ['/formulas', '처방 사전'],
  ['/herbs', '본초 사전'],
  ['/references', '한의학 문헌'],
  ['/journals', '학술지별 문헌'],
  ['/topics', '주제별 문헌'],
  ['/guides', '한의사 가이드'],
  ['/nonpay', '한방 비급여 가격'],
  ['/sick-codes', '한의과 상병코드'],
]

/**
 * 껍데기의 머리말을 이 쪽 내용으로 바꾸고, #root 안에 본문을 심는다.
 * React 가 붙으면 같은 내용으로 다시 그리므로 화면이 튀지 않는다.
 * bodyHtml 이 없으면 머리말만 고친다 — 본문은 React 에 맡긴다.
 */
export function renderPage(
  shell,
  { url, title, description, bodyHtml, jsonLd, canonical, footer = true },
) {
  // 치환이 안 되면 모든 쪽이 홈의 제목·canonical 을 달고 나간다. 조용히
  // 넘어가면 수천 쪽이 중복으로 잡히므로, 못 찾으면 빌드를 세운다.
  const swap = (html, pattern, replacement, what) => {
    if (!pattern.test(html))
      throw new Error(`껍데기에서 ${what} 를 못 찾았다 — index.html 이 바뀌었다`)
    return html.replace(pattern, replacement)
  }
  let html = shell
  html = swap(
    html,
    /<title>[\s\S]*?<\/title>/,
    `<title>${escape(title)}</title>`,
    '<title>',
  )
  html = swap(
    html,
    /<meta name="description"[^>]*>/,
    `<meta name="description" content="${escape(description)}" />`,
    'description',
  )
  html = swap(
    html,
    /<link rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${escape(canonical ?? url)}" />`,
    'canonical',
  )
  html = swap(
    html,
    /<meta property="og:url"[^>]*>/,
    `<meta property="og:url" content="${escape(url)}" />`,
    'og:url',
  )
  html = swap(
    html,
    /<meta property="og:title"[^>]*>/,
    `<meta property="og:title" content="${escape(title)}" />`,
    'og:title',
  )
  html = swap(
    html,
    /<meta property="og:description"[^>]*>/,
    `<meta property="og:description" content="${escape(description)}" />`,
    'og:description',
  )
  if (jsonLd) {
    html = swap(
      html,
      /<\/head>/,
      `  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n  </head>`,
      '</head>',
    )
  }
  if (!bodyHtml) return html
  /**
   * 본문을 굽는 쪽에는 푸터도 함께 굽는다.
   *
   * 공개 쪽은 레이아웃 없이 RouteBoundary 하나로만 감싸여 있어 푸터가
   * 없었다. 구운 상세 쪽의 내부 링크가 /register 와 /login 둘뿐이었고,
   * 크롤러는 거기서 더 갈 데가 없었다 - 7만 쪽이 전부 막다른 길이었다.
   *
   * 건강 쪽(증상 체크·체질 TMI)은 HealthLayout 이 제 푸터를 따로 들고
   * 있으므로 footer: false 로 빠진다. 거기에 이 푸터를 넣으면 사람이 보는
   * 것과 달라진다.
   */
  return swap(
    html,
    /<div id="root"><\/div>/,
    `<div id="root">${bodyHtml}${footer ? publicFooterHtml() : ''}</div>`,
    '#root',
  )
}

/** 로그인해야 보이는 것을 화면에도 적고 구조화 데이터에도 적는다. */
export const lockedHtml = (locked) => `
      <section class="prerender-locked">
        <h2>이어서 보려면 로그인이 필요합니다</h2>
        <ul>${locked.map((l) => `<li>${escape(l)}</li>`).join('')}</ul>
        <p><a href="/register">무료 계정 만들기</a> · <a href="/login">로그인</a></p>
      </section>`

export function casePage(teaser) {
  const url = `${ORIGIN}/cases/${encodeURIComponent(teaser.slug)}`
  const title = `${teaser.title} — ${teaser.book} 치험례 | 온고지신 AI`
  const description = `${teaser.book}(${teaser.recordedYear}) 수록 의안. 주소증 ${teaser.chiefComplaint}. ${teaser.title}`
  return {
    url,
    title,
    description,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'MedicalScholarlyArticle',
      headline: teaser.title,
      url,
      inLanguage: 'ko',
      isAccessibleForFree: false,
      citation: teaser.sourceEdition,
      datePublished: String(teaser.recordedYear),
      hasPart: {
        '@type': 'WebPageElement',
        isAccessibleForFree: false,
        cssSelector: '.prerender-locked',
      },
    },
    bodyHtml: `
      <article class="prerender-teaser">
        <p class="prerender-kicker">${escape(teaser.book)} · ${escape(teaser.recordedYear)}년</p>
        <h1>${escape(teaser.title)}</h1>
        <dl>
          <dt>주소증</dt><dd>${escape(teaser.chiefComplaint)}</dd>
          <dt>출처</dt><dd>${escape(teaser.sourceEdition)}</dd>
        </dl>
        ${lockedHtml(teaser.locked)}
        <p class="prerender-note">공개 문헌(中醫笈成, CC0)에 수록된 청대 이전 의안입니다. 단일 증례 기록이며 개별 처방의 효과를 입증하지 않습니다.</p>
      </article>`,
  }
}

export function formulaPage(teaser, related = []) {
  const url = `${ORIGIN}/formulas/${encodeURIComponent(teaser.slug)}`
  const hanja = teaser.hanja ? `(${teaser.hanja})` : ''
  const title = `${teaser.name}${hanja} 주치와 출전 | 온고지신 AI`
  const description = `${teaser.name} — ${teaser.category}. ${teaser.source ? `출전 ${teaser.source}. ` : ''}${teaser.indication ?? ''}`
  return {
    url,
    title,
    description,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Drug',
      name: teaser.name,
      alternateName: [teaser.hanja, ...teaser.aliases].filter(Boolean),
      url,
      inLanguage: 'ko',
      isAccessibleForFree: false,
      hasPart: {
        '@type': 'WebPageElement',
        isAccessibleForFree: false,
        cssSelector: '.prerender-locked',
      },
    },
    bodyHtml: `
      <article class="prerender-teaser">
        <p class="prerender-kicker">${escape(teaser.category)}</p>
        <h1>${escape(teaser.name)}${escape(hanja)}</h1>
        <dl>
          ${teaser.source ? `<dt>출전</dt><dd>${escape(teaser.source)}</dd>` : ''}
          ${teaser.indication ? `<dt>주치</dt><dd>${escape(teaser.indication)}</dd>` : ''}
          ${teaser.aliases.length ? `<dt>이명</dt><dd>${escape(teaser.aliases.join(', '))}</dd>` : ''}
        </dl>
        ${relatedHtml(related)}
        ${lockedHtml(teaser.locked)}
        <p class="prerender-note">의료인을 위한 임상 참고 자료입니다. 일반인 대상 의학적 조언의 근거로 쓸 수 없습니다.</p>
      </article>`,
  }
}

/**
 * 본초 한 건.
 *
 * 공정서 값과 고전 기술 참고값을 한 쪽에 두되 어느 쪽이 어디서 왔는지
 * 각주에 적는다. 한의사가 무엇을 믿을지 스스로 판단해야 한다.
 */
/**
 * 분류가 붙지 않은 약재의 category 값. 화면(PublicContentPages.tsx)과 같아야
 * 한다 — 크롤러와 사람이 다른 것을 보면 클로킹이다.
 */
export const HERB_CATEGORY_UNSET = '미분류'

export const herbKicker = (h) =>
  h.category && h.category !== HERB_CATEGORY_UNSET
    ? h.category
    : (h.taxonomy ?? h.medicinalPart ?? '한약재')

export function herbPage(teaser, related = []) {
  const url = `${ORIGIN}/herbs/${encodeURIComponent(teaser.slug)}`
  const hanja = teaser.hanja ? `(${teaser.hanja})` : ''
  const title = `${teaser.name}${hanja} — 성미·귀경과 기원 | 온고지신 AI`
  const description =
    `${teaser.name}${hanja} ${teaser.latinName ?? ''} · ${herbKicker(teaser)}. ` +
    `${teaser.medicinalPart ? `약용부위 ${teaser.medicinalPart}. ` : ''}${teaser.efficacy ?? ''}`.trim()
  const 성미 =
    teaser.properties?.text ??
    [teaser.properties?.nature, teaser.properties?.flavor].filter(Boolean).join(' · ')
  return {
    url,
    title,
    description,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Substance',
      name: teaser.name,
      alternateName: [teaser.hanja, teaser.latinName, teaser.englishName, ...teaser.aliases].filter(
        Boolean,
      ),
      url,
      inLanguage: 'ko',
      description: teaser.efficacy ?? undefined,
      isAccessibleForFree: false,
      hasPart: {
        '@type': 'WebPageElement',
        isAccessibleForFree: false,
        cssSelector: '.prerender-locked',
      },
    },
    bodyHtml: `
      <article class="prerender-teaser">
        <p class="prerender-kicker">${escape(herbKicker(teaser))}</p>
        <h1>${escape(teaser.name)}${escape(hanja)}</h1>
        <dl>
          ${teaser.latinName ? `<dt>라틴생약명</dt><dd>${escape(teaser.latinName)}</dd>` : ''}
          ${teaser.scientificName ? `<dt>기원 학명</dt><dd>${escape(teaser.scientificName)}</dd>` : ''}
          ${teaser.taxonomy ? `<dt>과명</dt><dd>${escape(teaser.taxonomy)}</dd>` : ''}
          ${teaser.medicinalPart ? `<dt>약용부위</dt><dd>${escape(teaser.medicinalPart)}</dd>` : ''}
          ${teaser.pharmacopoeia ? `<dt>수재 공정서</dt><dd>${escape(teaser.pharmacopoeia)}</dd>` : ''}
          ${teaser.englishName ? `<dt>영문명</dt><dd>${escape(teaser.englishName)}</dd>` : ''}
          ${teaser.aliases.length ? `<dt>이명</dt><dd>${escape(teaser.aliases.join(', '))}</dd>` : ''}
          ${성미 ? `<dt>성미</dt><dd>${escape(성미)}</dd>` : ''}
          ${teaser.meridianTropism.length ? `<dt>귀경</dt><dd>${escape(teaser.meridianTropism.join(', '))}</dd>` : ''}
          ${teaser.efficacy ? `<dt>효능</dt><dd>${escape(teaser.efficacy)}</dd>` : ''}
        </dl>
        ${relatedHtml(related)}
        ${lockedHtml(teaser.locked)}
        <p class="prerender-note">학명·라틴생약명·약용부위·수재 공정서는 식품의약품안전처 생약 약재정보의 공식 값입니다. 성미·귀경·효능은 고전 기술을 정리한 참고값이므로 임상 적용 전 원전을 확인하십시오.</p>
      </article>`,
  }
}

/** 근거 유형·분류의 한국어 이름. 화면(PublicContentPages.tsx)과 같아야 한다. */
export const EVIDENCE_LABEL = {
  systematic_review: '체계적 고찰·메타분석',
  rct: '무작위 대조 시험',
  observational: '관찰 연구',
  case_report: '증례 보고',
  guideline: '진료지침·고시',
  review: '종설',
  unknown: '유형 미상',
}
export const REFERENCE_CATEGORY_LABEL = {
  acupuncture: '침구',
  herbal: '한약·처방',
  diagnosis: '진단·변증',
  rehab: '추나·재활',
  safety: '안전성·상호작용',
  admin: '행정·청구·심사',
  other: '기타',
}
export const REFERENCE_SOURCE_LABEL = {
  kci: '한국학술지인용색인(KCI)',
  pubmed: 'PubMed',
}

/**
 * 문헌 한 건.
 *
 * 초록 원문은 굽지 않는다 — 저작권이 대개 출판사에 있어 서버도 공개
 * 응답에 싣지 않는다. 여기 실리는 한국어 요약은 우리가 쓴 것이다.
 */
export function referencePage(teaser) {
  const url = `${ORIGIN}/references/${encodeURIComponent(teaser.slug)}`
  /**
   * 같은 논문이 두 주소로 있을 때는 대표를 가리킨다.
   *
   * 같은 글이 학술지와 초록집에 따로 올라오거나 색인이 두 번 되면 내용이
   * 같은 쪽이 둘 생긴다(68묶음 352쪽). canonical 이 자기 자신을 가리키면
   * 검색엔진이 어느 쪽을 실을지 스스로 고르고, 그 판단이 갈리면 둘 다
   * 묻힌다. 서버가 정해 준 대표를 그대로 쓴다.
   */
  const canonical = teaser.canonicalSlug
    ? `${ORIGIN}/references/${encodeURIComponent(teaser.canonicalSlug)}`
    : url
  const heading = teaser.titleKo ?? teaser.title
  const evidence = EVIDENCE_LABEL[teaser.evidenceType] ?? '문헌'
  const category = REFERENCE_CATEGORY_LABEL[teaser.category] ?? '문헌'
  const source = REFERENCE_SOURCE_LABEL[teaser.source] ?? teaser.source
  const description =
    teaser.summaryKo ??
    `${category} · ${evidence}. ${teaser.journal ?? ''} ${teaser.publishedYear ?? ''} — ${heading}`.trim()
  return {
    url,
    canonical,
    title: `${heading} — ${evidence} | 온고지신 AI`,
    description,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'MedicalScholarlyArticle',
      headline: heading,
      alternateName: teaser.titleKo && teaser.titleKo !== teaser.title ? teaser.title : undefined,
      url,
      inLanguage: teaser.language === 'ko' ? 'ko' : teaser.language,
      author: teaser.authors.slice(0, 8).map((name) => ({ '@type': 'Person', name })),
      isPartOf: teaser.journal
        ? { '@type': 'Periodical', name: teaser.journal }
        : undefined,
      datePublished: teaser.publishedYear ? String(teaser.publishedYear) : undefined,
      identifier: teaser.doi ?? undefined,
      sameAs: teaser.url,
      keywords: teaser.keywords.slice(0, 12).join(', ') || undefined,
      isAccessibleForFree: false,
      hasPart: {
        '@type': 'WebPageElement',
        isAccessibleForFree: false,
        cssSelector: '.prerender-locked',
      },
    },
    bodyHtml: `
      <article class="prerender-teaser">
        <p class="prerender-kicker">${escape(category)} · ${escape(evidence)}</p>
        <h1>${escape(heading)}</h1>
        ${teaser.titleKo && teaser.titleKo !== teaser.title ? `<p class="public-original-title">${escape(teaser.title)}</p>` : ''}
        ${teaser.summaryKo ? `<p class="public-summary">${escape(teaser.summaryKo)}</p>` : ''}
        <dl>
          ${teaser.journal ? `<dt>학술지</dt><dd>${escape(teaser.journal)}${teaser.publishedYear ? ` (${escape(teaser.publishedYear)})` : ''}</dd>` : ''}
          ${teaser.authors.length ? `<dt>저자</dt><dd>${escape(teaser.authors.slice(0, 8).join(', '))}</dd>` : ''}
          <dt>수록</dt><dd>${escape(source)}</dd>
          ${teaser.doi ? `<dt>DOI</dt><dd>${escape(teaser.doi)}</dd>` : ''}
          ${teaser.keywords.length ? `<dt>키워드</dt><dd>${escape(teaser.keywords.slice(0, 12).join(', '))}</dd>` : ''}
          <dt>원문</dt><dd><a href="${escape(teaser.url)}" rel="noopener noreferrer nofollow">원문 보기</a></dd>
        </dl>
        ${lockedHtml(teaser.locked)}
        <p class="prerender-note">서지 정보와 원문 링크는 ${escape(source)}에서 수집했습니다. 한국어 요약은 기계가 만든 것이므로 임상 판단 전 원문을 확인하십시오. 초록 원문은 저작권이 출판사에 있어 싣지 않습니다.</p>
      </article>`,
  }
}

/**
 * 학술지 허브.
 *
 * 한의사는 학술지 이름을 통째로 검색한다. 논문을 한 편씩만 두면 그 검색어에
 * 닿을 쪽이 없다. 목록 스무 편을 본문에 실어 빈껍데기가 되지 않게 한다.
 */
export function journalPage(journal, sample) {
  const url = `${ORIGIN}/journals/${encodeURIComponent(journal.slug)}`
  const title = `${journal.journal} 수록 논문 ${journal.count}편 | 온고지신 AI`
  const description = `${journal.journal}에 실린 침구·한약 임상 문헌 ${journal.count}편의 서지와 한국어 요약.`
  return {
    url,
    title,
    description,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${journal.journal} 수록 논문`,
      url,
      inLanguage: 'ko',
      description,
    },
    bodyHtml: `
      <article class="prerender-teaser">
        <h1>${escape(journal.journal)}</h1>
        <p>${escape(journal.journal)}에 실린 문헌 ${escape(journal.count)}편. 초록 원문과 구조 요약은 무료 계정으로 열람할 수 있습니다.</p>
        <ul class="public-list">
          ${sample
            .map(
              (r) =>
                `<li><a href="/references/${encodeURIComponent(r.slug)}"><strong>${escape(
                  r.titleKo ?? r.title,
                )}</strong><span>${escape(EVIDENCE_LABEL[r.evidenceType] ?? '')}${
                  r.publishedYear ? ` · ${escape(r.publishedYear)}` : ''
                }</span></a></li>`,
            )
            .join('')}
        </ul>
        <p><a href="/journals">다른 학술지 보기</a></p>
        <p class="prerender-note">서지 정보와 원문 링크는 KCI·PubMed 에서 수집했습니다. 초록 원문은 저작권이 출판사에 있어 싣지 않습니다.</p>
      </article>`,
  }
}

/**
 * 쪽 아래에 붙는 관련 연구 목록.
 *
 * 화면(PublicContentPages.tsx)이 같은 자료로 같은 것을 그린다. 여기만
 * 두면 크롤러가 본 것을 사람이 못 보게 되고 그건 클로킹이다.
 */
export function relatedHtml(papers) {
  if (!papers.length) return ''
  return `
        <section class="public-related">
          <h2>관련 연구</h2>
          <ul class="public-list">
            ${papers
              .map(
                (p) =>
                  `<li><a href="/references/${encodeURIComponent(p.slug)}"><strong>${escape(
                    p.title,
                  )}</strong><span>${escape(EVIDENCE_LABEL[p.evidenceType] ?? '')}${
                    p.journal ? ` · ${escape(p.journal)}` : ''
                  }${p.publishedYear ? ` · ${escape(p.publishedYear)}` : ''}</span></a></li>`,
              )
              .join('')}
          </ul>
          <p class="public-related-note">이름이 제목이나 요약에 나오는 문헌을 모은 것입니다. 해당 처방·약재를 다룬 연구인지는 원문에서 확인하십시오.</p>
        </section>`
}

/**
 * 가이드 한 편.
 *
 * 화면(app/guides/GuidePages.tsx)이 같은 자료로 같은 것을 그린다. 둘이
 * 갈라지면 크롤러가 본 것을 사람이 못 보게 되고 그건 클로킹이다.
 *
 * 출처에 "확인 2026-09-25" 를 붙이는 것은 장식이 아니다. 수가와 고시는
 * 조용히 바뀌므로, 언제 본 숫자인지 모르면 읽는 사람이 그대로 청구했다가
 * 삭감된다.
 */
export function guidePage(guide, linkHref) {
  const url = `${ORIGIN}/guides/${encodeURIComponent(guide.slug)}`
  const sectionHtml = (section) => `
        <section class="guide-section">
          <h2>${escape(section.heading)}</h2>
          ${section.body.map((p) => `<p>${escape(p)}</p>`).join('')}
          ${section.caution ? `<p class="guide-caution">${escape(section.caution)}</p>` : ''}
          ${
            section.links?.length
              ? `<ul class="public-list guide-links">${section.links
                  .map(
                    (l) =>
                      `<li><a href="${escape(linkHref(l))}"><strong>${escape(
                        l.label,
                      )}</strong>${
                        l.note && !l.note.startsWith('/')
                          ? `<span>${escape(l.note)}</span>`
                          : ''
                      }</a></li>`,
                  )
                  .join('')}</ul>`
              : ''
          }
        </section>`
  return {
    url,
    title: `${guide.title} | 온고지신 AI`,
    description: guide.description,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: guide.title,
      description: guide.description,
      url,
      inLanguage: 'ko',
      dateModified: guide.updatedOn,
      author: { '@type': 'Organization', name: '온고지신 AI 운영팀' },
      citation: guide.sources.map((s) => s.url),
    },
    bodyHtml: `
      <article class="prerender-teaser public-teaser guide">
        <p class="prerender-kicker">${escape(guide.cluster)} · ${escape(guide.audience)}</p>
        <h1>${escape(guide.title)}</h1>
        <p class="public-summary">${escape(guide.description)}</p>
        ${guide.sections.map(sectionHtml).join('')}
        <section class="guide-sources">
          <h2>출처</h2>
          <ul>${guide.sources
            .map(
              (s) =>
                `<li><a href="${escape(s.url)}" rel="noopener noreferrer">${escape(
                  s.label,
                )}</a><span class="guide-checked">확인 ${escape(s.checkedOn)}</span></li>`,
            )
            .join('')}</ul>
        </section>
        <p class="prerender-note">제도와 수가는 해마다 바뀝니다. 본문의 숫자는 출처에 적힌 확인일 기준이며, 청구 전에는 심평원 고시 원문을 다시 확인하십시오. 의료인을 위한 참고 자료이며 진단·처방 지시가 아닙니다.</p>
      </article>`,
  }
}

/**
 * 주제 허브.
 *
 * 한의사는 "요통 침 치료 논문" 처럼 주제로 찾는다. 논문을 한 편씩만 두면
 * 그 검색어에 닿을 쪽이 없다. 학술지 허브와 같은 이치다.
 *
 * 목록 스무 편을 본문에 실어 빈껍데기가 되지 않게 한다.
 */
export function keywordPage(topic, sample) {
  const url = `${ORIGIN}/topics/${encodeURIComponent(topic.slug)}`
  const title = `${topic.keyword} — 한의학 문헌 ${topic.count}편 | 온고지신 AI`
  const description = `${topic.keyword}을(를) 다룬 침구·한약 임상 문헌 ${topic.count}편의 서지와 한국어 요약.`
  return {
    url,
    title,
    description,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${topic.keyword} — 한의학 문헌`,
      url,
      inLanguage: 'ko',
      description,
    },
    bodyHtml: `
      <article class="prerender-teaser">
        <h1>${escape(topic.keyword)}</h1>
        <p>${escape(topic.keyword)}을(를) 다룬 문헌 ${escape(topic.count)}편. 초록 원문과 구조 요약은 무료 계정으로 열람할 수 있습니다.</p>
        <ul class="public-list">
          ${sample
            .map(
              (r) =>
                `<li><a href="/references/${encodeURIComponent(r.slug)}"><strong>${escape(
                  r.titleKo ?? r.title,
                )}</strong><span>${escape(EVIDENCE_LABEL[r.evidenceType] ?? '')}${
                  r.journal ? ` · ${escape(r.journal)}` : ''
                }${r.publishedYear ? ` · ${escape(r.publishedYear)}` : ''}</span></a></li>`,
            )
            .join('')}
        </ul>
        <p><a href="/topics">다른 주제 보기</a> · <a href="/journals">학술지별로 보기</a></p>
        <p class="prerender-note">논문에 붙은 주제어로 모은 것입니다. 서지 정보와 원문 링크는 KCI·PubMed 에서 수집했으며, 초록 원문은 저작권이 출판사에 있어 싣지 않습니다.</p>
      </article>`,
  }
}


/**
 * ── 한방 비급여 진료비 ───────────────────────────────────────────────
 *
 * 슬러그와 금액 표기는 `src/lib/nonpay.ts` 한 곳에만 둔다. 여기서 다시
 * 만들면 화면이 쓰는 주소와 구운 주소가 언젠가 갈라지고, 갈라지면 구운
 * 쪽은 클릭했을 때 없는 쪽이 된다. 그래서 그 모듈을 통째로 받아 쓴다.
 */

const statCells = (np, stat) =>
  `<td>${escape(np.won(stat.min))}</td><td>${escape(np.won(stat.median))}</td>` +
  `<td>${escape(np.won(stat.average))}</td><td>${escape(np.won(stat.max))}</td>`

const NONPAY_HEAD =
  '<tr><th scope="col">구분</th><th scope="col">최저</th>' +
  '<th scope="col">중간</th><th scope="col">평균</th><th scope="col">최고</th></tr>'

/** 자료 출처 줄. 금액을 보이는 쪽마다 붙는다 — 화면과 같은 문장이다. */
const nonpaySourceNote = (np, appliedOn) => {
  const label = np.appliedOnLabel(appliedOn)
  return `<p class="public-note prerender-note">건강보험심사평가원 비급여진료비용 지역별 통계입니다${
    label ? ` (적용 ${escape(label)} 기준)` : ''
  }. 지역 안 의료기관들이 신고한 금액의 분포이고 개별 한의원의 가격이 아닙니다. 실제 비용은 진료 범위와 횟수에 따라 달라지므로 방문할 곳에 직접 확인해야 합니다. <a href="${
    np.HIRA_NONPAY_URL
  }" target="_blank" rel="noopener noreferrer">심평원 비급여 진료비 정보</a></p>`
}

const regionChips = (np, results, exceptCode) =>
  `<ul class="public-list public-chips">${results
    .filter((r) => r.region !== exceptCode)
    .map((r) => {
      const slug = np.nonpayRegionSlug(r.regionName)
      return slug
        ? `<li><a href="${np.nonpayRegionHref(slug)}">${escape(r.regionName)}</a></li>`
        : ''
    })
    .join('')}</ul>`

export function nonPayIndexPage(np, results) {
  const national = results.find((r) => r.region === 'All') ?? results[0]
  const items = np.byItem(results)
  const url = `${ORIGIN}/nonpay`
  const title = '한방 비급여 진료비 — 추나·약침 지역별 가격 | 온고지신 AI'
  const description =
    '추나요법·약침술·한방물리요법의 지역별 최저·중간·평균·최고 가격. 건강보험심사평가원 비급여 진료비용 공개 자료입니다.'
  return {
    url,
    title,
    description,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: '한방 비급여 진료비 지역별 통계',
      url,
      inLanguage: 'ko',
      description,
      creator: { '@type': 'Organization', name: '건강보험심사평가원' },
      isAccessibleForFree: true,
    },
    bodyHtml: `
      <div class="public-index">
        <h1>한방 비급여 진료비</h1>
        <p class="public-index-lead">추나요법·약침술처럼 건강보험이 되지 않는 한방 진료의 가격을 지역별로 봅니다. 심평원이 공개한 통계를 항목 ${escape(
          items.length,
        )}개, 지역 ${escape(results.length)}곳으로 정리했습니다.</p>
        <h2>항목별</h2>
        <div class="public-table-scroll"><table class="public-table">
          <caption>${escape(national.regionName)} 기준 가격</caption>
          <thead>${NONPAY_HEAD}</thead>
          <tbody>${national.items
            .map((item) => {
              const slug = np.nonpayItemSlug(item.name)
              const label = slug
                ? `<a href="${np.nonpayItemHref(slug)}">${escape(item.name)}</a>`
                : escape(item.name)
              return `<tr><th scope="row">${label}</th>${statCells(np, item)}</tr>`
            })
            .join('')}</tbody>
        </table></div>
        <h2>지역별</h2>
        ${regionChips(np, results, null)}
        ${nonpaySourceNote(np, national.appliedOn)}
      </div>`,
  }
}

export function nonPayItemPage(np, view, results) {
  const national = view.rows.find((r) => r.regionCode === 'All')
  const appliedOn = results.find((r) => r.appliedOn)?.appliedOn ?? null
  const url = `${ORIGIN}/nonpay/${encodeURIComponent(view.slug)}`
  const title = `${view.name} 비급여 가격 — 지역별 | 온고지신 AI`
  const description = `${view.name}의 지역별 최저·중간·평균·최고 가격. 심평원 비급여 진료비용 공개 자료.`
  return {
    url,
    title,
    description,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: `${view.name} 지역별 비급여 가격`,
      url,
      inLanguage: 'ko',
      description,
      creator: { '@type': 'Organization', name: '건강보험심사평가원' },
      isAccessibleForFree: true,
    },
    bodyHtml: `
      <article class="public-teaser prerender-teaser">
        <p class="public-kicker prerender-kicker">${escape(view.category)}</p>
        <h1>${escape(view.name)}</h1>
        <p>${escape(view.name)}은(는) 건강보험이 적용되지 않는 한방 항목입니다.${
          national && national.stat.median !== null
            ? ` 전국 중간 가격은 ${escape(np.won(national.stat.median))}입니다.`
            : ''
        } 아래는 지역별 분포입니다.</p>
        <div class="public-table-scroll"><table class="public-table">
          <caption>${escape(view.name)} 지역별 가격</caption>
          <thead>${NONPAY_HEAD}</thead>
          <tbody>${view.rows
            .map((row) => {
              const slug = np.nonpayRegionSlug(row.regionName)
              const label = slug
                ? `<a href="${np.nonpayRegionHref(slug)}">${escape(row.regionName)}</a>`
                : escape(row.regionName)
              return `<tr><th scope="row">${label}</th>${statCells(np, row.stat)}</tr>`
            })
            .join('')}</tbody>
        </table></div>
        <p><a href="/nonpay">다른 항목 보기</a></p>
        ${nonpaySourceNote(np, appliedOn)}
      </article>`,
  }
}

export function nonPayRegionPage(np, result, results) {
  const url = `${ORIGIN}/nonpay/${encodeURIComponent('지역')}/${encodeURIComponent(
    np.nonpayRegionSlug(result.regionName),
  )}`
  const title = `${result.regionName} 한방 비급여 진료비 | 온고지신 AI`
  const description = `${result.regionName}의 추나요법·약침술 등 한방 비급여 항목 ${result.items.length}개 가격. 심평원 공개 자료.`
  return {
    url,
    title,
    description,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: `${result.regionName} 한방 비급여 가격`,
      url,
      inLanguage: 'ko',
      description,
      creator: { '@type': 'Organization', name: '건강보험심사평가원' },
      isAccessibleForFree: true,
    },
    bodyHtml: `
      <article class="public-teaser prerender-teaser">
        <p class="public-kicker prerender-kicker">한방 비급여 진료비</p>
        <h1>${escape(result.regionName)} 한방 비급여 가격</h1>
        <p>${escape(result.regionName)} 지역 의료기관이 신고한 한방 비급여 항목 ${escape(
          result.items.length,
        )}개의 가격 분포입니다.</p>
        <div class="public-table-scroll"><table class="public-table">
          <caption>${escape(result.regionName)} 항목별 가격</caption>
          <thead>${NONPAY_HEAD}</thead>
          <tbody>${result.items
            .map((item) => {
              const slug = np.nonpayItemSlug(item.name)
              const label = slug
                ? `<a href="${np.nonpayItemHref(slug)}">${escape(item.name)}</a>`
                : escape(item.name)
              return `<tr><th scope="row">${label}</th>${statCells(np, item)}</tr>`
            })
            .join('')}</tbody>
        </table></div>
        ${regionChips(np, results, result.region)}
        ${nonpaySourceNote(np, result.appliedOn)}
      </article>`,
  }
}


/**
 * -- 한의과 상병코드 -------------------------------------------------
 *
 * 15,923쪽이 서로 닮은 껍데기가 되면 함께 색인에서 내려간다. 그래서 한 쪽이
 * 코드와 이름만 들고 있지 않게 한다 - 분류 안의 자리(상위·형제·하위)와,
 * 그 상병명이 제목에 나오는 우리 문헌을 같이 싣는다.
 *
 * 이름이 긴 상병은 제목에 나올 리 없어 문헌 칸이 빈다. 그건 사실이니
 * 비워 둔다 - 억지로 채우려고 이름을 쪼개면 엉뚱한 논문이 붙는다.
 */

const sickChips = (items, label) =>
  items.length === 0
    ? ''
    : `<h2>${escape(label)}</h2><ul class="public-list public-chips">${items
        .map(
          (c) =>
            `<li><a href="/sick-codes/${escape(c.code)}"><strong>${escape(
              c.code,
            )}</strong> ${escape(c.nameKo)}</a></li>`,
        )
        .join('')}</ul>`

const SICK_NOTE =
  '<p class="public-note prerender-note">건강보험심사평가원 질병정보서비스의 ' +
  '한의과 상병입니다. 청구에 쓰기 전에 심사기준과 고시 원문을 반드시 확인해야 ' +
  '합니다. 이 쪽은 코드와 이름을 알려줄 뿐 급여 여부를 말하지 않습니다.</p>'

export function sickCodePage(detail) {
  const url = `${ORIGIN}/sick-codes/${encodeURIComponent(detail.code)}`
  const title = `${detail.code} ${detail.nameKo} — 한의과 상병코드 | 온고지신 AI`
  const description =
    `${detail.code} ${detail.nameKo}` +
    (detail.nameEn ? ` (${detail.nameEn})` : '') +
    '. 한의과 상병코드와 같은 분류의 상병, 관련 한의학 문헌.'
  return {
    url,
    title,
    description,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'MedicalCode',
      code: detail.code,
      codingSystem: 'KCD',
      name: detail.nameKo,
      alternateName: detail.nameEn || undefined,
      url,
      inLanguage: 'ko',
    },
    bodyHtml: `
      <article class="public-teaser prerender-teaser">
        <p class="public-kicker prerender-kicker">한의과 상병코드${
          detail.parent
            ? ` · <a href="/sick-codes/${escape(detail.parent.code)}">${escape(
                detail.parent.code,
              )} ${escape(detail.parent.nameKo)}</a>`
            : ''
        }</p>
        <h1>${escape(detail.code)} ${escape(detail.nameKo)}</h1>
        <dl>
          <dt>코드</dt><dd>${escape(detail.code)}</dd>
          <dt>한글명</dt><dd>${escape(detail.nameKo)}</dd>
          ${detail.nameEn ? `<dt>영문명</dt><dd>${escape(detail.nameEn)}</dd>` : ''}
          <dt>구분</dt><dd>${detail.depth === 3 ? '분류' : '세부 상병'}</dd>
        </dl>
        ${sickChips(detail.children ?? [], '이 분류의 세부 상병')}
        ${sickChips(detail.siblings ?? [], '같은 분류의 다른 상병')}
        ${
          (detail.papers ?? []).length > 0
            ? `<h2>이 상병을 다룬 문헌</h2><ul class="public-list">${detail.papers
                .map(
                  (r) =>
                    `<li><a href="/references/${encodeURIComponent(
                      r.slug,
                    )}"><strong>${escape(r.title)}</strong></a></li>`,
                )
                .join('')}</ul>`
            : ''
        }
        <p><a href="/sick-codes">다른 상병 보기</a></p>
        ${SICK_NOTE}
      </article>`,
  }
}

/** 상병 분류 색인. 첫 글자가 KCD 의 장(章)이라 그것으로 묶는다. */
export function sickCodesIndexPage(categories) {
  const url = `${ORIGIN}/sick-codes`
  const title = '한의과 상병코드 — KCD 분류 | 온고지신 AI'
  const description =
    '한의과에서 쓰는 한국표준질병사인분류(KCD) 상병코드를 분류별로 찾아봅니다. 코드와 한글·영문 상병명, 관련 한의학 문헌을 함께 봅니다.'
  const chapters = new Map()
  for (const c of categories) {
    const key = c.code[0]
    if (!chapters.has(key)) chapters.set(key, [])
    chapters.get(key).push(c)
  }
  return {
    url,
    title,
    description,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: '한의과 상병코드',
      url,
      inLanguage: 'ko',
      description,
    },
    bodyHtml: `
      <div class="public-index">
        <h1>한의과 상병코드</h1>
        <p class="public-index-lead">한의과에서 쓰는 한국표준질병사인분류(KCD) 상병입니다. 분류 ${escape(
          categories.length.toLocaleString('ko-KR'),
        )}개를 싣고, 각 분류 쪽에서 그 아래 세부 상병을 봅니다.</p>
        ${[...chapters.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(
            ([chapter, rows]) =>
              `<section><h2>${escape(chapter)} 코드</h2><ul class="public-list">${rows
                .map(
                  (r) =>
                    `<li><a href="/sick-codes/${escape(
                      r.code,
                    )}"><strong>${escape(r.code)} ${escape(
                      r.nameKo,
                    )}</strong><span>${escape(r.nameEn ?? '')}</span></a></li>`,
                )
                .join('')}</ul></section>`,
          )
          .join('')}
        ${SICK_NOTE}
      </div>`,
  }
}


/**
 * -- 공개 목록 쪽의 본문 ---------------------------------------------
 *
 * /cases·/formulas·/herbs·/references·/journals·/topics·/guides 는 머리말만
 * 굽고 본문은 React 에 맡겨 왔다. 그래서 크롤러가 받는 것이 이것뿐이었다.
 *
 *     <body>
 *       <div id="root"></div>
 *     </body>
 *
 * 네이버에 수집 요청한 다섯 주소(/journals·/references·/herbs·/formulas·
 * /cases)가 전부 이 상태였다. Yeti 가 가져가긴 했는데 색인할 글자가 한 자도
 * 없었고, 수집 리포트에는 "수집 정보가 없습니다" 만 남았다.
 *
 * 홈에 본문을 심어 입구는 뚫었지만, 그 입구가 가리키는 아홉 쪽 중 일곱이
 * 다시 빈 쪽이라 크롤러는 한 칸 더 가서 멈췄다. 상세 쪽은 여전히 어디서도
 * 링크되지 않는다.
 *
 * 여기 적는 문구와 항목은 PublicContentPages.tsx·GuidePages.tsx 가 실제로
 * 그리는 것과 같아야 한다. 다르면 크롤러가 받는 쪽과 사람이 보는 쪽이
 * 갈라지고 그것이 클로킹이다. 그래서 목록의 길이도 화면과 맞춘다 - 화면이
 * 첫 쪽에 스무 건을 보이면 여기도 스무 건이다.
 */

/**
 * 주제 목록의 길이와 분류 이름. PublicContentPages.tsx 의 같은 이름 상수와
 * 짝이다 - 한쪽만 고치면 크롤러와 사람이 다른 목록을 본다.
 */
const KEYWORD_INDEX_LIMIT = 400
const KO_TOPIC_KIND_LABEL = {
  modality: '시술·진단',
  disease: '질환',
  formula: '처방',
}

/** 화면이 첫 쪽에 보이는 수. PublicContentPages.tsx 의 limit=20 과 짝이다. */
const INDEX_PAGE_SIZE = 20

const pieces = (n) => `${Number(n).toLocaleString('ko-KR')}편`

/**
 * 목록 쪽의 본문. 마크업은 PublicContentPages.tsx 의 `div.public-index` 와
 * 같은 모양이다 - h1, 이끄는 글, 그리고 `ul.public-list` 안의 항목들.
 * React 가 붙으면 같은 자리에 같은 것을 다시 그린다.
 *
 * items 의 href 는 부르는 쪽이 encodeURIComponent 로 만들어 넘긴다.
 * strong·span 은 날것으로 받아 여기서 escape 한다.
 */
function indexBodyHtml({ heading, leadHtml, sections }) {
  const list = (items) =>
    `<ul class="public-list">${items
      .map(
        (it) =>
          `<li><a href="${it.href}"><strong>${escape(it.strong)}</strong>` +
          `<span>${escape(it.span)}</span></a></li>`,
      )
      .join('')}</ul>`
  return `
      <div class="public-index">
        <h1>${escape(heading)}</h1>
        <p class="public-index-lead">${leadHtml}</p>
        ${sections
          .filter((s) => s.items.length)
          .map((s) =>
            [
              s.heading ? `<h2>${escape(s.heading)}</h2>` : '',
              s.leadHtml ? `<p class="public-index-lead">${s.leadHtml}</p>` : '',
              list(s.items),
            ]
              .filter(Boolean)
              .join(''),
          )
          .join('')}
      </div>`
}

/**
 * 제목·설명은 STATIC_ROUTES 가 들고 있는 것을 그대로 쓴다. 이 쪽들은 이미
 * 머리말만으로 한 번 구워졌고, 여기서 하는 일은 본문을 더하는 것뿐이다 -
 * 머리말까지 새로 지으면 같은 주소가 배포마다 다른 제목을 달게 된다.
 */
function listIndexPage(path, { heading, leadHtml, sections, name }) {
  const meta = staticRouteMeta(path)
  const url = ORIGIN + path
  return {
    url,
    title: meta.title,
    description: meta.description,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name,
      url,
      inLanguage: 'ko',
      description: meta.description,
    },
    bodyHtml: indexBodyHtml({ heading, leadHtml, sections }),
  }
}

export function casesIndexPage(cases) {
  return listIndexPage('/cases', {
    name: '고전 의안',
    heading: '공개 치험례',
    leadHtml:
      '청대 이전 의안(中醫笈成, CC0)에서 주소증과 출처를 공개합니다. 처방·경과· 원문 국역은 무료 계정으로 열람할 수 있습니다.',
    sections: [
      {
        items: cases.slice(0, INDEX_PAGE_SIZE).map((c) => ({
          href: `/cases/${encodeURIComponent(c.slug)}`,
          strong: c.title,
          span: `${c.book} · ${c.recordedYear}년 · 주소증 ${c.chiefComplaint}`,
        })),
      },
    ],
  })
}

export function formulasIndexPage(formulas) {
  return listIndexPage('/formulas', {
    name: '처방 사전',
    heading: '처방 사전',
    leadHtml:
      '처방의 출전과 주치를 공개합니다. 구성 약재·병기 해설·가감 운용·금기는 무료 계정으로 열람할 수 있습니다.',
    sections: [
      {
        items: formulas.slice(0, INDEX_PAGE_SIZE).map((f) => ({
          href: `/formulas/${encodeURIComponent(f.slug)}`,
          strong: `${f.name}${f.hanja ? `(${f.hanja})` : ''}`,
          span: `${f.category ?? ''}${f.source ? ` · ${f.source}` : ''}`,
        })),
      },
    ],
  })
}

export function herbsIndexPage(herbs) {
  return listIndexPage('/herbs', {
    name: '본초 사전',
    heading: '본초 사전',
    leadHtml:
      '공정서에 수재된 한약재의 기원 학명·라틴생약명·약용부위와 성미·귀경을 공개합니다. 임상 용량과 배합 금기는 무료 계정으로 열람할 수 있습니다.',
    sections: [
      {
        items: herbs.slice(0, INDEX_PAGE_SIZE).map((h) => ({
          href: `/herbs/${encodeURIComponent(h.slug)}`,
          strong: `${h.name}${h.hanja ? `(${h.hanja})` : ''}`,
          span:
            `${herbKicker(h)}${h.latinName ? ` · ${h.latinName}` : ''}` +
            `${h.medicinalPart ? ` · ${h.medicinalPart}` : ''}`,
        })),
      },
    ],
  })
}

export function referencesIndexPage(references) {
  return listIndexPage('/references', {
    name: '한의학 문헌',
    heading: '한의학 문헌',
    leadHtml:
      '침구·한약 임상 문헌의 서지와 한국어 요약을 공개합니다. 초록 원문과 구조 요약은 무료 계정으로 열람할 수 있습니다. <a href="/journals">학술지별로 보기</a>',
    sections: [
      {
        items: references.slice(0, INDEX_PAGE_SIZE).map((r) => ({
          href: `/references/${encodeURIComponent(r.slug)}`,
          strong: r.titleKo ?? r.title,
          span:
            `${EVIDENCE_LABEL[r.evidenceType] ?? ''}` +
            `${r.journal ? ` · ${r.journal}` : ''}` +
            `${r.publishedYear ? ` · ${r.publishedYear}` : ''}`,
        })),
      },
    ],
  })
}

export function journalsIndexPage(journals) {
  return listIndexPage('/journals', {
    name: '학술지별 문헌',
    heading: '학술지별 문헌',
    leadHtml:
      '학술지 이름으로 침구·한약 문헌을 모아 봅니다. 다섯 편 이상 수록된 학술지만 싣습니다.',
    sections: [
      {
        items: journals.map((j) => ({
          href: `/journals/${encodeURIComponent(j.slug)}`,
          strong: j.journal,
          span: pieces(j.count),
        })),
      },
    ],
  })
}

/**
 * 주제는 두 묶음이다. 한국어 주제(우리가 든 통제 어휘)를 위에 두고, 논문에
 * 붙어 온 영문 주제어를 아래에 둔다 - 화면과 같은 차례다.
 */
export function topicsIndexPage(koTopics, keywords) {
  return listIndexPage('/topics', {
    name: '주제별 문헌',
    heading: '주제별 문헌',
    leadHtml:
      '주제로 문헌을 모아 봅니다. 세 편 이상 다룬 주제만 싣습니다. <a href="/journals">학술지별로 보기</a>',
    sections: [
      {
        heading: '질환·시술·처방',
        leadHtml: '질환명·시술명·처방명이 제목에 나오는 문헌을 모은 것입니다.',
        items: koTopics.map((t) => ({
          href: `/topics/${encodeURIComponent(t.slug)}`,
          strong: t.term,
          span: `${KO_TOPIC_KIND_LABEL[t.kind] ?? '주제'} · ${pieces(t.count)}`,
        })),
      },
      {
        heading: '논문 주제어',
        leadHtml:
          '논문에 붙어 온 주제어(MeSH·저자 키워드)입니다. 대부분 영문입니다.',
        items: keywords.slice(0, KEYWORD_INDEX_LIMIT).map((k) => ({
          href: `/topics/${encodeURIComponent(k.slug)}`,
          strong: k.keyword,
          span: pieces(k.count),
        })),
      },
    ],
  })
}

/** 가이드는 묶음(cluster)마다 h2 를 세운다. GuidePages.tsx 와 같은 모양이다. */
export function guidesIndexPage(clusters, total) {
  return listIndexPage('/guides', {
    name: '한의사를 위한 가이드',
    heading: '한의사를 위한 가이드',
    leadHtml: `제도와 절차는 1차 출처 링크와 확인한 날짜를 함께 싣습니다. 임상 판단은 글이 대신하지 않고, 처방·본초·의안·문헌 쪽으로 보냅니다. 현재 ${escape(total)}편.`,
    sections: clusters.map(({ cluster, guides }) => ({
      heading: cluster,
      items: guides.map((g) => ({
        href: `/guides/${encodeURIComponent(g.slug)}`,
        strong: g.title,
        span: g.description,
      })),
    })),
  })
}


/**
 * -- 홈 본문 --------------------------------------------------------
 *
 * 홈의 #root 가 비어 있었다. 구운 HTML 이 5,517바이트인데 그 안에 본문이
 * 한 글자도 없고 내부 링크가 하나도 없었다 - 크롤러가 홈에서 보는 것은
 * 제목과 설명 메타뿐이고, 거기서 다른 쪽으로 가는 길을 못 찾았다.
 *
 * 그래서 의안·처방·본초·문헌·주제·가이드·비급여·상병으로 가는 입구가
 * 사람 눈에는 푸터에 있는데 크롤러에게는 없는 상태였다. 사이트맵에 주소가
 * 있어도 어디서도 링크되지 않는 쪽은 가중치를 거의 못 받는다.
 *
 * 여기 적는 문구와 링크는 LandingPage.tsx 가 실제로 그리는 것과 같아야
 * 한다. 다르면 크롤러가 받는 쪽과 사람이 보는 쪽이 갈라지고, 그것이
 * 클로킹이다. 그래서 히어로의 제목·설명과 푸터의 "공개 자료" 목록을
 * 그대로 옮긴다 - 한 글자라도 고치려면 양쪽을 같이 고쳐야 한다.
 */


/**
 * 공개 쪽의 푸터. PublicFooter.tsx 가 그리는 것과 같은 것을 담는다.
 *
 * 크롤러가 어느 쪽에 떨어지든 공개 자료 아홉 입구로 갈 수 있어야 한다.
 * 문구나 링크를 고치려면 PublicFooter.tsx 와 같이 고친다 - 다르면 크롤러가
 * 받는 쪽과 사람이 보는 쪽이 갈라지고 그것이 클로킹이다.
 */
export function publicFooterHtml() {
  return `
      <footer class="public-footer">
        <nav aria-label="공개 자료">
          <strong>공개 자료</strong>
          ${PUBLIC_NAV.map(
            ([href, label]) => `<a href="${href}">${escape(label)}</a>`,
          ).join('')}
        </nav>
        <p><a href="/">온고지신 AI</a> — 한의사를 위한 임상 워크스페이스.</p>
      </footer>`
}

/**
 * 껍데기의 #root 에 본문만 심는다. 머리말은 손대지 않는다.
 *
 * 홈에 필요한 것이 이것이다. 홈은 index.html 이 이미 제 제목·설명·canonical
 * 을 들고 있어서 renderPage 로 덮어쓸 이유가 없다 - 오히려 덮어쓰면 빌드가
 * 들고 있는 값과 갈라진다. 비어 있는 것은 본문뿐이다.
 */
export function injectBody(shell, bodyHtml) {
  const pattern = /<div id="root"><\/div>/
  if (!pattern.test(shell))
    throw new Error('껍데기에서 #root 를 못 찾았다 — index.html 이 바뀌었다')
  return shell.replace(pattern, `<div id="root">${bodyHtml}</div>`)
}

export function homeBodyHtml() {
  return `
      <div class="prerender-home">
        <h1>처방이 고민될 때,<br /><em>비슷한 치험례부터</em><br />찾아보세요.</h1>
        <p>환자 소견과 관련된 치험례를 찾고,<br />처방 구성·진료 경과·출처를 함께 검토하세요.</p>
        <nav aria-label="공개 자료">
          <strong>공개 자료</strong>
          ${PUBLIC_NAV.map(
            ([href, label]) => `<a href="${href}">${escape(label)}</a>`,
          ).join('')}
        </nav>
      </div>`
}
