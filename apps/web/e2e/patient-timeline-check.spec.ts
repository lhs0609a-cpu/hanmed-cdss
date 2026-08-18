import { test } from '@playwright/test'

/** 환자 상세 — 서버 데이터 로드, 경과 기록, 통증 점수 영속 확인 */
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
  console.log(`[통증 점수 영속] ${head.includes('3/10') ? '3/10 ✓' : '없음 ✗'}`)

  await page.getByRole('button', { name: /^진료 기록 \(/ }).click()
  await page.waitForTimeout(2000)
  const v = await page.locator('body').innerText()
  console.log(`[맥진 영속] ${v.includes('허완') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[경과 미기록] ${v.includes('경과 미기록') ? '있음 ✓' : '없음'}`)
  await page.screenshot({ path: `${OUT}/진료기록.png`, fullPage: true })

  await page.getByRole('button', { name: /^경과 추이$/ }).click()
  await page.waitForTimeout(2000)
  const g = await page.locator('body').innerText()
  console.log(`[경과 추이] ${g.includes('데이터 부족') ? '데이터 부족' : '그래프 ✓'}`)
  await page.screenshot({ path: `${OUT}/경과추이.png`, fullPage: true })
})
