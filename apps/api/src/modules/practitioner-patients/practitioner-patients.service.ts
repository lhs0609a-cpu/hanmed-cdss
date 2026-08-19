import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, FindOptionsWhere } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  PractitionerPatient,
} from '../../database/entities/practitioner-patient.entity';
import {
  PractitionerVisit,
  VisitHerb,
  VisitSymptom,
} from '../../database/entities/practitioner-visit.entity';
import { EncryptionService } from '../../common/services/encryption.service';

export interface PatientDto {
  id: string;
  name: string;
  phone: string | null;
  birthDate: string | null;
  gender: 'M' | 'F' | null;
  constitution: string | null;
  mainComplaint: string | null;
  memo: string | null;
  status: 'active' | 'inactive';
  lastVisitAt: string | null;
  totalVisits: number;
  createdAt: string;
}

export interface VisitDto {
  id: string;
  patientId: string | null;
  visitedAt: string;
  chiefComplaint: string | null;
  symptoms: VisitSymptom[];
  diagnosis: string | null;
  formulaName: string | null;
  herbs: VisitHerb[];
  aiConfidence: number | null;
  aiDegraded: boolean;
  painScore: number | null;
  pulseNote: string | null;
  notes: string | null;
  cheopyakDisease: string | null;
  cheopyakDays: number | null;
  outcome: string | null;
  outcomeNotes: string | null;
  outcomeRecordedAt: string | null;
  followUpAt: string | null;
}

export interface UpsertPatientInput {
  name: string;
  phone?: string | null;
  birthDate?: string | null;
  gender?: 'M' | 'F' | null;
  constitution?: string | null;
  mainComplaint?: string | null;
  memo?: string | null;
  status?: 'active' | 'inactive';
}

export interface CreateVisitInput {
  patientId?: string | null;
  visitedAt?: string;
  chiefComplaint?: string | null;
  symptoms?: VisitSymptom[];
  diagnosis?: string | null;
  formulaName?: string | null;
  herbs?: VisitHerb[];
  aiConfidence?: number | null;
  aiDegraded?: boolean;
  painScore?: number | null;
  pulseNote?: string | null;
  notes?: string | null;
  cheopyakDisease?: string | null;
  cheopyakDays?: number | null;
  followUpAt?: string | null;
}

/**
 * 첩약 건강보험 2단계 시범사업 한도.
 * 환자 1인당 연간 2개 질환, 질환당 20일분. (보건복지부 2단계 시범사업 기준)
 */
export const CHEOPYAK_DISEASES_PER_YEAR = 2;
export const CHEOPYAK_DAYS_PER_DISEASE = 20;

export interface CheopyakQuotaDto {
  year: number;
  diseases: Array<{
    disease: string;
    daysUsed: number;
    daysRemaining: number;
    lastPrescribedAt: string | null;
  }>;
  diseaseSlotsTotal: number;
  diseaseSlotsUsed: number;
  daysPerDisease: number;
}

/** 경과 기록 입력 — 처방 이후 어떻게 됐는지. */
export interface RecordOutcomeInput {
  outcome: '완치' | '호전' | '무효' | '악화' | '진행중';
  outcomeNotes?: string | null;
  followUpAt?: string | null;
}

@Injectable()
export class PractitionerPatientsService {
  private readonly logger = new Logger(PractitionerPatientsService.name);

  constructor(
    @InjectRepository(PractitionerPatient)
    private readonly patients: Repository<PractitionerPatient>,
    @InjectRepository(PractitionerVisit)
    private readonly visits: Repository<PractitionerVisit>,
    private readonly encryption: EncryptionService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 이름 검색 토큰 — 정규화한 이름의 HMAC.
   * 서버 키가 없으면 토큰을 만들지 않는다(검색만 못 할 뿐 저장은 정상).
   */
  private searchToken(name: string): string | null {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key || !name) return null;
    const normalized = name.replace(/\s+/g, '').toLowerCase();
    return crypto.createHmac('sha256', key).update(normalized).digest('hex');
  }

  private toDto(p: PractitionerPatient): PatientDto {
    return {
      id: p.id,
      name: this.safeDecrypt(p.nameEncrypted) ?? '(복호화 실패)',
      phone: this.safeDecrypt(p.phoneEncrypted),
      birthDate: this.safeDecrypt(p.birthDateEncrypted),
      gender: p.gender,
      constitution: p.constitution,
      mainComplaint: p.mainComplaint,
      memo: p.memo,
      status: p.status,
      lastVisitAt: p.lastVisitAt ? p.lastVisitAt.toISOString() : null,
      totalVisits: p.totalVisits,
      createdAt: p.createdAt.toISOString(),
    };
  }

  /**
   * 복호화 실패를 던지지 않는다 — 키 교체나 과거 데이터 때문에 한 건이 깨졌다고
   * 명부 전체 조회가 500 이 되면 한의사는 진료를 못 한다. 해당 필드만 비운다.
   */
  private safeDecrypt(value: string | null): string | null {
    if (!value) return null;
    try {
      return this.encryption.decrypt(value);
    } catch (e) {
      this.logger.warn(`복호화 실패 — 필드를 비워 반환합니다: ${(e as Error).message}`);
      return null;
    }
  }

  private toVisitDto(v: PractitionerVisit): VisitDto {
    return {
      id: v.id,
      patientId: v.patientId,
      visitedAt: v.visitedAt.toISOString(),
      chiefComplaint: v.chiefComplaint,
      symptoms: v.symptoms ?? [],
      diagnosis: v.diagnosis,
      formulaName: v.formulaName,
      herbs: v.herbs ?? [],
      aiConfidence: v.aiConfidence,
      aiDegraded: v.aiDegraded,
      painScore: v.painScore,
      pulseNote: v.pulseNote,
      notes: v.notes,
      cheopyakDisease: v.cheopyakDisease,
      cheopyakDays: v.cheopyakDays,
      outcome: v.outcome,
      outcomeNotes: v.outcomeNotes,
      outcomeRecordedAt: v.outcomeRecordedAt ? v.outcomeRecordedAt.toISOString() : null,
      followUpAt: v.followUpAt ? v.followUpAt.toISOString() : null,
    };
  }

  // ── 환자 명부 ────────────────────────────────────────────────

  async listPatients(practitionerId: string): Promise<PatientDto[]> {
    const rows = await this.patients.find({
      where: { practitionerId, deletedAt: IsNull() },
      order: { lastVisitAt: 'DESC', createdAt: 'DESC' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async getPatient(practitionerId: string, id: string): Promise<PatientDto> {
    const row = await this.findOwned(practitionerId, id);
    return this.toDto(row);
  }

  /** 소유자 검증을 한 곳으로 모은다 — 여기를 지나지 않는 조회를 만들지 말 것. */
  // ── 첩약 시범사업 한도 ───────────────────────────────────────

  /**
   * 이 환자의 올해 첩약 급여 사용량.
   *
   * 2단계 시범사업 규칙: 연간 2개 질환까지, 질환당 20일분까지.
   * 넘겨 처방하면 삭감되는데 지금은 한의사가 지난 처방을 기억해서 센다.
   * 연도 경계는 진료일(visitedAt) 기준이다.
   */
  async getCheopyakQuota(
    practitionerId: string,
    patientId: string,
    year: number,
  ): Promise<CheopyakQuotaDto> {
    // 남의 환자 id 로는 조회되지 않아야 한다.
    await this.findOwned(practitionerId, patientId);

    const rows = await this.visits
      .createQueryBuilder('v')
      .select('v."cheopyakDisease"', 'disease')
      .addSelect('SUM(COALESCE(v."cheopyakDays", 0))', 'days')
      .addSelect('MAX(v."visitedAt")', 'lastAt')
      .where('v."practitionerId" = :practitionerId', { practitionerId })
      .andWhere('v."patientId" = :patientId', { patientId })
      .andWhere('v."deletedAt" IS NULL')
      .andWhere('v."cheopyakDisease" IS NOT NULL')
      .andWhere('EXTRACT(YEAR FROM v."visitedAt") = :year', { year })
      .groupBy('v."cheopyakDisease"')
      .getRawMany<{ disease: string; days: string; lastAt: Date }>();

    const diseases = rows.map((r) => ({
      disease: r.disease,
      daysUsed: Number(r.days) || 0,
      daysRemaining: Math.max(0, CHEOPYAK_DAYS_PER_DISEASE - (Number(r.days) || 0)),
      lastPrescribedAt: r.lastAt ? new Date(r.lastAt).toISOString() : null,
    }));

    return {
      year,
      diseases,
      diseaseSlotsTotal: CHEOPYAK_DISEASES_PER_YEAR,
      diseaseSlotsUsed: diseases.length,
      daysPerDisease: CHEOPYAK_DAYS_PER_DISEASE,
    };
  }

  private async findOwned(
    practitionerId: string,
    id: string,
  ): Promise<PractitionerPatient> {
    const row = await this.patients.findOne({
      where: { id, practitionerId, deletedAt: IsNull() },
    });
    // 남의 환자를 조회했을 때 403 이 아니라 404 를 준다 — 존재 여부 자체가 정보다.
    if (!row) throw new NotFoundException('환자를 찾을 수 없습니다.');
    return row;
  }

  async createPatient(
    practitionerId: string,
    input: UpsertPatientInput,
  ): Promise<PatientDto> {
    const entity = this.patients.create({
      practitionerId,
      nameEncrypted: this.encryption.encrypt(input.name),
      phoneEncrypted: input.phone ? this.encryption.encrypt(input.phone) : null,
      birthDateEncrypted: input.birthDate
        ? this.encryption.encrypt(input.birthDate)
        : null,
      nameSearchToken: this.searchToken(input.name),
      gender: input.gender ?? null,
      constitution: input.constitution ?? null,
      mainComplaint: input.mainComplaint ?? null,
      memo: input.memo ?? null,
      status: input.status ?? 'active',
      totalVisits: 0,
    });
    const saved = await this.patients.save(entity);
    return this.toDto(saved);
  }

  async updatePatient(
    practitionerId: string,
    id: string,
    input: Partial<UpsertPatientInput>,
  ): Promise<PatientDto> {
    const row = await this.findOwned(practitionerId, id);

    if (input.name !== undefined) {
      row.nameEncrypted = this.encryption.encrypt(input.name);
      row.nameSearchToken = this.searchToken(input.name);
    }
    if (input.phone !== undefined) {
      row.phoneEncrypted = input.phone ? this.encryption.encrypt(input.phone) : null;
    }
    if (input.birthDate !== undefined) {
      row.birthDateEncrypted = input.birthDate
        ? this.encryption.encrypt(input.birthDate)
        : null;
    }
    if (input.gender !== undefined) row.gender = input.gender;
    if (input.constitution !== undefined) row.constitution = input.constitution;
    if (input.mainComplaint !== undefined) row.mainComplaint = input.mainComplaint;
    if (input.memo !== undefined) row.memo = input.memo;
    if (input.status !== undefined) row.status = input.status;

    const saved = await this.patients.save(row);
    return this.toDto(saved);
  }

  async deletePatient(practitionerId: string, id: string): Promise<void> {
    const row = await this.findOwned(practitionerId, id);
    await this.patients.softRemove(row);
  }

  // ── 진료 기록 ────────────────────────────────────────────────

  async listVisits(
    practitionerId: string,
    patientId?: string,
    limit = 50,
  ): Promise<VisitDto[]> {
    const where: FindOptionsWhere<PractitionerVisit> = {
      practitionerId,
      deletedAt: IsNull(),
    };
    if (patientId) where.patientId = patientId;
    const rows = await this.visits.find({
      where,
      order: { visitedAt: 'DESC' },
      take: Math.min(200, Math.max(1, limit)),
    });
    return rows.map((r) => this.toVisitDto(r));
  }

  async createVisit(
    practitionerId: string,
    input: CreateVisitInput,
  ): Promise<VisitDto> {
    // 환자를 지정했다면 반드시 내 환자여야 한다.
    if (input.patientId) {
      await this.findOwned(practitionerId, input.patientId);
    }

    const visitedAt = input.visitedAt ? new Date(input.visitedAt) : new Date();
    const entity = this.visits.create({
      practitionerId,
      patientId: input.patientId ?? null,
      visitedAt,
      chiefComplaint: input.chiefComplaint ?? null,
      symptoms: input.symptoms ?? [],
      diagnosis: input.diagnosis ?? null,
      formulaName: input.formulaName ?? null,
      herbs: input.herbs ?? [],
      aiConfidence: input.aiConfidence ?? null,
      aiDegraded: input.aiDegraded ?? false,
      // 0 은 '통증 없음' 이라는 답이므로 살려야 한다 — ?? 를 쓴다.
      painScore: input.painScore ?? null,
      pulseNote: input.pulseNote ?? null,
      notes: input.notes ?? null,
      cheopyakDisease: input.cheopyakDisease ?? null,
      cheopyakDays: input.cheopyakDays ?? null,
      followUpAt: input.followUpAt ? new Date(input.followUpAt) : null,
    });
    const saved = await this.visits.save(entity);

    // 명부의 최근 내원일·횟수 갱신 — 목록 정렬 기준이라 여기서 같이 올린다.
    if (saved.patientId) {
      await this.patients.increment(
        { id: saved.patientId, practitionerId },
        'totalVisits',
        1,
      );
      await this.patients.update(
        { id: saved.patientId, practitionerId },
        { lastVisitAt: visitedAt },
      );
    }

    return this.toVisitDto(saved);
  }

  /**
   * 진료 경과 기록.
   *
   * 처방만 저장되고 결과가 남지 않으면 "지난달에 뭘 줬고 어떻게 됐더라" 를 알 수 없다.
   * 여기 쌓인 경과가 이 한의사 자신의 치험례가 된다.
   */
  async recordOutcome(
    practitionerId: string,
    visitId: string,
    input: RecordOutcomeInput,
  ): Promise<VisitDto> {
    const row = await this.visits.findOne({
      where: { id: visitId, practitionerId, deletedAt: IsNull() },
    });
    if (!row) throw new NotFoundException('진료 기록을 찾을 수 없습니다.');

    row.outcome = input.outcome;
    row.outcomeNotes = input.outcomeNotes ?? null;
    row.outcomeRecordedAt = new Date();
    if (input.followUpAt !== undefined) {
      row.followUpAt = input.followUpAt ? new Date(input.followUpAt) : null;
    }
    const saved = await this.visits.save(row);
    return this.toVisitDto(saved);
  }

  /**
   * 경과 확인이 필요한 진료 목록.
   *
   * 재방문일이 지났는데 경과가 없거나, 재방문일을 안 잡았어도 처방 후
   * 일정 기간이 지난 진료를 모은다. 만성질환은 재방문 관리가 곧 치료라
   * 이 목록이 매일 여는 화면에 있어야 한다.
   */
  async listPendingFollowUps(
    practitionerId: string,
    staleDays = 14,
  ): Promise<Array<VisitDto & { patientName: string | null; daysSince: number }>> {
    const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

    const rows = await this.visits
      .createQueryBuilder('v')
      .where('v."practitionerId" = :pid', { pid: practitionerId })
      .andWhere('v."deletedAt" IS NULL')
      .andWhere('v."outcomeRecordedAt" IS NULL')
      // 괄호 주의 — 전체를 감싸지 않으면 AND 가 먼저 묶여서
      //   ... AND outcomeRecordedAt IS NULL AND (A) OR (B)
      // 가 되고, B 가 practitionerId 조건까지 벗어난다(교차 테넌트 노출).
      .andWhere(
        `(
           (v."followUpAt" IS NOT NULL AND v."followUpAt" <= NOW())
           OR (v."followUpAt" IS NULL AND v."visitedAt" <= :cutoff)
         )`,
        { cutoff },
      )
      .orderBy('v."visitedAt"', 'ASC')
      .take(50)
      .getMany();

    // 환자명은 암호화돼 있어 조인으로 못 가져온다. 필요한 것만 복호화한다.
    const patientIds = Array.from(
      new Set(rows.map((r) => r.patientId).filter((v): v is string => !!v)),
    );
    const nameById = new Map<string, string>();
    for (const pid of patientIds) {
      const p = await this.patients.findOne({
        where: { id: pid, practitionerId, deletedAt: IsNull() },
      });
      if (p) nameById.set(pid, this.safeDecrypt(p.nameEncrypted) ?? '(이름 없음)');
    }

    const now = Date.now();
    return rows.map((r) => ({
      ...this.toVisitDto(r),
      patientName: r.patientId ? nameById.get(r.patientId) ?? null : null,
      daysSince: Math.floor((now - r.visitedAt.getTime()) / (24 * 60 * 60 * 1000)),
    }));
  }

  async deleteVisit(practitionerId: string, id: string): Promise<void> {
    const row = await this.visits.findOne({
      where: { id, practitionerId, deletedAt: IsNull() },
    });
    if (!row) throw new NotFoundException('진료 기록을 찾을 수 없습니다.');
    await this.visits.softRemove(row);
  }

  // ── 로컬 데이터 이관 ─────────────────────────────────────────

  /**
   * 브라우저 localStorage 에 쌓여 있던 명부/기록을 서버로 한 번에 올린다.
   * 여러 기기에서 각각 호출될 수 있으므로 이름+생년월일이 같은 환자는 건너뛴다
   * (중복 등록이 오진의 원인이 된다).
   */
  async importLocal(
    practitionerId: string,
    payload: { patients?: UpsertPatientInput[]; visits?: CreateVisitInput[] },
  ): Promise<{ importedPatients: number; importedVisits: number; skipped: number }> {
    let importedPatients = 0;
    let skipped = 0;
    const idMap = new Map<string, string>();

    for (const p of payload.patients ?? []) {
      if (!p?.name) {
        skipped++;
        continue;
      }
      const token = this.searchToken(p.name);
      const existing = token
        ? await this.patients.findOne({
            where: { practitionerId, nameSearchToken: token, deletedAt: IsNull() },
          })
        : null;

      if (existing) {
        skipped++;
        idMap.set((p as { id?: string }).id ?? p.name, existing.id);
        continue;
      }
      const created = await this.createPatient(practitionerId, p);
      idMap.set((p as { id?: string }).id ?? p.name, created.id);
      importedPatients++;
    }

    let importedVisits = 0;
    for (const v of payload.visits ?? []) {
      const mapped = v.patientId ? idMap.get(v.patientId) ?? null : null;
      try {
        await this.createVisit(practitionerId, { ...v, patientId: mapped });
        importedVisits++;
      } catch (e) {
        this.logger.warn(`진료 기록 이관 실패 1건: ${(e as Error).message}`);
        skipped++;
      }
    }

    return { importedPatients, importedVisits, skipped };
  }

  /** 내보내기 — 한의사가 자기 데이터를 언제든 가져갈 수 있어야 한다. */
  async exportAll(practitionerId: string) {
    const [patients, visits] = await Promise.all([
      this.listPatients(practitionerId),
      this.listVisits(practitionerId, undefined, 200),
    ]);
    return { exportedAt: new Date().toISOString(), patients, visits };
  }
}
