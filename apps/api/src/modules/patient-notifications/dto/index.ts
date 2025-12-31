import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { NotificationType } from '../../../database/entities';

export class GetNotificationsDto {
  @ApiPropertyOptional({ description: '알림 유형', enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ description: '읽음 여부' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isRead?: boolean;

  @ApiPropertyOptional({ description: '페이지', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: '페이지당 항목', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}

export class CreateNotificationDto {
  @ApiProperty({ description: '환자 ID' })
  @IsString()
  patientId: string;

  @ApiProperty({ description: '알림 유형', enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: '제목' })
  @IsString()
  title: string;

  @ApiProperty({ description: '내용' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: '추가 데이터' })
  @IsOptional()
  data?: {
    recordId?: string;
    prescriptionId?: string;
    reservationId?: string;
    clinicId?: string;
    actionUrl?: string;
  };

  @ApiPropertyOptional({ description: '푸시 발송 여부', default: true })
  @IsOptional()
  @IsBoolean()
  sendPush?: boolean;
}

export class MarkReadDto {
  @ApiProperty({ description: '알림 ID 목록' })
  @IsArray()
  @IsString({ each: true })
  notificationIds: string[];
}

export class RegisterPushTokenDto {
  @ApiProperty({ description: '푸시 토큰' })
  @IsString()
  pushToken: string;

  @ApiPropertyOptional({ description: '디바이스 타입', enum: ['ios', 'android', 'web'] })
  @IsOptional()
  @IsString()
  deviceType?: 'ios' | 'android' | 'web';

  @ApiPropertyOptional({ description: '디바이스 이름' })
  @IsOptional()
  @IsString()
  deviceName?: string;
}

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ description: '예약 알림 활성화' })
  @IsOptional()
  @IsBoolean()
  reservationEnabled?: boolean;

  @ApiPropertyOptional({ description: '복약 알림 활성화' })
  @IsOptional()
  @IsBoolean()
  medicationEnabled?: boolean;

  @ApiPropertyOptional({ description: '진료기록 알림 활성화' })
  @IsOptional()
  @IsBoolean()
  recordEnabled?: boolean;

  @ApiPropertyOptional({ description: '건강팁 알림 활성화' })
  @IsOptional()
  @IsBoolean()
  healthTipEnabled?: boolean;

  @ApiPropertyOptional({ description: '프로모션 알림 활성화' })
  @IsOptional()
  @IsBoolean()
  promotionEnabled?: boolean;

  @ApiPropertyOptional({ description: '방해 금지 시작 시간', example: '22:00' })
  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @ApiPropertyOptional({ description: '방해 금지 종료 시간', example: '08:00' })
  @IsOptional()
  @IsString()
  quietHoursEnd?: string;
}
