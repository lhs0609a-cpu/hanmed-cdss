// SVG → PNG 변환 스크립트.
// puppeteer를 사용해 헤드리스 브라우저에서 1200x630 PNG로 렌더링한다.
// 실행: node scripts/generate-og-image.js

const path = require('path');
const fs = require('fs/promises');
const puppeteer = require('puppeteer');

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const svgPath = path.join(repoRoot, 'apps', 'web', 'public', 'og-image.svg');
  const outPath = path.join(repoRoot, 'apps', 'web', 'public', 'og-image.png');

  const svg = await fs.readFile(svgPath, 'utf8');
  const html = `<!doctype html><html><head>
    <meta charset="utf-8" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;800&family=Noto+Serif+KR:wght@700&display=swap" rel="stylesheet" />
    <style>html,body{margin:0;padding:0;background:#fff;}svg{display:block;}</style>
  </head><body>${svg}</body></html>`;

  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    // 폰트 안정화 (스크롤바/스타일 적용 대기)
    await page.evaluate(() => document.fonts && document.fonts.ready);
    const buf = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 1200, height: 630 },
      omitBackground: false,
    });
    await fs.writeFile(outPath, buf);
    console.log(`✅ Wrote ${outPath} (${buf.length} bytes)`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
