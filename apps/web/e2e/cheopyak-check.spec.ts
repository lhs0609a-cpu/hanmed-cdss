import { test } from '@playwright/test'

/** 첩약 시범사업 도우미 — 한도 계산과 체크리스트 초안 확인 */
test('첩약 도우미', async ({ page }) => {
  test.setTimeout(4 * 60 * 1000)
  await page.setViewportSize({ width: 1440, height: 1400 })
  const OUT = process.env.OUT_DIR || 'test-results/cheopyak'
  const PID = process.env.PID || ''

  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /데모 계정으로 체험/i }).click()
  await page.waitForTimeout(7000)

  await page.goto(`/dashboard/patients/${PID}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(8000)
  const t = await page.locator('body').innerText()
  console.log(`[도우미 카드] ${t.includes('첩약 건강보험') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[사용 현황] ${t.includes('20일 사용') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[한도 소진 경고] ${t.includes('모두 사용했습니다') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[체크리스트 초안] ${t.includes('진단 체크리스트 초안') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[차트 내용 반영] ${t.includes('독활기생탕') && t.includes('척맥 침약') ? '있음 ✓' : '없음 ✗'}`)
  await page.screenshot({ path: `${OUT}/첩약도우미.png`, fullPage: true })

  // 다른 질환을 고르면 잔여 20일로 바뀌어야 한다
  const sel = page.locator('select').filter({ hasText: '알레르기비염' }).first()
  if (await sel.count()) {
    await sel.selectOption({ label: '알레르기비염' })
    await page.waitForTimeout(1000)
    const t2 = await page.locator('body').innerText()
    console.log(`[미사용 질환 잔여] ${t2.includes('20일분') ? '20일분 ✓' : '없음 ✗'}`)
  }
})
