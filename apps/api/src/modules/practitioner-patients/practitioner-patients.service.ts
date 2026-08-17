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
  notes: string | null;
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
  notes?: string | null;
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
      notes: v.notes,
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
      notes: input.notes ?? null,
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
