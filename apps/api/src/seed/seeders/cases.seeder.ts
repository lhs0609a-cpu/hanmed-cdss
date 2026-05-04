import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import {
  ClinicalCase,
  ConstitutionType,
  Gender,
  TreatmentOutcome,
} from '../../database/entities/clinical-case.entity';

interface JsonCase {
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
  patient_name?: string;
  patient_age?: number | string | null;
  patient_gender?: string | null;
  patient_constitution?: string | null;
  patient_occupation?: string;
  patient_address?: string;
  appearance?: string;
  history?: string;
  reference?: string;
  differentiation?: string;
  treatment_principle?: string;
  prescription_plan?: string;
  medications?: string | string[];
  progress?: string;
  result?: string;
  full_text?: string;
  data_source?: string;
  created_at?: string;
  search_text?: string;
  is_real_case?: boolean;
}

const DATA_SEARCH_PATHS = [
  path.resolve(
    __dirname,
    '../../../../ai-engine/data/all_cases_combined.json',
  ),
  path.resolve(
    __dirname,
    '../../../../../ai-engine/data/all_cases_combined.json',
  ),
  path.resolve(
    process.cwd(),
    '..',
    'ai-engine',
    'data',
    'all_cases_combined.json',
  ),
];

const CONSTITUTION_MAP: Record<string, ConstitutionType> = {
  태양인: ConstitutionType.TAEYANG,
  태음인: ConstitutionType.TAEEUM,
  소양인: ConstitutionType.SOYANG,
  소음인: ConstitutionType.SOEUM,
};

@Injectable()
export class CasesSeeder {
  private readonly logger = new Logger(CasesSeeder.name);

  constructor(
    @InjectRepository(ClinicalCase)
    private casesRepo: Repository<ClinicalCase>,
  ) {}

  async run() {
    const data = this.loadJson();
    this.logger.log(`치험례 데이터 로드: ${data.length}건`);

    // 이미 있는 sourceId 일괄 조회 (idempotent)
    const incomingIds = data.map((d) => d.id).filter(Boolean);
    const existingIdSet = new Set<string>();
    const chunkSize = 1000;
    for (let i = 0; i < incomingIds.length; i += chunkSize) {
      const chunk = incomingIds.slice(i, i + chunkSize);
      const found = await this.casesRepo.find({
        where: { sourceId: In(chunk) },
        select: ['sourceId'],
      });
      for (const r of found) existingIdSet.add(r.sourceId);
    }
    this.logger.log(`이미 존재: ${existingIdSet.size}건 (skip)`);

    const newCases: ClinicalCase[] = [];
    let invalid = 0;

    for (const json of data) {
      if (!json.id || existingIdSet.has(json.id)) continue;
      const entity = this.toEntity(json);
      if (!entity) {
        invalid++;
        continue;
      }
      newCases.push(entity);
    }
    this.logger.log(`INSERT 대상: ${newCases.length}건 (정제 실패: ${invalid}건)`);

    // batch insert
    let inserted = 0;
    const batchSize = 200;
    for (let i = 0; i < newCases.length; i += batchSize) {
      const batch = newCases.slice(i, i + batchSize);
      try {
        await this.casesRepo.save(batch, { chunk: 50 });
        inserted += batch.length;
      } catch (err: any) {
        // sourceId 중복 등 — 한 건씩 재시도
        for (const c of batch) {
          try {
            await this.casesRepo.save(c);
            inserted++;
          } catch (e: any) {
            this.logger.warn(`스킵 sourceId=${c.sourceId}: ${e.message?.slice(0, 100)}`);
          }
        }
      }
      if ((i + batchSize) % 2000 === 0 || i + batchSize >= newCases.length) {
        this.logger.log(`진행: ${Math.min(i + batchSize, newCases.length)}/${newCases.length}`);
      }
    }

    this.logger.log(`✅ clinical_cases 시드 완료: insert=${inserted}`);
  }

  private loadJson(): JsonCase[] {
    for (const p of DATA_SEARCH_PATHS) {
      if (fs.existsSync(p)) {
        this.logger.log(`데이터 경로: ${p}`);
        return JSON.parse(fs.readFileSync(p, 'utf-8'));
      }
    }
    throw new Error(
      `all_cases_combined.json을 찾을 수 없습니다. 검색 경로:\n${DATA_SEARCH_PATHS.join('\n')}`,
    );
  }

  private toEntity(json: JsonCase): ClinicalCase | null {
    if (!json.id) return null;
    const chiefComplaint = (json.chief_complaint || json.title || '').trim();
    const originalText = (json.full_text || json.search_text || chiefComplaint).trim();
    if (!chiefComplaint || !originalText) return null;

    const recordedYear = this.parseYear(json.created_at);

    const symptoms = [...(json.symptoms || []), ...(json.sub_symptoms || [])]
      .filter(Boolean)
      .map((s) => ({ name: String(s).slice(0, 200) }));

    const herbalFormulas = json.formula_name
      ? [
          {
            formulaName: json.formula_name,
            herbs: this.parseMedications(json.medications),
            dosage: json.prescription_plan?.slice(0, 500) || undefined,
          },
        ]
      : [];

    return this.casesRepo.create({
      sourceId: json.id,
      recordedYear,
      recorderName: json.data_source || null,
      patientGender: this.parseGender(json.patient_gender),
      patientAgeRange: this.parseAgeRange(json.patient_age),
      patientConstitution: CONSTITUTION_MAP[json.patient_constitution || ''] || null,
      chiefComplaint: chiefComplaint.slice(0, 4000),
      presentIllness: json.history?.slice(0, 4000) || null,
      patternDiagnosis:
        json.differentiation?.slice(0, 500) || json.diagnosis?.slice(0, 500) || null,
      treatmentOutcome: this.parseOutcome(json.result),
      clinicalNotes: json.progress?.slice(0, 4000) || null,
      originalText: originalText.slice(0, 20000),
      symptoms,
      herbalFormulas,
    });
  }

  private parseYear(s?: string): number {
    if (!s) return 0;
    const m = s.match(/(19|20)\d{2}/);
    return m ? parseInt(m[0], 10) : 0;
  }

  private parseGender(s?: string | null): Gender {
    if (!s) return Gender.UNKNOWN;
    const lower = String(s).toLowerCase();
    if (lower === 'm' || lower === 'male' || lower === '남' || lower === '남성') return Gender.MALE;
    if (lower === 'f' || lower === 'female' || lower === '여' || lower === '여성')
      return Gender.FEMALE;
    return Gender.UNKNOWN;
  }

  private parseAgeRange(v: number | string | null | undefined): string | null {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : parseInt(String(v), 10);
    if (isNaN(n) || n <= 0) return String(v).slice(0, 30);
    if (n < 10) return '0-9';
    if (n < 20) return '10대';
    if (n < 30) return '20대';
    if (n < 40) return '30대';
    if (n < 50) return '40대';
    if (n < 60) return '50대';
    if (n < 70) return '60대';
    if (n < 80) return '70대';
    return '80대+';
  }

  private parseOutcome(s?: string): TreatmentOutcome {
    if (!s) return null as any;
    if (s.includes('완치') || s.includes('완전')) return TreatmentOutcome.CURED;
    if (s.includes('호전') || s.includes('개선') || s.includes('효과')) {
      return TreatmentOutcome.IMPROVED;
    }
    if (s.includes('악화')) return TreatmentOutcome.WORSENED;
    if (s.includes('변화 없') || s.includes('불변')) return TreatmentOutcome.NO_CHANGE;
    return null as any;
  }

  private parseMedications(
    raw: string | string[] | undefined,
  ): Array<{ name: string; amount: string }> {
    if (!raw) return [];
    const list = Array.isArray(raw) ? raw : [raw];
    return list
      .filter(Boolean)
      .map((s) => String(s).slice(0, 200))
      .map((s) => ({ name: s, amount: '' }));
  }
}
