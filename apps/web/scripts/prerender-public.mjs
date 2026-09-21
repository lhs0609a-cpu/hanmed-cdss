/**
 * 공개 페이지를 진짜 HTML 로 구워 낸다. `vite build` 뒤에 돈다.
 *
 * 왜 프리렌더인가 — 이 사이트는 순수 SPA 라 본문이 JS 실행 뒤에야 생기고,
 * index.html 의 머리말은 모든 경로에서 홈의 것이다. 그대로 두면 수천 쪽이
 * "나는 홈의 사본" 이라고 선언하며 나간다. 사이트맵에 실어 놓고 색인하지
 * 말라고 말하는 셈이다.
 *
 * 세 종류를 굽는다.
 *   - 고정 경로: 머리말만 제 것으로 바꾼다. 본문은 React 가 그린다.
 *   - 고전 의안·처방: 본문까지 굽는다. 1746년 기록이라 내용이 안 변한다.
 *   - 증상 체크·체질 TMI: 앱과 같은 모듈로 같은 값을 계산해 굽는다.
 *
 * 크롤러와 사람에게 같은 것을 준다. 크롤러에만 전문을 주면 클로킹이라
 * 색인에서 빠진다 — 가려진 부분은 isAccessibleForFree:false 로 선언한다.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { ORIGIN, STATIC_ROUTES } from './public-routes.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = resolve(HERE, '..')
const DIST = resolve(WEB, 'dist')
const API =
  process.env.PRERENDER_API_URL || 'https://api.ongojisin.co.kr/api/v1'

/**
 * API 가 죽어 있으면 빌드를 세운다.
 *
 * 예전에는 경고만 남기고 정적 경로 13개짜리 사이트맵으로 끝냈다. 조용히
 * 성공하는 바람에 3,883쪽이 빠진 채 배포되었고 몇 주 동안 아무도 몰랐다.
 * 빌드가 실패하면 직전 배포가 그대로 살아 있다 — 콘텐츠가 통째로 빠진
 * 것이 새로 올라가는 것보다 낫다.
 *
 * API 가 아직 없는 첫 배포에서만 PRERENDER_ALLOW_EMPTY=1 로 넘어간다.
 */
const ALLOW_EMPTY = process.env.PRERENDER_ALLOW_EMPTY === '1'

/**
 * 체질 TMI 는 7천 쪽이라 배포 용량의 대부분(~45MB)을 차지한다. 호스팅이
 * 파일 수나 용량에서 걸리면 PRERENDER_TMI=none 으로 끈다 — 사이트맵과
 * 주소는 그대로 남고, 머리말은 useSEO 가 브라우저에서 고쳐 준다.
 */
const PRERENDER_TMI = process.env.PRERENDER_TMI !== 'none'

const escape = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/**
 * 앱의 TS 모듈을 그대로 빌려 쓴다.
 *
 * 체질·사주 계산을 이 스크립트에 베껴 두면 앱이 바뀔 때 구워 둔 쪽만
 * 옛값을 들고 남는다 — 크롤러와 사람이 다른 것을 보게 된다.
 */
async function loadAppModule(entry) {
  const outfile = resolve(
    WEB,
    'node_modules/.cache/prerender',
    `${entry.replace(/[^\w]/g, '_')}.mjs`,
  )
  await build({
    entryPoints: [resolve(WEB, 'src', entry)],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    alias: { '@': resolve(WEB, 'src') },
    logLevel: 'error',
  })
  return import(pathToFileURL(outfile).href)
}

/** 배포 직후라 API 가 아직 안 떴을 수 있다. 몇 번 기다려 준다. */
async function getJson(path, attempt = 1) {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) {
      const error = new Error(`${path} → ${res.status}`)
      // 4xx 는 다시 물어도 같은 답이다. 429 만 기다릴 값어치가 있다.
      error.permanent = res.status >= 400 && res.status < 500 && res.status !== 429
      throw error
    }
    const body = await res.json()
    // 이 API 는 성공 응답을 { success, data } 로 감싼다.
    return body && typeof body === 'object' && 'data' in body ? body.data : body
  } catch (error) {
    if (error.permanent || attempt > 3) throw error
    const wait = attempt * 5000
    console.warn(
      `prerender: ${error.message} — ${wait / 1000}초 뒤 다시 (${attempt}/3)`,
    )
    await new Promise((done) => setTimeout(done, wait))
    return getJson(path, attempt + 1)
  }
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
 * bodyHtml 이 없으면 머리말만 고친다 — 본문은 React 에 맡긴다.
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

/** 증상 셀프체크. 사람들이 검색창에 치는 말이 그대로 제목이다. */
function healthCheckPage(check) {
  const url = `${ORIGIN}/health/check/${encodeURIComponent(check.slug)}`
  const km = check.result.koreanMedicine
  return {
    url,
    title: `${check.title} | 온고지신 AI`,
    description: `${check.subtitle} — ${check.description}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: check.title,
      url,
      inLanguage: 'ko',
      description: check.description,
    },
    bodyHtml: `
      <article class="prerender-teaser">
        <p class="prerender-kicker">${escape(check.category)} · 약 ${escape(check.estimatedMinutes)}분</p>
        <h1>${escape(check.title)}</h1>
        <p>${escape(check.subtitle)}</p>
        <p>${escape(check.description)}</p>
        <h2>이런 것을 확인합니다</h2>
        <ul>${check.questions.map((q) => `<li>${escape(q)}</li>`).join('')}</ul>
        <h2>한의학에서는</h2>
        <p><strong>${escape(km.term)}(${escape(km.termHanja)})</strong> — ${escape(km.explanation)}</p>
        <p class="prerender-note">스스로 확인해 보는 도구입니다. 진단이 아니며, 증상이 이어지면 의료기관에서 진료받으세요.</p>
      </article>`,
  }
}

/**
 * 체질 TMI.
 *
 * 실존 인물의 이름으로 검색되는 쪽이다. 공개된 생년월일에서 기계적으로
 * 뽑은 추론이지 본인이 밝힌 건강 정보가 아니므로, 그 사실을 본문과 구조화
 * 데이터 양쪽에 적는다 — 검색 결과에 이름과 함께 뜨는 쪽이기 때문이다.
 */
function celebPage(celeb, analysis, info) {
  const url = `${ORIGIN}/health/tmi/${encodeURIComponent(celeb.id)}`
  const aside = '공개된 생년월일로 계산한 추론이며, 본인이 밝힌 건강 정보가 아닙니다.'
  const strongest = Object.entries(analysis.balance).sort(
    (a, b) => b[1] - a[1],
  )[0][0]
  const description = `${celeb.name}의 생년월일로 본 사주 오행과 추론 체질(${info.name}). ${aside}`
  return {
    url,
    title: `${celeb.name} 체질 — 사주로 본 ${info.name} | 온고지신 AI`,
    description,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `${celeb.name} 체질 — 사주로 본 ${info.name}`,
      url,
      inLanguage: 'ko',
      description,
      disambiguatingDescription: aside,
    },
    bodyHtml: `
      <article class="prerender-teaser">
        <p class="prerender-kicker">${escape(celeb.group ?? celeb.category)}</p>
        <h1>${escape(celeb.name)} — ${escape(info.name)}</h1>
        <dl>
          <dt>생년월일</dt><dd>${escape(celeb.birthDate)}</dd>
          <dt>추론 체질</dt><dd>${escape(info.name)}(${escape(info.nameHanja)}) · ${escape(info.nickname)}</dd>
          <dt>강한 오행</dt><dd>${escape(strongest)}</dd>
          <dt>강한 장부</dt><dd>${escape(analysis.health.strongOrgan)}</dd>
          <dt>약한 장부</dt><dd>${escape(analysis.health.weakOrgan)}</dd>
        </dl>
        <p>${escape(info.description)}</p>
        <p class="prerender-note">공개된 생년월일로 사주 오행을 계산해 사상체질을 추론한 재미 콘텐츠입니다. ${escape(aside)} 진단이 아닙니다.</p>
      </article>`,
  }
}

function write(routePath, html) {
  const dir = resolve(DIST, `.${routePath}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, 'index.html'), html)
}

/**
 * 사이트맵의 주소는 canonical 과 한 글자도 다르지 않아야 한다. 한글
 * 경로를 이쪽은 원문으로, canonical 은 퍼센트 인코딩으로 적으면 크롤러가
 * 같은 쪽인지 한 번 더 판단해야 한다 — 굳이 물어볼 일을 만들지 않는다.
 */
const encodePath = (path) =>
  path.split('/').map(encodeURIComponent).join('/')

function writeSitemap(routes) {
  const body = routes
    .map(
      (r) =>
        `  <url>\n    <loc>${escape(ORIGIN + (r.path === '/' ? '' : encodePath(r.path)))}</loc>\n    <lastmod>${r.lastmod}</lastmod>\n  </url>`,
    )
    .join('\n')
  writeFileSync(
    resolve(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
  )
}

/** 고정 경로 — 머리말만 제 것으로 바꾼다. */
function writeStaticRoutes(shell, routes) {
  for (const route of STATIC_ROUTES) {
    routes.push({ path: route.path, lastmod: route.lastmod })
    if (route.skipPrerender) continue
    write(
      route.path,
      renderPage(shell, {
        url: ORIGIN + route.path,
        title: route.title,
        description: route.description,
      }),
    )
  }
}

/** 앱 데이터로 굽는 쪽 — 증상 체크와 체질 TMI. 그린 수를 돌려준다. */
async function writeAppDataRoutes(shell, routes, today) {
  const [{ healthChecks }, celebs, { CONSTITUTIONS }, saju, { CODE_TO_TYPE }] =
    await Promise.all([
      loadAppModule('data/healthChecks.ts'),
      loadAppModule('data/celebs/index.ts').then((m) => m.getAllCelebrities()),
      loadAppModule('data/constitutions.ts'),
      loadAppModule('lib/saju.ts'),
      loadAppModule('data/celebs/types.ts'),
    ])

  for (const check of healthChecks) {
    const path = `/health/check/${check.slug}`
    write(path, renderPage(shell, healthCheckPage(check)))
    routes.push({ path, lastmod: today })
  }

  let tmi = 0
  for (const celeb of celebs) {
    const path = `/health/tmi/${celeb.id}`
    if (!PRERENDER_TMI) {
      routes.push({ path, lastmod: today })
      continue
    }
    // 화면과 같은 함수로 같은 값을 얻는다. celeb.constitution 은 미리
    // 계산해 둔 코드라 화면이 쓰는 값과 어긋날 수 있어 보조로만 쓴다.
    const analysis = saju.analyzeProfile(celeb.birthDate, celeb.birthHour)
    const info =
      CONSTITUTIONS[analysis.health.constitution] ??
      CONSTITUTIONS[CODE_TO_TYPE[celeb.constitution]]
    if (!info) continue
    write(path, renderPage(shell, celebPage(celeb, analysis, info)))
    routes.push({ path, lastmod: today })
    tmi++
  }
  return { checks: healthChecks.length, tmi }
}

async function main() {
  const shell = loadShell()
  const routes = []
  const today = new Date().toISOString().slice(0, 10)

  writeStaticRoutes(shell, routes)
  const app = await writeAppDataRoutes(shell, routes, today)

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
    if (!ALLOW_EMPTY)
      throw new Error(
        `공개 콘텐츠를 못 받았다 (${error.message}).\n` +
          `  API(${API}) 가 떴는지 확인하고 다시 배포할 것.\n` +
          `  API 가 아직 없는 첫 배포라면 PRERENDER_ALLOW_EMPTY=1 로 넘어간다.`,
      )
    console.warn(
      `prerender: 공개 콘텐츠를 못 받았다 (${error.message}). 의안·처방 3,800여 쪽이 빠진 채로 나간다.`,
    )
    writeSitemap(routes)
    console.log(
      `prerender: 고정 ${STATIC_ROUTES.length}쪽, 증상체크 ${app.checks}쪽, 체질 TMI ${app.tmi}쪽, 의안·처방 0쪽`,
    )
    return
  }

  // lastmod 는 기록이 실제로 바뀐 날이어야 한다. 빌드한 날을 적으면 매
  // 배포마다 3,883개 주소가 전부 "바뀌었다" 고 알리는 셈이라 크롤러가
  // 그 신호를 믿지 않게 된다.
  const lastmod = new Map([
    ...stamps.cases.map((e) => [`/cases/${e.slug}`, e.lastmod]),
    ...stamps.formulas.map((e) => [`/formulas/${e.slug}`, e.lastmod]),
  ])

  for (const teaser of cases) {
    const path = `/cases/${teaser.slug}`
    write(path, renderPage(shell, casePage(teaser)))
    routes.push({ path, lastmod: lastmod.get(path) ?? today })
  }
  for (const teaser of formulas) {
    const path = `/formulas/${teaser.slug}`
    write(path, renderPage(shell, formulaPage(teaser)))
    routes.push({ path, lastmod: lastmod.get(path) ?? today })
  }
  writeSitemap(routes)
  console.log(
    `prerender: 고정 ${STATIC_ROUTES.length}쪽, 증상체크 ${app.checks}쪽, ` +
      `체질 TMI ${app.tmi}쪽, 치험례 ${cases.length}쪽, 처방 ${formulas.length}쪽 ` +
      `— 사이트맵 ${routes.length}개 주소`,
  )
}

main().catch((error) => {
  console.error('prerender 실패:', error.message)
  process.exit(1)
})
