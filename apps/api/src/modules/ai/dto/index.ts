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

// ============ Similar Case Success Stats DTO ============

export class SimilarCaseStatsRequestDto {
  @ApiProperty({ description: '주소증' })
  @IsString()
  @IsNotEmpty()
  chiefComplaint: string;

  @ApiProperty({ description: '증상 목록', type: [SymptomInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SymptomInputDto)
  symptoms: SymptomInputDto[];

  @ApiPropertyOptional({ description: '진단명/변증' })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional({ description: '체열 (cold/neutral/hot)' })
  @IsOptional()
  @IsString()
  bodyHeat?: string;

  @ApiPropertyOptional({ description: '근실도 (deficient/neutral/excess)' })
  @IsOptional()
  @IsString()
  bodyStrength?: string;
}

// ============ Health Score DTOs ============

export class VitalSignsDto {
  @ApiPropertyOptional({ description: '수면의 질 (1-10)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  sleepQuality?: number;

  @ApiPropertyOptional({ description: '에너지 수준 (1-10)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  energyLevel?: number;

  @ApiPropertyOptional({ description: '식욕 (1-10)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  appetite?: number;

  @ApiPropertyOptional({ description: '스트레스 수준 (1-10)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  stressLevel?: number;

  @ApiPropertyOptional({ description: '통증 수준 (1-10)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  painLevel?: number;
}

export class HealthScoreRequestDto {
  @ApiProperty({ description: '환자 ID' })
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: '진료 기록 ID' })
  @IsOptional()
  @IsString()
  patientRecordId?: string;

  @ApiProperty({ description: '증상 목록', type: [SymptomInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SymptomInputDto)
  symptoms: SymptomInputDto[];

  @ApiPropertyOptional({ description: '진단' })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional({ description: '변증' })
  @IsOptional()
  @IsString()
  patternDiagnosis?: string;

  @ApiPropertyOptional({ description: '체질' })
  @IsOptional()
  @IsString()
  constitution?: string;

  @ApiPropertyOptional({ description: '체열 (cold/neutral/hot)' })
  @IsOptional()
  @IsIn(['cold', 'neutral', 'hot'])
  bodyHeat?: 'cold' | 'neutral' | 'hot';

  @ApiPropertyOptional({ description: '근실도 (deficient/neutral/excess)' })
  @IsOptional()
  @IsIn(['deficient', 'neutral', 'excess'])
  bodyStrength?: 'deficient' | 'neutral' | 'excess';

  @ApiPropertyOptional({ description: '체열 점수 (-10 ~ +10)' })
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(10)
  bodyHeatScore?: number;

  @ApiPropertyOptional({ description: '근실도 점수 (-10 ~ +10)' })
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(10)
  bodyStrengthScore?: number;

  @ApiPropertyOptional({ description: '활력 징후' })
  @IsOptional()
  @ValidateNested()
  @Type(() => VitalSignsDto)
  vitalSigns?: VitalSignsDto;
}

export class PreviousScoreDto {
  @ApiProperty({ description: '이전 종합 건강 지수' })
  @IsNumber()
  overallHealthIndex: number;

  @ApiProperty({ description: '평가 시점' })
  @IsString()
  evaluatedAt: string;
}

export class HealthScoreWithTrendRequestDto extends HealthScoreRequestDto {
  @ApiPropertyOptional({ description: '이전 점수 (트렌드 계산용)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PreviousScoreDto)
  previousScore?: PreviousScoreDto;
}

// ============ Scientific Rationale DTOs ============

export class FormulaHerbDto {
  @ApiProperty({ description: '약재명' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '용량' })
  @IsOptional()
  @IsString()
  amount?: string;
}

export class PatientContextDto {
  @ApiPropertyOptional({ description: '주소증' })
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @ApiPropertyOptional({ description: '증상 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  symptoms?: string[];

  @ApiPropertyOptional({ description: '체열 (cold/neutral/hot)' })
  @IsOptional()
  @IsIn(['cold', 'neutral', 'hot'])
  bodyHeat?: 'cold' | 'neutral' | 'hot';

  @ApiPropertyOptional({ description: '근실도 (deficient/neutral/excess)' })
  @IsOptional()
  @IsIn(['deficient', 'neutral', 'excess'])
  bodyStrength?: 'deficient' | 'neutral' | 'excess';

  @ApiPropertyOptional({ description: '체질' })
  @IsOptional()
  @IsString()
  constitution?: string;

  @ApiPropertyOptional({ description: '나이' })
  @IsOptional()
  @IsNumber()
  age?: number;

  @ApiPropertyOptional({ description: '성별' })
  @IsOptional()
  @IsString()
  gender?: string;
}

export class IncludeEvidenceDto {
  @ApiPropertyOptional({ description: '전통의학 근거 포함', default: true })
  @IsOptional()
  traditional?: boolean;

  @ApiPropertyOptional({ description: '약리학 근거 포함', default: true })
  @IsOptional()
  pharmacological?: boolean;

  @ApiPropertyOptional({ description: '통계 근거 포함', default: true })
  @IsOptional()
  statistical?: boolean;
}

export class ScientificRationaleRequestDto {
  @ApiProperty({ description: '처방명 또는 처방 ID' })
  @IsString()
  @IsNotEmpty()
  formulaNameOrId: string;

  @ApiPropertyOptional({ description: '구성 약재 (처방명으로 조회 불가 시)', type: [FormulaHerbDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormulaHerbDto)
  herbs?: FormulaHerbDto[];

  @ApiPropertyOptional({ description: '환자 컨텍스트' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PatientContextDto)
  patientContext?: PatientContextDto;

  @ApiPropertyOptional({ description: '상세 수준', enum: ['basic', 'standard', 'comprehensive'], default: 'standard' })
  @IsOptional()
  @IsIn(['basic', 'standard', 'comprehensive'])
  detailLevel?: 'basic' | 'standard' | 'comprehensive';

  @ApiPropertyOptional({ description: '포함할 근거 유형' })
  @IsOptional()
  @ValidateNested()
  @Type(() => IncludeEvidenceDto)
  includeEvidence?: IncludeEvidenceDto;
}

export class QuickSummaryRequestDto {
  @ApiProperty({ description: '처방명' })
  @IsString()
  @IsNotEmpty()
  formulaName: string;

  @ApiPropertyOptional({ description: '약재 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  herbs?: string[];
}

export class HerbEvidenceRequestDto {
  @ApiProperty({ description: '약재명' })
  @IsString()
  @IsNotEmpty()
  herbName: string;
}

// ============ Pharmacology Report DTOs ============

export class PharmacologyHerbDto {
  @ApiProperty({ description: '약재명 (한글)' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '약재명 (영문)' })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional({ description: '용량' })
  @IsOptional()
  @IsString()
  amount?: string;
}

export class IncludeSectionsDto {
  @ApiPropertyOptional({ description: '활성 성분 포함', default: true })
  @IsOptional()
  compounds?: boolean;

  @ApiPropertyOptional({ description: '신호전달경로 포함', default: true })
  @IsOptional()
  pathways?: boolean;

  @ApiPropertyOptional({ description: 'ADME 약동학 포함', default: true })
  @IsOptional()
  adme?: boolean;

  @ApiPropertyOptional({ description: '플로우차트 포함', default: true })
  @IsOptional()
  flowchart?: boolean;

  @ApiPropertyOptional({ description: '관련 연구 포함', default: true })
  @IsOptional()
  studies?: boolean;
}

export class PharmacologyPatientContextDto {
  @ApiPropertyOptional({ description: '주소증' })
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @ApiPropertyOptional({ description: '증상 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  symptoms?: string[];
}

export class PharmacologyReportRequestDto {
  @ApiProperty({ description: '약재 목록', type: [PharmacologyHerbDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PharmacologyHerbDto)
  herbs: PharmacologyHerbDto[];

  @ApiPropertyOptional({ description: '처방명 (선택)' })
  @IsOptional()
  @IsString()
  formulaName?: string;

  @ApiPropertyOptional({ description: '상세 수준', enum: ['brief', 'standard', 'detailed'], default: 'standard' })
  @IsOptional()
  @IsIn(['brief', 'standard', 'detailed'])
  detailLevel?: 'brief' | 'standard' | 'detailed';

  @ApiPropertyOptional({ description: '포함할 섹션' })
  @IsOptional()
  @ValidateNested()
  @Type(() => IncludeSectionsDto)
  includeSections?: IncludeSectionsDto;

  @ApiPropertyOptional({ description: '환자 정보 (맞춤 설명용)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PharmacologyPatientContextDto)
  patientContext?: PharmacologyPatientContextDto;
}

export class HerbPharmacologyRequestDto {
  @ApiProperty({ description: '약재명' })
  @IsString()
  @IsNotEmpty()
  herbName: string;
}

export class CompoundTargetsRequestDto {
  @ApiProperty({ description: '성분명' })
  @IsString()
  @IsNotEmpty()
  compoundName: string;
}

// ============ Treatment Statistics DTOs ============

export class SimilarPatientStatisticsRequestDto {
  @ApiProperty({ description: '주소증' })
  @IsString()
  @IsNotEmpty()
  chiefComplaint: string;

  @ApiProperty({ description: '증상 목록', type: [SymptomInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SymptomInputDto)
  symptoms: SymptomInputDto[];

  @ApiPropertyOptional({ description: '진단명' })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional({ description: '체열 (cold/neutral/hot)' })
  @IsOptional()
  @IsIn(['cold', 'neutral', 'hot'])
  bodyHeat?: 'cold' | 'neutral' | 'hot';

  @ApiPropertyOptional({ description: '근실도 (deficient/neutral/excess)' })
  @IsOptional()
  @IsIn(['deficient', 'neutral', 'excess'])
  bodyStrength?: 'deficient' | 'neutral' | 'excess';

  @ApiPropertyOptional({ description: '환자 나이' })
  @IsOptional()
  @IsNumber()
  age?: number;

  @ApiPropertyOptional({ description: '환자 성별' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: '체질' })
  @IsOptional()
  @IsString()
  constitution?: string;

  @ApiPropertyOptional({ description: '특정 처방으로 필터' })
  @IsOptional()
  @IsString()
  formulaFilter?: string;
}

export class FormulaStatisticsRequestDto {
  @ApiProperty({ description: '처방명' })
  @IsString()
  @IsNotEmpty()
  formulaName: string;
}

export class FormulaComparisonRequestDto {
  @ApiProperty({ description: '비교할 처방 목록' })
  @IsArray()
  @IsString({ each: true })
  formulas: string[];

  @ApiPropertyOptional({ description: '적응증 필터' })
  @IsOptional()
  @IsString()
  indicationFilter?: string;

  @ApiPropertyOptional({ description: '체질 필터' })
  @IsOptional()
  @IsString()
  constitutionFilter?: string;
}

export class SymptomStatisticsRequestDto {
  @ApiProperty({ description: '증상명' })
  @IsString()
  @IsNotEmpty()
  symptomName: string;
}

export class ChartDataRequestDto {
  @ApiProperty({
    description: '차트 유형',
    enum: ['outcome', 'ageGroup', 'constitution', 'topFormulas', 'duration'],
  })
  @IsString()
  @IsIn(['outcome', 'ageGroup', 'constitution', 'topFormulas', 'duration'])
  chartType: 'outcome' | 'ageGroup' | 'constitution' | 'topFormulas' | 'duration';
}

// ============ Comprehensive Report DTOs ============

export class ReportPatientInfoDto {
  @ApiPropertyOptional({ description: '환자 이름' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '환자 나이' })
  @IsOptional()
  @IsNumber()
  age?: number;

  @ApiPropertyOptional({ description: '환자 성별' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: '체질' })
  @IsOptional()
  @IsString()
  constitution?: string;
}

export class ReportConsultationInfoDto {
  @ApiProperty({ description: '진료일 (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: '주소증' })
  @IsString()
  @IsNotEmpty()
  chiefComplaint: string;

  @ApiProperty({ description: '증상 목록', type: [SymptomInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SymptomInputDto)
  symptoms: SymptomInputDto[];

  @ApiPropertyOptional({ description: '진단명' })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional({ description: '변증' })
  @IsOptional()
  @IsString()
  patternDiagnosis?: string;
}

export class ReportHealthScoreDto {
  @ApiProperty({ description: '체열 점수 (-10 ~ +10)' })
  @IsNumber()
  @Min(-10)
  @Max(10)
  bodyHeatScore: number;

  @ApiProperty({ description: '근실도 점수 (-10 ~ +10)' })
  @IsNumber()
  @Min(-10)
  @Max(10)
  bodyStrengthScore: number;

  @ApiProperty({ description: '종합 건강지수 (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  overallHealthIndex: number;

  @ApiPropertyOptional({ description: '장부 기능 점수' })
  @IsOptional()
  organFunctionScores?: {
    spleen: number;
    lung: number;
    kidney: number;
    liver: number;
    heart: number;
  };
}

export class ReportPrescriptionHerbDto {
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

export class ReportPrescriptionDto {
  @ApiProperty({ description: '처방명' })
  @IsString()
  @IsNotEmpty()
  formulaName: string;

  @ApiPropertyOptional({ description: '처방 한자명' })
  @IsOptional()
  @IsString()
  formulaHanja?: string;

  @ApiProperty({ description: '구성 약재', type: [ReportPrescriptionHerbDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportPrescriptionHerbDto)
  herbs: ReportPrescriptionHerbDto[];

  @ApiPropertyOptional({ description: '복용법' })
  @IsOptional()
  @IsString()
  dosageInstructions?: string;
}

export class ReportIncludeSectionsDto {
  @ApiPropertyOptional({ description: '건강 점수 포함', default: true })
  @IsOptional()
  healthScore?: boolean;

  @ApiPropertyOptional({ description: '처방 정보 포함', default: true })
  @IsOptional()
  prescription?: boolean;

  @ApiPropertyOptional({ description: '과학적 근거 포함', default: true })
  @IsOptional()
  scientificEvidence?: boolean;

  @ApiPropertyOptional({ description: '예후 정보 포함', default: true })
  @IsOptional()
  prognosis?: boolean;

  @ApiPropertyOptional({ description: '생활 관리 포함', default: true })
  @IsOptional()
  lifestyle?: boolean;
}

export class ComprehensiveReportRequestDto {
  @ApiPropertyOptional({ description: '환자 ID' })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional({ description: '진료 기록 ID' })
  @IsOptional()
  @IsString()
  patientRecordId?: string;

  @ApiPropertyOptional({ description: '환자 정보' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReportPatientInfoDto)
  patientInfo?: ReportPatientInfoDto;

  @ApiProperty({ description: '진료 정보' })
  @ValidateNested()
  @Type(() => ReportConsultationInfoDto)
  consultationInfo: ReportConsultationInfoDto;

  @ApiPropertyOptional({ description: '건강 점수 (이미 계산된 경우)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReportHealthScoreDto)
  healthScore?: ReportHealthScoreDto;

  @ApiProperty({ description: '처방 정보' })
  @ValidateNested()
  @Type(() => ReportPrescriptionDto)
  prescription: ReportPrescriptionDto;

  @ApiPropertyOptional({ description: '포함할 섹션' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReportIncludeSectionsDto)
  includeSections?: ReportIncludeSectionsDto;

  @ApiPropertyOptional({ description: '보고서 유형', enum: ['consultation', 'followup', 'summary'], default: 'consultation' })
  @IsOptional()
  @IsIn(['consultation', 'followup', 'summary'])
  reportType?: 'consultation' | 'followup' | 'summary';

  @ApiPropertyOptional({ description: '상세 수준', enum: ['brief', 'standard', 'detailed'], default: 'standard' })
  @IsOptional()
  @IsIn(['brief', 'standard', 'detailed'])
  detailLevel?: 'brief' | 'standard' | 'detailed';
}

export class ReportHtmlOptionsDto {
  @ApiPropertyOptional({ description: '테마', enum: ['light', 'dark', 'print'], default: 'light' })
  @IsOptional()
  @IsIn(['light', 'dark', 'print'])
  theme?: 'light' | 'dark' | 'print';

  @ApiPropertyOptional({ description: '로고 URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ description: '병원명' })
  @IsOptional()
  @IsString()
  clinicName?: string;

  @ApiPropertyOptional({ description: '의사명' })
  @IsOptional()
  @IsString()
  doctorName?: string;
}

export class GenerateReportHtmlRequestDto extends ComprehensiveReportRequestDto {
  @ApiPropertyOptional({ description: 'HTML 옵션' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReportHtmlOptionsDto)
  htmlOptions?: ReportHtmlOptionsDto;
}
