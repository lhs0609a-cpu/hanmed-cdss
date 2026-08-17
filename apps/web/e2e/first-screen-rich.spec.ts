import { test, expect } from '@playwright/test'

/**
 * 브랜치 API(화이트리스트 3후보 + similar-success-stats)가 배포된 뒤의 첫 화면을
 * 네트워크 목킹으로 미리 검증한다. ③유사통계·④다른후보 블록이 실제로 렌더되는지 확인.
 */

const RECOMMEND = {
  success: true,
  data: {
    analysis:
      '환자는 만성 소화불량과 피로를 호소하며, 비위의 기허와 관련이 있음. 태음인 체질에 보중익기탕이 적합함.',
    recommendations: [
      {
        formula_name: '보중익기탕',
        confidence_score: 0.85,
        rationale: '비위기허로 판단되어 보기승양하는 보중익기탕이 최우선.',
        herbs: [
          { name: '인삼', amount: '6g', role: '군' },
          { name: '백출', amount: '6g', role: '군' },
          { name: '황기', amount: '6g', role: '군' },
          { name: '당귀', amount: '4g', role: '신' },
          { name: '진피', amount: '4g', role: '좌' },
          { name: '승마', amount: '2g', role: '사' },
          { name: '시호', amount: '2g', role: '사' },
          { name: '감초', amount: '3g', role: '사' },
          { name: '창출', amount: '6g', role: '좌' },
          { name: '생강', amount: '3g', role: '사' },
        ],
      },
      {
        formula_name: '육군자탕',
        confidence_score: 0.71,
        rationale: '담습이 겸한 비위기허라면 육군자탕도 후보.',
        herbs: [{ name: '인삼', amount: '6g', role: '군' }],
      },
      {
        formula_name: '삼출건비탕',
        confidence_score: 0.65,
        rationale: '소화 기능 저하가 뚜렷하면 삼출건비탕.',
        herbs: [{ name: '인삼', amount: '4g', role: '군' }],
      },
    ],
  },
}

const STATS = {
  success: true,
  data: {
    totalSimilarCases: 32,
    successRate: 78,
    outcomeBreakdown: { cured: 15, improved: 10, noChange: 5, worsened: 2 },
    averageTreatmentDuration: null,
    topSuccessfulFormulas: [
      { formulaName: '보중익기탕', caseCount: 19, successRate: 84 },
      { formulaName: '육군자탕', caseCount: 8, successRate: 75 },
    ],
    confidenceLevel: 'high',
    matchCriteria: ['AI 임베딩 유사도 매칭', '체질 일치 (태음인)'],
  },
}

test('배포 후 첫 화면 — 유사통계·다른후보 렌더', async ({ page }) => {
  test.setTimeout(2 * 60 * 1000)
  await page.setViewportSize({ width: 1440, height: 1200 })

  await page.route('**/prescriptions/recommend', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(RECOMMEND) })
  )
  await page.route('**/cases/similar-success-stats', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(STATS) })
  )

  await page.goto('/login')
  await page.getByRole('button', { name: /데모 계정으로 체험/i }).click()
  await page.waitForURL(/consultation\?demo=1/, { timeout: 40000 })

  // ② 히어로 — 최우선 처방 + 10味 구성(창출·생강 포함 = 화이트리스트 복원 확인)
  await expect(page.getByRole('heading', { name: '보중익기탕' })).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('구성 10味')).toBeVisible()
  await expect(page.getByText('창출', { exact: false })).toBeVisible()

  // ③ 유사 통계
  await expect(page.getByText('78', { exact: false }).first()).toBeVisible()

  // ④ 다른 후보 — 삼출건비탕은 후보 영역에만 등장(통계 상위처방엔 없음)하므로 고유 검증
  await expect(page.getByText('다른 후보 2개')).toBeVisible()
  await expect(page.getByRole('button', { name: /삼출건비탕/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /육군자탕/ })).toBeVisible()

  await page.screenshot({ path: 'test-results/rich-01-전체.png', fullPage: true })
  console.log('[rich] 히어로·유사통계·다른후보 모두 렌더 ✓')
})
