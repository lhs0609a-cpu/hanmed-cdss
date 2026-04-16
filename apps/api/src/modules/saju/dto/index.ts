import { IsString, IsOptional, IsEnum, IsNumber, IsEmail, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SajuReportTier } from '../../../database/entities/saju-report.entity';

export class CreateSajuOrderDto {
  @ApiProperty({ description: '이름' })
  @IsString()
  name: string;

  @ApiProperty({ description: '생년월일 (YYYY-MM-DD)' })
  @IsString()
  birthDate: string;

  @ApiPropertyOptional({ description: '출생 시간 (0-23)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(23)
  birthHour?: number;

  @ApiPropertyOptional({ description: '성별' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ description: '상품 티어', enum: SajuReportTier })
  @IsEnum(SajuReportTier)
  tier: SajuReportTier;

  @ApiPropertyOptional({ description: '이메일' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: '사용자 ID' })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class ConfirmSajuPaymentDto {
  @ApiProperty({ description: '토스 paymentKey' })
  @IsString()
  paymentKey: string;

  @ApiProperty({ description: '주문 ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: '결제 금액' })
  @IsNumber()
  amount: number;
}
