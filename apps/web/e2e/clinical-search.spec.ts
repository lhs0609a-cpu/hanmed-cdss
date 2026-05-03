import { test, expect, Page } from '@playwright/test'

async function enterDemo(page: Page) {
  await page.goto('/login')
  await page.getByRole('button', { name: /데모 계정으로 체험하기/i }).click()
  await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })
}

test.describe('처방/약재 검색 워크플로우', () => {
  test('처방 검색 페이지가 로딩되고 입력이 가능하다', async ({ page }) => {
    await enterDemo(page)
    await page.goto('/dashboard/formulas')

    // 페이지가 크래시 없이 로드되었는지 (RouteBoundary 동작 확인)
    await expect(page.locator('body')).not.toContainText(/예기치 않은 오류/i)

    const searchInput = page.getByPlaceholder(/검색|처방|이름/i).first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })
    await searchInput.fill('소시호탕')
  })

  test('약재 검색 페이지 진입 + 통합검색 진입', async ({ page }) => {
    await enterDemo(page)

    await page.goto('/dashboard/herbs')
    await expect(page.locator('body')).not.toContainText(/예기치 않은 오류/i)

    await page.goto('/dashboard/unified-search')
    await expect(page.locator('body')).not.toContainText(/예기치 않은 오류/i)
  })
})
