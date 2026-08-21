import * as fs from 'fs';
import * as path from 'path';

/**
 * 처방 비교 데이터를 해설에서 뽑아 파일로 만든다.
 *
 * 왜 — 처방 비교 화면이 통째로 하드코딩이었다. 처방 8개, 비교쌍 4개가 코드에
 * 박혀 있고 데이터를 전혀 읽지 않는다. 그런데 방약합편 해설에는 "○○과
 * 비교하면…" 대목이 274K자 들어 있다. 이미 가진 것을 안 쓰고 있었다.
 *
 * 기존 comparisons 필드도 못 쓴다 — 처방당 첫 하나만, 그것도 200자에서
 * 잘려 있다(420개 중 418개가 정확히 200자). comparisonText 원문을 다시 판다.
 *
 * 지어내지 않는다 — 본문에 있는 문장만 잘라 담는다. 상대 처방명이 카탈로그에
 * 없으면 버리지 않고 unresolved 로 표시해 남긴다(평위산처럼 실재하지만 우리
 * 카탈로그에 없는 처방이다. 없는 척하면 나중에 채울 때 못 찾는다).
 */

const WEB = path.resolve(__dirname, '../../../../../apps/web/public/data/formulas');
const SRC = path.join(WEB, 'all-formulas.json');
const OUT = path.join(WEB, 'formula-comparisons.json');

/**
 * "○○과 비교하면" 을 찾는다. 앞의 한글을 최대한 길게 먹어야
 * '독활기생탕' 이 '활기생탕' 으로 잘리지 않는다.
 */
const PAT =
  /([가-힣]{2,14}(?:탕|산|음|환|단|고|원|전|주|스|액|정))\s*(?:과|와)\s*비교(?:하면|해\s*보면|하여|할\s*때|하자면)/g;

interface Formula {
  id: string;
  name: string;
  hanja?: string;
  comparisonText?: string | null;
}

interface Comparison {
  /** 이 비교를 서술한 쪽 */
  fromId: string;
  from: string;
  /** 비교 대상 */
  to: string;
  /** 대상이 카탈로그에 있으면 그 id */
  toId: string | null;
  /** 본문에서 잘라낸 비교 설명 */
  text: string;
}

function main(): void {
  const formulas = JSON.parse(fs.readFileSync(SRC, 'utf-8')) as Formula[];
  const byName = new Map<string, Formula>();
  for (const f of formulas) byName.set(f.name, f);

  const out: Comparison[] = [];
  let unresolved = 0;

  for (const f of formulas) {
    const text = (f.comparisonText || '').replace(/\s+\n/g, '\n').trim();
    if (!text) continue;

    PAT.lastIndex = 0;
    const marks: Array<{ name: string; start: number }> = [];
    let m: RegExpExecArray | null;
    while ((m = PAT.exec(text)) !== null) {
      marks.push({ name: m[1], start: m.index });
    }
    if (marks.length === 0) continue;

    for (let i = 0; i < marks.length; i++) {
      const start = marks[i].start;
      // 다음 비교가 시작되는 곳까지가 이 비교의 설명이다.
      let end = i + 1 < marks.length ? marks[i + 1].start : text.length;
      // 다만 다음 비교는 보통 "요통에 사용하는 오적산과 비교하면" 처럼
      // 도입구를 앞에 달고 시작한다. 그대로 자르면 그 도입구가 앞 비교의
      // 꼬리로 붙는다. 마지막 문장 끝에서 끊어 앞 비교를 깔끔하게 닫는다.
      if (i + 1 < marks.length) {
        const tail = text.slice(start, end);
        const lastStop = Math.max(tail.lastIndexOf('.'), tail.lastIndexOf(String.fromCharCode(10)));
        if (lastStop > 40) end = start + lastStop + 1;
      }
      const body = text.slice(start, end).trim();
      // 문장이라 부르기 어려운 조각은 버린다.
      if (body.length < 40) continue;

      let target = marks[i].name;
      let targetId: string | null = byName.get(target)?.id ?? null;

      // '활기생탕' 처럼 앞이 잘린 경우 — 카탈로그에서 끝이 일치하는 이름을 찾는다.
      if (!targetId) {
        const fixed = formulas.find(
          (x) => x.name.endsWith(target) && x.name.length > target.length,
        );
        if (fixed) {
          target = fixed.name;
          targetId = fixed.id;
        }
      }
      if (!targetId) unresolved++;
      if (target === f.name) continue; // 자기 자신과의 비교는 없다

      out.push({
        fromId: f.id,
        from: f.name,
        to: target,
        toId: targetId,
        text: body,
      });
    }
  }

  // 같은 짝이 양쪽에서 서술된 경우 둘 다 남긴다 — 관점이 다르다.
  fs.writeFileSync(OUT, JSON.stringify(out, null, 0), 'utf-8');

  const resolved = out.filter((c) => c.toId).length;
  const withCatalog = new Set(out.filter((c) => c.toId).map((c) => c.fromId));
  console.log(`[comparisons] ${out.length}쌍 추출`);
  console.log(`  카탈로그 내 상대: ${resolved} · 미해결: ${out.length - resolved}`);
  console.log(`  비교를 가진 처방: ${withCatalog.size}건`);
  console.log(`  평균 설명 길이: ${Math.round(out.reduce((a, c) => a + c.text.length, 0) / out.length)}자`);
  console.log(`  출력: ${OUT}`);
}

main();
