import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  PractitionerCase,
  CaseHerb,
} from '../../database/entities/practitioner-case.entity';

export interface MyCaseDto {
  id: string;
  sourceVisitId: string | null;
  patientAge: number | null;
  patientGender: 'M' | 'F' | null;
  patientConstitution: string | null;
  chiefComplaint: string;
  symptoms: string[];
  diagnosis: string | null;
  byeonjeung: string | null;
  formulaName: string;
  herbs: CaseHerb[];
  modifications: string | null;
  treatmentDuration: string | null;
  outcome: string | null;
  outcomeDetails: string | null;
  notes: string | null;
  tags: string[];
  isStarred: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertMyCaseInput {
  sourceVisitId?: string | null;
  patientAge?: number | null;
  patientGender?: 'M' | 'F' | null;
  patientConstitution?: string | null;
  chiefComplaint: string;
  symptoms?: string[];
  diagnosis?: string | null;
  byeonjeung?: string | null;
  formulaName: string;
  herbs?: CaseHerb[];
  modifications?: string | null;
  treatmentDuration?: string | null;
  outcome?: '완치' | '호전' | '무효' | '악화' | '진행중' | null;
  outcomeDetails?: string | null;
  notes?: string | null;
  tags?: string[];
  isStarred?: boolean;
}

/**
 * 한의사 본인의 치험례.
 *
 * 모든 조회·수정은 practitionerId 로 스코프한다. 남의 치험례 id 를 알아도
 * 403 이 아니라 404 로 떨어지게 두어 존재 여부 자체가 새지 않게 한다.
 */
@Injectable()
export class PractitionerCasesService {
  constructor(
    @InjectRepository(PractitionerCase)
    private readonly cases: Repository<PractitionerCase>,
  ) {}

  private toDto(c: PractitionerCase): MyCaseDto {
    return {
      id: c.id,
      sourceVisitId: c.sourceVisitId,
      patientAge: c.patientAge,
      patientGender: c.patientGender,
      patientConstitution: c.patientConstitution,
      chiefComplaint: c.chiefComplaint,
      symptoms: c.symptoms ?? [],
      diagnosis: c.diagnosis,
      byeonjeung: c.byeonjeung,
      formulaName: c.formulaName,
      herbs: c.herbs ?? [],
      modifications: c.modifications,
      treatmentDuration: c.treatmentDuration,
      outcome: c.outcome,
      outcomeDetails: c.outcomeDetails,
      notes: c.notes,
      tags: c.tags ?? [],
      isStarred: c.isStarred,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }

  private async findOwned(
    practitionerId: string,
    id: string,
  ): Promise<PractitionerCase> {
    const found = await this.cases.findOne({
      where: { id, practitionerId, deletedAt: IsNull() },
    });
    if (!found) throw new NotFoundException('치험례를 찾을 수 없습니다.');
    return found;
  }

  async list(practitionerId: string): Promise<MyCaseDto[]> {
    const rows = await this.cases.find({
      where: { practitionerId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: 500,
    });
    return rows.map((r) => this.toDto(r));
  }

  async create(
    practitionerId: string,
    input: UpsertMyCaseInput,
  ): Promise<MyCaseDto> {
    const entity = this.cases.create({
      practitionerId,
      sourceVisitId: input.sourceVisitId ?? null,
      patientAge: input.patientAge ?? null,
      patientGender: input.patientGender ?? null,
      patientConstitution: input.patientConstitution ?? null,
      chiefComplaint: input.chiefComplaint,
      symptoms: input.symptoms ?? [],
      diagnosis: input.diagnosis ?? null,
      byeonjeung: input.byeonjeung ?? null,
      formulaName: input.formulaName,
      herbs: input.herbs ?? [],
      modifications: input.modifications ?? null,
      treatmentDuration: input.treatmentDuration ?? null,
      outcome: input.outcome ?? null,
      outcomeDetails: input.outcomeDetails ?? null,
      notes: input.notes ?? null,
      tags: input.tags ?? [],
      isStarred: input.isStarred ?? false,
    });
    return this.toDto(await this.cases.save(entity));
  }

  async update(
    practitionerId: string,
    id: string,
    input: Partial<UpsertMyCaseInput>,
  ): Promise<MyCaseDto> {
    const found = await this.findOwned(practitionerId, id);
    // 온 필드만 덮는다 — undefined 를 그대로 넣으면 기존 값이 날아간다.
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        (found as unknown as Record<string, unknown>)[key] = value;
      }
    }
    return this.toDto(await this.cases.save(found));
  }

  async remove(practitionerId: string, id: string): Promise<{ deleted: true }> {
    const found = await this.findOwned(practitionerId, id);
    await this.cases.softRemove(found);
    return { deleted: true };
  }
}
