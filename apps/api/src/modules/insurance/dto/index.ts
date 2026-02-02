import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  IsDateString,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClaimStatus, InsuranceType } from '../../../database/entities/insurance-claim.entity';

// 진단코드 DTO
export class DiagnosisCodeDto {
  @ApiProperty({ description: 'KCD 코드', example: 'U50.1' })
  @IsString()
  code: string;

  @ApiProperty({ description: '상병명' })
  @IsString()
  name: string;

  @ApiProperty({ description: '주상병 여부' })
  isPrimary: boolean;
}

// 시술 항목 DTO
export class TreatmentItemDto {
  @ApiProperty({ description: '수가코드' })
  @IsString()
  code: string;

  @ApiProperty({ description: '항목명' })
  @IsString()
  name: string;

  @ApiProperty({ description: '횟수' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: '단가' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ description: '카테고리' })
  @IsString()
  category: string;
}

// 청구서 생성 DTO
export class CreateClaimDto {
  @ApiProperty({ description: '환자 ID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: '진료 기록 ID' })
  @IsUUID()
  recordId: string;

  @ApiPropertyOptional({ enum: InsuranceType, default: InsuranceType.NATIONAL_HEALTH })
  @IsOptional()
  @IsEnum(InsuranceType)
  insuranceType?: InsuranceType;

  @ApiProperty({ description: '진료일' })
  @IsDateString()
  treatmentDate: string;

  @ApiPropertyOptional({ type: [DiagnosisCodeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiagnosisCodeDto)
  diagnosisCodes?: DiagnosisCodeDto[];

  @ApiPropertyOptional({ type: [TreatmentItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TreatmentItemDto)
  treatmentItems?: TreatmentItemDto[];
}

// 청구서 업데이트 DTO
export class UpdateClaimDto {
  @ApiPropertyOptional({ enum: ClaimStatus })
  @IsOptional()
  @IsEnum(ClaimStatus)
  status?: ClaimStatus;

  @ApiPropertyOptional({ type: [DiagnosisCodeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiagnosisCodeDto)
  diagnosisCodes?: DiagnosisCodeDto[];

  @ApiPropertyOptional({ type: [TreatmentItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TreatmentItemDto)
  treatmentItems?: TreatmentItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// 청구서 제출 DTO
export class SubmitClaimDto {
  @ApiProperty({ description: '청구서 ID 목록', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  claimIds: string[];
}

// 심사 결과 기록 DTO
export class RecordReviewResultDto {
  @ApiProperty({ enum: ['approved', 'rejected', 'partial'] })
  @IsEnum(['approved', 'rejected', 'partial'])
  status: 'approved' | 'rejected' | 'partial';

  @ApiProperty({ description: '승인 금액' })
  @IsNumber()
  @Min(0)
  approvedAmount: number;

  @ApiPropertyOptional({ description: '반려 사유' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

// 자동 상병코드 매칭 요청 DTO
export class AutoMatchCodesDto {
  @ApiProperty({ description: '진료 기록 ID' })
  @IsUUID()
  recordId: string;
}

// 청구서 목록 쿼리 DTO
export class ClaimListQueryDto {
  @ApiPropertyOptional({ enum: ClaimStatus })
  @IsOptional()
  @IsEnum(ClaimStatus)
  status?: ClaimStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}
