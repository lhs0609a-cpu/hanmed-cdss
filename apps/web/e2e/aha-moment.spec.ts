import { test, expect } from '@playwright/test'

/**
 * 아하 모먼트 흐름 검증 —
 * 로그인 직후 대시보드에서 예시 진료를 한 번에 열 수 있어야 하고,
 * 그 결과 화면에서 "내 환자 증상 입력"으로 넘어갈 수 있어야 한다.
 *
 * (2026-08-14: 예전엔 대시보드가 예시 진료로 자동 리다이렉트했으나
 *  조회 실패 시 기록 있는 사용자까지 튕기고 대시보드 접근이 막혀 카드 방식으로 바꿨다.)
 */

test('로그인 직후 대시보드에서 예시 진료를 열 수 있다', async ({ page }) => {
  test.setTimeout(3 * 60 * 1000)

  const consoleErrors: string[] = []
  page.on('pageerror', (e) => consoleErrors.push(e.message))

  await page.goto('/login')
  await page.getByRole('button', { name: /데모 계정으로 체험/i }).click()

  // 1) 마이그레이션 관문을 거치지 않고 곧장 대시보드로
  await page.waitForURL(/\/dashboard/, { timeout: 30000 })
  console.log(`[1] 로그인 직후 URL: ${page.url()}`)
  expect(page.url()).not.toContain('/welcome/migration')

  // 2) 진료 기록이 없으면 대시보드 안에서 예시 진료 카드를 권한다 (자동 리다이렉트 아님)
  const exampleCard = page.getByRole('link', { name: /예시 진료 결과부터 보기/ })
  await expect(exampleCard).toBeVisible({ timeout: 20000 })
  await exampleCard.click()
  await page.waitForURL(/consultation\?demo=1/, { timeout: 20000 })
  console.log(`[2] 예시 진료 진입 URL: ${page.url()}`)

  // 3) AI 분석이 끝나 결과(히어로)가 뜰 때까지 대기 — "최우선 처방" 히어로
  await expect(page.getByText('최우선 처방').first()).toBeVisible({ timeout: 90000 })
  console.log('[3] 최우선 처방 히어로 렌더 확인')

  // 4) 데모 컨텍스트 바 + CTA
  await expect(page.getByText('예시 진료 · 실제 AI 분석 결과')).toBeVisible()
  const cta = page.getByRole('button', { name: '내 환자 증상 입력' })
  await expect(cta).toBeVisible()
  console.log('[4] 데모 컨텍스트 바 + CTA 확인')

  // 5) 팝업(환영/투어)이 첫 화면을 가리지 않아야 한다
  for (const t of ['처음이신가요', '환영합니다']) {
    expect(await page.getByText(t, { exact: false }).first().isVisible().catch(() => false)).toBe(false)
  }
  console.log('[5] 환영·투어 팝업 없음 ✓')

  // 6) 실제 처방 카드가 렌더됐는지 (호출 실패/빈 결과 아님)
  const body = await page.locator('body').innerText()
  expect(body.includes('처방 추천을 불러오는데 실패')).toBe(false)
  expect(body.includes('추천 결과를 받지 못했어요')).toBe(false)
  console.log('[6] 처방 결과 정상')

  // 6-1) 의료 동의는 화면을 덮지 않는 상단 바 형태여야 한다(오버레이 X)
  await expect(page.getByText('참고용 임상 보조 도구입니다')).toBeVisible()
  console.log('[6-1] 의료 동의 상단바 확인 (오버레이 아님)')

  // 7) 핸드오프 — 클릭하면 1단계 빈 입력으로
  await cta.click()
  await page.waitForTimeout(1200)
  await expect(page.getByText('환자 정보 입력')).toBeVisible()
  console.log('[7] 내 환자 입력 핸드오프 정상')

  expect(consoleErrors, `uncaught: ${consoleErrors.join(' | ')}`).toHaveLength(0)
})
