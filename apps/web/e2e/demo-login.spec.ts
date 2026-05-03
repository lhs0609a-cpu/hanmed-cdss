import { test, expect } from '@playwright/test'

test.describe('데모 로그인 → 대시보드 진입', () => {
  test('데모 버튼 클릭 시 대시보드로 이동한다', async ({ page }) => {
    await page.goto('/login')

    await page.getByRole('button', { name: /데모 계정으로 체험하기/i }).click()

    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })
    // 대시보드 핵심 메뉴가 렌더되는지 확인 (사이드바)
    await expect(page.getByRole('link', { name: /환자 관리/i }).first()).toBeVisible()
  })

  test('데모 진입 후 새로고침해도 인증 상태가 유지된다', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /데모 계정으로 체험하기/i }).click()
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })

    await page.reload()
    await expect(page).toHaveURL(/dashboard/)
  })
})
