import { test } from '@playwright/test'

/** 진료 → 내 치험례 승격 확인 */
test('진료를 치험례로 저장', async ({ page }) => {
  test.setTimeout(4 * 60 * 1000)
  await page.setViewportSize({ width: 1440, height: 1300 })
  const OUT = process.env.OUT_DIR || 'test-results/promote'
  const PID = process.env.PID || ''

  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /데모 계정으로 체험/i }).click()
  await page.waitForTimeout(7000)

  await page.goto(`/dashboard/patients/${PID}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(8000)
  await page.getByRole('button', { name: /^진료 기록 \(/ }).click()
  await page.waitForTimeout(2000)

  const btn = page.getByRole('button', { name: /내 치험례로 저장/ }).first()
  console.log(`[승격 버튼] ${(await btn.count()) ? '있음 ✓' : '없음 ✗'}`)
  if (await btn.count()) {
    await btn.click()
    await page.waitForTimeout(4000)
    const t = await page.locator('body').innerText()
    console.log(`[저장됨 표시] ${t.includes('내 치험례에 저장됨') ? '있음 ✓' : '없음 ✗'}`)
    await page.screenshot({ path: `${OUT}/승격.png`, fullPage: true })
  }

  await page.goto('/dashboard/my-cases', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(6000)
  const c = await page.locator('body').innerText()
  console.log(`[치험례에 반영] ${c.includes('반하백출천마탕') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[경과 반영] ${c.includes('호전') ? '있음 ✓' : '없음'}`)
  console.log(`[나이·성별] ${c.includes('45세 여') ? '45세 여 ✓' : c.includes('세 여') ? '나이 표시 ✓' : '없음'}`)

  // 새로고침 후에도 중복 저장 버튼이 다시 뜨지 않아야 한다
  await page.goto(`/dashboard/patients/${PID}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(7000)
  await page.getByRole('button', { name: /^진료 기록 \(/ }).click()
  await page.waitForTimeout(2000)
  const again = await page.locator('body').innerText()
  console.log(`[재방문 시 중복 방지] ${again.includes('내 치험례에 저장됨') ? '유지됨 ✓' : '버튼 다시 뜸 ✗'}`)
})
