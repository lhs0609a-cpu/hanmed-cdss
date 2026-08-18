import { test } from '@playwright/test'

/** 환자 상세 — 서버 데이터 로드와 진료 타임라인 경과 기록 확인 */
test('환자 상세 타임라인', async ({ page }) => {
  test.setTimeout(4 * 60 * 1000)
  await page.setViewportSize({ width: 1440, height: 1400 })
  const OUT = process.env.OUT_DIR || 'test-results/timeline'
  const PID = process.env.PID || ''

  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /데모 계정으로 체험/i }).click()
  await page.waitForTimeout(7000)

  await page.goto(`/dashboard/patients/${PID}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(8000)
  const head = await page.locator('body').innerText()
  console.log(`[상세 로드] ${head.includes('이타임') ? '있음 ✓' : '없음'}`)
  console.log(`[NaN 표기] ${head.includes('NaN') ? '있음 ✗' : '없음 ✓'}`)

  // "새 진료 기록" 버튼과 겹치지 않게 탭만 정확히 집는다
  await page.getByRole('button', { name: /^진료 기록 \(/ }).click()
  await page.waitForTimeout(2500)
  const v = await page.locator('body').innerText()
  console.log(`[처방 표시] ${v.includes('보중익기탕') ? '있음 ✓' : '없음'}`)
  console.log(`[경과 미기록] ${v.includes('경과 미기록') ? '있음 ✓' : '없음'}`)

  const rec = page.getByRole('button', { name: '경과 기록하기' }).first()
  if (await rec.count()) {
    await rec.click()
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: '호전', exact: true }).first().click()
    await page.waitForTimeout(3000)
    const after = await page.locator('body').innerText()
    console.log(`[기록 후 뱃지] ${after.includes('호전') ? '있음 ✓' : '없음'}`)
  } else {
    console.log('[경과 기록 버튼] 없음')
  }
  await page.screenshot({ path: `${OUT}/환자상세.png`, fullPage: true })
})
