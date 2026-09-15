const { chromium, expect } = require('../apps/web/node_modules/@playwright/test');
const fs = require('fs');
const api = 'https://api.ongojisin.co.kr/api/v1';
const site = 'https://www.ongojisin.co.kr';
async function main() {
  const results = { checkedAt: new Date().toISOString(), events: [], failures: [], checks: [] };
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const health = await context.request.get(api + '/health');
    results.health = await health.json();
    if (process.argv[2] && results.health.data.commit !== process.argv[2]) throw new Error('API commit does not match release');
    const anonymous = await context.request.get(api + '/admin/growth');
    if (anonymous.status() !== 401) throw new Error('Admin report must require authentication');
    const invalid = await context.request.post(api + '/analytics/growth/events', { data: { events: [] } });
    if (invalid.status() !== 400) throw new Error('Malformed event batch was not rejected');
    const registration = await context.request.post(api + '/auth/register', { data: {} });
    if (registration.status() !== 400) throw new Error('Registration validation unavailable');
    results.checks.push('API release, protected admin endpoint and input validation verified');
    const page = await context.newPage();
    let protectedAnalytics = 0;
    const pending = [];
    page.on('request', request => {
      if (request.url().endsWith('/analytics/events')) protectedAnalytics++;
    });
    page.on('response', response => {
      if (response.url().endsWith('/analytics/growth/events')) {
        const events = response.request().postDataJSON()?.events || [];
        results.events.push(...events.map(e => ({ id: e.id, sessionId: e.sessionId, type: e.type, source: e.source, page: e.page, status: response.status() })));
        pending.push(response.finished());
      } else if (response.status() >= 500) results.failures.push({ path: new URL(response.url()).pathname, status: response.status() });
    });
    page.on('pageerror', error => results.failures.push({ javascript: error.message.slice(0, 160) }));
    await page.goto(site + '/go?utm_source=deployment_check&utm_medium=qa&utm_campaign=growth_release', { waitUntil: 'networkidle', timeout: 45000 });
    await page.locator('a[href="/register"]:visible').first().click();
    await page.locator('#name').fill('검증 중');
    await page.waitForTimeout(35000);
    if (new URL(page.url()).pathname !== '/register') throw new Error('Registration was redirected');
    await expect(page.locator('#name')).toHaveValue('검증 중');
    if (protectedAnalytics) throw new Error('Anonymous visitor called protected analytics');
    await expect(page.getByText('지금 파일이 없어도 가입할 수 있습니다.', { exact: false })).toBeVisible();
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error('Registration mobile overflow');
    await page.screenshot({ path: 'output/growth-audit/production-register-after.png', fullPage: true });
    results.checks.push('Ad landing → registration retains form for 35 seconds without protected analytics');
    await page.goto(site + '/login', { waitUntil: 'networkidle' });
    await page.locator('#email').fill('qa-growth-release@example.invalid');
    await page.locator('#password').fill('DeliberatelyInvalidPassword!');
    const loginResponse = page.waitForResponse(r => r.url().endsWith('/auth/login'));
    await page.locator('button[type=submit]').click();
    if ((await loginResponse).status() !== 401) throw new Error('Expected unknown account login rejection');
    await page.waitForTimeout(2000);
    if (new URL(page.url()).search.includes('session=expired')) throw new Error('Login rejection caused forced navigation');
    await expect(page.locator('#email')).toHaveValue('qa-growth-release@example.invalid');
    results.checks.push('Real login rejection preserves the form');
    await Promise.all(pending);
    if (!results.events.some(e => e.status === 200 && e.type === 'signup_start' && e.source === 'deployment_check')) throw new Error('Anonymous signup attribution was not accepted');
    if (results.events.some(e => e.status !== 200) || results.failures.length) throw new Error('Production errors found');
    results.checks.push('Public event collection accepts attributed page views and signup start');
    fs.writeFileSync('output/growth-audit/production-checks.json', JSON.stringify(results, null, 2));
    console.log(JSON.stringify({ health: results.health, checks: results.checks, collectedEvents: results.events.length, failures: results.failures }, null, 2));
  } finally { await browser.close(); }
}
fs.mkdirSync('output/growth-audit', { recursive: true });
main().catch(error => { console.error(error.message); process.exitCode = 1; });
