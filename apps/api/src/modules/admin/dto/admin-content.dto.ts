import { IsString, IsOptional, IsNumber, IsEnum, IsArray, IsUUID, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Gender, ConstitutionType, TreatmentOutcome } from '../../../database/entities/clinical-case.entity';
import { InteractionType, Severity, EvidenceLevel } from '../../../database/entities/drug-herb-interaction.entity';

// ============ Common DTOs ============

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

// ============ Clinical Case DTOs ============

export class CreateCaseDto {
  @IsString()
  sourceId: string;

  @IsNumber()
  recordedYear: number;

  @IsOptional()
  @IsString()
  recorderName?: string;

  @IsOptional()
  @IsEnum(Gender)
  patientGender?: Gender;

  @IsOptional()
  @IsString()
  patientAgeRange?: string;

  @IsOptional()
  @IsEnum(ConstitutionType)
  patientConstitution?: ConstitutionType;

  @IsString()
  chiefComplaint: string;

  @IsOptional()
  @IsString()
  presentIllness?: string;

  @IsOptional()
  @IsString()
  pulseDiagnosis?: string;

  @IsOptional()
  @IsString()
  tongueDiagnosis?: string;

  @IsOptional()
  @IsString()
  abdominalDiagnosis?: string;

  @IsOptional()
  @IsString()
  patternDiagnosis?: string;

  @IsOptional()
  @IsEnum(TreatmentOutcome)
  treatmentOutcome?: TreatmentOutcome;

  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @IsString()
  originalText: string;
}

export class UpdateCaseDto {
  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsNumber()
  recordedYear?: number;

  @IsOptional()
  @IsString()
  recorderName?: string;

  @IsOptional()
  @IsEnum(Gender)
  patientGender?: Gender;

  @IsOptional()
  @IsString()
  patientAgeRange?: string;

  @IsOptional()
  @IsEnum(ConstitutionType)
  patientConstitution?: ConstitutionType;

  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @IsOptional()
  @IsString()
  presentIllness?: string;

  @IsOptional()
  @IsString()
  pulseDiagnosis?: string;

  @IsOptional()
  @IsString()
  tongueDiagnosis?: string;

  @IsOptional()
  @IsString()
  abdominalDiagnosis?: string;

  @IsOptional()
  @IsString()
  patternDiagnosis?: string;

  @IsOptional()
  @IsEnum(TreatmentOutcome)
  treatmentOutcome?: TreatmentOutcome;

  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @IsOptional()
  @IsString()
  originalText?: string;
}

// ============ Formula DTOs ============

export class CreateFormulaDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  hanja?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  indication?: string;

  @IsOptional()
  @IsString()
  pathogenesis?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contraindications?: string[];
}

export class UpdateFormulaDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  hanja?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  indication?: string;

  @IsOptional()
  @IsString()
  pathogenesis?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contraindications?: string[];
}

export class FormulaHerbDto {
  @IsUUID()
  herbId: string;

  @IsString()
  amount: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateFormulaHerbsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormulaHerbDto)
  herbs: FormulaHerbDto[];
}

// ============ Herb DTOs ============

export class CreateHerbDto {
  @IsString()
  standardName: string;

  @IsOptional()
  @IsString()
  hanjaName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @IsString()
  category: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  meridianTropism?: string[];

  @IsOptional()
  @IsString()
  efficacy?: string;

  @IsOptional()
  @IsString()
  contraindications?: string;
}

export class UpdateHerbDto {
  @IsOptional()
  @IsString()
  standardName?: string;

  @IsOptional()
  @IsString()
  hanjaName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  meridianTropism?: string[];

  @IsOptional()
  @IsString()
  efficacy?: string;

  @IsOptional()
  @IsString()
  contraindications?: string;
}

// ============ Interaction DTOs ============

export class CreateInteractionDto {
  @IsString()
  drugName: string;

  @IsOptional()
  @IsString()
  drugAtcCode?: string;

  @IsUUID()
  herbId: string;

  @IsEnum(InteractionType)
  interactionType: InteractionType;

  @IsEnum(Severity)
  severity: Severity;

  @IsOptional()
  @IsString()
  mechanism?: string;

  @IsOptional()
  @IsEnum(EvidenceLevel)
  evidenceLevel?: EvidenceLevel;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referencePmid?: string[];

  @IsOptional()
  @IsString()
  recommendation?: string;
}

export class UpdateInteractionDto {
  @IsOptional()
  @IsString()
  drugName?: string;

  @IsOptional()
  @IsString()
  drugAtcCode?: string;

  @IsOptional()
  @IsUUID()
  herbId?: string;

  @IsOptional()
  @IsEnum(InteractionType)
  interactionType?: InteractionType;

  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;

  @IsOptional()
  @IsString()
  mechanism?: string;

  @IsOptional()
  @IsEnum(EvidenceLevel)
  evidenceLevel?: EvidenceLevel;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referencePmid?: string[];

  @IsOptional()
  @IsString()
  recommendation?: string;
}

// ============ Response Types ============

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
