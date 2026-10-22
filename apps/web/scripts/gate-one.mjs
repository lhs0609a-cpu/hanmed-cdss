// 글 하나(또는 여럿)를 dev 서버에서 받아 공용 게이트에 넣는다. 빌드하지 않는다.
//   npm run dev                      (다른 창에서 먼저 띄운다)
//   npm run gate -- <slug> [<slug>...]
//   npm run gate -- /some/other/path            (슬래시로 시작하면 경로 그대로 사용)
//
// 설정은 같은 폴더의 .content-engine.json 에서 읽는다.
// PORT / GENRE / GATE 환경변수로 덮어쓸 수 있다.
//
// 지침 V18 §A. 공용 게이트를 --dir 로 호출하므로 Git Bash 의 경로 변환 문제를 겪지 않는다.
import {mkdtemp, writeFile, rm, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const slugs = process.argv.slice(2).filter((a) => !a.startsWith('-'));
if (!slugs.length) {
  console.error('사용법: npm run gate -- <slug> [<slug>...]');
  process.exit(2);
}

let cfg = {genre: 'default', guidePath: 'guides', mode: 'dev', distDir: 'dist', port: 3000};
try {
  cfg = {...cfg, ...JSON.parse(await readFile('.content-engine.json', 'utf8'))};
} catch {
  console.error('.content-engine.json 을 읽지 못했습니다. init-site.mjs 를 먼저 실행하세요.');
  process.exit(2);
}

const port = process.env.PORT || String(cfg.port);
const genre = process.env.GENRE || cfg.genre;
const gate = process.env.GATE || 'D:/dev-ad/_tools/gate.mjs';
const mode = process.env.MODE || cfg.mode;
const base = 'http://127.0.0.1:' + port;

// 순수 SPA 사이트(이 사이트)는 dev 서버가 빈 <div id="root"> 만 준다. 그것을 게이트에
// 넣으면 본문 0자·이미지 0장으로 전부 불통과한다. 글 한 편만 프리렌더와 같은 모듈로
// 구워서 검사한다 — 빌드하지 않는다(지침 §A 함정 1).
if (mode === 'bake') {
  const bake = spawnSync(process.execPath, ['scripts/bake-one-guide.mjs', ...slugs], {stdio: 'inherit'});
  if (bake.status !== 0) process.exit(2);
  const args = [gate, '--dir', '.gate-html', '--site', process.cwd(), '--genre', genre, '--list'];
  if (slugs.length === 1) args.push('--include', slugs[0]);
  const r = spawnSync(process.execPath, args, {stdio: 'inherit'});
  process.exit(r.status ?? 1);
}

// 정적 빌드 사이트(dev 서버가 없는 사이트)는 빌드 산출물의 HTML 을 바로 검사한다.
// 이 경로에서는 글 하나만 고르는 수단이 --include 뿐이므로 slug 를 그대로 넘긴다.
if (mode === 'dir') {
  const args = [gate, '--dir', cfg.distDir, '--site', process.cwd(), '--genre', genre, '--list'];
  if (slugs.length === 1) args.push('--include', slugs[0]);
  else console.error(`정적 모드에서는 한 번에 한 편만 고를 수 있습니다. ${cfg.distDir}/ 전체를 검사합니다.`);
  const r = spawnSync(process.execPath, args, {stdio: 'inherit'});
  process.exit(r.status ?? 1);
}

const dir = await mkdtemp(join(tmpdir(), 'gate-'));
try {
  for (const slug of slugs) {
    const path = slug.startsWith('/') ? slug : '/' + cfg.guidePath + '/' + slug;
    const url = base + path;
    let res;
    try {
      res = await fetch(url);
    } catch (e) {
      console.error('dev 서버 응답 없음 (' + url + '). npm run dev 를 먼저 띄우세요. ' + e.message);
      process.exit(2);
    }
    if (!res.ok) {
      console.error('HTTP ' + res.status + ' ' + url);
      process.exit(2);
    }
    await writeFile(join(dir, slug.replace(/[/\\]/g, '_') + '.html'), await res.text(), 'utf8');
  }
  const r = spawnSync(process.execPath, [gate, '--dir', dir, '--site', process.cwd(), '--genre', genre, '--list'], {stdio: 'inherit'});
  process.exitCode = r.status ?? 1;
} finally {
  await rm(dir, {recursive: true, force: true});
}
