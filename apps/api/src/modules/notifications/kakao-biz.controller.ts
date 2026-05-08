import { Body, Controller, HttpCode, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { KakaoBizService, KakaoTemplateKey } from './kakao-biz.service';

class SendKakaoDto {
  @IsEnum([
    'appointment_confirm',
    'appointment_reminder',
    'medication_reminder',
    'follow_up',
    'prescription_ready',
    'visit_thanks',
  ])
  templateKey: KakaoTemplateKey;

  @IsString()
  recipientPhone: string;

  @IsObject()
  variables: Record<string, string>;

  @IsString()
  clinicId: string;

  @IsBoolean()
  patientConsented: boolean;

  @IsOptional()
  @IsBoolean()
  isAdvertising?: boolean;

  @IsOptional()
  @IsObject()
  reference?: { kind: 'appointment' | 'visit' | 'prescription'; id: string };
}

@ApiTags('notifications')
@Controller('notifications/kakao')
export class KakaoBizController {
  constructor(private readonly kakao: KakaoBizService) {}

  @Post('send')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: '카카오 알림톡 단건 발송',
    description:
      '환자 동의가 필요하며, 광고성 메시지는 21시~익일 8시 발송 불가(정통법 50조의2).',
  })
  @HttpCode(200)
  async send(@Request() req: any, @Body() dto: SendKakaoDto) {
    // userId 는 감사 로그용으로 사용 (현 단계에서는 service 내부 logging 으로 충분).
    void req.user.id;
    return this.kakao.send(dto);
  }
}
