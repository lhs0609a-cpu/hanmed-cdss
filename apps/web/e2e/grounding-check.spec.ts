import { test } from '@playwright/test'

/** 근거 블록 렌더 확인 — 예시 진료를 돌려 "이 처방을 고른 근거" 가 뜨는지 본다. */
test('추천 근거 블록 캡처', async ({ page }) => {
  test.setTimeout(5 * 60 * 1000)
  await page.setViewportSize({ width: 1440, height: 1200 })
  const OUT = process.env.OUT_DIR || 'test-results/grounding'

  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /데모 계정으로 체험/i }).click()
  await page.waitForTimeout(6000)

  await page.goto('/dashboard/consultation?demo=1', { waitUntil: 'domcontentloaded' })
  // AI 분석 + 치험례 조회가 끝나기를 넉넉히 기다린다
  await page.getByText('이 처방을 고른 근거').waitFor({ timeout: 180000 })
  await page.waitForTimeout(2500)

  await page.screenshot({ path: `${OUT}/근거블록.png`, fullPage: true })

  const body = await page.locator('body').innerText()
  console.log(`[근거 블록] 존재 ✓`)
  console.log(`[출전 표기] ${body.includes('출전') ? '있음 ✓' : '없음'}`)
  console.log(`[직접 인용 뱃지] ${body.includes('직접 인용') ? '있음 ✓' : '없음'}`)
  console.log(`[공유 버튼] ${body.includes('치험례로 공유하기') ? '있음 ✓' : '없음'}`)
  console.log(`[근거 없음 안내] ${body.includes('유사 치험례 근거가 붙지 않았습니다') ? '표시됨' : '해당없음'}`)
})
