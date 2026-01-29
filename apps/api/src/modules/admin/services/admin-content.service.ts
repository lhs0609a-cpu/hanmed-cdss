import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClinicalCase } from '../../../database/entities/clinical-case.entity';
import { Formula } from '../../../database/entities/formula.entity';
import { FormulaHerb } from '../../../database/entities/formula-herb.entity';
import { Herb } from '../../../database/entities/herb.entity';
import { DrugHerbInteraction } from '../../../database/entities/drug-herb-interaction.entity';
import { AuditLogService } from './audit-log.service';
import {
  PaginationQueryDto,
  CreateCaseDto,
  UpdateCaseDto,
  CreateFormulaDto,
  UpdateFormulaDto,
  UpdateFormulaHerbsDto,
  CreateHerbDto,
  UpdateHerbDto,
  CreateInteractionDto,
  UpdateInteractionDto,
  PaginatedResponse,
} from '../dto/admin-content.dto';

@Injectable()
export class AdminContentService {
  constructor(
    @InjectRepository(ClinicalCase)
    private caseRepository: Repository<ClinicalCase>,
    @InjectRepository(Formula)
    private formulaRepository: Repository<Formula>,
    @InjectRepository(FormulaHerb)
    private formulaHerbRepository: Repository<FormulaHerb>,
    @InjectRepository(Herb)
    private herbRepository: Repository<Herb>,
    @InjectRepository(DrugHerbInteraction)
    private interactionRepository: Repository<DrugHerbInteraction>,
    private auditLogService: AuditLogService,
  ) {}

  // ============ Clinical Cases ============

  async findAllCases(query: PaginationQueryDto): Promise<PaginatedResponse<ClinicalCase>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'DESC' } = query;

    const queryBuilder = this.caseRepository.createQueryBuilder('case');

    if (search) {
      queryBuilder.andWhere(
        '(case.sourceId ILIKE :search OR case.chiefComplaint ILIKE :search OR case.patternDiagnosis ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const validSortFields = ['createdAt', 'updatedAt', 'recordedYear', 'sourceId'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`case.${sortField}`, sortOrder);

    const total = await queryBuilder.getCount();
    const items = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createCase(dto: CreateCaseDto, adminId: string): Promise<ClinicalCase> {
    const caseEntity = this.caseRepository.create(dto);
    const saved = await this.caseRepository.save(caseEntity);

    await this.auditLogService.log({
      adminId,
      action: 'CONTENT_CREATE',
      targetType: 'case',
      targetId: saved.id,
      newValue: { sourceId: dto.sourceId, chiefComplaint: dto.chiefComplaint },
    });

    return saved;
  }

  async updateCase(id: string, dto: UpdateCaseDto, adminId: string): Promise<ClinicalCase> {
    const caseEntity = await this.caseRepository.findOne({ where: { id } });
    if (!caseEntity) {
      throw new NotFoundException('치험례를 찾을 수 없습니다.');
    }

    const oldValue = { ...caseEntity };
    Object.assign(caseEntity, dto);
    const updated = await this.caseRepository.save(caseEntity);

    await this.auditLogService.log({
      adminId,
      action: 'CONTENT_UPDATE',
      targetType: 'case',
      targetId: id,
      oldValue: this.getChangedFields(oldValue, dto),
      newValue: dto,
    });

    return updated;
  }

  async deleteCase(id: string, adminId: string): Promise<void> {
    const caseEntity = await this.caseRepository.findOne({ where: { id } });
    if (!caseEntity) {
      throw new NotFoundException('치험례를 찾을 수 없습니다.');
    }

    await this.caseRepository.remove(caseEntity);

    await this.auditLogService.log({
      adminId,
      action: 'CONTENT_DELETE',
      targetType: 'case',
      targetId: id,
      oldValue: { sourceId: caseEntity.sourceId, chiefComplaint: caseEntity.chiefComplaint },
    });
  }

  // ============ Formulas ============

  async findAllFormulas(query: PaginationQueryDto): Promise<PaginatedResponse<Formula>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'DESC' } = query;

    const queryBuilder = this.formulaRepository
      .createQueryBuilder('formula')
      .leftJoinAndSelect('formula.formulaHerbs', 'formulaHerbs')
      .leftJoinAndSelect('formulaHerbs.herb', 'herb');

    if (search) {
      queryBuilder.andWhere(
        '(formula.name ILIKE :search OR formula.hanja ILIKE :search OR formula.category ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const validSortFields = ['createdAt', 'updatedAt', 'name', 'category'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`formula.${sortField}`, sortOrder);

    const total = await queryBuilder.getCount();
    const items = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createFormula(dto: CreateFormulaDto, adminId: string): Promise<Formula> {
    const formula = this.formulaRepository.create(dto);
    const saved = await this.formulaRepository.save(formula);

    await this.auditLogService.log({
      adminId,
      action: 'CONTENT_CREATE',
      targetType: 'formula',
      targetId: saved.id,
      newValue: { name: dto.name, category: dto.category },
    });

    return saved;
  }

  async updateFormula(id: string, dto: UpdateFormulaDto, adminId: string): Promise<Formula> {
    const formula = await this.formulaRepository.findOne({ where: { id } });
    if (!formula) {
      throw new NotFoundException('처방을 찾을 수 없습니다.');
    }

    const oldValue = { ...formula };
    Object.assign(formula, dto);
    const updated = await this.formulaRepository.save(formula);

    await this.auditLogService.log({
      adminId,
      action: 'CONTENT_UPDATE',
      targetType: 'formula',
      targetId: id,
      oldValue: this.getChangedFields(oldValue, dto),
      newValue: dto,
    });

    return updated;
  }

  async deleteFormula(id: string, adminId: string): Promise<void> {
    const formula = await this.formulaRepository.findOne({ where: { id } });
    if (!formula) {
      throw new NotFoundException('처방을 찾을 수 없습니다.');
    }

    await this.formulaRepository.remove(formula);

    await this.auditLogService.log({
      adminId,
      action: 'CONTENT_DELETE',
      targetType: 'formula',
      targetId: id,
      oldValue: { name: formula.name, category: formula.category },
    });
  }

  async updateFormulaHerbs(
    id: string,
    dto: UpdateFormulaHerbsDto,
    adminId: string,
  ): Promise<Formula> {
    const formula = await this.formulaRepository.findOne({
      where: { id },
      relations: ['formulaHerbs'],
    });
    if (!formula) {
      throw new NotFoundException('처방을 찾을 수 없습니다.');
    }

    // 기존 약재 조합 삭제
    await this.formulaHerbRepository.delete({ formulaId: id });

    // 새 약재 조합 추가
    const formulaHerbs = dto.herbs.map((herb) => {
      return this.formulaHerbRepository.create({
        formulaId: id,
        herbId: herb.herbId,
        amount: herb.amount,
        role: herb.role as any,
        notes: herb.notes,
      });
    });

    await this.formulaHerbRepository.save(formulaHerbs);

    await this.auditLogService.log({
      adminId,
      action: 'CONTENT_UPDATE',
      targetType: 'formula',
      targetId: id,
      newValue: { herbs: dto.herbs },
    });

    return this.formulaRepository.findOne({
      where: { id },
      relations: ['formulaHerbs', 'formulaHerbs.herb'],
    });
  }

  // ============ Herbs ============

  async findAllHerbs(query: PaginationQueryDto): Promise<PaginatedResponse<Herb>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'DESC' } = query;

    const queryBuilder = this.herbRepository.createQueryBuilder('herb');

    if (search) {
      queryBuilder.andWhere(
        '(herb.standardName ILIKE :search OR herb.hanjaName ILIKE :search OR herb.category ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const validSortFields = ['createdAt', 'updatedAt', 'standardName', 'category'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`herb.${sortField}`, sortOrder);

    const total = await queryBuilder.getCount();
    const items = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createHerb(dto: CreateHerbDto, adminId: string): Promise<Herb> {
    const herb = this.herbRepository.create(dto);
    const saved = await this.herbRepository.save(herb);

    await this.auditLogService.log({
      adminId,
      action: 'CONTENT_CREATE',
      targetType: 'herb',
      targetId: saved.id,
      newValue: { standardName: dto.standardName, category: dto.category },
    });

    return saved;
  }

  async updateHerb(id: string, dto: UpdateHerbDto, adminId: string): Promise<Herb> {
    const herb = await this.herbRepository.findOne({ where: { id } });
    if (!herb) {
      throw new NotFoundException('약재를 찾을 수 없습니다.');
    }

    const oldValue = { ...herb };
    Object.assign(herb, dto);
    const updated = await this.herbRepository.save(herb);

    await this.auditLogService.log({
      adminId,
      action: 'CONTENT_UPDATE',
      targetType: 'herb',
      targetId: id,
      oldValue: this.getChangedFields(oldValue, dto),
      newValue: dto,
    });

    return updated;
  }

  async deleteHerb(id: string, adminId: string): Promise<void> {
    const herb = await this.herbRepository.findOne({ where: { id } });
    if (!herb) {
      throw new NotFoundException('약재를 찾을 수 없습니다.');
    }

    await this.herbRepository.remove(herb);

    await this.auditLogService.log({
      adminId,
      action: 'CONTENT_DELETE',
      targetType: 'herb',
      targetId: id,
      oldValue: { standardName: herb.standardName, category: herb.category },
    });
  }

  // ============ Interactions ============

  async findAllInteractions(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<DrugHerbInteraction>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'DESC' } = query;

    const queryBuilder = this.interactionRepository
      .createQueryBuilder('interaction')
      .leftJoinAndSelect('interaction.herb', 'herb');

    if (search) {
      queryBuilder.andWhere(
        '(interaction.drugName ILIKE :search OR herb.standardName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const validSortFields = ['createdAt', 'drugName', 'severity'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`interaction.${sortField}`, sortOrder);

    const total = await queryBuilder.getCount();
    const items = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createInteraction(dto: CreateInteractionDto, adminId: string): Promise<DrugHerbInteraction> {
    const interaction = this.interactionRepository.create(dto);
    const saved = await this.interactionRepository.save(interaction);

    await this.auditLogService.log({
      adminId,
      action: 'CONTENT_CREATE',
      targetType: 'interaction',
      targetId: saved.id,
      newValue: { drugName: dto.drugName, herbId: dto.herbId, severity: dto.severity },
    });

    return this.interactionRepository.findOne({
      where: { id: saved.id },
      relations: ['herb'],
    });
  }

  async updateInteraction(
    id: string,
    dto: UpdateInteractionDto,
    adminId: string,
  ): Promise<DrugHerbInteraction> {
    const interaction = await this.interactionRepository.findOne({ where: { id } });
    if (!interaction) {
      throw new NotFoundException('상호작용 정보를 찾을 수 없습니다.');
    }

    const oldValue = { ...interaction };
    Object.assign(interaction, dto);
    const updated = await this.interactionRepository.save(interaction);

    await this.auditLogService.log({
      adminId,
      action: 'CONTENT_UPDATE',
      targetType: 'interaction',
      targetId: id,
      oldValue: this.getChangedFields(oldValue, dto),
      newValue: dto,
    });

    return this.interactionRepository.findOne({
      where: { id: updated.id },
      relations: ['herb'],
    });
  }

  async deleteInteraction(id: string, adminId: string): Promise<void> {
    const interaction = await this.interactionRepository.findOne({ where: { id } });
    if (!interaction) {
      throw new NotFoundException('상호작용 정보를 찾을 수 없습니다.');
    }

    await this.interactionRepository.remove(interaction);

    await this.auditLogService.log({
      adminId,
      action: 'CONTENT_DELETE',
      targetType: 'interaction',
      targetId: id,
      oldValue: { drugName: interaction.drugName, severity: interaction.severity },
    });
  }

  // ============ Utility ============

  private getChangedFields(oldValue: any, newValue: any): Record<string, any> {
    const changed: Record<string, any> = {};
    for (const key of Object.keys(newValue)) {
      if (newValue[key] !== undefined && oldValue[key] !== newValue[key]) {
        changed[key] = oldValue[key];
      }
    }
    return changed;
  }
}
