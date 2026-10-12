// Run against a local Vite server: BASE_URL=http://127.0.0.1:4184 node scripts/clinical-demo-check.cjs
const { chromium, expect } = require('../apps/web/node_modules/@playwright/test')
const fs = require('node:fs')
const path = require('node:path')
const base = process.env.BASE_URL || 'http://127.0.0.1:4184'
const output = path.resolve(__dirname, '../output/clinical-demo-review')

async function prepare(browser, width) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'doNotTrack', { get: () => '0' })
    window.demoEvents = []
    window.addEventListener('ongojisin:landing-event', (event) =>
      window.demoEvents.push(event.detail),
    )
  })
  await page.route('**/analytics/**', (route) => route.fulfill({ status: 204 }))
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.clinical-workbench')).toBeVisible()
  return { page, errors }
}

async function run() {
  fs.mkdirSync(output, { recursive: true })
  const browser = await chromium.launch()
  const checks = []
  try {
    for (const width of [1440, 768, 390, 320]) {
      const { page, errors } = await prepare(browser, width)
      const demo = page.locator('.clinical-workbench')
      for (const checkbox of await demo.getByRole('checkbox').all()) await checkbox.uncheck()
      await expect(demo.locator('.cd-compare-button').first()).toBeDisabled()
      await demo.getByRole('checkbox', { name: '후니한 설태' }).check()
      await demo.getByRole('checkbox', { name: '활맥', exact: true }).check()
      await demo.getByRole('button', { name: '선택한 소견 비교하기' }).click()
      await expect(demo.locator('.cd-comparison > div')).toHaveCount(2)
      await expect(demo.locator('.cd-comparison')).toContainText('설진: 후니')
      await expect(demo.locator('.cd-comparison')).not.toContainText('메스꺼움')
      await expect(demo.locator('.cd-panel-lead')).toContainText('2개 소견')
      if ([1440, 390].includes(width))
        await demo.screenshot({
          path: path.join(output, `comparison-${width}.png`),
          style: '.landing-header { visibility: hidden; }',
        })
      await demo.getByRole('tab', { name: '소견 비교', exact: true }).focus()
      await page.keyboard.press('ArrowRight')
      await expect(demo.getByRole('tab', { name: '처방·경과', exact: true })).toBeFocused()
      await expect(demo.locator('.cd-outcomes')).toContainText('61')
      await expect(demo.locator('.cd-outcomes')).toContainText('41')
      if ([1440, 390].includes(width))
        await demo.screenshot({
          path: path.join(output, `outcomes-${width}.png`),
          style: '.landing-header { visibility: hidden; }',
        })
      await page.keyboard.press('ArrowRight')
      await expect(demo.getByRole('tab', { name: '근거 확인', exact: true })).toBeFocused()
      await expect(demo.locator('[data-growth="demo_source_open"]')).toHaveAttribute(
        'href',
        'https://jikm.or.kr/upload/pdf/jikm-46-3-570.pdf',
      )
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      expect(
        await page.evaluate(
          () => window.demoEvents.filter((e) => e.name === 'demo_completed').length,
        ),
      ).toBe(1)
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      )
      await demo.locator('[data-growth="signup_after_demo"]').click()
      await expect(page).toHaveURL(/\/register$/)
      expect(
        await page.evaluate(
          () => window.demoEvents.filter((e) => e.name === 'demo_signup_clicked').length,
        ),
      ).toBe(1)
      expect(errors).toEqual([])
      checks.push({
        width,
        checks:
          'selection, empty selection, comparison, keyboard tabs, outcomes, source, completion deduplication, signup, overflow',
      })
      await page.close()
    }

    const { page, errors } = await prepare(browser, 390)
    let responseMode = 'success'
    let requested = ''
    await page.route('**/public/references?**', async (route) => {
      requested = new URL(route.request().url()).searchParams.get('keyword')
      if (responseMode === 'error') return route.fulfill({ status: 503, json: {} })
      if (responseMode === 'rate-limit') return route.fulfill({ status: 429, json: {} })
      if (responseMode === 'empty')
        return route.fulfill({ json: { success: true, data: { items: [], total: 0 } } })
      const items = [
        {
          slug: 'test-1',
          title: 'Test paper',
          titleKo: `${requested} 검색 검증용 자료`,
          summaryKo: '테스트 응답의 공개 요약입니다.',
          journal: 'Test Journal',
          publishedYear: 2025,
          evidenceType: 'rct',
          url: 'https://example.com/paper',
        },
        { slug: 'test-2', title: 'No summary', summaryKo: null, url: 'javascript:alert(1)' },
      ]
      return route.fulfill({ json: { success: true, data: { items, total: 24 } } })
    })
    const demo = page.locator('.clinical-workbench')
    await demo.getByRole('tab', { name: '실제 문헌 검색', exact: false }).click()
    await expect(demo.locator('.cd-search-empty')).toContainText('가입 없이 실제 결과')
    await demo.locator('[data-growth="demo_research_search"]').click()
    await expect(demo.locator('.cd-paper-list article')).toHaveCount(2)
    expect(requested).toBe('요통')
    await expect(demo.locator('.cd-search-status')).toContainText('24편 중 2편')
    await demo.locator('.cd-paper-toggle').first().click()
    await expect(demo.locator('.cd-paper-summary').first()).toContainText('테스트 응답의 공개 요약')
    await demo.locator('.cd-paper-toggle').nth(1).click()
    await expect(demo.locator('.cd-paper-summary').nth(1)).toContainText(
      '공개 한국어 요약이 아직 없습니다',
    )
    await expect(demo.locator('a[href^="javascript:"]')).toHaveCount(0)
    await demo.getByRole('radio', { name: '편두통' }).check()
    await expect(demo.locator('.cd-paper-list article')).toHaveCount(0)
    responseMode = 'empty'
    await demo.locator('[data-growth="demo_research_search"]').click()
    await expect(demo.locator('.cd-search-empty')).toContainText('공개 자료를 찾지 못했습니다')
    responseMode = 'error'
    await demo.locator('[data-growth="demo_research_search"]').click()
    await expect(demo.getByRole('alert')).toContainText('문헌을 불러오지 못했습니다')
    responseMode = 'rate-limit'
    await demo.getByRole('button', { name: '다시 검색하기', exact: true }).click()
    await expect(demo.getByRole('alert')).toContainText('잠시 후 다시 검색')
    responseMode = 'success'
    await demo.getByRole('button', { name: '다시 검색하기', exact: true }).click()
    await expect(demo.locator('.cd-paper-list')).toContainText('편두통 검색 검증용 자료')
    expect(errors).toEqual([])
    checks.push({
      checks:
        'real request parameters, expandable result, missing summary, safe source links, changed topic, empty, error, rate limit, retry',
    })

    // An earlier request must never replace results for a newly selected topic.
    await page.unroute('**/public/references?**')
    let slowRequestStarted
    const slowRequest = new Promise((resolve) => {
      slowRequestStarted = resolve
    })
    await page.route('**/public/references?**', async (route) => {
      const keyword = new URL(route.request().url()).searchParams.get('keyword')
      if (keyword === '요통') {
        slowRequestStarted()
        await new Promise((resolve) => setTimeout(resolve, 600))
      }
      await route
        .fulfill({
          json: { data: { total: 1, items: [{ slug: keyword, title: keyword + ' 최신 결과' }] } },
        })
        .catch(() => {})
    })
    await demo.getByRole('radio', { name: '요통' }).check()
    await demo.locator('[data-growth="demo_research_search"]').click()
    await slowRequest
    await demo.getByRole('radio', { name: '수면장애' }).check()
    await demo.locator('[data-growth="demo_research_search"]').click()
    await expect(demo.locator('.cd-paper-list')).toContainText('수면장애 최신 결과')
    await page.waitForTimeout(750)
    await expect(demo.locator('.cd-paper-list')).not.toContainText('요통 최신 결과')
    expect(errors).toEqual([])
    checks.push({ checks: 'cancelled search cannot overwrite newer topic results' })
    await page.close()

    // Optional integration check: use Vite --mode connected and LIVE_API_CHECK=1.
    if (process.env.LIVE_API_CHECK === '1') {
      const live = await prepare(browser, 1440)
      await live.page.getByRole('tab', { name: '실제 문헌 검색', exact: false }).click()
      await live.page.locator('[data-growth="demo_research_search"]').click()
      await expect(live.page.locator('.cd-paper-list article').first()).toBeVisible({
        timeout: 20000,
      })
      await live.page.locator('.cd-paper-toggle').first().click()
      await live.page
        .locator('.clinical-workbench')
        .screenshot({
          path: path.join(output, 'live-research-1440.png'),
          style: '.landing-header { visibility: hidden; }',
        })
      checks.push({
        checks: 'live public API',
        result: await live.page.locator('.cd-search-status').innerText(),
      })
      expect(live.errors).toEqual([])
      await live.page.close()
    }
    fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(checks, null, 2))
    console.log(JSON.stringify(checks, null, 2))
  } finally {
    await browser.close()
  }
}
run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
