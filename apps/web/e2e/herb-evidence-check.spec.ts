import { test } from '@playwright/test'

/** 약재 화면 치험례 연결 확인 */
test('약재 치험례 확인', async ({ page }) => {
  test.setTimeout(5 * 60 * 1000)
  await page.setViewportSize({ width: 1440, height: 1100 })
  const OUT = process.env.OUT_DIR || 'test-results/herb'

  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /데모 계정으로 체험/i }).click()
  await page.waitForTimeout(6000)

  await page.goto('/dashboard/herbs', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(9000)
  const list = await page.locator('body').innerText()
  console.log(`[약재 목록 뱃지] ${(list.match(/치험례 [\d,]+건/g) || []).length}개 카드`)
  await page.screenshot({ path: `${OUT}/01-약재목록.png`, fullPage: true })

  const first = page.locator('a[href^="/dashboard/herbs/"]').first()
  if (await first.count()) {
    await first.click()
    await page.waitForTimeout(9000)
    const detail = await page.locator('body').innerText()
    console.log(`[약재 상세 근거 패널] ${detail.includes('치험례 근거') ? '있음 ✓' : '없음'}`)
    console.log(`[출판 편향 고지] ${detail.includes('성공한 사례를 주로') ? '있음 ✓' : '없음'}`)
    await page.screenshot({ path: `${OUT}/02-약재상세.png`, fullPage: true })
  }
})
