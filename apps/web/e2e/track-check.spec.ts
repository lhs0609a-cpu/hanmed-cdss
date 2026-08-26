import { test } from '@playwright/test'

/**
 * 환자 복약 추적 링크 — 한의원이 카톡으로 보내는 주소(/t/:trackToken).
 *
 * 안내서(/guide/:token)와 달리 처방이 바뀌어도 같은 주소가 유지되는지,
 * 경과가 처방을 가로질러 이어지는지, 수신 거부 수단이 있는지를 본다.
 * TRACK_TOKEN 을 넣지 않으면 '열 수 없다' 화면이 뜨는 것만 확인한다.
 */
test('복약 추적 링크 (환자)', async ({ page }) => {
  test.setTimeout(4 * 60 * 1000)
  await page.setViewportSize({ width: 420, height: 1600 })
  const OUT = process.env.OUT_DIR || 'test-results/track'
  const TOKEN = process.env.TRACK_TOKEN || ''

  await page.goto(`/t/${TOKEN}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(6000)
  const t = await page.locator('body').innerText()

  if (!TOKEN) {
    // 토큰 없이도 500 이나 빈 화면이 아니라 설명이 떠야 한다.
    console.log(
      `[토큰 없음 안내] ${t.includes('링크를 열 수 없습니다') ? '있음 ✓' : '없음 ✗'}`,
    )
    await page.screenshot({ path: `${OUT}/토큰없음.png`, fullPage: true })
    return
  }

  console.log(`[로그인 없이 열림] ${t.includes('내 복약 현황') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[지금 드시는 약] ${t.includes('지금 드시는 약') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[약재 구성] ${t.includes('무엇이 들어 있나요') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[복용 체크] ${t.includes('오늘 먹었어요') || t.includes('오늘 복용 완료') || t.includes('오늘부터 복용 시작') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[자가 기록] ${t.includes('오늘 어떠셨나요') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[수신 거부 수단] ${t.includes('알림 그만 받기') || t.includes('받지 않도록 설정') ? '있음 ✓' : '없음 ✗'}`)
  console.log(`[식별정보 노출] ${/\d{4}-\d{2}-\d{2}\s*생|010-/.test(t) ? '있음 ✗' : '없음 ✓'}`)
  await page.screenshot({ path: `${OUT}/추적화면.png`, fullPage: true })
})
