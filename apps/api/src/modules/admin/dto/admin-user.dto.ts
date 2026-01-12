import { IsEnum, IsOptional, IsString, IsInt, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole, UserStatus } from '../../../database/entities/enums';
import { SubscriptionTier } from '../../../database/entities/user.entity';

// 사용자 목록 조회 쿼리
export class GetUsersQueryDto {
  @IsOptional()
  @IsString()
  search?: string; // 이름, 이메일 검색

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsEnum(SubscriptionTier)
  subscriptionTier?: SubscriptionTier;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

// 사용자 정지 요청
export class SuspendUserDto {
  @IsString()
  reason: string;
}

// 사용자 역할 변경 요청
export class ChangeUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}

// 사용자 정보 수정 요청
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  clinicName?: string;

  @IsOptional()
  @IsString()
  specialization?: string;
}

// 사용자 응답
export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  licenseNumber: string | null;
  clinicName: string | null;
  role: UserRole;
  status: UserStatus;
  subscriptionTier: SubscriptionTier;
  subscriptionExpiresAt: Date | null;
  isVerified: boolean;
  isLicenseVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  suspendedAt?: Date | null;
  suspendedReason?: string | null;
}

// 페이지네이션 응답
export class PaginatedUsersResponseDto {
  users: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
