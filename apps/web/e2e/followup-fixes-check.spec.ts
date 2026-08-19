import { test } from '@playwright/test'

/** 이어서 잡은 3건: 환자 포털 실데이터, 자보 서식 항목·약침, 비급여 사전 설명 */
test('포털·자보·비급여 확인', async ({ page }) => {
  test.setTimeout(5 * 60 * 1000)
  const OUT = process.env.OUT_DIR || 'test-results/fixes'
  const PID = process.env.PID || ''

  // 1) 환자 포털 — 가짜 예약/처방이 사라졌는지
  await page.setViewportSize({ width: 420, height: 1000 })
  await page.goto('/patient', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)
  const land = await page.locator('body').innerText()
  console.log(`[랜딩 가짜 광고] ${land.includes('예약 확인') || land.includes('복약 알림을') ? '남음 ✗' : '제거됨 ✓'}`)
  console.log(`[랜딩 실제 기능] ${land.includes('복약 안내서') ? '있음 ✓' : '없음 ✗'}`)

  await page.goto('/patient/home', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)
  const home = await page.locator('body').innerText()
  console.log(`[가짜 예약 데이터] ${home.includes('2026-05-12') || home.includes('오전 10:30') ? '남음 ✗' : '제거됨 ✓'}`)
  console.log(`[보관함 빈 상태] ${home.includes('아직 저장된 안내서가 없습니다') ? '있음 ✓' : '없음 ✗'}`)
  await page.screenshot({ path: `${OUT}/환자홈.png`, fullPage: true })

  // 2) 한의사 — 자보 서식 + 비급여 기록
  await page.setViewportSize({ width: 1440, height: 1400 })
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /데모 계정으로 체험/i }).click()
  await page.waitForTimeout(7000)
  await page.goto(`/dashboard/patients/${PID}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(8000)
  await page.getByRole('button', { name: /^진료 기록 \(/ }).click()
  await page.waitForTimeout(2000)

  await page.getByRole('button', { name: /자보 내역서 만들기/ }).first().click()
  await page.waitForTimeout(5000)
  const sheet = await page.locator('body').innerText()
  console.log(`[상병기호 칸] ${sheet.includes('상병기호') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[변증 칸] ${sheet.includes('신허요통') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[조성(g)] ${sheet.includes('조성(g)') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[약침 섹션] ${sheet.includes('약침도 시술했습니다') ? '있음 ✓' : '없음 ✗'}`)
  await page.getByRole('checkbox').filter({ hasNot: page.locator('[disabled]') }).last().check().catch(() => {})
  await page.waitForTimeout(800)
  const sheet2 = await page.locator('body').innerText()
  console.log(`[약침 경고] ${sheet2.includes('경상환자') ? '있음 ✓' : '없음'}`)
  await page.screenshot({ path: `${OUT}/자보서식.png`, fullPage: true })
  await page.keyboard.press('Escape')

  // 3) 복약 안내서 모달 — 사전 설명 기록 표시
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(7000)
  await page.getByRole('button', { name: /^진료 기록 \(/ }).click()
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: /환자 복약 안내서/ }).first().click()
  await page.waitForTimeout(6000)
  const g = await page.locator('body').innerText()
  console.log(`[사전 설명 기록됨] ${g.includes('사전 설명·동의 기록됨') ? '있음 ✓' : '없음 ✗'}`)
  // 금액은 input 의 value 라 innerText 로는 안 잡힌다
  const costValues = await page.locator('input[type="number"]').evaluateAll((els) =>
    els.map((e) => (e as HTMLInputElement).value),
  )
  console.log(`[비용 자동 반영] ${costValues.includes('180000') ? '있음 ✓' : '없음 ✗'}`)
  await page.screenshot({ path: `${OUT}/안내서모달.png`, fullPage: true })
})
