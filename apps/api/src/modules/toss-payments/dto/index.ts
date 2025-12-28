import { IsEnum, IsString, IsOptional, IsNumber, IsUUID, Length, Matches, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionTier } from '../../../database/entities/user.entity';
import { BillingInterval } from '../../../database/entities/subscription.entity';
import { Type } from 'class-transformer';

export class RegisterCardDto {
  @ApiProperty({ example: '4330123412341234', description: '카드번호 16자리' })
  @IsString()
  @Length(15, 16)
  @Matches(/^\d+$/, { message: '카드번호는 숫자만 입력해주세요.' })
  cardNumber: string;

  @ApiProperty({ example: '25', description: '만료년도 (YY)' })
  @IsString()
  @Length(2, 2)
  expirationYear: string;

  @ApiProperty({ example: '12', description: '만료월 (MM)' })
  @IsString()
  @Length(2, 2)
  expirationMonth: string;

  @ApiProperty({ example: '12', description: '카드 비밀번호 앞 2자리' })
  @IsString()
  @Length(2, 2)
  cardPassword: string;

  @ApiProperty({
    example: '880101',
    description: '생년월일 6자리 (개인) 또는 사업자번호 10자리 (법인)',
  })
  @IsString()
  @Matches(/^(\d{6}|\d{10})$/, {
    message: '생년월일 6자리 또는 사업자번호 10자리를 입력해주세요.',
  })
  customerIdentityNumber: string;
}

export class SubscribeDto {
  @ApiProperty({ enum: ['basic', 'professional', 'clinic'] })
  @IsEnum(['basic', 'professional', 'clinic'])
  tier: SubscriptionTier;

  @ApiProperty({ enum: BillingInterval })
  @IsEnum(BillingInterval)
  interval: BillingInterval;
}

export class RefundRequestDto {
  @ApiProperty({ description: '환불할 결제 ID' })
  @IsUUID()
  paymentId: string;

  @ApiProperty({ description: '환불 사유' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: '부분 환불 금액 (없으면 전액 환불)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount?: number;
}

export class PaymentHistoryQueryDto {
  @ApiPropertyOptional({ default: 1, description: '페이지 번호' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, description: '페이지당 항목 수' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;
}
