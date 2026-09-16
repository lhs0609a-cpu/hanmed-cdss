import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import vm from 'node:vm'

const web = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(web, '../../output/clinical-landing')
const base = process.env.LANDING_BASE_URL || 'http://127.0.0.1:4176'
await mkdir(out, { recursive: true })

// Verify the error distinction without using any real account or password.
const source = await readFile(resolve(web, 'src/app/auth/loginError.ts'), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
for (const online of [true, false]) {
  const context = { exports: {}, navigator: { onLine: online } }
  vm.runInNewContext(compiled, context)
  const error = context.exports.toLoginErrorView({ message: 'Network Error' }, '')
  assert.match(error.message, online ? /로그인 서버/ : /인터넷 연결이 끊겼습니다/)
}

let browser
try { browser = await chromium.launch() } catch { browser = await chromium.launch({ channel: 'chrome' }) }
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const requests = []
  const consoleErrors = []
  page.on('request', (request) => {
    if (request.resourceType() === 'fetch' || request.resourceType() === 'xhr') requests.push(request.url())
  })
  page.on('console', (message) => {
    if (/CORS|ERR_CONNECTION_REFUSED/.test(message.text())) consoleErrors.push(message.text())
  })
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.locator('#email').waitFor({ timeout: 60000 })
  const health = await page.evaluate(async () => {
    const response = await fetch('/api/v1/health')
    return { status: response.status, contentType: response.headers.get('content-type') }
  })
  assert.equal(health.status, 200)
  assert.match(health.contentType, /application\/json/)

  // Send an empty body to the REAL login endpoint. DTO validation rejects it before
  // authentication, avoiding account login attempts, lockouts, tokens, or state changes.
  // Only the outgoing body is replaced; the server response is never mocked.
  await page.route('**/api/v1/auth/login', (route) => route.continue({ postData: '{}' }))
  await page.locator('#email').fill('connection-check@example.invalid')
  await page.locator('#password').fill('not-sent-to-server')
  const responsePromise = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/v1/auth/login', { timeout: 30000 })
  await page.locator('form button[type="submit"]').click()
  const response = await responsePromise
  assert.equal(response.status(), 400, 'Real API should return DTO validation, not a connection error')
  assert.equal(new URL(response.url()).origin, new URL(base).origin)
  await page.waitForFunction(() => {
    const button = document.querySelector('form button[type="submit"]')
    return button instanceof HTMLButtonElement && !button.disabled
  })
  assert.equal(await page.getByText(/서버에 연결하지 못했습니다/).count(), 0)
  assert.ok(!requests.some((url) => url.includes('localhost:3001') || url.includes('127.0.0.1:3001')))
  assert.deepEqual(consoleErrors, [])
  await page.screenshot({ path: resolve(out, 'api-connection-validation.png') })
  const report = {
    base, checkedAt: new Date().toISOString(),
    health, loginValidationStatus: response.status(),
    sameOriginLogin: true, localhost3001Requests: 0, corsErrors: consoleErrors,
    errorMessageTests: 'online server error and offline network error pass',
    note: 'Real upstream API response; empty login body rejected before authentication. No account credentials sent. Successful account authentication not tested.',
  }
  await writeFile(resolve(out, 'api-connection-verification.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally {
  await browser.close()
}
