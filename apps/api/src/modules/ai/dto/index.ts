import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsIn,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BodyHeat, BodyStrength } from '../../../database/entities/clinical-case.entity';

// ============ Common DTOs ============

export class SymptomInputDto {
  @ApiProperty({ description: '증상명' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '심각도 (1-10)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  severity?: number;

  @ApiPropertyOptional({ description: '지속 기간' })
  @IsOptional()
  @IsString()
  duration?: string;
}

export class PatientInfoDto {
  @ApiPropertyOptional({ description: '환자 나이' })
  @IsOptional()
  @IsNumber()
  age?: number;

  @ApiPropertyOptional({ description: '성별 (M/F)' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: '체질' })
  @IsOptional()
  @IsString()
  constitution?: string;
}

// ============ Recommendation DTOs ============

export class RecommendationRequestDto {
  @ApiPropertyOptional({ description: '환자 나이' })
  @IsOptional()
  @IsNumber()
  patientAge?: number;

  @ApiPropertyOptional({ description: '성별' })
  @IsOptional()
  @IsString()
  patientGender?: string;

  @ApiPropertyOptional({ description: '체질 (사상체질)' })
  @IsOptional()
  @IsString()
  constitution?: string;

  /**
   * ⚠️ 체열 (寒熱) - 필수!
   * 이종대 선생님 기준: 처방 선택의 핵심 기준
   * - cold: 한(寒) - 찬 체질
   * - neutral: 평(平) - 중립
   * - hot: 열(熱) - 열 체질
   */
  @ApiProperty({
    description: '체열 (寒熱) - 필수! cold/neutral/hot',
    enum: BodyHeat,
    example: 'cold',
  })
  @IsNotEmpty({ message: '체열(寒熱) 정보는 필수입니다. 처방 추천을 위해 반드시 입력해주세요.' })
  @IsEnum(BodyHeat, { message: '체열은 cold, neutral, hot 중 하나여야 합니다.' })
  bodyHeat: BodyHeat;

  /**
   * ⚠️ 근실도 (虛實) - 필수!
   * 이종대 선생님 기준: 처방 선택의 핵심 기준
   * - deficient: 허(虛) - 허약
   * - neutral: 평(平) - 중립
   * - excess: 실(實) - 튼튼
   */
  @ApiProperty({
    description: '근실도 (虛實) - 필수! deficient/neutral/excess',
    enum: BodyStrength,
    example: 'deficient',
  })
  @IsNotEmpty({ message: '근실도(虛實) 정보는 필수입니다. 처방 추천을 위해 반드시 입력해주세요.' })
  @IsEnum(BodyStrength, { message: '근실도는 deficient, neutral, excess 중 하나여야 합니다.' })
  bodyStrength: BodyStrength;

  /**
   * 체열 점수 (-10 극한 ~ +10 극열)
   */
  @ApiPropertyOptional({ description: '체열 점수 (-10 ~ +10)', minimum: -10, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(10)
  bodyHeatScore?: number;

  /**
   * 근실도 점수 (-10 극허 ~ +10 극실)
   */
  @ApiPropertyOptional({ description: '근실도 점수 (-10 ~ +10)', minimum: -10, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(10)
  bodyStrengthScore?: number;

  @ApiProperty({ description: '주소증' })
  @IsString()
  chiefComplaint: string;

  @ApiProperty({ description: '증상 목록', type: [SymptomInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SymptomInputDto)
  symptoms: SymptomInputDto[];

  @ApiPropertyOptional({ description: '현재 복용 중인 양약' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  currentMedications?: string[];

  @ApiPropertyOptional({ description: '추천 개수', default: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  topK?: number;
}

// ============ Case Search DTOs ============

export class SearchOptionsDto {
  @ApiPropertyOptional({ description: '반환할 결과 수', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  topK?: number;

  @ApiPropertyOptional({ description: '최소 신뢰도 점수', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minConfidence?: number;
}

export class CaseSearchRequestDto {
  @ApiPropertyOptional({ description: '환자 정보' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PatientInfoDto)
  patientInfo?: PatientInfoDto;

  @ApiProperty({ description: '주소증' })
  @IsString()
  chiefComplaint: string;

  @ApiPropertyOptional({ description: '증상 목록', type: [SymptomInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SymptomInputDto)
  symptoms?: SymptomInputDto[];

  @ApiPropertyOptional({ description: '진단명/변증' })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional({ description: '처방으로 필터링' })
  @IsOptional()
  @IsString()
  formula?: string;

  @ApiPropertyOptional({ description: '검색 옵션' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SearchOptionsDto)
  options?: SearchOptionsDto;
}

// ============ Patient Explanation DTOs ============

export class RecordExplanationRequestDto {
  @ApiProperty({ description: '진료일' })
  @IsString()
  visitDate: string;

  @ApiProperty({ description: '주소증' })
  @IsString()
  chiefComplaint: string;

  @ApiPropertyOptional({ description: '증상 목록', type: [SymptomInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SymptomInputDto)
  symptoms?: SymptomInputDto[];

  @ApiPropertyOptional({ description: '진단' })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional({ description: '치료 내용' })
  @IsOptional()
  @IsString()
  treatment?: string;

  @ApiPropertyOptional({ description: '환자 정보' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PatientInfoDto)
  patientInfo?: PatientInfoDto;
}

export class HerbInputDto {
  @ApiProperty({ description: '약재명' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '용량' })
  @IsOptional()
  @IsString()
  amount?: string;

  @ApiPropertyOptional({ description: '역할 (군/신/좌/사)' })
  @IsOptional()
  @IsString()
  role?: string;
}

export class PrescriptionExplanationRequestDto {
  @ApiProperty({ description: '처방명' })
  @IsString()
  formulaName: string;

  @ApiProperty({ description: '구성 약재', type: [HerbInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HerbInputDto)
  herbs: HerbInputDto[];

  @ApiPropertyOptional({ description: '복용법' })
  @IsOptional()
  @IsString()
  dosageInstructions?: string;

  @ApiPropertyOptional({ description: '처방 목적' })
  @IsOptional()
  @IsString()
  purpose?: string;
}

export class HerbExplanationRequestDto {
  @ApiProperty({ description: '약재명' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '분류' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '효능' })
  @IsOptional()
  @IsString()
  efficacy?: string;

  @ApiPropertyOptional({ description: '용도' })
  @IsOptional()
  @IsString()
  usage?: string;
}

export class HealthTipsRequestDto {
  @ApiPropertyOptional({ description: '체질' })
  @IsOptional()
  @IsString()
  constitution?: string;

  @ApiPropertyOptional({ description: '주요 증상' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mainSymptoms?: string[];

  @ApiPropertyOptional({ description: '현재 복용 중인 처방' })
  @IsOptional()
  @IsString()
  currentPrescription?: string;

  @ApiPropertyOptional({ description: '계절' })
  @IsOptional()
  @IsString()
  season?: string;
}

export class MedicationReminderRequestDto {
  @ApiProperty({ description: '처방명' })
  @IsString()
  prescriptionName: string;

  @ApiProperty({ description: '복용 시간대 (morning/lunch/dinner/bedtime)' })
  @IsString()
  @IsIn(['morning', 'lunch', 'dinner', 'bedtime'])
  timeOfDay: string;

  @ApiPropertyOptional({ description: '환자 이름' })
  @IsOptional()
  @IsString()
  patientName?: string;
}
