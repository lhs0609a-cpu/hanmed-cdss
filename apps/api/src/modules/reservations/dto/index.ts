import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VisitType, ReservationStatus } from '../../../database/entities';

export class CreateReservationDto {
  @ApiProperty({ description: '한의원 ID' })
  @IsString()
  @IsNotEmpty()
  clinicId: string;

  @ApiPropertyOptional({ description: '의료진 ID' })
  @IsOptional()
  @IsString()
  practitionerId?: string;

  @ApiProperty({ description: '예약 날짜', example: '2024-01-15' })
  @IsDateString()
  reservationDate: string;

  @ApiProperty({ description: '예약 시간', example: '14:30' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: '올바른 시간 형식이 아닙니다 (HH:mm)' })
  reservationTime: string;

  @ApiPropertyOptional({ description: '방문 유형', enum: VisitType })
  @IsOptional()
  @IsEnum(VisitType)
  visitType?: VisitType;

  @ApiPropertyOptional({ description: '방문 사유' })
  @IsOptional()
  @IsString()
  visitReason?: string;

  @ApiPropertyOptional({ description: '증상 메모' })
  @IsOptional()
  @IsString()
  symptomsNote?: string;
}

export class UpdateReservationDto {
  @ApiPropertyOptional({ description: '예약 날짜' })
  @IsOptional()
  @IsDateString()
  reservationDate?: string;

  @ApiPropertyOptional({ description: '예약 시간' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  reservationTime?: string;

  @ApiPropertyOptional({ description: '의료진 ID' })
  @IsOptional()
  @IsString()
  practitionerId?: string;

  @ApiPropertyOptional({ description: '방문 사유' })
  @IsOptional()
  @IsString()
  visitReason?: string;

  @ApiPropertyOptional({ description: '증상 메모' })
  @IsOptional()
  @IsString()
  symptomsNote?: string;
}

export class CancelReservationDto {
  @ApiPropertyOptional({ description: '취소 사유' })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}

export class ClinicUpdateReservationDto {
  @ApiPropertyOptional({ description: '예약 상태', enum: ReservationStatus })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @ApiPropertyOptional({ description: '한의원 메모' })
  @IsOptional()
  @IsString()
  clinicNotes?: string;
}

export class GetReservationsDto {
  @ApiPropertyOptional({ description: '상태 필터', enum: ReservationStatus })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

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
}
