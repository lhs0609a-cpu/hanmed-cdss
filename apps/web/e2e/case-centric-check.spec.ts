import { test } from '@playwright/test'

/** 치험례 축 확인 — 처방 목록/상세, 변증 도우미에 근거가 붙는지 */
test('치험례 중심 화면 확인', async ({ page }) => {
  test.setTimeout(6 * 60 * 1000)
  await page.setViewportSize({ width: 1440, height: 1100 })
  const OUT = process.env.OUT_DIR || 'test-results/case-centric'

  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /데모 계정으로 체험/i }).click()
  await page.waitForTimeout(6000)

  // 대시보드 — 치험례 동선
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)
  const dash = await page.locator('body').innerText()
  console.log(`[대시보드 치험례 동선] ${dash.includes('치험례에서 근거 찾기') ? '있음 ✓' : '없음'}`)
  await page.screenshot({ path: `${OUT}/01-대시보드.png`, fullPage: true })

  // 처방 목록 — 카드별 치험례 건수
  await page.goto('/dashboard/formulas', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(9000)
  const list = await page.locator('body').innerText()
  const counted = (list.match(/치험례 [\d,]+건/g) || []).length
  console.log(`[처방 목록 치험례 뱃지] ${counted}개 카드`)
  await page.screenshot({ path: `${OUT}/02-처방목록.png`, fullPage: true })

  // 처방 상세 — 근거 패널
  const firstCard = page.locator('a[href^="/formulas/"]').first()
  if (await firstCard.count()) {
    await firstCard.click()
    await page.waitForTimeout(9000)
    const detail = await page.locator('body').innerText()
    console.log(`[처방 상세 근거 패널] ${detail.includes('치험례 근거') ? '있음 ✓' : '없음'}`)
    await page.screenshot({ path: `${OUT}/03-처방상세.png`, fullPage: true })
  }
})
