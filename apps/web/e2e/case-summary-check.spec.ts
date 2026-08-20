import { test } from '@playwright/test'

/** 치험례 목록·상세에 구조화 요약이 나오는지 + 페이지 이동 */
test('치험례 요약 · 페이지 이동', async ({ page }) => {
  test.setTimeout(4 * 60 * 1000)
  await page.setViewportSize({ width: 1440, height: 1300 })
  const OUT = process.env.OUT_DIR || 'test-results/case-summary'

  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /데모 계정으로 체험/i }).click()
  await page.waitForTimeout(7000)

  // 정리가 끝난 케이스를 확실히 잡기 위해 그 케이스의 문구로 검색한다
  // 기본은 AI 유사검색이라 문구가 그대로 안 걸린다. 텍스트 검색으로 연다.
  await page.goto(
    '/dashboard/cases?mode=text&q=' + encodeURIComponent('풍치와 잇몸출혈'),
    { waitUntil: 'domcontentloaded' },
  )
  await page.waitForTimeout(7000)
  const list = await page.locator('body').innerText()
  console.log(`[목록 요약문] ${list.includes('내원') && list.includes('복용 후') ? '있음 ✓' : '없음 ✗'}`)
  await page.screenshot({ path: `${OUT}/목록.png`, fullPage: true })

  // 상세 열기
  const card = page.locator('h3').filter({ hasText: /탕|산|음|환/ }).first()
  console.log(`[카드 수] ${await page.locator('h3').count()}`)
  if (await card.count()) {
    await card.click()
    await page.waitForTimeout(2500)
    const d = await page.locator('body').innerText()
    console.log(`[한 줄 요약] ${d.includes('내원') ? '있음 ✓' : '없음 ✗'}`)
    console.log(`[결정적 소견] ${d.includes('결정적 소견') ? '있음 ✓' : '없음 ✗'}`)
    console.log(`[복용 경과] ${d.includes('복용 경과') ? '있음 ✓' : '없음 ✗'}`)
    console.log(`[특징] ${d.includes('이 치험례의 특징') ? '있음 ✓' : '없음 ✗'}`)
    console.log(`[처방 어긋남 경고] ${d.includes('본문에서 실제로 쓴 처방') ? '있음 ✓' : '해당없음'}`)
    console.log(`[원문 혼재 안내] ${d.includes('다른 사례나 처방 해설이 함께') ? '있음 ✓' : '해당없음'}`)
    await page.screenshot({ path: `${OUT}/상세.png`, fullPage: true })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(800)
  }

  // 페이지 이동이 실제로 되는지
  await page.goto('/dashboard/cases', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(6000)
  const before = await page.locator('h3').first().innerText().catch(() => '')
  const btn2 = page.getByRole('button', { name: '2', exact: true })
  if (await btn2.count()) {
    await btn2.click()
    await page.waitForTimeout(5000)
    const after = await page.locator('h3').first().innerText().catch(() => '')
    const url = page.url()
    console.log(`[2페이지 URL] ${url.includes('page=2') ? '있음 ✓' : '없음 ✗'}`)
    console.log(`[내용 바뀜] ${before && after && before !== after ? '바뀜 ✓' : `안 바뀜 ✗ (${before} → ${after})`}`)
  } else {
    console.log('[페이지 버튼] 없음 ✗')
  }
})
