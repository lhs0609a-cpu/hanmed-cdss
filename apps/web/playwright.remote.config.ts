import { defineConfig, devices } from '@playwright/test'

/**
 * 배포본(또는 임의 BASE_URL) 대상 스모크 전용 설정.
 * 로컬 dev 서버를 띄우지 않는다는 점만 playwright.config.ts 와 다르다.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL || 'https://hanmed-cdss.vercel.app',
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // 로컬 빌드본(127.0.0.1)에서 운영 API 를 호출해 볼 때 CORS 가 막는다.
        // 테스트 목적에 한해 브라우저 동일출처 정책을 끈다(운영 설정은 건드리지 않음).
        launchOptions: process.env.DISABLE_CORS
          ? {
              args: [
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
              ],
            }
          : {},
      },
    },
  ],
})
