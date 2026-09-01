import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Reference, ReferenceSource } from '../entities/reference.entity';
import { ReferenceIngestService } from '../../modules/references/reference-ingest.service';
import { KciApiClient } from '../../modules/references/sources/kci-api';

/**
 * KCI 공식 Open API 로 한의학 논문을 수집한다.
 *
 * OAI-PMH 수집기(harvest-kci.ts)를 대신한다. 그쪽은 주제로 못 걸러서
 * 240만 건을 전부 훑어야 했고, 20시간을 돌려도 한의학 비중이 1% 남짓이라
 * 대부분이 헛일이었다. 이쪽은 학술지 이름으로 직접 찾는다.
 *
 *   1단계 — 등재 학술지 전체에서 연구분야가 한의학인 것을 고른다.
 *   2단계 — 고른 학술지마다 논문을 전부 받는다.
 *
 * 학술지 단위로 판정하므로 관광학·심리학 논문이 섞이지 않는다. 대한한의학
 * 회지에 실린 글은 무엇이든 한의사가 읽을 것이다.
 *
 * 받는 논문에 국문 초록이 그대로 들어 있다. 번역도 요약도 필요 없이 바로
 * 읽힌다 — PubMed 쪽에 들이는 번역·요약 비용이 여기에는 안 든다.
 *
 * 인증키는 KCI 에서 발급받아 .env.local 의 KCI_OPEN_API_KEY 에 넣는다.
 * 공공데이터포털(data.go.kr)의 KCI_API_KEY 와는 발급처가 다르다 — 서로
 * 통하지 않으므로 환경변수도 따로 둔다.
 *
 * 실행:
 *   npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *     src/database/seeds/harvest-kci-api.ts
 *   ... --journals-only   (어떤 학술지가 잡히는지만 본다. 논문은 안 받는다)
 *   ... --year=2023       (학술지 목록 기준연도. 기본: 작년)
 *   ... --limit=5         (학술지 몇 종만 — 처음 돌릴 때 확인용)
 *   ... --dry-run         (저장하지 않는다)
 */

function argValue(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

const JOURNALS_ONLY = process.argv.includes('--journals-only');
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = Number(argValue('limit') ?? '0') || 0;
// 인용지수는 집계에 시간이 걸려 올해 것이 아직 없을 수 있다. 작년을 쓴다.
const YEAR = Number(argValue('year') ?? '0') || new Date().getFullYear() - 1;

async function main(): Promise<void> {
  const apiKey = process.env.KCI_OPEN_API_KEY;
  if (!apiKey) {
    console.error(
      'KCI_OPEN_API_KEY 가 없습니다.\n' +
        '\n' +
        'KCI 에서 발급받은 인증키를 apps/api/.env.local 에 넣어 주세요.\n' +
        '  KCI_OPEN_API_KEY=<발급키>\n' +
        '\n' +
        '신청: https://www.kci.go.kr/kciportal/po/openapi/openApiList.kci\n' +
        '(로그인 필요. 공공데이터포털 키와는 발급처가 다릅니다)',
    );
    process.exit(1);
  }

  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();

  try {
    const repo = ds.getRepository(Reference);
    const ingest = new ReferenceIngestService(repo);

    const before = await repo.count({ where: { source: ReferenceSource.KCI } });
    console.log(`KCI 적재 ${before.toLocaleString()}건으로 시작합니다.\n`);

    const client = new KciApiClient({
      apiKey,
      onProgress: (m) => console.log(`  ${m}`),
    });

    const journals = await client.findKoreanMedicineJournals(YEAR);
    console.log(`\n한의학 학술지 ${journals.length}종을 찾았습니다.`);
    for (const j of journals) {
      console.log(`  ${j.name}  (${j.major ?? '분야없음'}) — ${j.publisher ?? ''}`);
    }
    if (JOURNALS_ONLY) return;
    if (journals.length === 0) {
      console.log('\n학술지를 못 찾았습니다. --year 를 바꿔 보세요.');
      return;
    }

    const targets = LIMIT > 0 ? journals.slice(0, LIMIT) : journals;
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let withKoAbstract = 0;

    console.log('');
    for (const j of targets) {
      try {
        const refs = await client.fetchJournalArticles(j.name);
        withKoAbstract += refs.filter((r) => r.language === 'ko').length;

        if (DRY_RUN) {
          console.log(`[dry-run] ${j.name}: ${refs.length}건`);
          continue;
        }
        // 학술지 하나가 끝날 때마다 저장한다. 마지막에 몰아서 쓰면 도중에
        // 죽었을 때 그때까지 받은 것이 통째로 날아간다 — OAI-PMH 수집기가
        // 20시간을 돌고도 0건이던 이유가 그것이었다.
        const r = await ingest.save(refs);
        inserted += r.inserted;
        updated += r.updated;
        skipped += r.skipped;
        console.log(
          `${j.name}: ${refs.length}건 중 신규 ${r.inserted} · 갱신 ${r.updated}`,
        );
      } catch (e) {
        // 학술지 하나가 실패해도 나머지는 계속한다.
        console.log(`${j.name}: 실패 — ${(e as Error).message}`);
      }
    }

    const after = await repo.count({ where: { source: ReferenceSource.KCI } });
    console.log(
      `\n${DRY_RUN ? '[dry-run] ' : ''}신규 ${inserted} · 갱신 ${updated} · 제외 ${skipped}` +
        ` (그중 국문 초록 ${withKoAbstract}건)`,
    );
    console.log(`KCI 누계 ${after.toLocaleString()}건`);
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(`실패: ${(e as Error).message}`);
  process.exit(1);
});
