import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { VisitType } from '../../../database/entities';

// 진료 기록 생성 (의료진용)
export class CreatePatientRecordDto {
  @ApiProperty({ description: '환자 ID' })
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: '원본 치험례 ID' })
  @IsOptional()
  @IsString()
  clinicalCaseId?: string;

  @ApiProperty({ description: '진료 날짜' })
  @IsDateString()
  visitDate: string;

  @ApiPropertyOptional({ description: '방문 유형', enum: VisitType })
  @IsOptional()
  @IsEnum(VisitType)
  visitType?: VisitType;

  @ApiPropertyOptional({ description: '주호소 (환자용)' })
  @IsOptional()
  @IsString()
  chiefComplaintPatient?: string;

  @ApiPropertyOptional({ description: '증상 요약' })
  @IsOptional()
  @IsArray()
  symptomsSummary?: Array<{
    name: string;
    description: string;
    severity?: number;
  }>;

  @ApiPropertyOptional({ description: '진단 요약' })
  @IsOptional()
  @IsString()
  diagnosisSummary?: string;

  @ApiPropertyOptional({ description: '체질 결과' })
  @IsOptional()
  @IsString()
  constitutionResult?: string;

  @ApiPropertyOptional({ description: '변증 설명 (환자용)' })
  @IsOptional()
  @IsString()
  patternDiagnosisPatient?: string;

  @ApiPropertyOptional({ description: '다음 방문 권장일' })
  @IsOptional()
  @IsDateString()
  nextVisitRecommended?: string;

  @ApiPropertyOptional({ description: '다음 방문 메모' })
  @IsOptional()
  @IsString()
  nextVisitNotes?: string;
}

// 진료 기록 수정
export class UpdatePatientRecordDto {
  @ApiPropertyOptional({ description: '주호소 (환자용)' })
  @IsOptional()
  @IsString()
  chiefComplaintPatient?: string;

  @ApiPropertyOptional({ description: '증상 요약' })
  @IsOptional()
  @IsArray()
  symptomsSummary?: Array<{
    name: string;
    description: string;
    severity?: number;
  }>;

  @ApiPropertyOptional({ description: '진단 요약' })
  @IsOptional()
  @IsString()
  diagnosisSummary?: string;

  @ApiPropertyOptional({ description: '변증 설명 (환자용)' })
  @IsOptional()
  @IsString()
  patternDiagnosisPatient?: string;

  @ApiPropertyOptional({ description: 'AI 건강 인사이트' })
  @IsOptional()
  aiHealthInsights?: any;

  @ApiPropertyOptional({ description: '생활 관리 권고' })
  @IsOptional()
  @IsArray()
  lifestyleRecommendations?: any[];

  @ApiPropertyOptional({ description: '식이 권고' })
  @IsOptional()
  dietRecommendations?: any;

  @ApiPropertyOptional({ description: '운동 권고' })
  @IsOptional()
  @IsArray()
  exerciseRecommendations?: any[];

  @ApiPropertyOptional({ description: '다음 방문 권장일' })
  @IsOptional()
  @IsDateString()
  nextVisitRecommended?: string;

  @ApiPropertyOptional({ description: '다음 방문 메모' })
  @IsOptional()
  @IsString()
  nextVisitNotes?: string;
}

// 환자에게 공유
export class ShareRecordDto {
  @ApiProperty({ description: '진료 기록 ID' })
  @IsString()
  @IsNotEmpty()
  recordId: string;

  @ApiPropertyOptional({ description: 'AI 설명 생성 여부', default: true })
  @IsOptional()
  @IsBoolean()
  generateAiExplanation?: boolean;
}

// 진료 기록 목록 조회
export class GetRecordsDto {
  @ApiPropertyOptional({ description: '시작 날짜' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료 날짜' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '한의원 ID' })
  @IsOptional()
  @IsString()
  clinicId?: string;

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
