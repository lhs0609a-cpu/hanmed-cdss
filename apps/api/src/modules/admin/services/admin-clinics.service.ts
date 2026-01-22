import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Clinic } from '../../../database/entities/clinic.entity';
import {
  GetClinicsQueryDto,
  UpdateClinicDto,
  AdminClinicResponse,
  PaginatedClinicsResponse,
  ClinicVerificationStatus,
} from '../dto/admin-clinic.dto';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class AdminClinicsService {
  constructor(
    @InjectRepository(Clinic)
    private clinicRepository: Repository<Clinic>,
    private auditLogService: AuditLogService,
  ) {}

  async findAll(query: GetClinicsQueryDto): Promise<PaginatedClinicsResponse> {
    const {
      search,
      verificationStatus,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.clinicRepository
      .createQueryBuilder('clinic')
      .leftJoinAndSelect('clinic.owner', 'owner');

    // 검색 필터
    if (search) {
      queryBuilder.andWhere(
        '(clinic.name ILIKE :search OR clinic.addressRoad ILIKE :search OR clinic.businessNumber ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // 인증 상태 필터
    if (verificationStatus) {
      switch (verificationStatus) {
        case ClinicVerificationStatus.VERIFIED:
          queryBuilder.andWhere('clinic.isHanmedVerified = :verified', { verified: true });
          break;
        case ClinicVerificationStatus.PENDING:
          queryBuilder.andWhere('clinic.isHanmedVerified = :verified AND clinic.ownerId IS NOT NULL', { verified: false });
          break;
        case ClinicVerificationStatus.REJECTED:
          // rejected status is tracked separately in practice, for now treat as not verified
          queryBuilder.andWhere('clinic.isHanmedVerified = :verified', { verified: false });
          break;
      }
    }

    // 정렬
    const validSortFields = ['createdAt', 'updatedAt', 'name', 'ratingAverage', 'reviewCount'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`clinic.${sortField}`, sortOrder);

    // 페이지네이션
    const total = await queryBuilder.getCount();
    const clinics = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      clinics: clinics.map(this.mapToResponse),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<AdminClinicResponse> {
    const clinic = await this.clinicRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!clinic) {
      throw new NotFoundException('한의원을 찾을 수 없습니다.');
    }

    return this.mapToResponse(clinic);
  }

  async update(
    id: string,
    dto: UpdateClinicDto,
    adminId: string,
  ): Promise<AdminClinicResponse> {
    const clinic = await this.clinicRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!clinic) {
      throw new NotFoundException('한의원을 찾을 수 없습니다.');
    }

    const oldValue = { ...clinic };
    Object.assign(clinic, dto);
    const updated = await this.clinicRepository.save(clinic);

    await this.auditLogService.log({
      adminId,
      action: 'CLINIC_UPDATE',
      targetType: 'clinic',
      targetId: id,
      oldValue: this.getChangedFields(oldValue, dto),
      newValue: dto,
    });

    return this.mapToResponse(updated);
  }

  async verify(id: string, adminId: string, notes?: string): Promise<AdminClinicResponse> {
    const clinic = await this.clinicRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!clinic) {
      throw new NotFoundException('한의원을 찾을 수 없습니다.');
    }

    const oldValue = { isHanmedVerified: clinic.isHanmedVerified };
    clinic.isHanmedVerified = true;
    const updated = await this.clinicRepository.save(clinic);

    await this.auditLogService.log({
      adminId,
      action: 'CLINIC_VERIFY',
      targetType: 'clinic',
      targetId: id,
      oldValue,
      newValue: { isHanmedVerified: true, notes },
    });

    return this.mapToResponse(updated);
  }

  async reject(id: string, adminId: string, reason: string): Promise<AdminClinicResponse> {
    const clinic = await this.clinicRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!clinic) {
      throw new NotFoundException('한의원을 찾을 수 없습니다.');
    }

    const oldValue = { isHanmedVerified: clinic.isHanmedVerified };
    clinic.isHanmedVerified = false;
    const updated = await this.clinicRepository.save(clinic);

    await this.auditLogService.log({
      adminId,
      action: 'CLINIC_REJECT',
      targetType: 'clinic',
      targetId: id,
      oldValue,
      newValue: { isHanmedVerified: false, reason },
    });

    return this.mapToResponse(updated);
  }

  private mapToResponse(clinic: Clinic): AdminClinicResponse {
    return {
      id: clinic.id,
      name: clinic.name,
      businessNumber: clinic.businessNumber,
      licenseNumber: clinic.licenseNumber,
      phone: clinic.phone,
      email: clinic.email,
      addressRoad: clinic.addressRoad,
      addressDetail: clinic.addressDetail,
      isHanmedVerified: clinic.isHanmedVerified,
      subscriptionTier: clinic.subscriptionTier,
      ratingAverage: Number(clinic.ratingAverage) || 0,
      reviewCount: clinic.reviewCount || 0,
      reservationEnabled: clinic.reservationEnabled,
      createdAt: clinic.createdAt,
      updatedAt: clinic.updatedAt,
      owner: clinic.owner
        ? {
            id: clinic.owner.id,
            name: clinic.owner.name,
            email: clinic.owner.email,
          }
        : null,
    };
  }

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
