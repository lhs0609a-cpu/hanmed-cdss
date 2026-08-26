import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { readFileSync } from 'fs';
import { NonPayPrice } from '../entities/nonpay-price.entity';
import { fetchAllItems, toRows } from '../../modules/nonpay-prices/nonpay-sync';

/**
 * 심평원 비급여 진료비용(지역별 통계) 중 한방 항목을 DB 로 옮긴다 — 수동 실행분.
 *
 * 평소 갱신은 NonPayPricesSyncService 가 매월 5일에 한다. 이 스크립트는
 * 한국에서 직접 돌리거나(도쿄에서 부르면 해외 IP 스로틀로 몇 분씩 걸린다),
 * 받아 둔 응답 파일로 적재하거나, dry-run 으로 확인할 때 쓴다.
 * 수신·파싱 로직은 스케줄러와 같은 모듈을 쓴다 — 두 벌로 두면 한쪽만 고쳐진다.
 *
 * 개별 의료기관 정보는 가져오지 않는다.
 *
 * 멱등: 코드 기준 upsert. 값이 같으면 그대로 덮어써도 결과가 같다.
 *
 * 실행: npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *         src/database/seeds/sync-nonpay-prices.ts [--dry-run] [--file=<경로>]
 */

const DRY_RUN = process.argv.includes('--dry-run');
/**
 * --file=<경로> 로 저장해 둔 응답 XML 을 쓸 수 있다.
 * 상류(data.go.kr)가 자주 504 를 내는데, 한 번 받아 둔 응답이 있으면 그걸로
 * 적재하는 편이 상류를 계속 두드리는 것보다 낫다. 월 1회 갱신 자료다.
 */
const FILE_ARG = process.argv.find((a) => a.startsWith('--file='));

async function main(): Promise<void> {
  const key = process.env.HIRA_NONPAY_API_KEY || process.env.PUBLIC_DATA_API_KEY;
  if (!key && !FILE_ARG) {
    console.error('HIRA_NONPAY_API_KEY 가 필요합니다.');
    process.exit(1);
  }

  console.log(`[nonpay] 심평원 지역별 비급여 가격 수신${DRY_RUN ? ' (dry-run)' : ''}`);

  let items: string[];
  if (FILE_ARG) {
    const path = FILE_ARG.slice('--file='.length);
    const xml = readFileSync(path, 'utf-8');
    if (!xml.includes('<resultCode>00</resultCode>')) {
      throw new Error('정상 응답이 아닌 파일입니다.');
    }
    items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    console.log(`[nonpay] 파일에서 ${items.length}건 읽음 (${path})`);
  } else {
    items = await fetchAllItems(key as string, (m) => console.log(m));
    console.log(`[nonpay] 전체 ${items.length}건 수신`);
  }

  const rows = toRows(items);
  console.log(`[nonpay] 한방 항목 ${rows.length}건`);

  if (DRY_RUN) {
    for (const r of rows) {
      console.log(
        `  ${r.name} — 지역 ${Object.keys(r.regions).length}곳, 전국 중간 ${
          r.regions.All?.median ?? '-'
        }`,
      );
    }
    console.log(`\n[nonpay] ${rows.length}건 (dry-run — 저장 안 함)`);
    return;
  }

  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();
  try {
    const repo = ds.getRepository(NonPayPrice);
    let saved = 0;
    for (const payload of rows) {
      const existing = await repo.findOne({ where: { code: payload.code } });
      await repo.save(
        existing ? Object.assign(existing, payload) : repo.create(payload),
      );
      saved++;
    }
    console.log(`\n[nonpay] 저장 ${saved}건`);
  } finally {
    await ds.destroy();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[nonpay] 실패:', e);
    process.exit(1);
  });
