import { test } from '@playwright/test'

/** 임시 진단용 — 데모 로그인 실패 원인 확인 (감사 후 삭제) */
test('데모 로그인 네트워크 진단', async ({ page }) => {
  test.setTimeout(3 * 60 * 1000)

  page.on('response', async (r) => {
    if (r.url().includes('/auth/demo-login')) {
      let body = ''
      try {
        body = (await r.text()).slice(0, 300)
      } catch {
        body = '(본문 없음)'
      }
      console.log(`[RESP] ${r.status()} ${r.url()}`)
      console.log(`[BODY] ${body}`)
    }
  })
  page.on('requestfailed', (r) => {
    if (r.url().includes('demo-login')) {
      console.log(`[FAILED] ${r.url()} — ${r.failure()?.errorText}`)
    }
  })
  page.on('console', (m) => {
    if (m.type() === 'error') console.log(`[CONSOLE] ${m.text().slice(0, 200)}`)
  })

  // 실제 유입 경로 재현: 랜딩 → 로그인
  page.on('response', (r) => {
    if (r.status() >= 400) console.log(`[HTTP ${r.status()}] ${r.url().slice(0, 120)}`)
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: /데모 계정으로 체험/i }).click()
  await page.waitForTimeout(20000)
  console.log(`[URL] ${page.url()}`)
  const err = await page
    .locator('text=/실패|요청이|제한/')
    .first()
    .textContent()
    .catch(() => null)
  console.log(`[ERR TEXT] ${err ?? '(없음)'}`)
})
