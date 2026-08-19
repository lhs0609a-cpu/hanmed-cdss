import { test } from '@playwright/test'

/** 한의사 쪽 — 안내서 발행 모달, 환자가 보낸 기록 카드 */
test('안내서 발행 · 환자 기록 수신', async ({ page }) => {
  test.setTimeout(5 * 60 * 1000)
  await page.setViewportSize({ width: 1440, height: 1500 })
  const OUT = process.env.OUT_DIR || 'test-results/guide-p'
  const PID = process.env.PID || ''

  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /데모 계정으로 체험/i }).click()
  await page.waitForTimeout(7000)

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(6000)
  const dash = await page.locator('body').innerText()
  console.log(`[환자 기록 카드] ${dash.includes('환자가 보낸 기록') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[이상반응 강조] ${dash.includes('이상반응') ? '있음 ✓' : '없음 ✗'}`)
  await page.screenshot({ path: `${OUT}/대시보드.png`, fullPage: true })

  await page.goto(`/dashboard/patients/${PID}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(8000)
  await page.getByRole('button', { name: /^진료 기록 \(/ }).click()
  await page.waitForTimeout(2000)

  const btn = page.getByRole('button', { name: /환자 복약 안내서/ }).first()
  console.log(`[안내서 버튼] ${(await btn.count()) ? '있음 ✓' : '없음 ✗'}`)
  if (await btn.count()) {
    await btn.click()
    await page.waitForTimeout(6000)
    const m = await page.locator('body').innerText()
    console.log(`[모달] ${m.includes('복약 안내서') ? '있음 ✓' : '없음 ✗'}`)
    console.log(`[링크] ${m.includes('/guide/') ? '있음 ✓' : '없음 ✗'}`)
    console.log(`[자가 기록 표시] ${m.includes('환자 자가 기록') ? '있음 ✓' : '없음 ✗'}`)
    console.log(`[비급여 고지 안내] ${m.includes('제45조의2') ? '있음 ✓' : '없음 ✗'}`)
    const qr = page.locator('img[alt="복약 안내서 QR 코드"]')
    console.log(`[QR] ${(await qr.count()) ? '있음 ✓' : '없음 ✗'}`)
    await page.screenshot({ path: `${OUT}/발행모달.png`, fullPage: true })
  }
})
