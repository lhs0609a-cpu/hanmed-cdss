import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  IsBoolean,
  ValidateNested,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CaseCategory,
  CaseDifficulty,
  SharedCaseStatus,
} from '../../../database/entities/shared-case.entity';

// 익명화된 환자 정보 DTO
export class AnonymizedPatientInfoDto {
  @ApiProperty({ example: '40대' })
  @IsString()
  ageRange: string;

  @ApiProperty({ example: '여성' })
  @IsString()
  gender: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  constitution?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  mainSymptoms: string[];

  @ApiPropertyOptional({ example: '3개월' })
  @IsOptional()
  @IsString()
  duration?: string;
}

// 시도한 치료 DTO
export class TriedTreatmentDto {
  @ApiProperty()
  @IsString()
  treatment: string;

  @ApiProperty()
  @IsString()
  duration: string;

  @ApiProperty()
  @IsString()
  result: string;
}

// 케이스 생성 DTO
export class CreateSharedCaseDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ enum: CaseCategory })
  @IsEnum(CaseCategory)
  category: CaseCategory;

  @ApiPropertyOptional({ enum: CaseDifficulty })
  @IsOptional()
  @IsEnum(CaseDifficulty)
  difficulty?: CaseDifficulty;

  @ApiProperty({ type: AnonymizedPatientInfoDto })
  @ValidateNested()
  @Type(() => AnonymizedPatientInfoDto)
  patientInfo: AnonymizedPatientInfoDto;

  @ApiPropertyOptional({ type: [TriedTreatmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TriedTreatmentDto)
  triedTreatments?: TriedTreatmentDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  questions?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

// 추천 치료 DTO
export class SuggestedTreatmentDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  formulas?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  treatments?: string[];

  @ApiProperty()
  @IsString()
  rationale: string;
}

// 참고 자료 DTO
export class ReferenceDto {
  @ApiProperty({ enum: ['paper', 'textbook', 'experience'] })
  @IsEnum(['paper', 'textbook', 'experience'])
  type: 'paper' | 'textbook' | 'experience';

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  url?: string;
}

// 댓글 생성 DTO
export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ type: SuggestedTreatmentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SuggestedTreatmentDto)
  suggestedTreatment?: SuggestedTreatmentDto;

  @ApiPropertyOptional({ type: [ReferenceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReferenceDto)
  references?: ReferenceDto[];
}

// 투표 DTO
export class VoteDto {
  @ApiProperty({ enum: ['up', 'down'] })
  @IsEnum(['up', 'down'])
  voteType: 'up' | 'down';
}

// 케이스 검색 DTO
export class SearchCasesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ enum: CaseCategory })
  @IsOptional()
  @IsEnum(CaseCategory)
  category?: CaseCategory;

  @ApiPropertyOptional({ enum: CaseDifficulty })
  @IsOptional()
  @IsEnum(CaseDifficulty)
  difficulty?: CaseDifficulty;

  @ApiPropertyOptional({ enum: SharedCaseStatus })
  @IsOptional()
  @IsEnum(SharedCaseStatus)
  status?: SharedCaseStatus;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

// 멘토링 요청 DTO
export class RequestMentorshipDto {
  @ApiProperty()
  @IsUUID()
  mentorId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @ApiProperty()
  @IsString()
  message: string;
}

// 전문가 프로필 DTO
export class CreateExpertProfileDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  yearsOfExperience: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  specializations: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  expertSymptoms?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAvailableForMentoring?: boolean;
}
