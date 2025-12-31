import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PrescriptionStatus } from '../../../database/entities';

// 처방 생성 (의료진용)
export class CreatePrescriptionDto {
  @ApiProperty({ description: '환자 ID' })
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: '진료 기록 ID' })
  @IsOptional()
  @IsString()
  recordId?: string;

  @ApiPropertyOptional({ description: '처방약 ID' })
  @IsOptional()
  @IsString()
  formulaId?: string;

  @ApiProperty({ description: '처방명' })
  @IsString()
  @IsNotEmpty()
  formulaName: string;

  @ApiPropertyOptional({ description: '처방 설명' })
  @IsOptional()
  @IsString()
  formulaDescription?: string;

  @ApiProperty({ description: '약재 상세 정보' })
  @IsArray()
  herbsDetail: Array<{
    herbId?: string;
    name: string;
    hanja?: string;
    amount: string;
    purpose: string;
    efficacy?: string;
    cautions?: string[];
  }>;

  @ApiPropertyOptional({ description: '복용 안내' })
  @IsOptional()
  @IsString()
  dosageInstructions?: string;

  @ApiPropertyOptional({ description: '복용 빈도', example: '하루 3회' })
  @IsOptional()
  @IsString()
  dosageFrequency?: string;

  @ApiPropertyOptional({ description: '복용 시간', example: '식후 30분' })
  @IsOptional()
  @IsString()
  dosageTiming?: string;

  @ApiPropertyOptional({ description: '복용 기간 (일)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  durationDays?: number;

  @ApiPropertyOptional({ description: '주의사항' })
  @IsOptional()
  @IsArray()
  precautions?: Array<{
    type: 'warning' | 'caution' | 'info';
    title: string;
    description: string;
  }>;

  @ApiPropertyOptional({ description: '시작일' })
  @IsOptional()
  @IsDateString()
  startDate?: string;
}

// 처방 수정
export class UpdatePrescriptionDto {
  @ApiPropertyOptional({ description: '복용 안내' })
  @IsOptional()
  @IsString()
  dosageInstructions?: string;

  @ApiPropertyOptional({ description: '복용 빈도' })
  @IsOptional()
  @IsString()
  dosageFrequency?: string;

  @ApiPropertyOptional({ description: '복용 시간' })
  @IsOptional()
  @IsString()
  dosageTiming?: string;

  @ApiPropertyOptional({ description: '복용 기간 (일)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  durationDays?: number;

  @ApiPropertyOptional({ description: '주의사항' })
  @IsOptional()
  @IsArray()
  precautions?: any[];

  @ApiPropertyOptional({ description: '상태', enum: PrescriptionStatus })
  @IsOptional()
  @IsEnum(PrescriptionStatus)
  status?: PrescriptionStatus;
}

// 처방 목록 조회
export class GetPrescriptionsDto {
  @ApiPropertyOptional({ description: '상태', enum: PrescriptionStatus })
  @IsOptional()
  @IsEnum(PrescriptionStatus)
  status?: PrescriptionStatus;

  @ApiPropertyOptional({ description: '활성 처방만', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activeOnly?: boolean;

  @ApiPropertyOptional({ description: '페이지', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: '페이지당 항목', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}
