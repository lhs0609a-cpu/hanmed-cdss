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
import { ORIGIN } from './public-routes.mjs'

export const escape = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/**
 * 껍데기의 머리말을 이 쪽 내용으로 바꾸고, #root 안에 본문을 심는다.
 * React 가 붙으면 같은 내용으로 다시 그리므로 화면이 튀지 않는다.
 * bodyHtml 이 없으면 머리말만 고친다 — 본문은 React 에 맡긴다.
 */
export function renderPage(
  shell,
  { url, title, description, bodyHtml, jsonLd, canonical },
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
  return swap(
    html,
    /<div id="root"><\/div>/,
    `<div id="root">${bodyHtml}</div>`,
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
