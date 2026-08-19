import { test } from '@playwright/test'

/** 환자용 복약 안내서 — 로그인 없이 열리는지, 6가지 답이 다 있는지 */
test('복약 안내서 (환자)', async ({ page }) => {
  test.setTimeout(4 * 60 * 1000)
  await page.setViewportSize({ width: 420, height: 1400 })
  const OUT = process.env.OUT_DIR || 'test-results/guide'
  const TOKEN = process.env.GUIDE_TOKEN || ''

  // 로그인하지 않은 상태로 바로 연다
  await page.goto(`/guide/${TOKEN}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(6000)
  const t = await page.locator('body').innerText()

  console.log(`[로그인 없이 열림] ${t.includes('보중익기탕') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[약재 구성] ${t.includes('무엇이 들어 있나요') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[왜 이 처방] ${t.includes('왜 이 처방인가요') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[호전 비율 정상] ${t.includes('9900') ? '9900% ✗' : '정상 ✓'}`)
  console.log(`[상호작용] ${t.includes('와파린') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[비용] ${t.includes('192,000') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[수령/환불 안내] ${t.includes('받지 않은') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[식별정보 노출] ${t.includes('안내서') && t.includes('1988') ? '있음 ✗' : '없음 ✓'}`)
  await page.screenshot({ path: `${OUT}/안내서.png`, fullPage: true })

  // 자가 기록 — 이상반응 체크 시 경고가 뜨는지
  const flag = page.getByRole('button', { name: '눈·피부가 노래짐(황달)' })
  if (await flag.count()) {
    await flag.click()
    await page.waitForTimeout(800)
    const t2 = await page.locator('body').innerText()
    console.log(`[이상반응 경고] ${t2.includes('복용을 멈추고') ? '있음 ✓' : '없음 ✗'}`)
    await page.getByRole('button', { name: '한의원에 보내기' }).click()
    await page.waitForTimeout(3500)
    const t3 = await page.locator('body').innerText()
    console.log(`[전송 완료] ${t3.includes('한의원에 전달했습니다') ? '있음 ✓' : '없음 ✗'}`)
    await page.screenshot({ path: `${OUT}/자가기록.png`, fullPage: true })
  } else {
    console.log('[자가 기록] 폼 없음 ✗')
  }
})
