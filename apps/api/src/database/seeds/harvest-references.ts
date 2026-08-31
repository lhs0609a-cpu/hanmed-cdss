import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Reference } from '../entities/reference.entity';
import { ReferenceIngestService } from '../../modules/references/reference-ingest.service';

/**
 * 문헌 자료실 적재 — CLI.
 *
 * 같은 일을 하는 관리자 API(POST /admin/references/harvest)가 있지만 그쪽은
 * 관리자 JWT 가 있어야 한다. 초기 적재는 몇 시간에 걸쳐 여러 번 돌려야 하는데,
 * 그때마다 브라우저에서 토큰을 꺼내 오는 것은 실용적이지 않다.
 *
 * DATABASE_URL 만 있으면 된다. data-source.ts 가 .env.local → .env 순으로
 * 읽으므로 파일에 넣어 두면 명령줄에 자격증명이 남지 않는다.
 *
 * 서비스는 Nest 컨테이너 없이 직접 만든다. 생성자가 리포지토리 하나만 받으므로
 * 그렇게 해도 되고, 그래야 수집·중복판정·업서트 규칙이 API 와 한 몸으로 간다 —
 * 여기에 로직을 복사해 두면 언젠가 둘이 어긋나고, 어긋난 순간부터 "1만 건"
 * 중 몇 건이 진짜인지 아무도 모르게 된다.
 *
 * 실행:
 *   npx ts-node -r tsconfig-paths/register src/database/seeds/harvest-references.ts
 *   ... --per-topic=400 --min-year=2015
 *   ... --stats-only        (적재 없이 현황만)
 *   ... --purge --dry-run   (임상에서 못 쓰는 자료가 몇 건인지만 세기)
 *   ... --purge             (실제로 지우기)
 *
 * 주제가 7개라 --per-topic=400 이면 한 번에 최대 2,800건이다. 상류(NCBI)가
 * 키 없이 초당 3회라 수십 분이 걸린다. 이미 있는 것은 갱신만 되고 중복으로
 * 쌓이지 않으므로 몇 번을 돌려도 안전하다.
 */

function argValue(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

const STATS_ONLY = process.argv.includes('--stats-only');
const PURGE = process.argv.includes('--purge');
const DRY_RUN = process.argv.includes('--dry-run');
const PER_TOPIC = Number(argValue('per-topic') ?? '200') || 200;
const MIN_YEAR =
  Number(argValue('min-year') ?? '') || new Date().getFullYear() - 10;

function printStats(s: {
  total: number;
  bySource: Record<string, number>;
  byCategory: Record<string, number>;
  byEvidenceType: Record<string, number>;
}) {
  const CATEGORY_LABEL: Record<string, string> = {
    acupuncture: '침구',
    herbal: '한약·본초',
    diagnosis: '진단·변증',
    rehab: '추나·재활',
    safety: '안전성',
    admin: '행정·청구',
    other: '기타',
  };
  const EVIDENCE_LABEL: Record<string, string> = {
    systematic_review: '체계적 고찰',
    rct: 'RCT',
    guideline: '진료지침',
    observational: '관찰연구',
    case_report: '증례보고',
    review: '종설',
    unknown: '미분류',
  };

  console.log(`\n총 ${s.total.toLocaleString()}건`);
  const line = (
    title: string,
    obj: Record<string, number>,
    labels?: Record<string, string>,
  ) => {
    const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return;
    console.log(`\n  ${title}`);
    for (const [k, v] of entries) {
      console.log(`    ${(labels?.[k] ?? k).padEnd(14)} ${v.toLocaleString()}`);
    }
  };
  line('출처별', s.bySource);
  line('분류별', s.byCategory, CATEGORY_LABEL);
  line('근거수준별', s.byEvidenceType, EVIDENCE_LABEL);
}

async function main(): Promise<void> {
  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();

  try {
    const ingest = new ReferenceIngestService(ds.getRepository(Reference));

    if (STATS_ONLY) {
      printStats(await ingest.stats());
      return;
    }

    if (PURGE) {
      const r = await ingest.purgeNonClinical(DRY_RUN);
      console.log('');
      console.log(`총 ${r.total.toLocaleString()}건 중`);
      console.log(`  근거수준 미분류        ${r.unknownEvidence.toLocaleString()}`);
      console.log(`  동물·세포·성분 연구     ${r.animalOrCell.toLocaleString()}`);
      console.log(
        `  ${DRY_RUN ? '지울 대상' : '지웠음'}              ${r.wouldDelete.toLocaleString()}`,
      );
      console.log(`  남는 것               ${r.remaining.toLocaleString()}`);
      if (DRY_RUN) {
        console.log('');
        console.log('(--dry-run 이라 실제로 지우지 않았습니다)');
      } else {
        printStats(await ingest.stats());
      }
      return;
    }

    console.log(
      `PubMed 수집 시작 — 주제당 ${PER_TOPIC}건, ${MIN_YEAR}년 이후\n` +
        `상류 속도제한 때문에 수십 분이 걸립니다. 중간에 끊어도 그때까지 받은 것은 저장돼 있습니다.\n`,
    );
    const before = await ingest.stats();
    const started = Date.now();

    const r = await ingest.harvestNow(PER_TOPIC, MIN_YEAR);

    const mins = Math.round((Date.now() - started) / 60000);
    console.log(
      `\n수집 완료 (${mins}분) — 수신 ${r.fetched} · 신규 ${r.inserted} · 갱신 ${r.updated} · 제외 ${r.skipped}`,
    );
    if (r.errors.length > 0) {
      console.log(`\n오류 ${r.errors.length}건 (앞 10건):`);
      r.errors.slice(0, 10).forEach((e) => console.log(`  - ${e}`));
    }

    const after = await ingest.stats();
    printStats(after);
    console.log(
      `\n이번 실행으로 ${(after.total - before.total).toLocaleString()}건 늘었습니다.`,
    );
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  // 접속 실패 메시지에 자격증명이 섞여 나오는 경우가 있어 스택은 찍지 않는다.
  console.error(`실패: ${(e as Error).message}`);
  process.exit(1);
});
