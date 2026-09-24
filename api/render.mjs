/**
 * 굽지 않은 공개 쪽을 요청이 올 때 만든다.
 *
 * 왜 필요한가 — 프리렌더는 쪽마다 파일 하나를 남긴다. 5만 쪽에 355MB 였고,
 * 문헌을 전량 열면 20만 쪽 1.4GB 가 된다. 정적 배포로는 올릴 수 없다.
 * 그렇다고 사이트맵에만 주소를 싣고 HTML 을 안 주면, 크롤러가 받는 것은
 * 본문 없는 SPA 껍데기다 — 네이버는 그런 쪽을 색인하지 않는다.
 *
 * 그래서 나눈다. 값어치가 큰 쪽(한국어 자료)은 구워서 파일로 두고, 나머지는
 * 여기서 만든다. Vercel 은 정적 파일을 먼저 찾고 없을 때만 이 함수로
 * 보내므로, 구운 쪽은 이 함수를 거치지 않는다.
 *
 * vercel.json 의 rewrites 순서가 중요하다. 공개 쪽 다섯 줄이 먼저 오고
 * `/(.*) → /index.html` 이 맨 아래에 있어야 한다. 그 줄이 위로 올라가면
 * 모든 주소를 먼저 삼켜서 이 함수가 한 번도 불리지 않는다. JSON 에는
 * 주석을 달 수 없으니 그 까닭을 여기 적어 둔다.
 *
 * HTML 을 만드는 일은 여기 있지 않다. 빌드 때 쓰는 것과 같은 모듈
 * (apps/web/scripts/page-builders.mjs)을 그대로 부른다. 둘이 갈라지면 같은
 * 주소가 받는 시점에 따라 다른 쪽이 되고, 크롤러는 그것을 클로킹으로 읽는다.
 */
import {
  casePage,
  formulaPage,
  herbPage,
  journalPage,
  referencePage,
  renderPage,
} from '../apps/web/scripts/page-builders.mjs';

const API =
  process.env.PRERENDER_API_URL || 'https://api.ongojisin.co.kr/api/v1';

/**
 * 주소 앞머리 → 어느 API 를 묻고 어떤 쪽을 만들 것인가.
 *
 * 여기 없는 경로는 이 함수가 맡지 않는다. 임의의 주소를 받아 API 로
 * 넘기면, 주소를 지어내는 것만으로 우리 API 를 대신 두드리게 된다.
 */
const ROUTES = {
  references: { path: 'references', build: referencePage },
  cases: { path: 'cases', build: casePage },
  formulas: { path: 'formulas', build: formulaPage },
  herbs: { path: 'herbs', build: herbPage },
};

/**
 * 껍데기는 우리 배포본의 index.html 이다.
 *
 * 파일로 읽지 않고 HTTP 로 받는다 — 서버리스 함수는 정적 산출물과 다른
 * 자리에 올라가서 dist 를 직접 못 본다. 한 번 받으면 이 인스턴스가 살아
 * 있는 동안 다시 받지 않는다.
 */
let shellCache = null;
async function loadShell(origin) {
  if (shellCache) return shellCache;
  const res = await fetch(`${origin}/index.html`, {
    headers: { accept: 'text/html' },
  });
  if (!res.ok) throw new Error(`껍데기를 못 받았다 (${res.status})`);
  shellCache = await res.text();
  return shellCache;
}

async function getJson(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const error = new Error(`${path} → ${res.status}`);
    error.status = res.status;
    throw error;
  }
  const body = await res.json();
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  // 경로는 퍼센트 인코딩으로 온다. 한글 주소를 쓰므로 반드시 풀어야 한다.
  const [, kind, ...rest] = url.pathname.split('/').map(decodeURIComponent);
  const slug = rest.join('/');

  const origin = `https://${req.headers.host}`;

  try {
    /**
     * 학술지 허브는 목록이라 다른 길로 간다. 한 건을 묻는 것이 아니라
     * 그 학술지의 논문 스무 편을 받아 본문에 싣는다.
     */
    if (kind === 'journals' && slug) {
      const page = await getJson(
        `/public/references?limit=20&journal=${encodeURIComponent(slug)}`,
      );
      if (!page.total) return notFound(res);
      const shell = await loadShell(origin);
      return send(
        res,
        renderPage(
          shell,
          journalPage({ journal: slug, slug, count: page.total }, page.items),
        ),
      );
    }

    const route = ROUTES[kind];
    if (!route || !slug) return notFound(res);

    const teaser = await getJson(
      `/public/${route.path}/${encodeURIComponent(slug)}`,
    );
    const shell = await loadShell(origin);
    return send(res, renderPage(shell, route.build(teaser)));
  } catch (error) {
    if (error.status === 404) return notFound(res);
    /**
     * 만들지 못했으면 껍데기라도 돌려준다. 500 을 주면 크롤러가 그 주소를
     * 죽은 것으로 기록하는데, 실제로는 API 가 잠깐 흔들린 것뿐이다.
     * 사람에게는 SPA 가 붙어 같은 내용을 그린다.
     */
    try {
      const shell = await loadShell(origin);
      res.setHeader('content-type', 'text/html; charset=utf-8');
      // 캐시하지 않는다 — 다음 요청 때는 만들어질 수 있다.
      res.setHeader('cache-control', 'no-store');
      return res.status(200).send(shell);
    } catch {
      return res.status(502).send('일시적으로 쪽을 만들 수 없습니다.');
    }
  }
}

function send(res, html) {
  res.setHeader('content-type', 'text/html; charset=utf-8');
  /**
   * CDN 에 하루 두고, 만료 뒤에도 일주일간은 옛것을 주면서 뒤에서 새로
   * 받아 온다. 문헌 쪽은 내용이 거의 변하지 않으므로 매 요청마다 API 를
   * 두드릴 이유가 없다 — 크롤러가 수만 쪽을 훑을 때 그 차이가 크다.
   */
  res.setHeader(
    'cache-control',
    'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
  );
  return res.status(200).send(html);
}

function notFound(res) {
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('cache-control', 'public, s-maxage=3600');
  return res
    .status(404)
    .send(
      '<!doctype html><html lang="ko"><head><meta charset="utf-8">' +
        '<title>공개된 자료가 아닙니다 | 온고지신 AI</title>' +
        '<meta name="robots" content="noindex"></head>' +
        '<body><h1>공개된 자료가 아닙니다.</h1>' +
        '<p><a href="/references">문헌 목록으로</a></p></body></html>',
    );
}
