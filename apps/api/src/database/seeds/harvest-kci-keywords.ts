import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Formula } from '../entities/formula.entity';
import { Reference } from '../entities/reference.entity';
import { ReferenceIngestService } from '../../modules/references/reference-ingest.service';
import { KciApiClient } from '../../modules/references/sources/kci-api';

/**
 * KCI 에서 검색어로 한의학 논문을 더 모은다.
 *
 * 학술지 단위 수집(harvest-kci-api.ts)은 한의학 학술지에 실린 것만 가져온다.
 * 그래서 타 분야 학술지에 실린 한의학 연구가 통째로 빠져 있었다 — 표본으로
 * 재 보니 이랬다.
 *
 *   추나      1,947편 중 표본 100건에서 보유 1건   (재활의학·물리치료 학술지)
 *   변증      1,287편 중 표본 100건에서 보유 23건
 *   침구        318편 중 표본 100건에서 보유 42건
 *
 * 추나는 급여 시술인데 우리가 사실상 들고 있지 않았다. 한의사가 "추나 논문"
 * 을 찾아 들어올 자리가 없었다는 뜻이다.
 *
 * ── 검색어를 무엇으로 삼는가 ────────────────────────────────────────
 *
 * 시술·분야 이름과 처방명만 쓴다. 약재 이름으로 찾으면 안 된다. 제목 검색은
 * 글자만 보므로 동음이의어가 그대로 걸린다 — 大棗를 "대조" 로 찾으면
 * 대조군(control group) 논문이 쏟아진다. 실제로 재 보니 3,634편이었다.
 * 같은 이유로 두 글자 처방명도 뺀다(relatedResearch.ts 와 같은 규칙).
 *
 * 처방명을 검색어로 쓰는 것에는 덤이 있다. 처방 쪽에 붙는 "관련 연구" 는
 * 출처가 한국어로 준 제목에서만 처방명을 찾는데, 그 재료가 바로 KCI 논문이다.
 * 여기서 모을수록 처방 쪽이 두꺼워진다.
 *
 * 실행:
 *   npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *     src/database/seeds/harvest-kci-keywords.ts
 *   ... --terms-only      (어떤 검색어로 몇 건이 잡히는지만 본다)
 *   ... --limit=5         (검색어 몇 개만 — 처음 돌릴 때 확인용)
 *   ... --formulas=0      (처방명은 빼고 시술·분야 용어만)
 *   ... --dry-run         (저장하지 않는다)
 */

function argValue(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

const TERMS_ONLY = process.argv.includes('--terms-only');
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = Number(argValue('limit') ?? '0') || 0;
const WITH_FORMULAS = argValue('formulas') !== '0';

/**
 * 시술·분야 검색어.
 *
 * 한의사가 실제로 쓰는 말이고, 일상어와 겹치지 않는 것만 골랐다. "한방" 처럼
 * 넓은 말은 뺐다 — 3,363편이 잡히지만 대부분 이미 학술지 수집으로 들어와
 * 있고, 남은 것은 한방차·한방화장품처럼 진료와 무관한 글이다.
 *
 * 손으로 관리한다. 자동으로 뽑으면 "대조" 같은 것이 섞여 들어온다.
 */
const MODALITY_TERMS = [
  // 시술
  '침구', '약침', '봉약침', '전침', '이침', '매선', '추나', '부항', '뜸', '구법',
  '한방물리요법', '도침', '화침', '온침', '사혈',
  // 진단·이론
  '변증', '사상체질', '체질진단', '맥진', '설진', '복진', '경락', '경혈',
  // 치료 분야
  '한의치료', '한의학적치료', '한약치료', '한방치료', '한의표준임상진료지침',
  // 제형·약제
  '한약제제', '엑스제', '탕약', '약재', '본초',
  // 행정·제도 — 검색 의도가 가장 뾰족한 자리다
  '첩약', '한방의료보험', '한의약', '한의원', '한방병원', '자동차보험 한방',
];

async function main() {
  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();

  const key = process.env.KCI_OPEN_API_KEY;
  if (!key) throw new Error('KCI_OPEN_API_KEY 가 없습니다 (.env.local).');

  const client = new KciApiClient({
    apiKey: key,
    onProgress: (m) => console.log(`  ${m}`),
  });
  const ingest = new ReferenceIngestService(ds.getRepository(Reference));

  /**
   * 처방명은 DB 에서 가져온다. 세 글자 미만은 빼고 한글 이름만 — 두 글자
   * 처방명은 일상어와 겹쳐 엉뚱한 논문을 끌어온다.
   */
  let formulaTerms: string[] = [];
  if (WITH_FORMULAS) {
    const rows = await ds
      .getRepository(Formula)
      .createQueryBuilder('f')
      .select('DISTINCT f.name', 'name')
      .where(`f.name ~ '^[가-힣]{3,}$'`)
      .orderBy('name', 'ASC')
      .getRawMany<{ name: string }>();
    formulaTerms = rows.map((r) => r.name);
  }

  const terms = [...MODALITY_TERMS, ...formulaTerms];
  const targets = LIMIT > 0 ? terms.slice(0, LIMIT) : terms;

  console.log(
    `검색어 ${targets.length}개 (시술·분야 ${MODALITY_TERMS.length} + 처방 ${formulaTerms.length})`,
  );

  let inserted = 0;
  let updated = 0;
  let fetched = 0;

  for (const [at, term] of targets.entries()) {
    const head = `[${at + 1}/${targets.length}] ${term}`;
    try {
      const refs = await client.fetchByTitle(term);
      fetched += refs.length;
      if (TERMS_ONLY || DRY_RUN) {
        console.log(`${head}: ${refs.length}건`);
        continue;
      }
      if (!refs.length) {
        console.log(`${head}: 0건`);
        continue;
      }
      const result = await ingest.save(refs);
      inserted += result.inserted;
      updated += result.updated;
      console.log(
        `${head}: 받은 ${refs.length} · 새로 저장 ${result.inserted} · 이미 있음 ${result.updated}`,
      );
    } catch (e) {
      // 검색어 하나가 실패했다고 나머지를 버리지 않는다. 어느 것이
      // 실패했는지 남겨 두면 그것만 다시 돌릴 수 있다.
      console.log(`${head}: 실패 — ${(e as Error).message}`);
    }
  }

  console.log(
    `\n끝. 받은 ${fetched}건 · 새로 저장 ${inserted}건 · 이미 있음 ${updated}건` +
      (DRY_RUN || TERMS_ONLY ? ' (저장하지 않음)' : ''),
  );
  await ds.destroy();
}

main().catch((e) => {
  console.error('수집 실패:', e);
  process.exit(1);
});
