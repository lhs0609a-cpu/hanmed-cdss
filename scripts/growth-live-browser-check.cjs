const { chromium, expect } = require('../apps/web/node_modules/@playwright/test');
const fs = require('node:fs');
const out = 'output/realtime-growth-implementation';
const base = process.argv[2] || 'http://127.0.0.1:4186';

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(() => localStorage.setItem('auth-storage', JSON.stringify({
      state: { user: { id: 'fixture-admin', role: 'admin', name: '검증 관리자', subscriptionTier: 'clinic' },
        isAuthenticated: true, isGuest: false, accessToken: 'fixture', refreshToken: 'fixture' }, version: 0,
    })));
    const now = Date.now();
    const at = minutes => new Date(now - minutes * 60000).toISOString();
    const report = {
      summary: { visitors: 2, recentVisitors: 1, sessions: 2, active: 1, pageViews: 2, signups: 0, activated: 0, signupRate: 0, bounceRate: 0, avgEngagement: 20 },
      funnel: ['page_view', 'signup_start', 'signup_submit', 'signup_success', 'feature_used'].map(type => ({ type, count: 0, conversion: 0, dropoff: 0 })),
      channels: [], pages: [], heatmap: [], targets: [], errors: [], daily: [], sources: [], vitals: [], sessions: [],
      firstCollectedAt: at(60), start: at(60), end: at(0), eventCount: 3,
    };
    let status = 'new'; let version = 1; let fail = false; let conflict = false; let calls = 0;
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
    await context.route('**/api/v1/**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      let data = [];
      if (url.pathname.endsWith('/admin/growth/live')) {
        calls++;
        if (fail) return route.fulfill({ status: 503, json: { message: 'fixture outage' } });
        data = { dataStatus: 'ready', asOf: new Date().toISOString(), lastReceivedAt: at(1), sampleSize: 40, recentVisitors: 7,
          minutes: Array.from({ length: 60 }, (_, i) => ({ at: at(60 - i), starts: i % 3, signups: i % 2 })),
          feed: [{ source: 'meta', device: 'mobile', page: '/register', at: at(1), stages: ['체험 완료', '가입 입력'] }] };
      } else if (url.pathname.endsWith('/admin/growth/insights')) {
        data = [{ id: 'signup_error:all', status, version, active: true, evidence: {
          id: 'signup_error:all', label: '가입 오류 비율 증가', device: 'all', windowStart: at(15), windowEnd: at(0),
          baselineStart: at(30), baselineEnd: at(15), numerator: 10, denominator: 40, baselineNumerator: 2, baselineDenominator: 40,
          sufficient: true, recovered: 3, action: '가입 오류를 재현하세요.', verify: '같은 기기의 오류 비율을 비교하세요.', hypothesis: '입력 안내를 놓쳤을 수 있습니다.',
        } }];
      } else if (request.method() === 'PATCH') {
        const input = request.postDataJSON();
        if (conflict) return route.fulfill({ status: 409, json: { message: '다른 관리자 수정' } });
        expect(input.version).toBe(version);
        status = input.status; version++;
        data = { status, version };
      } else if (url.pathname.endsWith('/audit')) {
        data = [{ fromStatus: 'new', toStatus: status, createdAt: at(0) }];
      } else if (url.pathname.endsWith('/admin/growth')) data = report;
      return route.fulfill({ json: { success: true, data } });
    });
    await page.goto(`${base}/admin/growth`, { waitUntil: 'networkidle', timeout: 120000 });
    await expect(page.getByRole('heading', { name: '실시간 행동 분석', exact: true })).toBeVisible();
    await expect(page.getByText('현재 10/40세션 · 이전 2/40세션')).toBeVisible();
    const select = page.getByLabel('가입 오류 비율 증가 처리 상태');
    await select.selectOption('reviewing');
    await expect(select).toHaveValue('reviewing');
    await page.getByRole('button', { name: '상태 변경 기록', exact: true }).click();
    await expect(page.getByText(/새 제안 → 확인 중/)).toBeVisible();
    conflict = true;
    await select.selectOption('closed');
    await expect(page.getByRole('alert').filter({ hasText: '상태를 저장하지 못했습니다' })).toBeVisible();
    await expect(select).toHaveValue('reviewing');
    conflict = false;
    await select.selectOption('observing');
    await expect(select).toHaveValue('observing');
    await page.screenshot({ path: `${out}/desktop-fixture.png`, fullPage: true });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error(`Overflow at ${width}px`);
      await page.screenshot({ path: `${out}/mobile-${width}-fixture.png`, fullPage: true });
    }
    fail = true;
    await page.getByRole('button', { name: '실시간 새로고침', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: '연결 또는 집계 지연' })).toBeVisible();
    await expect(page.getByText('최근 5분 활동 브라우저')).toContainText('7');
    await expect(select).toBeDisabled();
    fail = false;
    await page.getByRole('button', { name: '실시간 새로고침', exact: true }).click();
    await expect(select).toBeEnabled();
    await expect(page.getByRole('status').filter({ hasText: '집계 정상' })).toBeVisible();
    // Exercise the actual visibility listener; hidden tabs must stop scheduled polling.
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    const hiddenCalls = calls;
    await page.waitForTimeout(17000);
    expect(calls).toBe(hiddenCalls);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
    await expect.poll(() => calls).toBeGreaterThan(hiddenCalls);
    const visibleCalls = calls;
    await expect.poll(() => calls, { timeout: 20000 }).toBeGreaterThan(visibleCalls);
    expect(errors).toEqual([]);
    const result = { checkedAt: new Date().toISOString(), checks: ['desktop and 390/320px layout', 'state persistence and audit', '409 retains previous state', 'outage preserves last values', 'reconnect restores actions', 'hidden tab pauses and resumes immediately', '15-second visible refresh'], javascriptErrors: errors, limitation: 'Synthetic API fixtures, no production data or account mutations.' };
    fs.writeFileSync(`${out}/browser-checks.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
