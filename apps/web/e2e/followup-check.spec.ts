import { test } from '@playwright/test'

/** 경과 확인 카드 렌더 확인 */
test('대시보드 경과 확인 카드', async ({ page }) => {
  test.setTimeout(4 * 60 * 1000)
  await page.setViewportSize({ width: 1440, height: 1000 })
  const OUT = process.env.OUT_DIR || 'test-results/followup'

  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /데모 계정으로 체험/i }).click()
  await page.waitForTimeout(7000)
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(6000)

  const body = await page.locator('body').innerText()
  console.log(`[경과 확인 카드] ${body.includes('경과 확인') ? '있음 ✓' : '없음'}`)
  console.log(`[환자·처방 표시] ${body.includes('보중익기탕') ? '있음 ✓' : '없음'}`)

  const row = page.getByText('보중익기탕').first()
  if (await row.count()) {
    await row.click()
    await page.waitForTimeout(1200)
    const after = await page.locator('body').innerText()
    console.log(`[경과 버튼] ${after.includes('완치') && after.includes('호전') ? '있음 ✓' : '없음'}`)
  }
  await page.screenshot({ path: `${OUT}/대시보드.png`, fullPage: true })
})
