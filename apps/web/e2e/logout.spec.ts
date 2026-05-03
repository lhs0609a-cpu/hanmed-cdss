import { test, expect } from '@playwright/test'

test.describe('로그아웃 플로우', () => {
  test('로그아웃 버튼 클릭 시 로컬 인증 상태가 초기화되고 보호 라우트가 차단된다', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /데모 계정으로 체험하기/i }).click()
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })

    // 로그아웃 버튼은 사이드바에 있음 (모바일/데스크탑 모두 노출)
    const logoutButton = page.getByRole('button', { name: /로그아웃/i }).first()
    await logoutButton.click()

    // 인증이 풀려서 보호 라우트로 진입하면 로그인 페이지로 리다이렉트되어야 함
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/login/, { timeout: 10000 })
  })
})
