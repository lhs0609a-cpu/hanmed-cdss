import { test } from '@playwright/test'

/** 환자 화면 — 복용 진행과 내 경과 */
test('복용 진행 · 내 경과', async ({ page }) => {
  test.setTimeout(4 * 60 * 1000)
  await page.setViewportSize({ width: 420, height: 1600 })
  const OUT = process.env.OUT_DIR || 'test-results/progress'
  const TOKEN = process.env.GUIDE_TOKEN || ''

  await page.goto(`/guide/${TOKEN}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(6000)
  const t = await page.locator('body').innerText()
  console.log(`[내 경과 섹션] ${t.includes('내 경과') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[호전 문구] ${t.includes('낮아졌습니다') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[복용 시작 버튼] ${t.includes('오늘부터 복용 시작') ? '있음 ✓' : '없음 ✗'}`)

  await page.getByRole('button', { name: '오늘부터 복용 시작' }).click()
  await page.waitForTimeout(1200)
  const t2 = await page.locator('body').innerText()
  console.log(`[복용 일차] ${t2.includes('복용 1일째') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[남은 일수] ${t2.includes('9일 남음') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[오늘 복용 상태] ${t2.includes('오늘 복용 완료') ? '완료 ✓' : t2.includes('오늘 먹었어요') ? '미체크' : '없음 ✗'}`)
  await page.screenshot({ path: `${OUT}/복용진행.png`, fullPage: true })

  // 기록 후 다시 기록하기
  await page.getByRole('button', { name: '한의원에 보내기' }).click()
  await page.waitForTimeout(3500)
  const t3 = await page.locator('body').innerText()
  console.log(`[다시 기록하기] ${t3.includes('다시 기록하기') ? '있음 ✓' : '없음 ✗'}`)

  // 보관함에 복용 일차가 뜨는지
  await page.goto('/patient/home', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)
  const t4 = await page.locator('body').innerText()
  console.log(`[보관함 등록] ${t4.includes('보중익기탕') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[보관함 복용일차] ${t4.includes('복용 1일째') ? '있음 ✓' : '없음 ✗'}`)
  await page.screenshot({ path: `${OUT}/보관함.png`, fullPage: true })
})
