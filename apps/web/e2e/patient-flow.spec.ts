import { test, expect, Page } from '@playwright/test'

async function enterDemo(page: Page) {
  await page.goto('/login')
  await page.getByRole('button', { name: /데모 계정으로 체험하기/i }).click()
  await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })
}

test.describe('환자 진료 플로우', () => {
  test('환자 목록 페이지가 로딩된다', async ({ page }) => {
    await enterDemo(page)
    await page.goto('/dashboard/patients')

    // 빈 상태 또는 환자 카드가 표시되어야 함, 크래시는 안 됨
    await expect(page.locator('body')).not.toContainText(/예기치 않은 오류/i)
    await expect(page.locator('main')).toBeVisible()
  })

  test('AI 진료 페이지가 로딩된다', async ({ page }) => {
    await enterDemo(page)
    await page.goto('/dashboard/consultation')

    await expect(page.locator('body')).not.toContainText(/예기치 않은 오류/i)
    await expect(page.locator('main')).toBeVisible()
  })

  test('AI 변증 페이지가 로딩된다', async ({ page }) => {
    await enterDemo(page)
    await page.goto('/dashboard/pattern-diagnosis')

    await expect(page.locator('body')).not.toContainText(/예기치 않은 오류/i)
  })
})
