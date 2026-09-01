import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { dataSourceOptions } from '../data-source';
import { Reference, ReferenceSource } from '../entities/reference.entity';
import { ReferenceIngestService } from '../../modules/references/reference-ingest.service';
import { KciClient } from '../../modules/references/sources/kci';
import { RawReference } from '../../modules/references/sources/types';

/**
 * KCI 한국어 논문 수집 — OAI-PMH.
 *
 * 자료실 14,804건 중 한국어가 11건이었다. 진료 중에 영어 초록을 읽는 한의사는
 * 거의 없다. 한국어 몇 천 건이 영어 1만 건보다 실제로 더 쓰인다.
 *
 * KCI OAI-PMH 는 주제로 못 거른다(set 이 ARTI/ARTI_CONF/JOUR 셋뿐). 240만 건을
 * 훑으면서 연구분야와 제목·초록 키워드로 한의학만 골라낸다. 한 번에 끝나지
 * 않으므로 resumptionToken 을 파일에 남기고 다음 실행에서 그 지점부터 잇는다.
 *
 * 실행:
 *   npx ts-node -r tsconfig-paths/register src/database/seeds/harvest-kci.ts
 *   ... --pages=200      (한 번에 훑을 페이지 수, 1페이지 = 100건)
 *   ... --from=2024-01-01 --until=2024-12-31   (datestamp 구간)
 *   ... --restart        (이어받기 토큰을 버리고 처음부터)
 *   ... --stats-only
 */

function argValue(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

const PAGES = Number(argValue('pages') ?? '200') || 200;
const FROM = argValue('from');
const UNTIL = argValue('until');
const RESTART = process.argv.includes('--restart');
const STATS_ONLY = process.argv.includes('--stats-only');

/**
 * 이어받기 지점.
 *
 * DB 에 두지 않고 파일에 둔다 — 이건 수집 작업의 상태이지 제품 데이터가
 * 아니고, 마이그레이션을 하나 더 만들 만큼의 무게도 아니다.
 */
const TOKEN_FILE = path.join(__dirname, '.kci-resume-token');

function readToken(): string | null {
  if (RESTART) return null;
  try {
    const v = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
    return v || null;
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  try {
    if (token) fs.writeFileSync(TOKEN_FILE, token, 'utf8');
    else if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
  } catch {
    // 토큰을 못 남기면 다음 실행이 처음부터 돈다. 느릴 뿐 틀리지는 않는다.
  }
}

async function main(): Promise<void> {
  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();

  try {
    const repo = ds.getRepository(Reference);
    const ingest = new ReferenceIngestService(repo);

    const koCount = await repo.count({ where: { source: ReferenceSource.KCI } });
    const total = await repo.count();
    console.log(`KCI 적재 ${koCount.toLocaleString()}건 / 전체 ${total.toLocaleString()}건`);
    if (STATS_ONLY) return;

    const resume = readToken();
    console.log(
      resume
        ? `이어서 훑습니다 (토큰 있음). 이번에 ${PAGES}페이지.`
        : `처음부터 훑습니다. 이번에 ${PAGES}페이지.`,
    );
    console.log('KCI 는 주제 필터가 없어 전 분야를 훑으며 한의학만 걸러냅니다.\n');

    const started = Date.now();
    // datestamp 구간을 명시하지 않으면 서버가 1900-01-01:9999-12-31 로 잡는데
    // 그 창은 102건만 돌려주는 빈 구간이다. 실제 데이터는 구간을 줘야 나온다.
    const from = FROM ?? '2020-01-01';
    const until = UNTIL ?? new Date().toISOString().slice(0, 10);
    console.log(`구간 ${from} ~ ${until}`);

    // 중간 저장 합계. 마지막에 한 번만 세면 도중에 죽었을 때 얼마나
    // 건졌는지 알 수 없다.
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let extracted = 0;
    const errors: string[] = [];

    async function flush(batch: RawReference[], token: string | null) {
      writeToken(token);
      if (batch.length === 0) return;
      const r = await ingest.save(batch);
      inserted += r.inserted;
      updated += r.updated;
      skipped += r.skipped;
      extracted += batch.length;
      errors.push(...r.errors);
      console.log(
        `  [중간 저장] 한의학 ${batch.length}건 · 신규 ${r.inserted} · 갱신 ${r.updated}` +
          ` (누계 신규 ${inserted})`,
      );
    }
    const client = new KciClient({
      from,
      until,
      resumptionToken: resume,
      maxPages: PAGES,
      onProgress: (m) => console.log(`  ${m}`),
      // 20페이지(2,000건)마다 저장하고 토큰을 남긴다. 한 회차가 몇 시간짜리라
      // 끝까지 안고 가면 중간에 죽었을 때 그날 것이 통째로 없어진다.
      flushEvery: 20,
      onBatch: flush,
    });

    const { refs, nextToken, scanned } = await client.harvest();
    // 남은 것 마무리.
    await flush(refs, nextToken);

    const mins = ((Date.now() - started) / 60000).toFixed(1);
    const saved = { inserted, updated, skipped, errors };

    console.log(
      `\n완료 (${mins}분) — 훑은 논문 ${scanned.toLocaleString()}건 중 ` +
        `한의학 ${extracted}건 추출 · 신규 ${saved.inserted} · 갱신 ${saved.updated} · 제외 ${saved.skipped}`,
    );
    if (saved.errors.length > 0) {
      console.log(`오류 ${saved.errors.length}건 (앞 5건):`);
      saved.errors.slice(0, 5).forEach((e) => console.log(`  - ${e}`));
    }

    const after = await repo.count({ where: { source: ReferenceSource.KCI } });
    console.log(`KCI 누계 ${after.toLocaleString()}건`);
    console.log(
      nextToken
        ? '\n아직 남았습니다. 같은 명령을 다시 돌리면 이어서 훑습니다.'
        : '\n끝까지 훑었습니다.',
    );
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(`실패: ${(e as Error).message}`);
  process.exit(1);
});
