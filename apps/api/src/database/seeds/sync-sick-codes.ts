import { DataSource } from 'typeorm';
import { readFileSync } from 'fs';
import { dataSourceOptions } from '../data-source';
import { SickCode } from '../entities/sick-code.entity';

/**
 * 한의과 상병(KCD) 15,923건을 DB 로 옮긴다.
 *
 * 원자료: 공공데이터포털 B551182 질병정보서비스
 *         getDissNameCodeList1 — 서비스명과 오퍼레이션명 양쪽에 1 이 붙는다.
 *
 * `sickType` 과 `medTp` 는 필터가 아니라 **필수값**이다. 하나라도 빠지면
 * totalCount 가 0 으로 온다. 실측한 조합별 건수는 이렇다.
 *
 *     sickType=2 & medTp=2  →  15,923   ← 한의과 세부상병. 우리가 받는 것
 *     sickType=2 & medTp=1  →  14,652
 *     sickType=1 & medTp=2  →   2,221
 *     sickType=1 & medTp=1  →   2,065
 *     (둘 중 하나라도 빠짐)  →        0
 *
 * public-data.service.ts 의 주석에는 이 수가 1,592 로 적혀 있었는데 실제
 * 응답은 15,923 이다. 자릿수가 하나 빠진 오기로 보인다 — 그 수를 믿고 축을
 * 잡으면 열 배를 놓친다.
 *
 * 응답은 XML 만 준다(JSON 없음). 그래서 파서를 직접 쓴다 — 스키마가
 * sickCd·sickNm·sickEngNm 세 칸뿐이라 라이브러리를 들일 이유가 없다.
 *
 * 멱등: code 기준 upsert. 두 번 돌려도 결과가 같다.
 *
 * 실행: npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *         src/database/seeds/sync-sick-codes.ts [--dry-run] [--file=<경로>]
 */

const ENDPOINT =
  'https://apis.data.go.kr/B551182/diseaseInfoService1/getDissNameCodeList1';
const PAGE_SIZE = 1000;
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 6000;

/** 심평원이 준 상병 한 줄. */
export interface SickRow {
  code: string;
  nameKo: string;
  nameEn: string;
}

/**
 * 주소로 쓸 수 있는 코드인가.
 *
 * 실측 15,923건은 모두 이 규칙을 만족한다. 규칙을 두는 것은 원자료가 언젠가
 * 슬래시나 공백이 든 값을 보내도 그것이 조용히 주소가 되지 않게 하기 위함이다.
 */
export const SICK_CODE_PATTERN = /^[A-Z][0-9A-Z]{2,6}$/;

const tag = (name: string, xml: string): string => {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml);
  return m ? m[1].trim() : '';
};

/** XML 한 덩이에서 상병 줄을 뽑는다. */
export function parseSickXml(xml: string): SickRow[] {
  const out: SickRow[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const item = m[1];
    const code = tag('sickCd', item);
    const nameKo = tag('sickNm', item);
    if (!code || !nameKo) continue;
    if (!SICK_CODE_PATTERN.test(code)) {
      console.warn(`[sick] 주소로 쓸 수 없는 코드라 건너뛴다: ${code}`);
      continue;
    }
    out.push({ code, nameKo, nameEn: tag('sickEngNm', item) });
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(key: string, pageNo: number): Promise<string> {
  const url =
    `${ENDPOINT}?serviceKey=${key}&sickType=2&medTp=2` +
    `&numOfRows=${PAGE_SIZE}&pageNo=${pageNo}`;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url);
      const xml = await res.text();
      // 정상 응답인지 먼저 본다. 상류는 실패해도 200 으로 오는 일이 있다.
      if (!xml.includes('<resultCode>00</resultCode>')) {
        throw new Error(
          `정상 응답이 아니다: ${tag('resultMsg', xml) || tag('errMsg', xml) || res.status}`,
        );
      }
      return xml;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) throw error;
      console.warn(
        `[sick] ${pageNo}쪽 ${attempt}차 실패 — ${(error as Error).message}`,
      );
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  throw new Error('닿지 못했다');
}

const DRY_RUN = process.argv.includes('--dry-run');
const FILE_ARG = process.argv.find((a) => a.startsWith('--file='));

async function main(): Promise<void> {
  const key = process.env.PUBLIC_DATA_API_KEY;
  if (!key && !FILE_ARG) {
    console.error('PUBLIC_DATA_API_KEY 가 필요합니다 (.env.local).');
    process.exit(1);
  }

  console.log(`[sick] 한의과 상병 수신${DRY_RUN ? ' (dry-run)' : ''}`);

  let rows: SickRow[] = [];
  if (FILE_ARG) {
    // 받아 둔 응답으로 적재한다. 상류가 느릴 때 계속 두드리는 것보다 낫다.
    rows = parseSickXml(readFileSync(FILE_ARG.slice('--file='.length), 'utf-8'));
  } else {
    let total = Infinity;
    for (let page = 1; rows.length < total; page += 1) {
      const xml = await fetchPage(key as string, page);
      const got = parseSickXml(xml);
      const declared = Number(tag('totalCount', xml));
      if (Number.isFinite(declared) && declared > 0) total = declared;
      if (got.length === 0) break;
      rows.push(...got);
      console.log(`[sick] ${rows.length}/${total}`);
      await sleep(1200);
    }
  }

  /**
   * 같은 코드가 두 번 오면 나중 것을 버린다. 앞에서 본 것이 대표다 —
   * 사이트맵·canonical 과 같은 규칙이라 서로 어긋나지 않는다.
   */
  const byCode = new Map<string, SickRow>();
  for (const r of rows) if (!byCode.has(r.code)) byCode.set(r.code, r);
  const unique = [...byCode.values()];

  console.log(
    `[sick] 받은 ${rows.length.toLocaleString()} · 코드 유일 ${unique.length.toLocaleString()}` +
      ` (분류 ${unique.filter((r) => r.code.length === 3).length.toLocaleString()} ·` +
      ` 세부 ${unique.filter((r) => r.code.length > 3).length.toLocaleString()})`,
  );

  if (unique.length === 0) throw new Error('한 건도 받지 못했다 — 적재하지 않는다');

  if (DRY_RUN) {
    for (const r of unique.slice(0, 5)) {
      console.log(`  ${r.code.padEnd(8)} ${r.nameKo}`);
    }
    console.log('[sick] dry-run 이라 저장하지 않는다.');
    return;
  }

  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();
  try {
    const repo = ds.getRepository(SickCode);
    // 15,923건을 한 번에 넣으면 파라미터 상한에 걸린다. 나눠 넣는다.
    const CHUNK = 500;
    for (let at = 0; at < unique.length; at += CHUNK) {
      await repo.upsert(
        unique.slice(at, at + CHUNK).map((r) => ({
          code: r.code,
          nameKo: r.nameKo,
          nameEn: r.nameEn,
          depth: r.code.length,
        })),
        ['code'],
      );
    }
    console.log(`[sick] 저장 완료 ${await repo.count()}건`);
  } finally {
    await ds.destroy();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[sick] 실패:', error);
    process.exit(1);
  });
}
