import { test, expect } from '@playwright/test'

test.setTimeout(45000)

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort())
  await page.route('**/cases/evidence?*', (route) => route.fulfill({ json: {
    name: '혈허', kind: 'pattern', total: 1, gradedCount: 1, successRate: null,
    outcomeBreakdown: { 호전: 1 }, cases: [{
      id: 'evidence-1', chiefComplaint: '피로와 어지럼', summaryOneLine: '혈허 치험례',
      formulaName: '십전대보탕', outcome: '호전', gender: 'female',
    }],
  } }))
  await page.route('**/cases/evidence-1/full', (route) => route.fulfill({ json: {
    originalText: '치험례 원문 전체', patternReasoning: '혈허 변증 근거',
    courseSteps: [{ step: '재진', change: '어지럼 호전' }],
    watermark: { label: '테스트', issuedAt: '2026-10-12T00:00:00Z', traceId: 'test-trace' },
  } }))
  await page.goto('/e2e/fixtures/readability.html', { waitUntil: 'domcontentloaded' })
})

test('pixel text scales, persists, and returns to medium', async ({ page }) => {
  const before = await page.getByTestId('sample').boundingBox()
  await page.getByRole('button', { name: '크게 120%' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-font-scale', 'large')
  const after = await page.getByTestId('sample').boundingBox()
  expect(after!.height / before!.height).toBeCloseTo(1.2, 1)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-font-scale', 'large')
  await expect(page.getByRole('button', { name: '크게 120%' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '작게 90%' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-font-scale', 'small')
  await page.getByRole('button', { name: '중간 100%' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-font-scale', 'normal')
})

test('magnifier reads pointer and keyboard targets and closes with Escape', async ({ page }) => {
  await page.getByRole('button', { name: '확대경 켜기' }).click()
  const lens = page.getByRole('complementary', { name: '글자 확대경' })
  await page.getByTestId('sample').hover()
  await expect(lens).toContainText('작은 글씨도 편하게 읽을 수 있습니다.')
  await page.getByRole('button', { name: '키보드로 읽는 문장' }).focus()
  await expect(lens).toContainText('키보드로 읽는 문장')
  await page.keyboard.press('Escape')
  await expect(lens).toHaveCount(0)
  await expect(page.getByRole('button', { name: '확대경 켜기' })).toBeFocused()
})

test('evidence opens the exact record and restores focus after closing', async ({ page }) => {
  const card = page.getByRole('button', { name: '치험례 상세 보기: 혈허 치험례' })
  await card.click()
  const dialog = page.getByRole('dialog', { name: '치험례 근거 상세' })
  await expect(dialog).toContainText('치험례 원문 전체')
  await expect(dialog).toContainText('어지럼 호전')
  await page.getByRole('button', { name: '크게 120%' }).click()
  await expect(dialog).toBeVisible()
  await page.getByRole('button', { name: '확대경 켜기' }).click()
  await dialog.getByText('치험례 원문 전체', { exact: true }).hover()
  const lens = page.getByRole('complementary', { name: '글자 확대경' })
  await expect(lens).toContainText('치험례 원문 전체')
  await expect(lens.locator('.ongo-protected')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(lens).toHaveCount(0)
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(card).toBeFocused()
})

test('mobile large mode keeps all size controls on screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.getByRole('button', { name: '크게 120%' }).click()
  for (const name of ['작게 90%', '중간 100%', '크게 120%', '확대경 켜기']) {
    const button = page.getByRole('button', { name })
    await expect(button).toBeVisible()
    const box = await button.boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(375)
  }
})
