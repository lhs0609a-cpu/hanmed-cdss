import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MedicationLogStatus } from '../../../database/entities';

// ===== 건강 일지 =====

export class CreateHealthJournalDto {
  @ApiProperty({ description: '기록 날짜' })
  @IsDateString()
  recordedDate: string;

  @ApiPropertyOptional({ description: '기록 시간' })
  @IsOptional()
  @IsString()
  recordedTime?: string;

  @ApiPropertyOptional({ description: '전반적 컨디션 (1-10)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10)
  overallCondition?: number;

  @ApiPropertyOptional({ description: '통증 수준 (0-10)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  painLevel?: number;

  @ApiPropertyOptional({ description: '에너지 수준 (1-10)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10)
  energyLevel?: number;

  @ApiPropertyOptional({ description: '수면 품질 (1-10)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10)
  sleepQuality?: number;

  @ApiPropertyOptional({ description: '수면 시간' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sleepHours?: number;

  @ApiPropertyOptional({ description: '증상 기록' })
  @IsOptional()
  @IsArray()
  symptoms?: Array<{
    name: string;
    severity: number;
    location?: string;
    duration?: string;
    notes?: string;
  }>;

  @ApiPropertyOptional({ description: '복용 여부' })
  @IsOptional()
  @IsBoolean()
  medicationTaken?: boolean;

  @ApiPropertyOptional({ description: '복용 메모' })
  @IsOptional()
  @IsString()
  medicationNotes?: string;

  @ApiPropertyOptional({ description: '식사 기록' })
  @IsOptional()
  @IsArray()
  meals?: Array<{
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    time?: string;
    description: string;
    appetite?: number;
  }>;

  @ApiPropertyOptional({ description: '운동 여부' })
  @IsOptional()
  @IsBoolean()
  exerciseDone?: boolean;

  @ApiPropertyOptional({ description: '운동 메모' })
  @IsOptional()
  @IsString()
  exerciseNotes?: string;

  @ApiPropertyOptional({ description: '운동 시간 (분)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  exerciseDuration?: number;

  @ApiPropertyOptional({ description: '스트레스 수준 (1-10)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10)
  stressLevel?: number;

  @ApiPropertyOptional({ description: '기분' })
  @IsOptional()
  @IsString()
  mood?: string;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GetHealthJournalDto {
  @ApiPropertyOptional({ description: '시작 날짜' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료 날짜' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '페이지', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: '페이지당 항목', default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 30;
}

// ===== 복약 알림 =====

export class CreateMedicationReminderDto {
  @ApiPropertyOptional({ description: '처방 ID' })
  @IsOptional()
  @IsString()
  prescriptionId?: string;

  @ApiProperty({ description: '알림 제목' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: '알림 시간', example: '08:00' })
  @IsString()
  @IsNotEmpty()
  reminderTime: string;

  @ApiPropertyOptional({ description: '알림 요일 (0=일, 6=토)', default: [0,1,2,3,4,5,6] })
  @IsOptional()
  @IsArray()
  reminderDays?: number[];

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMedicationReminderDto {
  @ApiPropertyOptional({ description: '알림 제목' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '알림 시간' })
  @IsOptional()
  @IsString()
  reminderTime?: string;

  @ApiPropertyOptional({ description: '알림 요일' })
  @IsOptional()
  @IsArray()
  reminderDays?: number[];

  @ApiPropertyOptional({ description: '활성화 여부' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ===== 복약 기록 =====

export class CreateMedicationLogDto {
  @ApiPropertyOptional({ description: '처방 ID' })
  @IsOptional()
  @IsString()
  prescriptionId?: string;

  @ApiPropertyOptional({ description: '알림 ID' })
  @IsOptional()
  @IsString()
  reminderId?: string;

  @ApiProperty({ description: '복용 시간' })
  @IsDateString()
  takenAt: string;

  @ApiPropertyOptional({ description: '상태', enum: MedicationLogStatus })
  @IsOptional()
  @IsEnum(MedicationLogStatus)
  status?: MedicationLogStatus;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: '부작용' })
  @IsOptional()
  @IsArray()
  sideEffects?: Array<{
    symptom: string;
    severity: number;
    notes?: string;
  }>;
}

export class GetMedicationLogsDto {
  @ApiPropertyOptional({ description: '처방 ID' })
  @IsOptional()
  @IsString()
  prescriptionId?: string;

  @ApiPropertyOptional({ description: '시작 날짜' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료 날짜' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
