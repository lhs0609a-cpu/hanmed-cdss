/**
 * sitemap.xml 과 llms.txt 를 빌드 산출물에 넣는다.
 *
 * robots.txt 는 오래전부터 사이트맵을 광고했지만 그 파일은 저장소 어디에도
 * 없었다. 크롤러가 실제로 받은 건 SPA 의 index.html 이었다 — 200 이라
 * 404 보다 알아채기 어려웠다.
 *
 * ORIGIN 은 실제로 서비스되는 도메인이어야 한다. 예전 값이던
 * ongojisin.ai 는 DNS 에 A 레코드조차 없는데, canonical·og:url·사이트맵이
 * 전부 그 주소를 가리키고 있었다. 30일 구글 유입 1명은 그 결과다.
 *
 * 경로 목록은 손으로 관리한다. 라우터에서 자동으로 뽑으면 로그인·결제·
 * 리포트 열람처럼 색인되면 안 되는 경로까지 흘러 들어간다.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ORIGIN = 'https://www.ongojisin.co.kr'
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public')

/** changefreq/priority 는 구글이 무시한 지 오래라 넣지 않는다. */
const ROUTES = [
  { path: '/', lastmod: '2026-09-21' },
  { path: '/register', lastmod: '2026-09-21' },
  { path: '/cases', lastmod: '2026-09-21' },
  { path: '/formulas', lastmod: '2026-09-21' },
  { path: '/health', lastmod: '2026-09-21' },
  { path: '/health/community', lastmod: '2026-09-21' },
  { path: '/health/qna', lastmod: '2026-09-21' },
  { path: '/health/tmi', lastmod: '2026-09-21' },
  { path: '/health/saju', lastmod: '2026-09-21' },
  { path: '/terms', lastmod: '2026-09-08' },
  { path: '/privacy', lastmod: '2026-09-08' },
  { path: '/refund-policy', lastmod: '2026-09-08' },
  { path: '/subscription-terms', lastmod: '2026-09-08' },
]

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROUTES.map(
  (route) =>
    `  <url>\n    <loc>${ORIGIN}${route.path === '/' ? '' : route.path}</loc>\n    <lastmod>${route.lastmod}</lastmod>\n  </url>`,
).join('\n')}
</urlset>
`

/**
 * llms.txt — 생성형 검색이 무엇을 인용해도 되는지 밝힌다.
 * 임상 정보를 다루므로 "무엇이 아닌지" 를 분명히 적는다.
 */
const llms = `# 온고지신 AI

> 한의사를 위한 임상 의사결정 지원 시스템(CDSS). 축적된 치험례와 공개 임상
> 문헌을 근거로 변증 후보와 처방 정보를 제시한다. 진단을 대신하지 않는다.

## 무엇인가
- 대상: 한의사, 한약사, 공중보건한의사 등 면허를 확인한 의료인
- 기능: 치험례 검색, 변증 후보 제시, 처방·본초 정보, 상호작용 점검, 환자 기록
- 근거: 각 제시에는 출처 문헌 또는 치험례가 따라붙는다

## 인용할 때
- 이 서비스의 출력은 임상 참고 자료이며 진단·처방 지시가 아니다.
- 일반인 대상 의학적 조언의 근거로 인용하지 말 것.
- 개별 치험례는 특정 환자의 기록이므로 일반화된 효능 근거가 아니다.

## 주요 경로
- ${ORIGIN}/ : 서비스 소개와 공개 문헌 미리보기
- ${ORIGIN}/health : 일반인 대상 건강 정보
- ${ORIGIN}/terms : 이용약관
- ${ORIGIN}/privacy : 개인정보처리방침

## 연락
- 운영: 머프키치
`

mkdirSync(OUT, { recursive: true })
writeFileSync(resolve(OUT, 'sitemap.xml'), sitemap)
writeFileSync(resolve(OUT, 'llms.txt'), llms)
console.log(`seo: sitemap.xml (${ROUTES.length} urls), llms.txt`)
