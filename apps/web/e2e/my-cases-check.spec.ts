import { test } from '@playwright/test'

/** 내 치험례 — 서버 저장 확인 (다른 브라우저 세션에서도 보이는가) */
test('내 치험례 서버 저장', async ({ page }) => {
  test.setTimeout(4 * 60 * 1000)
  await page.setViewportSize({ width: 1440, height: 1200 })
  const OUT = process.env.OUT_DIR || 'test-results/my-cases'

  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /데모 계정으로 체험/i }).click()
  await page.waitForTimeout(7000)

  await page.goto('/dashboard/my-cases', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(6000)
  const body = await page.locator('body').innerText()
  console.log(`[서버 치험례] ${body.includes('반하백출천마탕') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[기기 저장 경고] ${body.includes('이 기기에만 저장됩니다') ? '남아있음 ✗' : '제거됨 ✓'}`)
  console.log(`[통계] ${body.includes('호전/완치') ? '있음 ✓' : '없음'}`)

  // 상단 의료 고지 배너에도 '자세히' 가 있으므로 마지막 것(카드 안쪽)을 집는다
  const more = page.getByRole('button', { name: /^자세히$/ }).last()
  if (await more.count()) {
    await more.click()
    await page.waitForTimeout(1200)
    const t = await page.locator('body').innerText()
    console.log(`[펼치기] ${t.includes('담음상역') ? '변증 보임 ✓' : '안 보임 ✗'}`)
    console.log(`[약재] ${t.includes('반하 6g') ? '있음 ✓' : '없음'}`)
  } else {
    console.log('[펼치기] 버튼 없음 ✗')
  }
  await page.screenshot({ path: `${OUT}/내치험례.png`, fullPage: true })
})
