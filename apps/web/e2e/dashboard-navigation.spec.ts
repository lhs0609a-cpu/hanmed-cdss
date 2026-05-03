import { test, expect, Page } from '@playwright/test'

async function enterDemo(page: Page) {
  await page.goto('/login')
  await page.getByRole('button', { name: /데모 계정으로 체험하기/i }).click()
  await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })
}

/**
 * 라우트별 RouteBoundary 동작 회귀 테스트.
 * 한 페이지에서 발생한 예외가 전체 앱을 죽이지 않는지 확인하기 위해
 * 여러 페이지를 순차 방문한 뒤 대시보드로 복귀할 수 있어야 한다.
 */
const ROUTES = [
  '/dashboard/cases',
  '/dashboard/voice-chart',
  '/dashboard/red-flag',
  '/dashboard/insurance',
  '/dashboard/byeongyang',
  '/dashboard/dosage',
  '/dashboard/community',
  '/dashboard/settings',
]

test.describe('대시보드 네비게이션 안정성', () => {
  test('주요 라우트 8개를 순회해도 앱이 죽지 않는다', async ({ page }) => {
    await enterDemo(page)

    for (const route of ROUTES) {
      await page.goto(route)
      await expect(page.locator('body')).not.toContainText(/예기치 않은 오류/i)
    }

    // 대시보드 홈 복귀
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard\/?$/)
  })
})
