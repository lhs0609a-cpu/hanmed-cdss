import { test } from '@playwright/test'

/** 딥리서치 기반 신규 기능 4종 확인 */
test('자보 내역서 · 병용 점검 · 재진 관리', async ({ page }) => {
  test.setTimeout(5 * 60 * 1000)
  await page.setViewportSize({ width: 1440, height: 1600 })
  const OUT = process.env.OUT_DIR || 'test-results/painpoints'
  const PID = process.env.PID || ''

  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /데모 계정으로 체험/i }).click()
  await page.waitForTimeout(7000)

  // 대시보드 — 한동안 안 온 환자
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(6000)
  const dash = await page.locator('body').innerText()
  console.log(`[안 온 환자 카드] ${dash.includes('한동안 안 온 환자') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[대상 표시] ${dash.includes('최첩약') ? '있음 ✓' : '없음 ✗'}`)
  await page.screenshot({ path: `${OUT}/대시보드.png`, fullPage: true })

  // 환자 상세 — 병용 점검
  await page.goto(`/dashboard/patients/${PID}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(9000)
  const detail = await page.locator('body').innerText()
  console.log(`[병용 점검 카드] ${detail.includes('복용 양약') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[복용약 표시] ${detail.includes('와파린') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[상호작용 결과] ${detail.includes('병용 금기') || detail.includes('주의 요망') || detail.includes('알려진 상호작용은') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[설명 기록됨] ${detail.includes('설명함으로 기록됨') ? '있음 ✓' : '없음'}`)
  await page.screenshot({ path: `${OUT}/환자상세.png`, fullPage: true })

  // 진료 기록 — 자보 내역서
  await page.getByRole('button', { name: /^진료 기록 \(/ }).click()
  await page.waitForTimeout(2000)
  const btn = page.getByRole('button', { name: /자보 내역서 만들기/ }).first()
  console.log(`[자보 버튼] ${(await btn.count()) ? '있음 ✓' : '없음 ✗'}`)
  if (await btn.count()) {
    await btn.click()
    await page.waitForTimeout(5000)
    const sheet = await page.locator('body').innerText()
    console.log(`[내역서 모달] ${sheet.includes('별지 제13호') ? '있음 ✓' : '없음 ✗'}`)
    console.log(`[약재 프리필] ${sheet.includes('독활') ? '있음 ✓' : '없음 ✗'}`)
    console.log(`[7일 초과 경고] ${sheet.includes('1회 최대 7일분') ? '있음 ✓' : '없음(10일 아님)'}`)
    await page.screenshot({ path: `${OUT}/자보내역서.png`, fullPage: true })
  }
})
