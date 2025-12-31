import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MessageChannel {
  SMS = 'sms',
  KAKAO = 'kakao',
  PUSH = 'push',
}

export class SendSmsDto {
  @ApiProperty({ description: '수신자 전화번호' })
  @IsString()
  to: string;

  @ApiProperty({ description: '메시지 내용' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: '발신자 번호' })
  @IsString()
  @IsOptional()
  from?: string;
}

export class SendKakaoAlimtalkDto {
  @ApiProperty({ description: '수신자 전화번호' })
  @IsString()
  to: string;

  @ApiProperty({ description: '템플릿 코드' })
  @IsString()
  templateCode: string;

  @ApiProperty({ description: '템플릿 변수' })
  @IsObject()
  templateParams: Record<string, string>;
}

export class SendMessageDto {
  @ApiProperty({ enum: MessageChannel, description: '발송 채널' })
  @IsEnum(MessageChannel)
  channel: MessageChannel;

  @ApiProperty({ description: '수신자 전화번호' })
  @IsString()
  to: string;

  @ApiPropertyOptional({ description: '메시지 내용 (SMS용)' })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional({ description: '템플릿 코드 (카카오용)' })
  @IsString()
  @IsOptional()
  templateCode?: string;

  @ApiPropertyOptional({ description: '템플릿 변수 (카카오용)' })
  @IsObject()
  @IsOptional()
  templateParams?: Record<string, string>;
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  channel: MessageChannel;
  recipient: string;
  sentAt?: Date;
  error?: string;
}

// 카카오 알림톡 템플릿 코드 상수
export const KakaoTemplates = {
  RECORD_SHARE: 'RECORD_SHARE', // 진료기록 공유
  PRESCRIPTION_SHARE: 'PRESCRIPTION_SHARE', // 처방전 공유
  RESERVATION_CONFIRM: 'RESERVATION_CONFIRM', // 예약 확인
  RESERVATION_REMINDER: 'RESERVATION_REMINDER', // 예약 리마인더
  MEDICATION_REMINDER: 'MEDICATION_REMINDER', // 복약 리마인더
} as const;
