/**
 * 공개 페이지를 진짜 HTML 로 구워 낸다. `vite build` 뒤에 돈다.
 *
 * 왜 프리렌더인가 — 이 사이트는 순수 SPA 라 본문이 JS 실행 뒤에야 생긴다.
 * 수천 쪽을 그렇게 올리면 크롤러가 렌더링 예산을 쓰느라 색인이 느리고
 * 들쭉날쭉하다. 공개 대상인 고전 의안은 1746년 기록이라 내용이 변하지
 * 않으므로, 런타임 함수를 두는 것보다 빌드 때 굽는 편이 단순하고 싸다.
 *
 * 크롤러와 사람에게 같은 것을 준다. 크롤러에만 전문을 주면 클로킹이라
 * 색인에서 빠진다 — 가려진 부분은 isAccessibleForFree:false 로 선언한다.
 *
 * API 가 죽어 있어도 빌드를 깨뜨리지 않는다. 경고만 남기고 정적 경로만
 * 담은 사이트맵으로 끝낸다. 콘텐츠 하나 때문에 배포 전체가 막히면 안 된다.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(HERE, '../dist')
const ORIGIN = 'https://www.ongojisin.co.kr'
const API =
  process.env.PRERENDER_API_URL || 'https://api.ongojisin.co.kr/api/v1'

/** 정적 경로 — generate-seo-files.mjs 와 같은 목록이어야 한다. */
const STATIC_ROUTES = [
  { path: '/', lastmod: '2026-09-21' },
  { path: '/register', lastmod: '2026-09-21' },
  { path: '/cases', lastmod: '2026-09-21' },
  { path: '/formulas', lastmod: '2026-09-21' },
  { path: '/health', lastmod: '2026-09-21' },
  { path: '/health/community', lastmod: '2026-09-21' },
  { path: '/health/qna', lastmod: '2026-09-21' },
  { path: '/health/tmi', lastmod: '2026-09-21' },
  { path: '/health/saju', lastmod: '2026-09-21' },
  { path: '/terms', lastmod: '2026-09-08' },
  { path: '/privacy', lastmod: '2026-09-08' },
  { path: '/refund-policy', lastmod: '2026-09-08' },
  { path: '/subscription-terms', lastmod: '2026-09-08' },
]

const escape = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

async function getJson(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`${path} → ${res.status}`)
  const body = await res.json()
  // 이 API 는 성공 응답을 { success, data } 로 감싼다.
  return body && typeof body === 'object' && 'data' in body ? body.data : body
}

/** 목록 끝까지 따라간다. 한 번에 주는 최대치가 50 이다. */
async function collect(path) {
  const all = []
  for (let page = 1; page <= 500; page++) {
    const chunk = await getJson(`${path}?page=${page}&limit=50`)
    all.push(...chunk.items)
    if (all.length >= chunk.total || !chunk.items.length) break
  }
  return all
}

/**
 * dist/index.html 을 껍데기로 쓴다. 해시가 붙은 에셋 이름은 빌드 뒤에야
 * 알 수 있으므로 이 스크립트는 반드시 vite build 다음에 돌아야 한다.
 */
function loadShell() {
  const file = resolve(DIST, 'index.html')
  if (!existsSync(file))
    throw new Error('dist/index.html 이 없다 — vite build 뒤에 실행해야 한다')
  return readFileSync(file, 'utf8')
}

/**
 * 껍데기의 머리말을 이 쪽 내용으로 바꾸고, #root 안에 본문을 심는다.
 * React 가 붙으면 같은 내용으로 다시 그리므로 화면이 튀지 않는다.
 */
function renderPage(shell, { url, title, description, bodyHtml, jsonLd }) {
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
    `<link rel="canonical" href="${escape(url)}" />`,
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
  html = swap(
    html,
    /<\/head>/,
    `  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n  </head>`,
    '</head>',
  )
  return swap(
    html,
    /<div id="root"><\/div>/,
    `<div id="root">${bodyHtml}</div>`,
    '#root',
  )
}

/** 로그인해야 보이는 것을 화면에도 적고 구조화 데이터에도 적는다. */
const lockedHtml = (locked) => `
      <section class="prerender-locked">
        <h2>이어서 보려면 로그인이 필요합니다</h2>
        <ul>${locked.map((l) => `<li>${escape(l)}</li>`).join('')}</ul>
        <p><a href="/register">무료 계정 만들기</a> · <a href="/login">로그인</a></p>
      </section>`

function casePage(teaser) {
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

function formulaPage(teaser) {
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
        ${lockedHtml(teaser.locked)}
        <p class="prerender-note">의료인을 위한 임상 참고 자료입니다. 일반인 대상 의학적 조언의 근거로 쓸 수 없습니다.</p>
      </article>`,
  }
}

function write(routePath, html) {
  const dir = resolve(DIST, `.${routePath}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, 'index.html'), html)
}

function writeSitemap(routes) {
  const body = routes
    .map(
      (r) =>
        `  <url>\n    <loc>${escape(ORIGIN + (r.path === '/' ? '' : r.path))}</loc>\n    <lastmod>${r.lastmod}</lastmod>\n  </url>`,
    )
    .join('\n')
  writeFileSync(
    resolve(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
  )
}

async function main() {
  const shell = loadShell()
  const routes = [...STATIC_ROUTES]
  let cases = []
  let formulas = []
  let stamps = { cases: [], formulas: [] }
  try {
    ;[cases, formulas, stamps] = await Promise.all([
      collect('/public/cases'),
      collect('/public/formulas'),
      getJson('/public/sitemap-entries'),
    ])
  } catch (error) {
    console.warn(
      `prerender: 공개 콘텐츠를 못 받았다 (${error.message}). 정적 경로만 싣는다.`,
    )
    writeSitemap(routes)
    return
  }

  // lastmod 는 기록이 실제로 바뀐 날이어야 한다. 빌드한 날을 적으면 매
  // 배포마다 3,883개 주소가 전부 "바뀌었다" 고 알리는 셈이라 크롤러가
  // 그 신호를 믿지 않게 된다.
  const lastmod = new Map([
    ...stamps.cases.map((e) => [`/cases/${e.slug}`, e.lastmod]),
    ...stamps.formulas.map((e) => [`/formulas/${e.slug}`, e.lastmod]),
  ])
  const fallback = new Date().toISOString().slice(0, 10)

  for (const teaser of cases) {
    const path = `/cases/${teaser.slug}`
    write(path, renderPage(shell, casePage(teaser)))
    routes.push({ path, lastmod: lastmod.get(path) ?? fallback })
  }
  for (const teaser of formulas) {
    const path = `/formulas/${teaser.slug}`
    write(path, renderPage(shell, formulaPage(teaser)))
    routes.push({ path, lastmod: lastmod.get(path) ?? fallback })
  }
  writeSitemap(routes)
  console.log(
    `prerender: 치험례 ${cases.length}쪽, 처방 ${formulas.length}쪽, 사이트맵 ${routes.length}개 주소`,
  )
}

main().catch((error) => {
  // 여기까지 온 것은 dist 가 없는 것 같은 진짜 실패다. 그건 빌드를 세운다.
  console.error('prerender 실패:', error.message)
  process.exit(1)
})
