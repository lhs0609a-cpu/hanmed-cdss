import { test } from '@playwright/test'

/** 진료 전 비용 안내 — 급여 대상/비대상 분기와 외부 링크 */
test('한약 비용 안내', async ({ page }) => {
  test.setTimeout(3 * 60 * 1000)
  await page.setViewportSize({ width: 420, height: 1600 })
  const OUT = process.env.OUT_DIR || 'test-results/cost'

  await page.goto('/patient', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)
  const land = await page.locator('body').innerText()
  console.log(`[랜딩 진입점] ${land.includes('한약, 얼마나 들까요') ? '있음 ✓' : '없음 ✗'}`)

  await page.goto('/patient/cost', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)
  const t = await page.locator('body').innerText()
  console.log(`[대상 질환 6개] ${t.includes('알레르기비염') && t.includes('월경통') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[가격 조회 링크] ${t.includes('비급여 가격 조회하기') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[사전 설명 권리] ${t.includes('미리 설명받으실 수 있습니다') ? '있음 ✓' : '없음 ✗'}`)

  // 급여 대상 선택
  await page.getByRole('button', { name: '알레르기비염' }).click()
  await page.waitForTimeout(900)
  const t2 = await page.locator('body').innerText()
  console.log(`[급여 안내] ${t2.includes('본인부담 30%') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[연간 한도] ${t2.includes('2개 질환까지') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[경감액 출처] ${t2.includes('84,860원') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[참여기관 찾기] ${t2.includes('참여 한의원 찾기') ? '있음 ✓' : '없음 ✗'}`)
  await page.screenshot({ path: `${OUT}/급여대상.png`, fullPage: true })

  // 비대상 선택
  await page.getByRole('button', { name: '그 밖의 증상' }).click()
  await page.waitForTimeout(900)
  const t3 = await page.locator('body').innerText()
  console.log(`[비급여 안내] ${t3.includes('아직 비급여입니다') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[가짜 가격 노출] ${/\d{2,3},\d{3}원/.test(t3.replace('84,860원','')) ? '있음 ✗' : '없음 ✓'}`)
  await page.screenshot({ path: `${OUT}/비급여.png`, fullPage: true })
})
