import { test, expect, Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

/**
 * 전 라우트 스모크 — "각 기능이 실제로 뜨는가"를 한 번에 훑는다.
 * 페이지마다 콘솔 에러 / 실패한 API 호출 / 에러 바운더리 노출 / 렌더 분량을 수집해
 * scratchpad 에 JSON 리포트로 남긴다.
 */

const ROUTES: string[] = [
  '/dashboard',
  '/dashboard/consultation',
  '/dashboard/consultation?demo=1',
  '/dashboard/cases',
  '/dashboard/interactions',
  '/dashboard/formulas',
  '/dashboard/herbs',
  '/dashboard/herbs-db',
  '/dashboard/combo',
  '/dashboard/constitution',
  '/dashboard/acupoints',
  '/dashboard/symptom-search',
  '/dashboard/pulse',
  '/dashboard/dosage',
  '/dashboard/patients',
  '/dashboard/classics',
  '/dashboard/insurance',
  '/dashboard/insurance-fee',
  '/dashboard/documents',
  '/dashboard/pattern-diagnosis',
  '/dashboard/claim-check',
  '/dashboard/formula-compare',
  '/dashboard/red-flag',
  '/dashboard/voice-chart',
  '/dashboard/byeongyang',
  '/dashboard/school-compare',
  '/dashboard/integrated-diagnosis',
  '/dashboard/unified-search',
  '/dashboard/case-search',
  '/dashboard/my-cases',
  '/dashboard/statistics',
  '/dashboard/analytics',
  '/dashboard/smart-insurance',
  '/dashboard/crm',
  '/dashboard/case-network',
  '/dashboard/inventory',
  '/dashboard/community',
  '/dashboard/subscription',
  '/dashboard/settings',
  '/dashboard/activity',
  '/dashboard/profile',
  '/welcome/migration',
]

const ERROR_BOUNDARY_TITLES = [
  '예기치 않은 오류',
  '네트워크 연결 문제',
  '인증 오류',
  '요청 시간 초과',
  '데이터 오류',
  '새 버전이 배포되었어요',
]

type RouteReport = {
  route: string
  finalUrl: string
  errorBoundary: string | null
  consoleErrors: string[]
  failedRequests: string[]
  visibleErrorText: string[]
  textLength: number
  headings: string[]
  snippet: string
  buttons: string[]
}

const OUT = path.resolve(
  'C:/Users/lhs06/AppData/Local/Temp/claude/G---------developer-hanmed-cdss/f51e464b-5191-49be-931a-78d7d6e0a3f1/scratchpad/route-report.json'
)

async function demoLogin(page: Page) {
  await page.goto('/login')
  await page.getByRole('button', { name: /데모 계정으로 체험/i }).click()
  // 배포본에 따라 로그인 직후 목적지가 다르다(/dashboard 또는 마이그레이션 관문).
  await page.waitForURL(/dashboard|welcome/, { timeout: 30000 })
  console.log(`[login] 로그인 직후 도착지: ${new URL(page.url()).pathname}`)

  // 첫 방문 모달 2종(의료 동의 / 환영)을 스토리지 플래그로 미리 닫는다.
  await page.evaluate(() => {
    localStorage.setItem('medical_disclaimer_accepted_v1', new Date().toISOString())
    localStorage.setItem('medical_disclaimer_seen', new Date().toDateString())
    localStorage.setItem('hanmed-cdss-welcome-shown', 'true')
    localStorage.setItem('onboarding_completed', 'true')
  })
  if (!page.url().includes('/dashboard')) {
    await page.goto('/dashboard')
    await page.waitForTimeout(2000)
  }
}

test('전 라우트 스모크', async ({ page }) => {
  test.setTimeout(15 * 60 * 1000)

  await demoLogin(page)

  const reports: RouteReport[] = []

  for (const route of ROUTES) {
    const consoleErrors: string[] = []
    const failedRequests: string[] = []

    const onConsole = (msg: import('@playwright/test').ConsoleMessage) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300))
    }
    const onResponse = (res: import('@playwright/test').Response) => {
      if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.request().method()} ${res.url()}`)
    }
    const onPageError = (err: Error) => consoleErrors.push(`[uncaught] ${err.message.slice(0, 300)}`)

    page.on('console', onConsole)
    page.on('response', onResponse)
    page.on('pageerror', onPageError)

    try {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
      await page.waitForTimeout(2500) // lazy chunk + react-query 초기 fetch
    } catch (e) {
      consoleErrors.push(`[goto] ${(e as Error).message.slice(0, 200)}`)
    }

    const body = (await page.locator('body').innerText().catch(() => '')) || ''

    const errorBoundary = ERROR_BOUNDARY_TITLES.find((t) => body.includes(t)) ?? null

    const visibleErrorText = [
      '불러오는데 실패',
      '불러오지 못했',
      '실패했습니다',
      '오류가 발생',
      '준비 중',
      '준비중',
      '표시할 내용이 없',
      '데이터가 없습니다',
    ].filter((t) => body.includes(t))

    const headings = await page
      .locator('h1, h2')
      .allInnerTexts()
      .then((a) => a.map((s) => s.trim()).filter(Boolean).slice(0, 6))
      .catch(() => [])

    reports.push({
      route,
      finalUrl: new URL(page.url()).pathname + new URL(page.url()).search,
      errorBoundary,
      consoleErrors: [...new Set(consoleErrors)].slice(0, 8),
      failedRequests: [...new Set(failedRequests)].slice(0, 12),
      visibleErrorText,
      textLength: body.length,
      headings,
      snippet: body.replace(/\s+/g, ' ').slice(0, 500),
      buttons: await page
        .locator('main button, main a[href]')
        .allInnerTexts()
        .then((a) => [...new Set(a.map((s) => s.trim()).filter(Boolean))].slice(0, 15))
        .catch(() => []),
    })

    page.off('console', onConsole)
    page.off('response', onResponse)
    page.off('pageerror', onPageError)
  }

  fs.writeFileSync(OUT, JSON.stringify(reports, null, 2), 'utf-8')

  // 콘솔에도 요약 출력
  for (const r of reports) {
    const flags = [
      r.errorBoundary ? `BOUNDARY:${r.errorBoundary}` : '',
      r.failedRequests.length ? `API_FAIL:${r.failedRequests.length}` : '',
      r.consoleErrors.length ? `CONSOLE:${r.consoleErrors.length}` : '',
      r.visibleErrorText.length ? `TEXT:${r.visibleErrorText.join('|')}` : '',
      r.textLength < 400 ? `THIN:${r.textLength}` : '',
      r.finalUrl.split('?')[0] !== r.route.split('?')[0] ? `REDIRECT→${r.finalUrl}` : '',
    ].filter(Boolean)
    console.log(`${flags.length ? '✗' : '✓'} ${r.route}  ${flags.join('  ')}`)
  }

  expect(reports.length).toBe(ROUTES.length)
})
