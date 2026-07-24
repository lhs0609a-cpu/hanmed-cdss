import { test, expect } from '@playwright/test'

/**
 * 아하 모먼트 흐름 검증 —
 * 로그인 직후 첫 화면이 "이미 분석이 끝난 예시 진료 결과"여야 하고,
 * 거기서 "내 환자 증상 입력"으로 넘어갈 수 있어야 한다.
 */

test('로그인 직후 첫 화면이 예시 진료 결과다', async ({ page }) => {
  test.setTimeout(3 * 60 * 1000)

  const consoleErrors: string[] = []
  page.on('pageerror', (e) => consoleErrors.push(e.message))

  await page.goto('/login')
  await page.getByRole('button', { name: /데모 계정으로 체험/i }).click()

  // 1) 마이그레이션 관문을 거치지 않고 곧장 대시보드로
  await page.waitForURL(/\/dashboard/, { timeout: 30000 })
  console.log(`[1] 로그인 직후 URL: ${page.url()}`)
  expect(page.url()).not.toContain('/welcome/migration')

  // 2) 진료 기록이 없으면 예시 진료(demo=1)로 자동 이동
  await page.waitForURL(/consultation\?demo=1/, { timeout: 20000 })
  console.log(`[2] 첫 화면 URL: ${page.url()}`)

  // 3) AI 분석이 끝나 결과(step4)가 뜰 때까지 대기
  await expect(page.getByText('처방 추천 결과')).toBeVisible({ timeout: 90000 })
  console.log('[3] 처방 추천 결과 렌더 확인')

  // 4) 데모 핸드오프 배너 + CTA
  await expect(page.getByText('예시 증례입니다')).toBeVisible()
  const cta = page.getByRole('button', { name: '내 환자 증상 입력' })
  await expect(cta).toBeVisible()
  console.log('[4] 데모 배너 + CTA 확인')

  // 5) 실제 처방 카드가 렌더됐는지
  const body = await page.locator('body').innerText()
  const hasNoResult = body.includes('추천 결과를 받지 못했어요')
  const hasError = body.includes('처방 추천을 불러오는데 실패')
  console.log(`[5] 빈 결과=${hasNoResult}, 호출 실패=${hasError}`)
  expect(hasError).toBe(false)
  expect(hasNoResult).toBe(false)

  // 6) 유사 치험례 성공률 카드 / 설명자료 버튼 (커밋 986a700 에서 붙인 자산)
  console.log(`[6] 유사증례 카드: ${body.includes('유사') ? 'O' : 'X'}`)
  console.log(`[6] 설명자료 버튼: ${body.includes('설명자료') || body.includes('근거서') ? 'O' : 'X'}`)

  // 6-1) 첫 진입에는 의료 동의 모달이 결과 위를 덮는다 — 동의하고 넘어간다.
  const disclaimer = page.getByText('의료 정보 이용 동의')
  if (await disclaimer.isVisible().catch(() => false)) {
    console.log('[6-1] ⚠ 의료 동의 모달이 아하 화면을 가림 — 동의 처리 후 계속')
    await page.getByRole('checkbox').first().click()
    await page.getByRole('button', { name: /동의하고 시작하기/ }).click()
    await expect(disclaimer).toBeHidden({ timeout: 10000 })
  }

  // 7) 핸드오프 — 클릭하면 1단계 빈 입력으로
  await cta.click()
  await page.waitForTimeout(1200)
  await expect(page.getByText('환자 정보 입력')).toBeVisible()
  console.log('[7] 내 환자 입력 핸드오프 정상')

  expect(consoleErrors, `uncaught: ${consoleErrors.join(' | ')}`).toHaveLength(0)
})
