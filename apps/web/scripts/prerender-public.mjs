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
/**
 * 쪽을 만드는 일은 page-builders.mjs 한 곳에만 있다. 굽지 않은 쪽은
 * 요청이 올 때 api/render.mjs 가 같은 모듈로 같은 HTML 을 만든다 —
 * 둘이 갈라지면 같은 주소가 받는 시점에 따라 다른 쪽이 되고, 크롤러는
 * 그것을 클로킹으로 읽는다.
 */
import {
  casePage,
  escape,
  formulaPage,
  herbPage,
  journalPage,
  referencePage,
  relatedHtml,
  renderPage,
  guidePage,
  EVIDENCE_LABEL,
} from './page-builders.mjs'

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

/**
 * 논문은 42,182건이다. 전부 구우면 270MB 남짓이라 TMI(45MB)까지 더해 배포가
 * 호스팅 한도에 걸린다. 그래서 기본은 '한국어 자료만' 이다.
 *
 * 왜 한국어를 고르나 — 네이버는 한국어 본문이 없는 쪽을 색인하지 않는다.
 * 영문 초록만 있는 PubMed 항목은 구워 봐야 제목 한 줄이 영어인 쪽이 되고,
 * 구글에서도 원문 사이트에 밀린다. 한국어 제목이나 한국어 요약이 있는
 * 것부터 굽는 것이 같은 용량으로 가장 많이 읽히는 길이다.
 *
 * 굽지 않은 쪽도 사이트맵에는 남는다 — 주소는 살아 있고 머리말은 useSEO 가
 * 브라우저에서 고쳐 준다. 용량이 허락하면 PRERENDER_REFERENCES=all.
 */
const PRERENDER_REFERENCES = process.env.PRERENDER_REFERENCES ?? 'korean'


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

/**
 * API 요청 사이 최소 간격.
 *
 * 서버는 한 아이피에서 초당 5회까지만 받는다(app.module.ts 의 short 한도).
 * 프리렌더는 그보다 빨리 던질 수 있어서, 그냥 두면 다섯 번에 한 번씩 429 를
 * 받고 5초를 쉰다 — 문헌 211쪽을 받는 데 그 대기만 3분이 넘게 붙었다.
 *
 * 한도를 올리는 쪽이 아니라 이쪽이 맞추는 쪽을 골랐다. 그 한도는 인증 없는
 * 경로를 지키라고 둔 것이고, 빌드 편하자고 그걸 여는 것은 지키는 이유를
 * 빌드 시간과 바꾸는 일이다. 4회/초면 한도 아래이고, 211쪽이 1분이 안 된다.
 */
const MIN_REQUEST_GAP_MS = 250
let nextSlot = 0

async function pace() {
  const now = Date.now()
  const at = Math.max(now, nextSlot)
  nextSlot = at + MIN_REQUEST_GAP_MS
  if (at > now) await new Promise((done) => setTimeout(done, at - now))
}

/** 배포 직후라 API 가 아직 안 떴을 수 있다. 몇 번 기다려 준다. */
async function getJson(path, attempt = 1) {
  await pace()
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

/**
 * 목록 끝까지 따라간다. 한 번에 주는 최대치가 200 이다.
 *
 * 쪽 상한을 인자로 받는다 — 문헌은 42,182건이라 500쪽(25,000건)에서 끊기면
 * 나머지 17,000건이 조용히 빠진다. 상한에 실제로 닿으면 빌드를 세운다.
 * 조용히 모자란 채 나가는 것이 이 스크립트가 예전에 겪은 바로 그 사고다.
 */
const PAGE_SIZE = 200

async function collect(path, maxPages = 500) {
  const all = []
  for (let page = 1; page <= maxPages; page++) {
    const chunk = await getJson(`${path}?page=${page}&limit=${PAGE_SIZE}`)
    all.push(...chunk.items)
    if (all.length >= chunk.total || !chunk.items.length) return all
    if (page === maxPages)
      throw new Error(
        `${path} 가 ${maxPages}쪽에서 끊겼다 — ${all.length}/${chunk.total}건. 상한을 올릴 것.`,
      )
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

/**
 * 사이트맵 하나에 담을 수 있는 주소 수. 규격 상한은 50,000 이고 구글·네이버
 * 모두 그 선에서 자른다. 문헌이 들어오면서 전체가 5만을 넘었으므로 여유를
 * 두고 끊는다 — 상한에 딱 맞추면 자료가 조금만 늘어도 다시 넘친다.
 */
const SITEMAP_CHUNK = 40000

const urlBlock = (r) =>
  `  <url>\n    <loc>${escape(ORIGIN + (r.path === '/' ? '' : encodePath(r.path)))}</loc>\n    <lastmod>${r.lastmod}</lastmod>\n  </url>`

const urlsetXml = (rows) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.map(urlBlock).join('\n')}\n</urlset>\n`

/**
 * RSS 2.0 피드.
 *
 * 네이버 서치어드바이저는 사이트맵과 별도로 RSS 를 받는다. 사이트맵이
 * "이런 주소가 다 있다" 라면 RSS 는 "이것이 새로 생겼다" 다 — 로봇이
 * 다음 방문을 기다리지 않고 먼저 와 본다.
 *
 * 그래서 전부 싣지 않는다. 5만 건을 밀어 넣으면 무엇이 새것인지 말하지
 * 못하는 두 번째 사이트맵이 될 뿐이다. 최근에 바뀐 것부터 100건만 싣고,
 * 나머지는 사이트맵이 맡는다.
 *
 * 날짜는 우리가 그 쪽을 마지막으로 고친 날(lastmod)이지 논문이 발표된
 * 해가 아니다. 1746년 의안에 1746년을 적으면 피드가 전부 옛날 것으로
 * 보이고, 로봇이 새 글을 찾는 데 쓰지 못한다.
 */
const RSS_ITEM_LIMIT = 100

function writeRss(items) {
  /**
   * 종류마다 최근 것을 고른 뒤 합쳐서 날짜순으로 싣는다.
   *
   * 날짜순으로만 자르면 100건이 전부 한 책의 의안이 된다. 한 코퍼스는
   * 대개 같은 날 통째로 들어와 lastmod 가 같고, 그중 가장 최근 코퍼스가
   * 목록을 다 먹기 때문이다. 그러면 피드가 이 사이트에 본초와 문헌이
   * 있다는 것을 한 줄도 말하지 못한다.
   *
   * 고르는 것은 순서지 날짜가 아니다. 항목마다 제 lastmod 를 그대로
   * 달고 나가므로 피드가 없는 새것을 있다고 말하지 않는다.
   */
  const byKind = new Map()
  for (const item of items) {
    if (!item.title || !item.lastmod) continue
    const kind = item.path.split('/')[1]
    const lane = byKind.get(kind) ?? []
    lane.push(item)
    byKind.set(kind, lane)
  }
  const newestFirst = (a, b) =>
    a.lastmod === b.lastmod ? 0 : a.lastmod < b.lastmod ? 1 : -1
  const quota = Math.max(1, Math.ceil(RSS_ITEM_LIMIT / Math.max(1, byKind.size)))
  const rows = [...byKind.values()]
    .flatMap((lane) => lane.sort(newestFirst).slice(0, quota))
    .sort(newestFirst)
    .slice(0, RSS_ITEM_LIMIT)
  if (!rows.length) return 0
  const rfc822 = (day) => new Date(`${day}T00:00:00Z`).toUTCString()
  // 쪽 제목은 끝에 사이트 이름을 달고 있다. 피드는 이미 채널 이름으로
  // 사이트를 말하고 있어서, 항목마다 또 붙이면 목록이 같은 글자로 덮인다.
  const trim = (title) => title.replace(/\s*\|\s*온고지신 AI\s*$/, '')
  const body = rows
    .map(
      (item) => `    <item>
      <title>${escape(trim(item.title))}</title>
      <link>${escape(ORIGIN + encodePath(item.path))}</link>
      <guid isPermaLink="true">${escape(ORIGIN + encodePath(item.path))}</guid>
      <description>${escape(item.description ?? item.title)}</description>
      <pubDate>${rfc822(item.lastmod)}</pubDate>
    </item>`,
    )
    .join(String.fromCharCode(10))
  writeFileSync(
    resolve(DIST, 'rss.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>온고지신 AI — 한의학 임상 자료</title>
    <link>${ORIGIN}</link>
    <description>고전 의안, 처방, 본초, 침구·한약 임상 문헌에 새로 열린 자료.</description>
    <language>ko</language>
    <lastBuildDate>${rfc822(rows[0].lastmod)}</lastBuildDate>
${body}
  </channel>
</rss>
`,
  )
  return rows.length
}

/**
 * 사이트맵을 종류별로 쪼개고 색인으로 묶는다.
 *
 * 왜 색인인가 — 주소가 5만을 넘으면 규격상 한 파일에 담을 수 없다. 넘긴
 * 채로 올리면 크롤러가 뒤를 통째로 버리는데, 잘렸다고 알려주지 않는다.
 * 3,883쪽이 몇 주 동안 조용히 빠져 있던 것과 같은 종류의 사고다.
 *
 * 쪼개는 단위는 종류다. 번호로만 자르면 한 종류가 두 파일에 걸쳐 어디까지
 * 들어갔는지 사람이 셀 수 없다. 종류별로 두면 서치어드바이저와 서치콘솔에서
 * 어느 묶음이 얼마나 색인됐는지 그대로 읽힌다.
 */
function writeSitemap(groups) {
  const files = []
  for (const [name, rows] of Object.entries(groups)) {
    if (!rows.length) continue
    for (let at = 0; at < rows.length; at += SITEMAP_CHUNK) {
      const part = rows.slice(at, at + SITEMAP_CHUNK)
      const suffix = rows.length > SITEMAP_CHUNK ? `-${at / SITEMAP_CHUNK + 1}` : ''
      const file = `sitemap-${name}${suffix}.xml`
      writeFileSync(resolve(DIST, file), urlsetXml(part))
      files.push({
        file,
        lastmod: part.reduce((a, r) => (r.lastmod > a ? r.lastmod : a), part[0].lastmod),
        count: part.length,
      })
    }
  }
  if (!files.length) throw new Error('사이트맵에 실을 주소가 하나도 없다')
  writeFileSync(
    resolve(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${files
      .map(
        (f) =>
          `  <sitemap>\n    <loc>${ORIGIN}/${f.file}</loc>\n    <lastmod>${f.lastmod}</lastmod>\n  </sitemap>`,
      )
      .join('\n')}\n</sitemapindex>\n`,
  )
  return files
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
async function writeAppDataRoutes(shell, groups, today) {
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
    groups.health.push({ path, lastmod: today })
  }

  let tmi = 0
  for (const celeb of celebs) {
    const path = `/health/tmi/${celeb.id}`
    if (!PRERENDER_TMI) {
      groups.tmi.push({ path, lastmod: today })
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
    groups.tmi.push({ path, lastmod: today })
    tmi++
  }
  return { checks: healthChecks.length, tmi }
}

async function main() {
  const shell = loadShell()
  /**
   * 사이트맵은 종류별로 나눠 담는다. 5만 주소를 한 파일에 담을 수 없고,
   * 나눠 두면 어느 묶음이 얼마나 색인됐는지 서치어드바이저에서 읽힌다.
   */
  const groups = {
    core: [],
    health: [],
    tmi: [],
    cases: [],
    formulas: [],
    herbs: [],
    references: [],
    journals: [],
    guides: [],
  }
  const today = new Date().toISOString().slice(0, 10)

  writeStaticRoutes(shell, groups.core)
  const app = await writeAppDataRoutes(shell, groups, today)

  /**
   * 가이드는 우리가 쓴 글이라 API 를 묻지 않는다. 앱과 같은 모듈에서 같은
   * 자료를 읽어 굽는다 — 화면이 그리는 것과 한 글자도 다르지 않게.
   *
   * API 를 부르기 전에 굽는다. 뒤에 두었더니 공개 API 가 죽었을 때
   * (PRERENDER_ALLOW_EMPTY 로 넘어가는 경로) 가이드까지 통째로 빠졌다 —
   * API 와 아무 상관도 없는 글인데 같이 사라지는 것은 말이 안 된다.
   */
  const guideModule = await loadAppModule('data/guides/index.ts')
  for (const guide of guideModule.GUIDES) {
    const path = `/guides/${guide.slug}`
    write(path, renderPage(shell, guidePage(guide, guideModule.guideLinkHref)))
    groups.guides.push({ path, lastmod: guide.updatedOn })
  }

  let cases = []
  let formulas = []
  let herbs = []
  let references = []
  let journals = []
  let stamps = { cases: [], formulas: [], herbs: [], references: [] }
  try {
    ;[cases, formulas, herbs, references, journals, stamps] = await Promise.all([
      collect('/public/cases', 100),
      collect('/public/formulas', 20),
      collect('/public/herbs', 20),
      // 42,000건이 200건씩 온다. 상한은 넉넉히 두되, 닿으면 빌드를 세운다.
      // 굽지 않기로 했으면 받아 오지도 않는다. 42,182건을 200건씩 211번
      // 왕복하는 데만 몇 분이 걸리는데, 그렇게 받은 것을 한 쪽도 쓰지 않고
      // 버리는 것은 배포 시간을 그냥 태우는 일이다. 주소는 사이트맵 항목이
      // 따로 들고 있다.
      PRERENDER_REFERENCES === 'none'
        ? Promise.resolve([])
        : collect('/public/references', 500),
      getJson('/public/reference-journals'),
      getJson('/public/sitemap-entries'),
    ])
  } catch (error) {
    if (!ALLOW_EMPTY)
      throw new Error(
        `공개 콘텐츠를 못 받았다 (${error.message}).
` +
          `  API(${API}) 가 떴는지 확인하고 다시 배포할 것.
` +
          `  API 가 아직 없는 첫 배포라면 PRERENDER_ALLOW_EMPTY=1 로 넘어간다.`,
      )
    console.warn(
      `prerender: 공개 콘텐츠를 못 받았다 (${error.message}). 의안·처방·본초·문헌이 빠진 채로 나간다.`,
    )
    writeSitemap(groups)
    console.log(
      `prerender: 고정 ${STATIC_ROUTES.length}쪽, 증상체크 ${app.checks}쪽, ` +
        `체질 TMI ${app.tmi}쪽, 가이드 ${guideModule.GUIDES.length}쪽, 나머지 0쪽`,
    )
    return
  }

  // lastmod 는 기록이 실제로 바뀐 날이어야 한다. 빌드한 날을 적으면 매
  // 배포마다 5만 개 주소가 전부 "바뀌었다" 고 알리는 셈이라 크롤러가
  // 그 신호를 믿지 않게 된다.
  const lastmod = new Map([
    ...stamps.cases.map((e) => [`/cases/${e.slug}`, e.lastmod]),
    ...stamps.formulas.map((e) => [`/formulas/${e.slug}`, e.lastmod]),
    ...(stamps.herbs ?? []).map((e) => [`/herbs/${e.slug}`, e.lastmod]),
    ...(stamps.references ?? []).map((e) => [`/references/${e.slug}`, e.lastmod]),
  ])

  /**
   * RSS 에 실을 후보. 쪽을 구우면서 같이 모은다 — 제목과 설명은 이미
   * 만들어 둔 것이고, 나중에 다시 만들면 화면과 피드가 갈라진다.
   */
  const feed = []

  const bake = (list, group, prefix, build) => {
    for (const teaser of list) {
      const path = `${prefix}/${teaser.slug}`
      const page = build(teaser)
      write(path, renderPage(shell, page))
      const at = lastmod.get(path) ?? today
      group.push({ path, lastmod: at })
      feed.push({ path, lastmod: at, title: page.title, description: page.description })
    }
  }

  /**
   * 처방·본초에 걸리는 논문을 여기서 짝지어 둔다.
   *
   * 같은 일을 DB 에 시키면 LIKE '%이름%' 가 4만 행을 훑어 24초가 걸렸다 —
   * 인증 없는 경로에 둘 수 있는 질의가 아니다. 논문 전부가 이미 손에 있으니
   * 여기서 맞춘다.
   *
   * 화면도 같은 것을 그려야 해서 정적 JSON 으로 함께 떨군다. 여기만 굽고
   * 화면이 모르면 React 가 붙는 순간 목록이 사라진다 — 크롤러가 본 것을
   * 사람이 못 보는 셈이라 클로킹이다.
   *
   * PRERENDER_REFERENCES=none 이면 논문을 받아 오지 않으므로 짝도 비어
   * 있다. 그때는 양쪽 모두 이 칸을 그리지 않아 서로 어긋나지 않는다.
   */
  const { papersForFormula, papersForHerb } = await loadAppModule(
    'lib/relatedResearch.ts',
  )
  const relatedFormulas = {}
  const relatedHerbs = {}
  for (const teaser of formulas)
    relatedFormulas[teaser.slug] = papersForFormula(teaser.name, references)
  for (const teaser of herbs)
    relatedHerbs[teaser.slug] = papersForHerb(teaser.scientificName, references)
  mkdirSync(resolve(DIST, 'data'), { recursive: true })
  writeFileSync(
    resolve(DIST, 'data/related-formulas.json'),
    JSON.stringify(relatedFormulas),
  )
  writeFileSync(
    resolve(DIST, 'data/related-herbs.json'),
    JSON.stringify(relatedHerbs),
  )
  const relatedPairs =
    Object.values(relatedFormulas).filter((v) => v.length).length +
    Object.values(relatedHerbs).filter((v) => v.length).length

  bake(cases, groups.cases, '/cases', casePage)
  bake(formulas, groups.formulas, '/formulas', (t) =>
    formulaPage(t, relatedFormulas[t.slug] ?? []),
  )
  bake(herbs, groups.herbs, '/herbs', (t) =>
    herbPage(t, relatedHerbs[t.slug] ?? []),
  )

  /**
   * 문헌은 용량 때문에 굽는 것을 고른다. 고르지 않은 것도 주소는 사이트맵에
   * 남는다 — 머리말은 useSEO 가 브라우저에서 고쳐 준다.
   *
   * 한국어 기준은 "한국어 제목이나 한국어 요약이 있는가" 다. 둘 다 없으면
   * 구워 봐야 한국어가 한 글자도 없는 쪽이 되고, 네이버는 그런 쪽을 색인하지
   * 않는다.
   */
  const hasKorean = (r) => Boolean(r.titleKo || r.summaryKo)
  /**
   * 사이트맵에 실린 것만 굽는다.
   *
   * 사이트맵은 내용이 같은 것 중 대표 하나만 싣는다(352쪽이 그렇게 빠진다).
   * 그런데 굽는 것은 목록 응답으로 만드는데, 목록에서는 canonicalSlug 가
   * 자기 자신이라 중복 두 쪽이 모두 자기를 가리키는 HTML 로 구워졌다 —
   * 사이트맵은 하나만 싣는데 구운 쪽은 둘 다 "내가 정본" 이라고 말하는 꼴이다.
   *
   * 대표가 아닌 것은 굽지 않는다. 그 주소로 들어오면 서버리스 함수가
   * 만들고, 그쪽은 한 건씩 묻기 때문에 대표를 제대로 찾아 가리킨다.
   */
  const canonicalSlugs = new Set(
    (stamps.references ?? []).map((e) => e.slug),
  )
  let bakedReferences = 0
  for (const teaser of references) {
    if (!canonicalSlugs.has(teaser.slug)) continue
    if (PRERENDER_REFERENCES === 'all' || hasKorean(teaser)) {
      const path = `/references/${teaser.slug}`
      const page = referencePage(teaser)
      write(path, renderPage(shell, page))
      bakedReferences++
      feed.push({
        path,
        lastmod: lastmod.get(path) ?? today,
        title: page.title,
        description: page.description,
      })
    }
  }
  // 주소는 굽든 말든 사이트맵에 남는다. 굽지 않은 쪽의 머리말은 useSEO 가
  // 브라우저에서 고쳐 준다.
  for (const entry of stamps.references ?? [])
    groups.references.push({
      path: `/references/${entry.slug}`,
      lastmod: entry.lastmod,
    })

  /**
   * 학술지 허브. 본문에 실을 스무 편은 이미 받아 둔 목록에서 고른다 —
   * 학술지마다 API 를 다시 물으면 600번을 더 왕복한다.
   */
  const byJournal = new Map()
  for (const r of references) {
    if (!r.journal) continue
    const bucket = byJournal.get(r.journal)
    if (bucket) {
      if (bucket.length < 20) bucket.push(r)
    } else byJournal.set(r.journal, [r])
  }
  for (const journal of journals) {
    const path = `/journals/${journal.slug}`
    write(path, renderPage(shell, journalPage(journal, byJournal.get(journal.journal) ?? [])))
    groups.journals.push({ path, lastmod: today })
  }

  const rssItems = writeRss(feed)
  const files = writeSitemap(groups)
  const total = Object.values(groups).reduce((a, g) => a + g.length, 0)
  console.log(
    `prerender: 고정 ${STATIC_ROUTES.length}쪽, 증상체크 ${app.checks}쪽, ` +
      `체질 TMI ${app.tmi}쪽, 치험례 ${cases.length}쪽, 처방 ${formulas.length}쪽, ` +
      `본초 ${herbs.length}쪽, 문헌 ${references.length}쪽(구움 ${bakedReferences}), ` +
      `학술지 ${journals.length}쪽, 가이드 ${guideModule.GUIDES.length}쪽 ` +
      `— 사이트맵 ${total}개 주소, ${files.length}개 파일, RSS ${rssItems}건, ` +
      `관련 연구 ${relatedPairs}쪽`,
  )
}

main().catch((error) => {
  console.error('prerender 실패:', error.message)
  process.exit(1)
})
