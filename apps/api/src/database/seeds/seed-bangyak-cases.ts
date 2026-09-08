/**
 * 새로보는 방약합편 상/중/하통 활용사례 -> clinical_cases.
 *
 * 왜 필요한가:
 *   기존 적재는 활용사례 '색인 줄'만 넣었다. 원문에는 색인 아래에 변증·가감·
 *   회차별 경과가 다 붙은 본문이 있는데 파서가 그걸 건너뛰었다. 그래서 DB 의
 *   방약합편 사례는 제목만 남은 껍데기였다.
 *
 * 중복에 대해:
 *   이종대 선생이 밴드에 올린 사례(excel-*)와 방약합편 수록 사례는 상당 부분
 *   같은 케이스다. 표본 114건 중 45건이 이미 DB 에 있었다(2026-09 실측).
 *   sourceId 유니크만으로는 이걸 못 막는다 — 출처가 다르니 id 도 다르다.
 *   그래서 본문 내용으로 걸러 낸다. 같은 진료를 두 번 보여주면 "치험례 1만 건"
 *   이라는 숫자만 커지고 한의사는 같은 화면을 두 번 읽게 된다.
 *
 * 실행:
 *   python scripts/extract-bangyak-cases.py apps/ai-engine/data/bangyak_cases.json
 *   npx ts-node -r tsconfig-paths/register src/database/seeds/seed-bangyak-cases.ts
 *   ... --dry-run   (적재 없이 신규/중복 건수만)
 */

import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { dataSourceOptions } from '../data-source';
import {
  ClinicalCase,
  ConstitutionType,
  Gender,
  TreatmentOutcome,
} from '../entities/clinical-case.entity';

const DRY_RUN = process.argv.includes('--dry-run');

interface BangyakCase {
  id: string;
  volume: string;
  formula_no: string;
  formula_name: string;
  formula_hanja: string;
  title: string;
  gender: 'male' | 'female' | null;
  age: number | null;
  age_months: number | null;
  constitution: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  recorder: string;
  symptoms: string[];
  full_text: string;
}

/**
 * 발간 연도를 기록 연도로 쓴다.
 *
 * 개별 진료가 언제 있었는지는 원문이 말해 주지 않는다(1980년대~2000년대에
 * 걸쳐 있다). 추측해서 채우면 연도 필터가 거짓말을 하므로, 확실한 사실 하나
 * 인 발간 연도를 넣고 그게 진료일이 아님을 여기 적어 둔다.
 */
const PUBLISHED_YEAR = 2012;

function normalize(text: string): string {
  return text.replace(/\s+/g, '');
}

/**
 * '소양성소음인' 처럼 겹친 표기는 뒤쪽이 본체질이다. 마지막 'OO인' 을 취한다.
 * 없으면 null — 미상으로 채워 넣지 않는다. 추측한 체질은 처방 선택을 흔든다.
 */
function mapConstitution(raw: string | null): ConstitutionType | null {
  if (!raw) return null;
  const tokens = raw.match(/(태양|태음|소양|소음)/g);
  if (!tokens?.length) return null;
  const base = tokens[tokens.length - 1];
  return {
    태양: ConstitutionType.TAEYANG,
    태음: ConstitutionType.TAEEUM,
    소양: ConstitutionType.SOYANG,
    소음: ConstitutionType.SOEUM,
  }[base] as ConstitutionType;
}

/**
 * 경과는 본문 끝에 적힌다. 뒤 600자만 본다 — 앞쪽의 "이전에 호전된 적이 있다"
 * 같은 문장을 결과로 잘못 읽지 않기 위해서다. 판정이 안 서면 null 이다.
 */
function inferOutcome(text: string): TreatmentOutcome | null {
  const tail = text.slice(-600);
  if (/악화|더 심해|심해졌|부작용/.test(tail)) return TreatmentOutcome.WORSENED;
  if (/완치|모두 소실|전혀 없|완전히 나|다 나았/.test(tail)) return TreatmentOutcome.CURED;
  if (/호전|경감|줄어들|좋아졌|소실|개선|나아졌/.test(tail)) return TreatmentOutcome.IMPROVED;
  if (/차도가 없|효과가 없|변화가 없|여전/.test(tail)) return TreatmentOutcome.NO_CHANGE;
  return null;
}

function ageRange(c: BangyakCase): string | null {
  if (c.age_months != null) return `${c.age_months}개월`;
  if (c.age != null) return String(c.age);
  return null;
}

function toEntity(c: BangyakCase): Partial<ClinicalCase> {
  return {
    sourceId: c.id,
    recordedYear: PUBLISHED_YEAR,
    recorderName: c.recorder,
    patientGender:
      c.gender === 'male'
        ? Gender.MALE
        : c.gender === 'female'
          ? Gender.FEMALE
          : Gender.UNKNOWN,
    patientAgeRange: ageRange(c) as string,
    patientConstitution: mapConstitution(c.constitution) as ConstitutionType,
    chiefComplaint: c.title || '(주소증 미기재)',
    treatmentOutcome: inferOutcome(c.full_text) as TreatmentOutcome,
    originalText: c.full_text.slice(0, 16000),
    symptoms: c.symptoms.map((name) => ({ name })),
    herbalFormulas: c.formula_name
      ? [
          {
            formulaName: c.formula_name,
            herbs: [] as Array<{ name: string; amount: string }>,
          },
        ]
      : [],
  };
}

async function main() {
  const dataPath = path.resolve(
    __dirname,
    '../../../../ai-engine/data/bangyak_cases.json',
  );
  if (!fs.existsSync(dataPath)) {
    throw new Error(
      `파일 없음: ${dataPath}\n먼저 실행: python scripts/extract-bangyak-cases.py ${dataPath}`,
    );
  }
  const cases: BangyakCase[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`방약합편 추출 사례 ${cases.length}건`);

  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();
  const repo = dataSource.getRepository(ClinicalCase);

  // 기존 원문을 한 덩어리로 이어 붙여 놓고 부분문자열로 찾는다.
  // 6,454행 약 13MB 라 메모리에 올라간다. 행마다 LIKE 를 던지면 3,300번의
  // 순차 스캔이 되어 훨씬 느리다.
  console.log('기존 원문 적재 중…');
  const existing = await repo
    .createQueryBuilder('c')
    .select(['c.id', 'c.originalText'])
    .getMany();
  const haystack = existing
    .map((e) => normalize(e.originalText || ''))
    .join(' ');
  console.log(
    `  기존 ${existing.length}건 / 지문 ${(haystack.length / 1e6).toFixed(1)}MB`,
  );

  const fresh: Partial<ClinicalCase>[] = [];
  let dupContent = 0;
  let tooShort = 0;

  for (const c of cases) {
    const norm = normalize(c.full_text);
    if (norm.length < 150) {
      tooShort++;
      continue;
    }
    // 본문 중간에서 세 군데를 뽑아 하나라도 걸리면 같은 사례로 본다.
    // 앞머리는 처방명·인적사항이라 다른 사례끼리도 닮는다. 중간이 안전하다.
    const probes = [0.35, 0.5, 0.65].map((r) =>
      norm.slice(
        Math.floor(norm.length * r),
        Math.floor(norm.length * r) + 24,
      ),
    );
    if (probes.some((p) => p.length >= 20 && haystack.includes(p))) {
      dupContent++;
      continue;
    }
    fresh.push(toEntity(c));
  }

  console.log(
    `신규 ${fresh.length}건 / 내용중복 ${dupContent}건 / 너무짧음 ${tooShort}건`,
  );

  if (DRY_RUN) {
    console.log('--dry-run: 적재하지 않음');
    await dataSource.destroy();
    return;
  }

  const BATCH = 300;
  let upserted = 0;
  for (let i = 0; i < fresh.length; i += BATCH) {
    const batch = fresh.slice(i, i + BATCH);
    await repo.upsert(batch as any, {
      conflictPaths: ['sourceId'],
      skipUpdateIfNoValuesChanged: true,
    });
    upserted += batch.length;
    console.log(`  적재 ${upserted}/${fresh.length}`);
  }
  console.log(`완료 — ${upserted}건`);

  const total = await repo.count();
  console.log(`clinical_cases 총계 ${total}건`);
  await dataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
