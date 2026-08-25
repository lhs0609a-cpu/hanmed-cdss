/**
 * 브랜드 SVG → PNG 래스터화.
 *
 * 왜 필요한가:
 *  - 카카오톡·페이스북·X·라인 등 링크 미리보기 크롤러는 SVG 를 렌더링하지 않는다.
 *    og:image 가 .svg 를 가리키면 미리보기 이미지가 아예 뜨지 않는다.
 *  - 안드로이드 홈화면 아이콘과 iOS apple-touch-icon 도 PNG 를 요구한다.
 *  - SVG 안의 한글/한자는 렌더링하는 쪽에 폰트가 있어야 한다. 여기서 한 번 구워두면
 *    크롤러 서버에 한글 폰트가 없어도 글자가 깨지지 않는다.
 *
 * public/*.svg 를 고쳤으면 반드시 다시 돌린다:
 *   npm run icons
 */
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const PUB = resolve(dirname(fileURLToPath(import.meta.url)), '../public')

const jobs = [
  // transparent: 파비콘 계열은 스쿼클 모서리 밖을 투명하게 둔다.
  { svg: 'favicon.svg', out: 'icon-192.png', w: 192, h: 192, transparent: true },
  { svg: 'favicon.svg', out: 'icon-512.png', w: 512, h: 512, transparent: true },
  // maskable 은 OS 가 임의 모양으로 잘라내므로 배경이 꽉 차 있어야 한다.
  { svg: 'favicon-maskable.svg', out: 'icon-maskable-512.png', w: 512, h: 512, transparent: false },
  // iOS 는 투명을 검정으로 채우므로 불투명하게 굽는다.
  { svg: 'favicon-maskable.svg', out: 'apple-touch-icon.png', w: 180, h: 180, transparent: false },
  { svg: 'og-image.svg', out: 'og-image.png', w: 1200, h: 630, transparent: false },
]

/**
 * 번들 크로미움이 없으면(=`npx playwright install` 을 안 돌린 환경) 시스템 크롬으로 떨어진다.
 * 아이콘 굽자고 150MB 를 받게 하지 않는다.
 */
async function launch() {
  try {
    return await chromium.launch()
  } catch {
    console.log('  (번들 크로미움 없음 — 시스템 Chrome 사용)')
    return await chromium.launch({ channel: 'chrome' })
  }
}

const browser = await launch()
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 })

  for (const j of jobs) {
    const svg = readFileSync(resolve(PUB, j.svg), 'utf8')
    await page.setViewportSize({ width: j.w, height: j.h })
    await page.setContent(
      `<!doctype html><meta charset="utf-8">
       <style>
         html,body{margin:0;padding:0;width:${j.w}px;height:${j.h}px;overflow:hidden}
         svg{display:block;width:${j.w}px;height:${j.h}px}
       </style>${svg}`,
      { waitUntil: 'load' },
    )
    await page.screenshot({
      path: resolve(PUB, j.out),
      omitBackground: j.transparent,
      clip: { x: 0, y: 0, width: j.w, height: j.h },
    })
    console.log(`  ${j.out.padEnd(24)} ${j.w}×${j.h}  ← ${j.svg}`)
  }
} finally {
  await browser.close()
}
