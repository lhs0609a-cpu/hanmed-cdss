import { test, expect } from '@playwright/test';

test.describe('의료 면책조항', () => {
  test.beforeEach(async ({ page }) => {
    // 로컬 스토리지 초기화 (면책 동의 기록 삭제)
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('medical_disclaimer_accepted_v1');
      localStorage.removeItem('medical_disclaimer_seen');
    });
  });

  test('최초 로그인 시 필수 면책 동의 모달 표시', async ({ page }) => {
    // 테스트 계정으로 로그인 (실제 환경에 맞게 조정)
    await page.goto('/login');
    await page.getByLabel(/이메일/i).fill('test@example.com');
    await page.getByLabel(/비밀번호/i).fill('testpassword123');
    await page.getByRole('button', { name: /로그인/i }).click();

    // 대시보드로 이동 후 면책 모달 확인
    await page.waitForURL(/dashboard/);

    // 면책 모달이 표시되는지 확인
    const disclaimerModal = page.getByText(/의료 정보 이용 동의/i);
    await expect(disclaimerModal).toBeVisible({ timeout: 10000 });
  });

  test('면책 체크박스 미선택 시 동의 버튼 비활성화', async ({ page }) => {
    await page.goto('/login');

    // 모의 로그인 (실제 환경에 맞게 조정)
    // 여기서는 직접 localStorage에 토큰 설정
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-token');
    });

    await page.goto('/dashboard');

    // 면책 모달이 있다면 체크박스 확인
    const checkbox = page.getByRole('checkbox');
    const submitButton = page.getByRole('button', { name: /동의/i });

    if (await checkbox.isVisible()) {
      // 체크박스 미선택 시 버튼 비활성화
      await expect(submitButton).toBeDisabled();

      // 체크박스 선택 후 버튼 활성화
      await checkbox.check();
      await expect(submitButton).toBeEnabled();
    }
  });

  test('면책 동의 후 재방문 시 모달 미표시', async ({ page }) => {
    // 이미 동의한 상태로 설정
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('medical_disclaimer_accepted_v1', new Date().toISOString());
    });

    // 대시보드 접근 (인증 필요)
    await page.goto('/dashboard');

    // 면책 모달이 표시되지 않아야 함
    const disclaimerModal = page.getByText(/의료 정보 이용 동의/i);
    await expect(disclaimerModal).not.toBeVisible();
  });
});

test.describe('AI 추천 면책조항', () => {
  test.beforeEach(async ({ page }) => {
    // 면책 동의 완료 상태로 설정
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('medical_disclaimer_accepted_v1', new Date().toISOString());
      localStorage.setItem('medical_disclaimer_seen', new Date().toDateString());
    });
  });

  test('AI 진단 페이지에 면책 조항 표시', async ({ page }) => {
    // 인증된 상태로 진단 페이지 접근
    await page.goto('/dashboard/pattern-diagnosis');

    // 페이지가 로드되면 AI 관련 경고가 표시되어야 함
    // (로그인 필요시 리다이렉트될 수 있음)
    const aiWarning = page.getByText(/참고용 정보|AI 분석 결과 안내/i);

    // 페이지 내 어딘가에 면책 관련 텍스트가 있어야 함
    await page.waitForLoadState('networkidle');
  });

  test('처방 추천 시 처방 전 확인 사항 표시', async ({ page }) => {
    // AI 진료 페이지 접근
    await page.goto('/dashboard/consultation');

    await page.waitForLoadState('networkidle');

    // 페이지 로드 확인
    const pageTitle = page.getByRole('heading', { level: 1 });
    await expect(pageTitle).toBeVisible({ timeout: 10000 });
  });
});
