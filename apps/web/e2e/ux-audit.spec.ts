import { test, expect } from '@playwright/test'

/**
 * 임시 UX 감사 스펙 — 한의사 관점 실사용 검증용. (감사 후 삭제 예정)
 * 배포본 대상: BASE_URL 환경변수로 지정. 각 화면 스크린샷 + 콘솔/네트워크 오류 수집.
 */

const PAGES: Array<{ slug: string; path: string; wait?: string }> = [
  { slug: '01-dashboard', path: '/dashboard' },
  { slug: '02-consultation', path: '/dashboard/consultation' },
  { slug: '03-patients', path: '/dashboard/patients' },
  { slug: '04-cases', path: '/dashboard/cases' },
  { slug: '05-pattern-diagnosis', path: '/dashboard/pattern-diagnosis' },
  { slug: '06-unified-search', path: '/dashboard/unified-search' },
  { slug: '07-formula-compare', path: '/dashboard/formula-compare' },
  { slug: '08-formulas', path: '/dashboard/formulas' },
  { slug: '09-herbs', path: '/dashboard/herbs' },
  { slug: '10-red-flag', path: '/dashboard/red-flag' },
  { slug: '11-interactions', path: '/dashboard/interactions' },
  { slug: '12-constitution', path: '/dashboard/constitution' },
  { slug: '13-classics', path: '/dashboard/classics' },
  { slug: '14-insurance', path: '/dashboard/insurance' },
  { slug: '15-analytics', path: '/dashboard/analytics' },
  { slug: '16-community', path: '/dashboard/community' },
  { slug: '17-subscription', path: '/dashboard/subscription' },
]

const OUT = process.env.OUT_DIR || 'test-results/ux'

test('UX 감사 — 로그인 첫 화면 + 노출 메뉴 전수 순회', async ({ page }) => {
  test.setTimeout(10 * 60 * 1000)
  await page.setViewportSize({ width: 1440, height: 900 })

  // 로컬 빌드본(127.0.0.1)에서 운영 API 를 부를 때 CORS 가 막으므로,
  // 요청을 서버사이드로 우회 실행하고 CORS 헤더를 붙여 돌려준다(운영 설정은 안 건드림).
  const origin = process.env.BASE_URL || 'http://127.0.0.1:4190'
  await page.route('**/api.ongojisin.co.kr/**', (route) => {
    const url = new URL(route.request().url())
    return route.continue({ url: `${origin}${url.pathname}${url.search}` })
  })

  const errors: string[] = []
  let currentSlug = 'login'
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[${currentSlug}] console: ${m.text().slice(0, 220)}`)
  })
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`[${currentSlug}] HTTP ${r.status()} ${r.url().slice(0, 160)}`)
  })

  // 랜딩 → 로그인
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/00-landing.png` })

  currentSlug = 'login'
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/00-login.png` })

  await page.getByRole('button', { name: /데모 계정으로 체험/i }).click()
  // waitForURL 은 navigation 이벤트를 기다리는데 React Router 의 pushState 전환에서는
  // 'load' 가 다시 발생하지 않아 타임아웃난다. URL 을 폴링해서 확인한다.
  await expect
    .poll(() => page.url(), { timeout: 60000, intervals: [500] })
    .toContain('/dashboard')
  await page.waitForTimeout(4000)
  await page.screenshot({ path: `${OUT}/00-첫화면-로그인직후.png`, fullPage: true })

  for (const p of PAGES) {
    currentSlug = p.slug
    await page.goto(p.path, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(4000)
    await page.screenshot({ path: `${OUT}/${p.slug}.png`, fullPage: true })
    const bodyLen = (await page.locator('body').innerText().catch(() => '')).length
    console.log(`[${p.slug}] 텍스트 ${bodyLen}자`)
  }

  // 모바일 뷰 — 첫 화면만
  currentSlug = 'mobile'
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `${OUT}/90-mobile-dashboard.png`, fullPage: true })

  console.log('\n===== 오류 목록 =====')
  const uniq = [...new Set(errors)]
  uniq.forEach((e) => console.log(e))
  console.log(`총 ${uniq.length}건`)
  expect(true).toBe(true)
})
