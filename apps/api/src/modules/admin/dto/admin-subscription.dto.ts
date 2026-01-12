import { IsEnum, IsOptional, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionTier } from '../../../database/entities/user.entity';

// 구독 플랜 변경 요청
export class ChangeSubscriptionPlanDto {
  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;

  @IsOptional()
  @IsDateString()
  expiresAt?: string; // ISO 날짜 문자열
}

// 구독 기간 연장 요청
export class ExtendSubscriptionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days: number; // 연장할 일수
}

// 사용량 초기화 요청
export class ResetUsageDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  newCount?: number; // 초기화할 값 (기본: 0)
}

// 구독 통계 응답
export class SubscriptionStatsDto {
  totalUsers: number;
  activeSubscribers: number;
  byTier: {
    free: number;
    basic: number;
    professional: number;
    clinic: number;
  };
  monthlyRevenue: number;
  yearlyRevenue: number;
}
