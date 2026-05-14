/**
 * 치험례 임베딩 생성 — OpenAI text-embedding-3-small (1536d).
 *
 * 대상: clinical_cases 의 embedding 컬럼이 NULL 인 행.
 * 텍스트 조합: chiefComplaint + patternDiagnosis + symptoms.join + originalText(앞 2000자).
 *
 * 비용: 6,454건 × 평균 800 토큰 ≈ 5.2M 토큰. $0.02/1M → 약 $0.10.
 * 시간: 100건/배치 × 13배치 ≈ 5분 이내.
 *
 * 실행:
 *   OPENAI_API_KEY=sk-... pnpm --filter @hanmed/api embed:cases
 *
 * 옵션:
 *   --limit=N     N건만 처리
 *   --batch=N     한 번에 OpenAI 에 보내는 입력 수 (기본 100, 최대 2048)
 *   --reembed     embedding 이 이미 있는 행도 다시 생성
 */

import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { ClinicalCase } from '../entities/clinical-case.entity';
import OpenAI from 'openai';

const MODEL = 'text-embedding-3-small'; // 1536d
const MAX_INPUT_CHARS = 6000; // 토큰 한도 보호

interface CliOptions {
  limit: number | null;
  batch: number;
  reembed: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const get = (key: string): string | undefined => {
    const found = args.find((a) => a.startsWith(`--${key}=`));
    return found ? found.split('=')[1] : undefined;
  };
  return {
    limit: get('limit') ? parseInt(get('limit')!, 10) : null,
    batch: get('batch') ? Math.min(parseInt(get('batch')!, 10), 2048) : 100,
    reembed: args.includes('--reembed'),
  };
}

/**
 * 케이스에서 임베딩 입력 텍스트 생성.
 * 단순 originalText 가 아니라 핵심 필드를 weight 줘서 의미 매칭 향상.
 */
function buildEmbeddingInput(c: ClinicalCase): string {
  const parts: string[] = [];
  if (c.chiefComplaint) parts.push(`주소증: ${c.chiefComplaint}`);
  if (c.patternDiagnosis) parts.push(`변증: ${c.patternDiagnosis}`);
  if (Array.isArray(c.symptoms)) {
    const names = c.symptoms.map((s) => (typeof s === 'string' ? s : s?.name)).filter(Boolean);
    if (names.length > 0) parts.push(`증상: ${names.join(', ')}`);
  }
  if (Array.isArray(c.herbalFormulas) && c.herbalFormulas[0]?.formulaName) {
    parts.push(`처방: ${c.herbalFormulas[0].formulaName}`);
  }
  if (c.patientConstitution) parts.push(`체질: ${c.patientConstitution}`);
  if (c.treatmentOutcome) parts.push(`결과: ${c.treatmentOutcome}`);
  if (c.originalText) parts.push(c.originalText);
  const joined = parts.join('\n');
  return joined.length > MAX_INPUT_CHARS ? joined.slice(0, MAX_INPUT_CHARS) : joined;
}

async function main() {
  const opts = parseArgs();
  console.log('임베딩 옵션:', opts);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY 환경변수가 필요합니다.');
    process.exit(1);
  }
  const client = new OpenAI({ apiKey });

  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();
  console.log('DB 연결 OK');

  const repo = dataSource.getRepository(ClinicalCase);

  const qb = repo.createQueryBuilder('c');
  if (!opts.reembed) {
    qb.where('c.embedding IS NULL');
  }
  qb.orderBy('c.createdAt', 'ASC');
  if (opts.limit) qb.limit(opts.limit);

  const total = await qb.getCount();
  console.log(`처리 대상: ${total}건`);
  if (total === 0) {
    console.log('대상 없음 — 종료');
    await dataSource.destroy();
    return;
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const start = Date.now();

  // 배치 단위로 페이지네이션 + OpenAI 일괄 호출
  const PAGE = opts.batch;
  let offset = 0;
  while (offset < total) {
    const rows = await qb.clone().skip(offset).take(PAGE).getMany();
    if (rows.length === 0) break;

    const inputs = rows.map(buildEmbeddingInput);

    try {
      const response = await client.embeddings.create({
        model: MODEL,
        input: inputs,
      });

      if (response.data.length !== rows.length) {
        throw new Error(`응답 길이 불일치: ${response.data.length} != ${rows.length}`);
      }

      // 행별로 update
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        const embedding = response.data[i].embedding;
        try {
          await repo.update(
            { id: row.id },
            {
              embedding,
              embeddedAt: new Date(),
            },
          );
          succeeded += 1;
        } catch (err: any) {
          failed += 1;
          console.warn(`  update 실패 sourceId=${row.sourceId}: ${err?.message?.slice(0, 120)}`);
        }
        processed += 1;
      }
    } catch (err: any) {
      // 배치 전체 실패 — 카운트만 올림, 다음 배치로 진행
      failed += rows.length;
      processed += rows.length;
      console.warn(`배치 실패 (offset=${offset}): ${err?.message?.slice(0, 200)}`);
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    process.stdout.write(
      `  ${processed}/${total} (성공 ${succeeded}, 실패 ${failed}, 경과 ${elapsed}s)\r`,
    );
    offset += PAGE;
  }

  console.log('\n=== 결과 ===');
  console.log(`  처리: ${processed}건`);
  console.log(`  성공: ${succeeded}건`);
  console.log(`  실패: ${failed}건`);
  await dataSource.destroy();
}

main().catch((err) => {
  console.error('임베딩 생성 실패:', err);
  process.exit(1);
});
