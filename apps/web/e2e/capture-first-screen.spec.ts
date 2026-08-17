import { test, expect } from '@playwright/test'

/** 첫 화면 설계 검토용 스크린샷 — 산출물은 test-results/ (gitignore) */
test('첫 화면 캡처', async ({ page }) => {
  test.setTimeout(3 * 60 * 1000)
  await page.setViewportSize({ width: 1440, height: 900 })

  const popups: string[] = []
  await page.goto('/login')
  await page.getByRole('button', { name: /데모 계정으로 체험/i }).click()
  await page.waitForURL(/consultation\?demo=1/, { timeout: 40000 })

  // 처방 히어로가 뜰 때까지 대기
  await page.getByText('최우선 처방').first().waitFor({ timeout: 90000 })
  await page.waitForTimeout(2500)

  // 팝업(환영/투어)이 남아 있는지 점검 — 없어야 정상
  for (const t of ['처음이신가요', '환영합니다', '시작하기']) {
    if (await page.getByText(t, { exact: false }).first().isVisible().catch(() => false)) {
      popups.push(t)
    }
  }
  console.log(`[팝업 잔존] ${popups.length ? popups.join(', ') : '없음 ✓'}`)

  // 의료 동의는 상단 바 형태로만 존재해야 한다(화면 덮는 오버레이 X)
  const barVisible = await page
    .getByText('참고용 임상 보조 도구입니다')
    .isVisible()
    .catch(() => false)
  console.log(`[의료 동의 상단바] ${barVisible ? '노출 ✓' : '없음'}`)

  await page.screenshot({ path: 'test-results/new-01-첫화면-상단.png' })
  await page.screenshot({ path: 'test-results/new-02-첫화면-전체.png', fullPage: true })

  // 동의 후 바가 사라지는지
  const agree = page.getByRole('button', { name: /^동의$/ })
  if (await agree.isVisible().catch(() => false)) {
    await agree.click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: 'test-results/new-03-동의후.png' })
  }

  expect(popups, `첫 화면에 팝업이 남아있음: ${popups.join(', ')}`).toHaveLength(0)
})
