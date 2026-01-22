import { test, expect } from '@playwright/test';

test.describe('인증 플로우', () => {
  test('로그인 페이지 로딩', async ({ page }) => {
    await page.goto('/login');

    // 로그인 폼이 있는지 확인
    await expect(page.getByRole('heading', { name: /로그인/i })).toBeVisible();
    await expect(page.getByLabel(/이메일/i)).toBeVisible();
    await expect(page.getByLabel(/비밀번호/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /로그인/i })).toBeVisible();
  });

  test('회원가입 페이지 로딩', async ({ page }) => {
    await page.goto('/register');

    // 회원가입 폼이 있는지 확인
    await expect(page.getByRole('heading', { name: /회원가입/i })).toBeVisible();
    await expect(page.getByLabel(/이메일/i)).toBeVisible();
    await expect(page.getByLabel(/비밀번호/i)).toBeVisible();
    await expect(page.getByLabel(/이름/i)).toBeVisible();
  });

  test('비밀번호 찾기 페이지 로딩', async ({ page }) => {
    await page.goto('/forgot-password');

    // 비밀번호 찾기 폼이 있는지 확인
    await expect(page.getByRole('heading', { name: /비밀번호/i })).toBeVisible();
    await expect(page.getByLabel(/이메일/i)).toBeVisible();
  });

  test('잘못된 로그인 시 에러 메시지 표시', async ({ page }) => {
    await page.goto('/login');

    // 잘못된 자격 증명 입력
    await page.getByLabel(/이메일/i).fill('wrong@example.com');
    await page.getByLabel(/비밀번호/i).fill('wrongpassword');
    await page.getByRole('button', { name: /로그인/i }).click();

    // 에러 메시지 확인 (API 응답에 따라 조정 필요)
    await expect(page.getByText(/올바르지 않습니다|실패/i)).toBeVisible({ timeout: 10000 });
  });

  test('미인증 사용자 대시보드 접근 시 리다이렉트', async ({ page }) => {
    await page.goto('/dashboard');

    // 로그인 페이지로 리다이렉트 되었는지 확인
    await expect(page).toHaveURL(/login/);
  });
});
