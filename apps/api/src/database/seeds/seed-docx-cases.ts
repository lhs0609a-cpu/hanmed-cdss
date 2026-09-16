/**
 * 치험례 워드 문서(태 시리즈·고령자채록·사상·감기·빈용) -> clinical_cases.
 *
 * 기존 적재는 이 문서들에서 785건만 뽑았다. 파일군마다 서식이 달라
 * 파서가 대부분을 놓쳤기 때문이다 — 태11장(464KB)에서 12건, 태18장(520KB)에서
 * 17건 같은 식이었다. scripts/extract-docx-cases.py 가 인적사항 줄을 기준으로
 * 다시 자르면 1,777건이 나온다.
 *
 * 실행:
 *   python scripts/extract-docx-cases.py apps/ai-engine/data/docx_cases.json
 *   npx ts-node -r tsconfig-paths/register src/database/seeds/seed-docx-cases.ts
 *   ... --dry-run
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
import { CaseDeduper } from './case-dedupe';

const DRY_RUN = process.argv.includes('--dry-run');

interface DocxCase {
  id: string;
  source_file: string;
  formula_name: string | null;
  title: string | null;
  gender: 'male' | 'female' | null;
  age: number | null;
  age_months: number | null;
  constitution: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  symptoms: string[];
  full_text: string;
}

/**
 * 파일명에서 기록 연도를 읽는다.
 *
 * "220603 고령자채록 수정본" 은 2022년, "감기의 한약치료(하권-2002년 6월 20일)"
 * 은 2002년이다. 파일명이 말해 주지 않으면 문서를 넘겨받은 해로 둔다 —
 * 진료 연도를 추측해서 채우면 연도 필터가 거짓말을 한다.
 */
const RECEIVED_YEAR = 2025;

function recordedYear(sourceFile: string): number {
  const explicit = sourceFile.match(/(19|20)\d{2}년/);
  if (explicit) return Number(explicit[0].slice(0, 4));
  const compact = sourceFile.match(/^(\d{2})(\d{2})(\d{2})\s/);
  if (compact) return 2000 + Number(compact[1]);
  const paren = sourceFile.match(/\((\d{2})(\d{2})(\d{2})\)/);
  if (paren) return 2000 + Number(paren[1]);
  return RECEIVED_YEAR;
}

/**
 * 채록 문서는 채록 대상이 기록자다. 파일명에 이름이 적혀 있다.
 * 나머지는 저자(이종대) 자료다.
 */
function recorderName(sourceFile: string): string {
  if (sourceFile.includes('한장훈')) return '한장훈';
  if (sourceFile.includes('최경구')) return '최경구';
  return '이종대';
}

function mapConstitution(raw: string | null): ConstitutionType | null {
  if (!raw) return null;
  const tokens = raw.match(/(태양|태음|소양|소음)/g);
  if (!tokens?.length) return null;
  return {
    태양: ConstitutionType.TAEYANG,
    태음: ConstitutionType.TAEEUM,
    소양: ConstitutionType.SOYANG,
    소음: ConstitutionType.SOEUM,
  }[tokens[tokens.length - 1]] as ConstitutionType;
}

function inferOutcome(text: string): TreatmentOutcome | null {
  const tail = text.slice(-600);
  if (/악화|더 심해|심해졌/.test(tail)) return TreatmentOutcome.WORSENED;
  if (/완치|모두 소실|전혀 없|완전히 나|다 나았/.test(tail))
    return TreatmentOutcome.CURED;
  if (/호전|경감|줄어들|좋아졌|소실|개선|나아졌/.test(tail))
    return TreatmentOutcome.IMPROVED;
  if (/차도가 없|효과가 없|변화가 없|여전/.test(tail))
    return TreatmentOutcome.NO_CHANGE;
  return null;
}

function ageRange(c: DocxCase): string | null {
  if (c.age_months != null) return `${c.age_months}개월`;
  if (c.age) return String(c.age);
  return null;
}

function toEntity(c: DocxCase): Partial<ClinicalCase> {
  const title = (c.title || '').split('\n')[0].slice(0, 300);
  return {
    sourceId: c.id,
    recordedYear: recordedYear(c.source_file),
    recorderName: recorderName(c.source_file),
    patientGender:
      c.gender === 'male'
        ? Gender.MALE
        : c.gender === 'female'
          ? Gender.FEMALE
          : Gender.UNKNOWN,
    patientAgeRange: ageRange(c) as string,
    patientConstitution: mapConstitution(c.constitution) as ConstitutionType,
    chiefComplaint: title || c.symptoms[0] || '(주소증 미기재)',
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
    '../../../../ai-engine/data/docx_cases.json',
  );
  if (!fs.existsSync(dataPath)) {
    throw new Error(
      `파일 없음: ${dataPath}\n먼저 실행: python scripts/extract-docx-cases.py ${dataPath}`,
    );
  }
  const cases: DocxCase[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`워드 문서 추출 사례 ${cases.length}건`);

  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();
  const repo = dataSource.getRepository(ClinicalCase);
  const deduper = await CaseDeduper.load(repo);

  const fresh: Partial<ClinicalCase>[] = [];
  let dup = 0;
  for (const c of cases) {
    if (deduper.isDuplicate(c.full_text)) {
      dup++;
      continue;
    }
    deduper.add(c.full_text);
    fresh.push(toEntity(c));
  }
  console.log(`신규 ${fresh.length}건 / 내용중복 ${dup}건`);

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
  console.log(`완료 — ${upserted}건 / clinical_cases 총계 ${await repo.count()}건`);
  await dataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
