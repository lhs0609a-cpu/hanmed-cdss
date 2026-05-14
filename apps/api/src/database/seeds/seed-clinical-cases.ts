/**
 * 치험례 7,096건 시드 — apps/ai-engine/data/*.json → clinical_cases 테이블.
 *
 * 데이터 출처:
 *   - extracted_cases.json (6,053건) : 방약합편 추출
 *   - real_clinical_cases.json (1,043건) : 실제 임상 케이스
 *
 * idempotent: sourceId unique 제약을 활용해 upsert(=중복 시 update). 한 번 실행 후 재실행해도 안전.
 *
 * 실행:
 *   pnpm --filter @hanmed/api seed:cases
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

// === JSON 스키마 =============================================================

interface ExtractedCase {
  id: string;
  formula_id?: string;
  formula_name?: string;
  formula_hanja?: string;
  title?: string;
  chief_complaint?: string;
  symptoms?: string[];
  diagnosis?: string;
  patient_age?: number | null;
  patient_gender?: string | null;
  patient_constitution?: string | null;
  treatment_formula?: string;
  treatment_modification?: string;
  result?: string;
  progress?: any[];
  data_source?: string;
  search_text?: string;
  symptom_keywords?: string[];
}

interface RealClinicalCase {
  id: string;
  source_file?: string;
  formula_name?: string;
  formula_hanja?: string;
  case_code?: string;
  title?: string;
  chief_complaint?: string;
  symptoms?: string[];
  sub_symptoms?: string[];
  diagnosis?: string;
  patient_age?: number | null;
  patient_gender?: string | null;
  patient_constitution?: string | null;
  appearance?: string;
  history?: string;
  reference?: string;
  differentiation?: string;
  treatment_principle?: string;
  prescription_plan?: string;
  medications?: Array<{ order?: string; content?: string }>;
  progress?: Array<{ order?: string; content?: string }>;
  result?: string;
  full_text?: string;
  data_source?: string;
  search_text?: string;
}

// === 정규화 헬퍼 =============================================================

function mapGender(raw?: string | null): Gender {
  if (!raw) return Gender.UNKNOWN;
  const v = raw.trim().toLowerCase();
  if (v === 'm' || v === 'male' || v === '남' || v === '남성') return Gender.MALE;
  if (v === 'f' || v === 'female' || v === '여' || v === '여성') return Gender.FEMALE;
  return Gender.UNKNOWN;
}

function mapConstitution(raw?: string | null): ConstitutionType | null {
  if (!raw) return null;
  const v = raw.trim();
  if (v.includes('태양')) return ConstitutionType.TAEYANG;
  if (v.includes('태음')) return ConstitutionType.TAEEUM;
  if (v.includes('소양')) return ConstitutionType.SOYANG;
  if (v.includes('소음')) return ConstitutionType.SOEUM;
  return null;
}

function mapOutcome(raw?: string): TreatmentOutcome | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;
  if (v.includes('완치') || v.includes('완전') || v.includes('소실')) return TreatmentOutcome.CURED;
  if (v.includes('호전') || v.includes('개선') || v.includes('감소') || v.includes('회복')) return TreatmentOutcome.IMPROVED;
  if (v.includes('악화')) return TreatmentOutcome.WORSENED;
  if (v.includes('불변') || v.includes('변화 없') || v.includes('무효')) return TreatmentOutcome.NO_CHANGE;
  return null;
}

function toSymptomsJson(raw?: string[] | null): ClinicalCase['symptoms'] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .map((name) => ({ name }));
}

function clamp(text: string | undefined | null, max: number): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) : text;
}

// === 매핑 =====================================================================

function mapExtracted(e: ExtractedCase): Partial<ClinicalCase> {
  const formulaName = (e.treatment_formula || e.formula_name || '').trim();
  const herbalFormulas = formulaName
    ? [{ formulaName, herbs: [] as Array<{ name: string; amount: string }> }]
    : [];

  const originalText =
    e.search_text ||
    [e.title, e.chief_complaint, (e.symptoms || []).join(', '), e.diagnosis, e.result]
      .filter(Boolean)
      .join('\n');

  return {
    sourceId: `extracted-${e.id}`,
    // 방약합편 출판 기준 — 정확한 연도는 알 수 없으므로 1885 (방약합편 초간)
    recordedYear: 1885,
    recorderName: e.data_source || '방약합편',
    patientGender: mapGender(e.patient_gender),
    patientAgeRange: e.patient_age != null ? String(e.patient_age) : null!,
    patientConstitution: mapConstitution(e.patient_constitution) as any,
    chiefComplaint: clamp(e.chief_complaint || e.title || '', 8000) || '(주소증 미기재)',
    presentIllness: clamp(e.diagnosis || '', 8000) || null!,
    patternDiagnosis: clamp(e.diagnosis || '', 200) || null!,
    treatmentOutcome: mapOutcome(e.result) as any,
    clinicalNotes: clamp(e.treatment_modification || '', 8000) || null!,
    originalText: clamp(originalText, 16000),
    symptoms: toSymptomsJson(e.symptoms),
    herbalFormulas,
  };
}

function mapReal(r: RealClinicalCase): Partial<ClinicalCase> {
  const formulaName = (r.formula_name || '').trim();
  const herbalFormulas = formulaName
    ? [{ formulaName, herbs: [] as Array<{ name: string; amount: string }> }]
    : [];

  const medicationsText = (r.medications || [])
    .map((m) => (m?.content || '').trim())
    .filter(Boolean)
    .join('\n');
  const progressText = (r.progress || [])
    .map((p) => (p?.content || '').trim())
    .filter(Boolean)
    .join('\n');

  const originalText =
    r.full_text ||
    r.search_text ||
    [r.title, r.chief_complaint, medicationsText, progressText, r.result].filter(Boolean).join('\n');

  // recordedYear: created_at 이 있으면 추출, 없으면 2020 (실제 임상 데이터 수집 시점)
  const recordedYear = 2020;

  return {
    sourceId: `real-${r.id}`,
    recordedYear,
    recorderName: r.source_file || '실제 임상 케이스',
    patientGender: mapGender(r.patient_gender),
    patientAgeRange: r.patient_age != null ? String(r.patient_age) : null!,
    patientConstitution: mapConstitution(r.patient_constitution) as any,
    chiefComplaint: clamp(r.chief_complaint || r.title || '', 8000) || '(주소증 미기재)',
    presentIllness: clamp(r.history || '', 8000) || null!,
    patternDiagnosis: clamp(r.differentiation || r.diagnosis || '', 200) || null!,
    treatmentOutcome: mapOutcome(r.result) as any,
    clinicalNotes: clamp(medicationsText, 8000) || null!,
    originalText: clamp(originalText, 16000),
    symptoms: toSymptomsJson([...(r.symptoms || []), ...(r.sub_symptoms || [])]),
    herbalFormulas,
  };
}

// === 메인 =====================================================================

async function seedClinicalCases() {
  console.log('치험례 시드 시작…');

  const dataDir = path.resolve(__dirname, '../../../../ai-engine/data');
  const extractedPath = path.join(dataDir, 'extracted_cases.json');
  const realPath = path.join(dataDir, 'real_clinical_cases.json');

  if (!fs.existsSync(extractedPath)) {
    throw new Error(`파일 없음: ${extractedPath}`);
  }
  if (!fs.existsSync(realPath)) {
    throw new Error(`파일 없음: ${realPath}`);
  }

  const extracted: ExtractedCase[] = JSON.parse(fs.readFileSync(extractedPath, 'utf-8'));
  const real: RealClinicalCase[] = JSON.parse(fs.readFileSync(realPath, 'utf-8'));
  console.log(`  extracted_cases.json: ${extracted.length}건`);
  console.log(`  real_clinical_cases.json: ${real.length}건`);
  console.log(`  합계: ${extracted.length + real.length}건`);

  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();
  console.log('DB 연결 OK');

  const repo = dataSource.getRepository(ClinicalCase);

  // 배치 크기 — 한 번에 500건씩 upsert (DB 부하 분산)
  const BATCH = 500;
  let upserted = 0;
  let failed = 0;

  async function processBatch(rows: Partial<ClinicalCase>[]) {
    // upsert(conflictPath=sourceId) — idempotent. 중복이면 update.
    try {
      await repo.upsert(rows as any, {
        conflictPaths: ['sourceId'],
        skipUpdateIfNoValuesChanged: true,
      });
      upserted += rows.length;
    } catch (err: any) {
      // 배치 실패 시 한 건씩 재시도로 어떤 row 가 문제인지 좁힘
      console.warn(`배치 upsert 실패 — 단건 모드 재시도: ${err?.message?.slice(0, 200)}`);
      for (const row of rows) {
        try {
          await repo.upsert(row as any, { conflictPaths: ['sourceId'] });
          upserted += 1;
        } catch (e: any) {
          failed += 1;
          console.warn(`  실패 sourceId=${row.sourceId}: ${e?.message?.slice(0, 160)}`);
        }
      }
    }
  }

  try {
    console.log('extracted_cases 마이그레이션 중…');
    for (let i = 0; i < extracted.length; i += BATCH) {
      const slice = extracted.slice(i, i + BATCH).map(mapExtracted);
      await processBatch(slice);
      process.stdout.write(`  ${Math.min(i + BATCH, extracted.length)}/${extracted.length}\r`);
    }
    console.log(`\n  extracted 완료`);

    console.log('real_clinical_cases 마이그레이션 중…');
    for (let i = 0; i < real.length; i += BATCH) {
      const slice = real.slice(i, i + BATCH).map(mapReal);
      await processBatch(slice);
      process.stdout.write(`  ${Math.min(i + BATCH, real.length)}/${real.length}\r`);
    }
    console.log(`\n  real 완료`);

    const total = await repo.count();
    console.log('\n=== 시드 결과 ===');
    console.log(`  upsert 성공: ${upserted}건`);
    console.log(`  실패: ${failed}건`);
    console.log(`  현재 DB clinical_cases 총: ${total}건`);
  } finally {
    await dataSource.destroy();
  }
}

seedClinicalCases().catch((err) => {
  console.error('시드 실패:', err);
  process.exit(1);
});
