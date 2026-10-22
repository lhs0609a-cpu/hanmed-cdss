// 프리셋 JSON -> .svg 한 장. figure.mjs 호출과 <svg> 추출을 한 번에 한다.
//   npm run figsvg -- <type> <입력.json> <출력.svg>
//   type: bar | stack | steps | compare
//
// figure.mjs 의 출력은 <figure>로 감싼 HTML 조각이다. 그대로 .svg 로 저장하면 브라우저가
// 렌더하지 못한다. 이 스크립트가 <svg>...</svg> 만 떼어 저장한다.
// 프리셋의 __표시__ 가 남아 있으면 종료코드 1로 막는다. 지침 V18 §G
import {writeFile, mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {spawnSync} from 'node:child_process';

const [type, input, output] = process.argv.slice(2);
if (!type || !input || !output) {
  console.error('사용법: npm run figsvg -- <type> <입력.json> <출력.svg>');
  console.error('type: bar | stack | steps | compare');
  process.exit(2);
}

const figure = process.env.FIGURE || 'D:/dev-ad/_tools/figure.mjs';
const r = spawnSync(process.execPath, [figure, '--type', type, '--in', input], {encoding: 'utf8'});
if (r.status !== 0) {
  console.error(r.stderr || 'figure.mjs 실행 실패');
  process.exit(r.status ?? 1);
}

const svg = r.stdout.match(/<svg[\s\S]*<\/svg>/)?.[0];
if (!svg) {
  console.error('출력에서 <svg>를 찾지 못했습니다.');
  process.exit(1);
}
if (/__[^_\s][^_]*__/.test(svg)) {
  console.error('프리셋의 __표시__ 자리가 남아 있습니다. 수치를 채우고 다시 실행하세요.');
  console.error('남은 자리: ' + [...new Set(svg.match(/__[^_\s][^_]*__/g))].join(' '));
  process.exit(1);
}

await mkdir(dirname(output), {recursive: true});
await writeFile(output, svg, 'utf8');
console.log(output + ' (' + svg.length + '바이트)');
