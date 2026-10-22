/**
 * 가이드 한 편만 실제 HTML 로 구워 낸다. 게이트용이다.
 *
 * 왜 필요한가 — 이 사이트는 순수 SPA 라 dev 서버가 주는 것은 빈 `<div id="root">`
 * 뿐이다. 게이트는 완성된 HTML 만 보므로(지침 §A) dev 서버 응답을 넣으면 본문 0자·
 * 이미지 0장으로 전부 불통과한다. 그렇다고 글 한 편마다 `npm run build` 를 돌리면
 * 90초가 든다 — 지침 §A 가 하지 말라고 못박은 바로 그 짓이다.
 *
 * 그래서 프리렌더가 쓰는 같은 모듈(page-builders.mjs)로 그 한 쪽만 굽는다.
 * 굽는 일이 두 곳에 생기지 않도록 함수는 가져다 쓰고 여기서 새로 만들지 않는다.
 *
 *   node scripts/bake-one-guide.mjs <slug> [<slug>...]
 *
 * 결과는 .gate-html/<slug>.html 로 떨어진다. 그 폴더를 게이트에 --dir 로 준다.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { guidePage, renderPage } from './page-builders.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = resolve(HERE, '..')
const OUT = resolve(WEB, '.gate-html')

const slugs = process.argv.slice(2).filter((a) => !a.startsWith('-'))
if (!slugs.length) {
  console.error('사용법: node scripts/bake-one-guide.mjs <slug> [<slug>...]')
  process.exit(2)
}

/**
 * 껍데기. dist/index.html 이 있으면 그것을 쓰고, 없으면 소스의 index.html 을 쓴다.
 * 게이트가 보는 것은 본문·이미지·링크이지 번들 해시가 아니라서 둘 중 무엇이든 된다.
 */
function loadShell() {
  for (const f of [resolve(WEB, 'dist/index.html'), resolve(WEB, 'index.html')]) {
    if (existsSync(f)) return readFileSync(f, 'utf8')
  }
  throw new Error('index.html 을 찾지 못했다')
}

const outfile = resolve(WEB, 'node_modules/.cache/prerender/gate_guides.mjs')
await build({
  entryPoints: [resolve(WEB, 'src/data/guides/index.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile,
  alias: { '@': resolve(WEB, 'src') },
  logLevel: 'error',
})
const guides = await import(pathToFileURL(outfile).href)

const shell = loadShell()
mkdirSync(OUT, { recursive: true })

let missing = 0
for (const slug of slugs) {
  const guide = guides.GUIDES.find((g) => g.slug === slug)
  if (!guide) {
    console.error(`없는 slug: ${slug}`)
    missing++
    continue
  }
  const html = renderPage(shell, guidePage(guide, guides.guideLinkHref))
  const file = resolve(OUT, `${slug}.html`)
  writeFileSync(file, html, 'utf8')
  console.log(`${file} (${html.length.toLocaleString()}자)`)
}
process.exit(missing ? 1 : 0)
