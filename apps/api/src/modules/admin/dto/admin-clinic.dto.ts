import { IsString, IsOptional, IsBoolean, IsNumber, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum ClinicVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export class GetClinicsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ClinicVerificationStatus)
  verificationStatus?: ClinicVerificationStatus;

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
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class UpdateClinicDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  businessNumber?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  addressRoad?: string;

  @IsOptional()
  @IsString()
  addressDetail?: string;

  @IsOptional()
  @IsBoolean()
  reservationEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  reservationInterval?: number;

  @IsOptional()
  @IsNumber()
  maxDailyReservations?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class VerifyClinicDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectClinicDto {
  @IsString()
  reason: string;
}

export interface AdminClinicResponse {
  id: string;
  name: string;
  businessNumber: string | null;
  licenseNumber: string | null;
  phone: string | null;
  email: string | null;
  addressRoad: string | null;
  addressDetail: string | null;
  isHanmedVerified: boolean;
  subscriptionTier: string | null;
  ratingAverage: number;
  reviewCount: number;
  reservationEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface PaginatedClinicsResponse {
  clinics: AdminClinicResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
