import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const out = resolve(root, 'output/clinical-landing')
const base = process.env.LANDING_BASE_URL || 'http://127.0.0.1:4175'
await mkdir(out, { recursive: true })
let browser
try {
  browser = await chromium.launch()
} catch {
  browser = await chromium.launch({ channel: 'chrome' })
}
const results = []
const errors = []
const stats = {
  cases: 8579,
  classicalCases: 7920,
  references: 42182,
  herbs: 636,
  formulas: 404,
  countedAt: '2026-09-09T00:00:00Z',
}

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  })
  page.on('pageerror', (error) => {
    if (new URL(page.url()).pathname === '/') errors.push(error.message)
  })
  await page.route('**/stats/public', (route) =>
    route.fulfill({ json: { success: true, data: stats } }),
  )
  // Isolate browser verification from live clinical services.
  await page.route(/\/api\/(?!.*stats\/public)/, (route) =>
    route.fulfill({ json: { success: true, data: [] } }),
  )
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.locator('h1').waitFor({ timeout: 60000 })
  await page.evaluate(() =>
    Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 8000)),
    ]),
  )
  await page.locator('.clinical-landing img').evaluateAll(async (nodes) => {
    nodes.forEach((img) => {
      img.loading = 'eager'
    })
    await Promise.all(nodes.map((img) => img.decode().catch(() => {})))
  })
  assert.equal(await page.locator('h1').count(), 1)
  assert.match(await page.locator('h1').innerText(), /진료의 판단에/)
  assert.match(await page.locator('.landing-stats').innerText(), /8,579/)
  await page.screenshot({ path: resolve(out, 'desktop-first-screen.png') })
  await page.screenshot({
    path: resolve(out, 'desktop-full.png'),
    fullPage: true,
  })
  results.push('Desktop render and public stats pass')

  await page
    .getByRole('link', { name: '샘플 케이스 체험', exact: true })
    .click()
  await page.getByRole('tab', { name: '소화 불편' }).click()
  assert.match(
    await page.locator('.demo-content blockquote').innerText(),
    /더부룩/,
  )
  await page.getByRole('button', { name: '다음 단계', exact: true }).click()
  await page.getByRole('button', { name: '근거 확인 항목 펼치기' }).click()
  assert.equal(await page.locator('#demo-evidence-detail').isVisible(), true)
  await page.screenshot({
    path: resolve(out, 'demo-evidence.png'),
    fullPage: false,
  })
  await page.getByRole('button', { name: '다음 단계', exact: true }).click()
  await page.getByRole('button', { name: '예시 검토 완료 표시하기' }).click()
  assert.match(
    await page.locator('.demo-review-note').innerText(),
    /더 많은 기능/,
  )
  const events = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem('ongojisin_landing_events') || '[]'),
  )
  assert.ok(
    events.some(
      (event) =>
        event.name === 'demo_completed' &&
        event.properties.context === 'digestion',
    ),
  )
  assert.ok(events.some((event) => event.name === 'demo_evidence_opened'))
  await page.getByRole('tab', { name: '소화 불편' }).focus()
  await page.keyboard.press('ArrowRight')
  assert.equal(
    await page
      .getByRole('tab', { name: '목·어깨 불편' })
      .getAttribute('aria-selected'),
    'true',
  )
  assert.match(
    await page.locator('.demo-content blockquote').innerText(),
    /목과 어깨/,
  )
  results.push(
    'Case switching, keyboard tabs, evidence expansion, completion and funnel events pass',
  )

  await page.getByRole('tab', { name: '치험례', exact: true }).click()
  assert.equal(
    await page.locator('.product-screen img').getAttribute('src'),
    '/screens/cases.webp',
  )
  await page.getByRole('tab', { name: '치험례', exact: true }).press('End')
  assert.equal(
    await page
      .getByRole('tab', { name: '처방', exact: true })
      .getAttribute('aria-selected'),
    'true',
  )
  await page.getByRole('button', { name: '연 결제' }).click()
  assert.match(
    await page.locator('.pricing-card-featured .pricing-price').innerText(),
    /490,000/,
  )
  assert.match(
    await page.locator('.pricing-addon strong').innerText(),
    /990,000/,
  )
  await page.getByRole('button', { name: '월 결제', exact: true }).click()
  assert.match(
    await page.locator('.pricing-card-featured .pricing-price').innerText(),
    /49,000/,
  )
  await page
    .getByRole('button', { name: '가입 전에 제품을 체험할 수 있나요?' })
    .click()
  assert.equal(await page.locator('#faq-answer-1').isVisible(), true)
  assert.equal(await page.locator('#faq-answer-0').isVisible(), false)
  results.push(
    'Product tabs, annual totals, add-on amount and FAQ disclosure pass',
  )

  for (const width of [1920, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({
      path: resolve(out, `viewport-${width}.png`),
      fullPage: true,
    })
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    assert.equal(overflow, false, `Horizontal overflow at ${width}px`)
    if (width === 390) {
      await page.screenshot({ path: resolve(out, 'mobile-first-screen.png') })
      await page.getByRole('button', { name: '메뉴 열기' }).click()
      assert.equal(await page.locator('#landing-mobile-nav').isVisible(), true)
      await page.keyboard.press('Escape')
      assert.equal(
        await page
          .getByRole('button', { name: '메뉴 열기' })
          .getAttribute('aria-expanded'),
        'false',
      )
      await page.getByRole('button', { name: '메뉴 열기' }).click()
      await page
        .locator('#landing-mobile-nav')
        .getByRole('link', { name: '요금제' })
        .click()
      assert.equal(await page.locator('#landing-mobile-nav').count(), 0)
    }
  }
  results.push(
    '1920/1024/768/390/320px layouts, no overflow, mobile navigation and Escape pass',
  )

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('tab', { name: '수면 불편', exact: true }).click()
  assert.equal(
    await page
      .locator('.demo-content')
      .evaluate((node) => getComputedStyle(node).animationName),
    'none',
  )
  const images = await page
    .locator('.clinical-landing img')
    .evaluateAll(async (nodes) => {
      await Promise.all(nodes.map((img) => img.decode().catch(() => {})))
      return nodes.map((img) => ({
        src: img.getAttribute('src'),
        width: img.naturalWidth,
      }))
    })
  assert.ok(
    images.every((img) => img.width > 0),
    JSON.stringify(images),
  )
  const badAnchors = await page
    .locator('.clinical-landing a[href^="#"]')
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => !document.querySelector(node.getAttribute('href')))
        .map((node) => node.getAttribute('href')),
    )
  assert.deepEqual(badAnchors, [])
  assert.equal(
    await page.locator('.hero-actions a[href="/register"]').count(),
    1,
  )
  results.push(
    'Reduced motion, image loading, in-page targets and registration link pass',
  )

  // Check that guest entry persists and that authenticated entry is not destructive.
  await page
    .getByRole('button', { name: '프로그램 둘러보기', exact: true })
    .last()
    .click()
  await page.waitForURL('**/dashboard')
  const guest = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('auth-storage') || '{}'),
  )
  assert.equal(guest.state?.isGuest, true)
  results.push('Guest entry reaches dashboard and persists guest state')
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('auth-storage') || '{}')
    const token = `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ sub: 'test', exp: Math.floor(Date.now() / 1000) + 3600 }))}.local-test-only`
    saved.state = {
      ...saved.state,
      isGuest: false,
      isAuthenticated: true,
      accessToken: token,
      refreshToken: token,
      user: {
        id: 'test',
        name: '테스트',
        subscriptionTier: 'free',
        isVerified: true,
      },
    }
    localStorage.setItem('auth-storage', JSON.stringify(saved))
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page
    .getByRole('button', { name: '프로그램 둘러보기', exact: true })
    .last()
    .click()
  await page.waitForURL('**/dashboard')
  const signedIn = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('auth-storage') || '{}'),
  )
  assert.equal(signedIn.state?.isAuthenticated, true)
  assert.equal(signedIn.state?.isGuest, false)
  results.push('Authenticated session survives program entry')

  const offline = await browser.newPage({
    viewport: { width: 390, height: 844 },
  })
  await offline.route('**/stats/public', (route) =>
    route.fulfill({ status: 400, json: {} }),
  )
  await offline.goto(base, { waitUntil: 'domcontentloaded' })
  assert.match(
    await offline.locator('.stats-source').innerText(),
    /최근 등록된 데이터/,
  )
  assert.match(await offline.locator('.landing-stats').innerText(), /8,579/)
  await offline.close()
  results.push('Stats failure preserves fallback data and honest source label')

  // Compose crawlable social artwork with real Korean text and the generated brand asset.
  const hero = (
    await readFile(
      resolve(root, 'apps/web/public/brand/clinical/clarity-hero-1536.webp'),
    )
  ).toString('base64')
  const og = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  })
  const ogHtml = `<!doctype html><html lang="ko"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;overflow:hidden;background:#f7f8f5;color:#172d28;font-family:'Malgun Gothic',sans-serif}.art{position:absolute;right:-80px;top:0;width:690px;height:630px;object-fit:cover;object-position:65% center}.copy{position:relative;padding:66px 60px;width:700px}.brand{font-size:26px;font-weight:700;letter-spacing:-1px}.brand small{font-size:18px;color:#12685d;margin-left:8px}.line{font-size:12px;color:#12685d;letter-spacing:2px;margin-top:54px}h1{font-size:59px;letter-spacing:-4px;line-height:1.3;font-weight:600;margin:22px 0}em{color:#12685d;font-style:normal}p{font-size:17px;color:#5b6b63;line-height:1.9}.url{font-size:13px;margin-top:31px;color:#12685d}</style><img class="art" src="data:image/webp;base64,${hero}" alt=""><div class="copy"><div class="brand">온고지신<small>AI</small></div><div class="line">KNOWLEDGE, CONNECTED.</div><h1>진료의 판단에,<br><em>확인할 수 있는 근거를.</em></h1><p>축적된 치험례와 임상 문헌을 오늘의 진료 가까이에.<br>한의사를 위한 임상 워크스페이스.</p><div class="url">ongojisin.ai</div></div></html>`
  await og.setContent(ogHtml, { waitUntil: 'load' })
  await og.evaluate(() => document.fonts.ready)
  await og.screenshot({
    path: resolve(root, 'apps/web/public/brand/clinical/og-clinical-v1.png'),
  })
  await writeFile(resolve(out, 'social-preview.html'), ogHtml)
  results.push('1200×630 PNG social artwork generated')

  assert.deepEqual(errors, [], `Browser runtime errors: ${errors.join('; ')}`)
  await writeFile(
    resolve(out, 'verification.json'),
    JSON.stringify(
      { base, results, errors, checkedAt: new Date().toISOString() },
      null,
      2,
    ),
  )
  console.log(results.join('\n'))
} finally {
  await browser.close()
}
