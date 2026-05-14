/**
 * 치험례 AI 정리 — raw originalText 를 Claude 로 구조화한다.
 *
 * 입력 (DB clinical_cases 의 한 행):
 *   - originalText: 정제되지 않은 한자 혼재 원문
 *   - herbalFormulas: 보통 [{ formulaName: '...', herbs: [] }] — 약재 구성 비어있음
 *   - symptoms: 평탄 문자열 일부만
 *   - presentIllness/patternDiagnosis: 자주 비어있음
 *
 * AI 추출 목표:
 *   - 약재 구성 herbs[]: 본문에서 군신좌사·용량 파싱
 *   - 변증 patternDiagnosis: 한 줄로 명확화
 *   - 증상 symptoms[]: 한자 괄호 제거된 깨끗한 한글
 *   - 결과 treatmentOutcome enum: 완치/호전/무효/악화
 *   - tags[]: 해시태그 후보 (체질·증상·변증·결과)
 *   - summary: 1~2줄 요약 (presentIllness 에 저장)
 *
 * idempotent: clinicalNotes 가 '[AI-ENRICHED]' 로 시작하면 스킵.
 *
 * 실행:
 *   ANTHROPIC_API_KEY=sk-ant-... pnpm --filter @hanmed/api enrich:cases
 *
 * 옵션:
 *   --dry-run         DB 쓰기 없이 첫 5건만 출력
 *   --limit=N         N 건만 처리
 *   --batch=N         동시 처리 수 (기본 5)
 *   --since=YYYY-MM-DD  특정 일자 이후 생성된 케이스만
 *
 * 비용 추정:
 *   6,454 건 × 평균 1,500 토큰 ≈ Sonnet 4.5 기준 $25~30, 약 6~8시간 소요.
 *   중단 후 재실행 안전 — 이미 처리된 행 스킵.
 */

import { DataSource, IsNull } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import {
  ClinicalCase,
  ConstitutionType,
  Gender,
  TreatmentOutcome,
} from '../entities/clinical-case.entity';
import Anthropic from '@anthropic-ai/sdk';

interface EnrichResult {
  herbs: Array<{ name: string; amount: string; role?: string }>;
  patternDiagnosis: string | null;
  symptoms: string[];
  treatmentOutcome: TreatmentOutcome | null;
  tags: string[];
  summary: string;
}

const ENRICHED_MARKER = '[AI-ENRICHED]';
const MODEL = 'claude-sonnet-4-6';
const SYSTEM_PROMPT = `당신은 한의학 치험례 원문을 구조화하는 도우미입니다.
입력 텍스트(보통 방약합편 또는 임상 사례 원문)에서 다음을 추출해 JSON 으로만 응답합니다.
다른 설명 텍스트 없이 JSON 만 출력하세요.

스키마:
{
  "herbs": [{"name": "약재명(한글)", "amount": "용량(예: 4g, 1돈)", "role": "군|신|좌|사 (있을 때)"}],
  "patternDiagnosis": "변증명(한 줄, 한글) 또는 null",
  "symptoms": ["증상1", "증상2", ...] (한글, 한자 괄호 제거, 중복 없음, 최대 10개),
  "treatmentOutcome": "완치|호전|무효|악화 또는 null",
  "tags": ["#태그1", ...] (체질/증상/변증/결과 등 5~10개),
  "summary": "1~2줄 요약(한글)"
}

원칙:
- 원문에 명시되지 않은 정보는 추측하지 말고 null/빈배열 처리.
- 한자 표기는 한글로 변환 (예: 半夏 → 반하). 모르면 그대로 유지.
- 약재명은 KFDA·동의보감 표준 표기 사용 (예: 인삼, 백출).
`;

interface CliOptions {
  dryRun: boolean;
  limit: number | null;
  batch: number;
  since: string | null;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const get = (key: string): string | undefined => {
    const found = args.find((a) => a.startsWith(`--${key}=`));
    return found ? found.split('=')[1] : undefined;
  };
  return {
    dryRun: args.includes('--dry-run'),
    limit: get('limit') ? parseInt(get('limit')!, 10) : null,
    batch: get('batch') ? parseInt(get('batch')!, 10) : 5,
    since: get('since') || null,
  };
}

async function callClaude(client: Anthropic, originalText: string): Promise<EnrichResult | null> {
  const userText = originalText.slice(0, 8000); // 토큰 한도 보호
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userText }],
  });

  const content = response.content[0];
  if (content.type !== 'text') return null;

  let text = content.text.trim();
  // 모델이 fenced block 으로 감쌌을 때 안전 추출
  if (text.includes('```json')) {
    text = text.split('```json')[1].split('```')[0].trim();
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }

  try {
    const parsed = JSON.parse(text) as Partial<EnrichResult>;
    return {
      herbs: Array.isArray(parsed.herbs) ? parsed.herbs : [],
      patternDiagnosis: parsed.patternDiagnosis ?? null,
      symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
      treatmentOutcome: parsed.treatmentOutcome ?? null,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    };
  } catch {
    console.warn('[parse] 실패 — 응답 prefix:', text.slice(0, 200));
    return null;
  }
}

async function enrichOne(
  client: Anthropic,
  row: ClinicalCase,
  opts: CliOptions,
): Promise<Partial<ClinicalCase> | null> {
  const result = await callClaude(client, row.originalText);
  if (!result) return null;

  // 기존 herbalFormulas[0] 의 formulaName 은 유지하고 herbs 만 채움
  const existingFormula =
    Array.isArray(row.herbalFormulas) && row.herbalFormulas[0]
      ? row.herbalFormulas[0]
      : { formulaName: '', herbs: [] };
  const newFormulas = existingFormula.formulaName
    ? [
        {
          ...existingFormula,
          herbs: result.herbs.map((h) => ({ name: h.name, amount: h.amount })),
        },
      ]
    : Array.isArray(row.herbalFormulas)
    ? row.herbalFormulas
    : [];

  const updated: Partial<ClinicalCase> = {
    herbalFormulas: newFormulas,
    symptoms: result.symptoms.map((s) => ({ name: s })),
    patternDiagnosis: result.patternDiagnosis || row.patternDiagnosis,
    treatmentOutcome: result.treatmentOutcome || row.treatmentOutcome,
    presentIllness: result.summary || row.presentIllness,
    // clinicalNotes 에 마커 + 태그 직렬화 (jsonb 컬럼이 없으므로 텍스트로 보관)
    clinicalNotes: `${ENRICHED_MARKER}\nTAGS: ${result.tags.join(' ')}\n${result.summary}`,
  };

  if (opts.dryRun) {
    console.log('=== DRY RUN: sourceId=%s ===', row.sourceId);
    console.log(JSON.stringify({ ...updated, _tags: result.tags }, null, 2));
  }
  return updated;
}

async function main() {
  const opts = parseArgs();
  console.log('Enrich 옵션:', opts);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY 환경변수가 필요합니다.');
    process.exit(1);
  }
  const client = new Anthropic({ apiKey });

  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();
  console.log('DB 연결 OK');

  const repo = dataSource.getRepository(ClinicalCase);

  // 처리 대상: clinicalNotes 가 marker 로 시작하지 않는 것만
  const queryBuilder = repo
    .createQueryBuilder('c')
    .where('(c.clinicalNotes IS NULL OR c.clinicalNotes NOT LIKE :marker)', {
      marker: `${ENRICHED_MARKER}%`,
    })
    .orderBy('c.createdAt', 'DESC');

  if (opts.since) {
    queryBuilder.andWhere('c.createdAt >= :since', { since: opts.since });
  }
  if (opts.limit) {
    queryBuilder.limit(opts.limit);
  }

  const total = await queryBuilder.getCount();
  console.log(`처리 대상: ${total}건`);

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  // 페이지네이션 + 동시성
  const PAGE = 50;
  let offset = 0;
  while (offset < total) {
    const batch = await queryBuilder.clone().skip(offset).take(PAGE).getMany();
    if (batch.length === 0) break;

    // 동시 처리 — opts.batch 개씩
    for (let i = 0; i < batch.length; i += opts.batch) {
      const chunk = batch.slice(i, i + opts.batch);
      const results = await Promise.all(
        chunk.map(async (row) => {
          try {
            const updated = await enrichOne(client, row, opts);
            if (!updated) return { row, ok: false, reason: 'no parse' };
            if (!opts.dryRun) {
              await repo.update({ id: row.id }, updated);
            }
            return { row, ok: true };
          } catch (err: any) {
            return { row, ok: false, reason: err?.message || String(err) };
          }
        }),
      );
      for (const r of results) {
        processed += 1;
        if (r.ok) succeeded += 1;
        else {
          failed += 1;
          console.warn(`  실패 sourceId=${r.row.sourceId}: ${r.reason}`);
        }
      }
      process.stdout.write(
        `  ${processed}/${total} (성공 ${succeeded}, 실패 ${failed})\r`,
      );
    }

    offset += PAGE;
    if (opts.dryRun) break; // dry-run 은 1 페이지만
  }

  console.log('\n=== 결과 ===');
  console.log(`  처리: ${processed}건`);
  console.log(`  성공: ${succeeded}건`);
  console.log(`  실패: ${failed}건`);
  await dataSource.destroy();
}

main().catch((err) => {
  console.error('Enrich 실패:', err);
  process.exit(1);
});

// linter helpers — 사용 안 하는 import 가 있어도 향후 확장에 대비해 보존
void IsNull;
void ConstitutionType;
void Gender;
