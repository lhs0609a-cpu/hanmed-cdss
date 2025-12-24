import { IsEnum, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionTier } from '../../../database/entities/user.entity';
import { BillingInterval } from '../../../database/entities/subscription.entity';

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
