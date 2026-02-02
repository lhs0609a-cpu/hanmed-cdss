import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import {
  InsuranceClaim,
  ClaimStatus,
  InsuranceType,
  DiagnosisCode,
  TreatmentItem,
  DiagnosisCodeMaster,
} from '../../database/entities/insurance-claim.entity';
import { PatientRecord } from '../../database/entities/patient-record.entity';
import { PatientAccount } from '../../database/entities/patient-account.entity';

export interface ClaimSummary {
  totalClaims: number;
  totalAmount: number;
  byStatus: Record<ClaimStatus, { count: number; amount: number }>;
  pendingAmount: number;
  approvedAmount: number;
  rejectedAmount: number;
}

@Injectable()
export class InsuranceService {
  constructor(
    @InjectRepository(InsuranceClaim)
    private claimRepository: Repository<InsuranceClaim>,
    @InjectRepository(DiagnosisCodeMaster)
    private diagnosisCodeRepository: Repository<DiagnosisCodeMaster>,
    @InjectRepository(PatientRecord)
    private patientRecordRepository: Repository<PatientRecord>,
    @InjectRepository(PatientAccount)
    private patientRepository: Repository<PatientAccount>,
  ) {}

  /**
   * 청구서 자동 생성 (진료 기록 기반)
   */
  async createClaimFromRecord(
    practitionerId: string,
    clinicId: string,
    recordId: string,
    insuranceType: InsuranceType = InsuranceType.NATIONAL_HEALTH,
  ): Promise<InsuranceClaim> {
    // 진료 기록 조회
    const record = await this.patientRecordRepository.findOne({
      where: { id: recordId },
      relations: ['patient', 'prescription'],
    });

    if (!record) {
      throw new NotFoundException('진료 기록을 찾을 수 없습니다.');
    }

    // 기존 청구서 확인
    const existingClaim = await this.claimRepository.findOne({
      where: { recordId },
    });

    if (existingClaim) {
      return existingClaim;
    }

    // 상병코드 자동 매칭
    const diagnosisCodes = await this.autoMatchDiagnosisCodes(record);

    // 시술 항목 자동 생성
    const treatmentItems = this.generateTreatmentItems(record);

    // 금액 계산
    const totalAmount = treatmentItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const patientCopay = Math.round(totalAmount * 0.3); // 30% 본인부담 (예시)
    const insuranceAmount = totalAmount - patientCopay;

    // 청구 번호 생성
    const claimNumber = await this.generateClaimNumber(clinicId);

    // AI 분석
    const aiAnalysis = this.analyzeClaimRisk(diagnosisCodes, treatmentItems);

    const claim = this.claimRepository.create({
      claimNumber,
      practitionerId,
      patientId: record.patientId,
      clinicId,
      recordId,
      insuranceType,
      status: ClaimStatus.DRAFT,
      treatmentDate: record.visitDate,
      diagnosisCodes,
      treatmentItems,
      totalAmount,
      patientCopay,
      insuranceAmount,
      aiAnalysis,
    });

    return this.claimRepository.save(claim);
  }

  /**
   * 청구서 수동 생성
   */
  async createClaim(
    practitionerId: string,
    clinicId: string,
    data: {
      patientId: string;
      recordId?: string;
      insuranceType?: InsuranceType;
      treatmentDate: Date;
      diagnosisCodes?: DiagnosisCode[];
      treatmentItems?: TreatmentItem[];
    },
  ): Promise<InsuranceClaim> {
    const claimNumber = await this.generateClaimNumber(clinicId);

    const treatmentItems = data.treatmentItems || [];
    const totalAmount = treatmentItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const patientCopay = Math.round(totalAmount * 0.3);
    const insuranceAmount = totalAmount - patientCopay;

    const claim = this.claimRepository.create({
      claimNumber,
      practitionerId,
      patientId: data.patientId,
      clinicId,
      recordId: data.recordId,
      insuranceType: data.insuranceType || InsuranceType.NATIONAL_HEALTH,
      status: ClaimStatus.DRAFT,
      treatmentDate: data.treatmentDate,
      diagnosisCodes: data.diagnosisCodes || [],
      treatmentItems,
      totalAmount,
      patientCopay,
      insuranceAmount,
    });

    return this.claimRepository.save(claim);
  }

  /**
   * 청구서 조회
   */
  async getClaim(claimId: string): Promise<InsuranceClaim> {
    const claim = await this.claimRepository.findOne({
      where: { id: claimId },
      relations: ['patient', 'record'],
    });

    if (!claim) {
      throw new NotFoundException('청구서를 찾을 수 없습니다.');
    }

    return claim;
  }

  /**
   * 청구서 목록 조회
   */
  async getClaims(
    practitionerId: string,
    clinicId: string,
    options: {
      status?: ClaimStatus;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    },
  ): Promise<{ claims: InsuranceClaim[]; total: number; page: number; limit: number }> {
    const { status, startDate, endDate, page = 1, limit = 20 } = options;

    const queryBuilder = this.claimRepository.createQueryBuilder('claim')
      .where('claim.clinicId = :clinicId', { clinicId })
      .leftJoinAndSelect('claim.patient', 'patient');

    if (status) {
      queryBuilder.andWhere('claim.status = :status', { status });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('claim.treatmentDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const [claims, total] = await queryBuilder
      .orderBy('claim.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { claims, total, page, limit };
  }

  /**
   * 청구서 업데이트
   */
  async updateClaim(
    claimId: string,
    data: {
      diagnosisCodes?: DiagnosisCode[];
      treatmentItems?: TreatmentItem[];
      notes?: string;
    },
  ): Promise<InsuranceClaim> {
    const claim = await this.getClaim(claimId);

    if (claim.status !== ClaimStatus.DRAFT) {
      throw new BadRequestException('제출된 청구서는 수정할 수 없습니다.');
    }

    if (data.diagnosisCodes) {
      claim.diagnosisCodes = data.diagnosisCodes;
    }

    if (data.treatmentItems) {
      claim.treatmentItems = data.treatmentItems;
      claim.totalAmount = data.treatmentItems.reduce((sum, item) => sum + item.totalPrice, 0);
      claim.patientCopay = Math.round(claim.totalAmount * 0.3);
      claim.insuranceAmount = claim.totalAmount - claim.patientCopay;
    }

    if (data.notes !== undefined) {
      claim.notes = data.notes;
    }

    // AI 재분석
    claim.aiAnalysis = this.analyzeClaimRisk(claim.diagnosisCodes, claim.treatmentItems);

    return this.claimRepository.save(claim);
  }

  /**
   * 청구서 제출
   */
  async submitClaims(claimIds: string[], submittedBy: string): Promise<InsuranceClaim[]> {
    const claims = await this.claimRepository.find({
      where: { id: In(claimIds), status: ClaimStatus.DRAFT },
    });

    if (claims.length !== claimIds.length) {
      throw new BadRequestException('일부 청구서가 없거나 이미 제출되었습니다.');
    }

    const now = new Date();
    for (const claim of claims) {
      claim.status = ClaimStatus.SUBMITTED;
      claim.claimDate = now;
      claim.submittedAt = now;
      claim.submittedBy = submittedBy;
    }

    return this.claimRepository.save(claims);
  }

  /**
   * 심사 결과 기록
   */
  async recordReviewResult(
    claimId: string,
    result: {
      status: 'approved' | 'rejected' | 'partial';
      approvedAmount: number;
      rejectionReason?: string;
    },
  ): Promise<InsuranceClaim> {
    const claim = await this.getClaim(claimId);

    if (claim.status !== ClaimStatus.SUBMITTED && claim.status !== ClaimStatus.UNDER_REVIEW) {
      throw new BadRequestException('심사 결과를 기록할 수 없는 상태입니다.');
    }

    claim.reviewResult = {
      reviewedAt: new Date(),
      status: result.status,
      approvedAmount: result.approvedAmount,
      rejectedAmount: claim.insuranceAmount - result.approvedAmount,
      rejectionReason: result.rejectionReason,
    };

    claim.status = result.status === 'approved'
      ? ClaimStatus.APPROVED
      : result.status === 'rejected'
        ? ClaimStatus.REJECTED
        : ClaimStatus.PARTIAL;

    return this.claimRepository.save(claim);
  }

  /**
   * 상병코드 자동 매칭
   */
  async autoMatchDiagnosisCodes(record: PatientRecord): Promise<DiagnosisCode[]> {
    const codes: DiagnosisCode[] = [];

    // 증상 기반 매칭
    const symptoms = record.symptomsSummary || [];
    for (const symptom of symptoms) {
      const matchedCodes = await this.diagnosisCodeRepository.find({
        where: { isActive: true },
        take: 3,
      });

      // 키워드 매칭 시뮬레이션 (실제로는 더 정교한 매칭 필요)
      for (const code of matchedCodes) {
        if (code.keywords?.some(k => symptom.name.includes(k))) {
          codes.push({
            code: code.code,
            name: code.nameKo,
            isPrimary: codes.length === 0,
            confidence: 0.85,
          });
          break;
        }
      }
    }

    // 기본 한방 코드 추가 (예시)
    if (codes.length === 0) {
      codes.push({
        code: 'U50.9',
        name: '상세불명의 한방병증',
        isPrimary: true,
        confidence: 0.5,
      });
    }

    return codes;
  }

  /**
   * 시술 항목 자동 생성
   */
  private generateTreatmentItems(record: PatientRecord): TreatmentItem[] {
    const items: TreatmentItem[] = [];

    // 기본 진찰료
    items.push({
      code: 'AA100',
      name: '한방 외래 초진료',
      quantity: 1,
      unitPrice: 13800,
      totalPrice: 13800,
      category: '진찰',
    });

    // 처방이 있으면 약제비 추가
    if (record.prescription) {
      items.push({
        code: 'BB100',
        name: '한약 조제료',
        quantity: 1,
        unitPrice: 5000,
        totalPrice: 5000,
        category: '약',
      });
    }

    return items;
  }

  /**
   * 청구 위험도 분석
   */
  private analyzeClaimRisk(
    diagnosisCodes: DiagnosisCode[],
    treatmentItems: TreatmentItem[],
  ): InsuranceClaim['aiAnalysis'] {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    const missingItems: string[] = [];
    let riskScore = 0;

    // 상병코드 검증
    if (diagnosisCodes.length === 0) {
      warnings.push('상병코드가 없습니다.');
      riskScore += 30;
      missingItems.push('상병코드');
    }

    const hasPrimary = diagnosisCodes.some(c => c.isPrimary);
    if (!hasPrimary && diagnosisCodes.length > 0) {
      warnings.push('주상병이 지정되지 않았습니다.');
      riskScore += 10;
    }

    // 시술 항목 검증
    if (treatmentItems.length === 0) {
      warnings.push('시술 항목이 없습니다.');
      riskScore += 30;
      missingItems.push('시술 항목');
    }

    // 금액 검증
    const totalAmount = treatmentItems.reduce((sum, item) => sum + item.totalPrice, 0);
    if (totalAmount > 500000) {
      warnings.push('청구 금액이 높아 심사 대상이 될 수 있습니다.');
      riskScore += 20;
    }

    // 제안 생성
    if (diagnosisCodes.some(c => (c.confidence || 0) < 0.7)) {
      suggestions.push('AI 매칭 신뢰도가 낮은 상병코드를 확인하세요.');
    }

    return {
      suggestedCodes: diagnosisCodes,
      riskScore: Math.min(100, riskScore),
      warnings,
      suggestions,
      missingItems,
    };
  }

  /**
   * 청구 번호 생성
   */
  private async generateClaimNumber(clinicId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const count = await this.claimRepository.count({
      where: {
        clinicId,
        createdAt: Between(
          new Date(today.setHours(0, 0, 0, 0)),
          new Date(today.setHours(23, 59, 59, 999)),
        ),
      },
    });

    return `CLM-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * 청구 통계
   */
  async getClaimSummary(
    clinicId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ClaimSummary> {
    const claims = await this.claimRepository.find({
      where: {
        clinicId,
        treatmentDate: Between(startDate, endDate),
      },
    });

    const byStatus: Record<ClaimStatus, { count: number; amount: number }> = {
      [ClaimStatus.DRAFT]: { count: 0, amount: 0 },
      [ClaimStatus.PENDING]: { count: 0, amount: 0 },
      [ClaimStatus.SUBMITTED]: { count: 0, amount: 0 },
      [ClaimStatus.UNDER_REVIEW]: { count: 0, amount: 0 },
      [ClaimStatus.APPROVED]: { count: 0, amount: 0 },
      [ClaimStatus.REJECTED]: { count: 0, amount: 0 },
      [ClaimStatus.PARTIAL]: { count: 0, amount: 0 },
      [ClaimStatus.PAID]: { count: 0, amount: 0 },
    };

    let totalAmount = 0;
    let pendingAmount = 0;
    let approvedAmount = 0;
    let rejectedAmount = 0;

    claims.forEach(claim => {
      byStatus[claim.status].count++;
      byStatus[claim.status].amount += Number(claim.insuranceAmount);
      totalAmount += Number(claim.insuranceAmount);

      if ([ClaimStatus.SUBMITTED, ClaimStatus.UNDER_REVIEW].includes(claim.status)) {
        pendingAmount += Number(claim.insuranceAmount);
      }
      if ([ClaimStatus.APPROVED, ClaimStatus.PAID].includes(claim.status)) {
        approvedAmount += Number(claim.reviewResult?.approvedAmount || claim.insuranceAmount);
      }
      if (claim.status === ClaimStatus.REJECTED) {
        rejectedAmount += Number(claim.insuranceAmount);
      }
    });

    return {
      totalClaims: claims.length,
      totalAmount,
      byStatus,
      pendingAmount,
      approvedAmount,
      rejectedAmount,
    };
  }

  /**
   * 누락 청구 감지
   */
  async detectMissingClaims(
    clinicId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<PatientRecord[]> {
    // 해당 기간의 진료 기록 중 청구서가 없는 것들
    const records = await this.patientRecordRepository.find({
      where: {
        clinicId,
        visitDate: Between(startDate, endDate),
      },
    });

    const claimedRecordIds = (await this.claimRepository.find({
      where: { clinicId },
      select: ['recordId'],
    })).map(c => c.recordId);

    return records.filter(r => !claimedRecordIds.includes(r.id));
  }
}
