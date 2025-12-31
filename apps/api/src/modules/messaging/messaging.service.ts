import { Injectable, Logger } from '@nestjs/common';
import { SmsService } from './services/sms.service';
import { KakaoService } from './services/kakao.service';
import {
  SendSmsDto,
  SendKakaoAlimtalkDto,
  SendMessageDto,
  MessageResult,
  MessageChannel,
  KakaoTemplates,
} from './dto';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private smsService: SmsService,
    private kakaoService: KakaoService,
  ) {}

  // 통합 메시지 발송
  async send(dto: SendMessageDto): Promise<MessageResult> {
    switch (dto.channel) {
      case MessageChannel.SMS:
        return this.sendSms({ to: dto.to, message: dto.message! });
      case MessageChannel.KAKAO:
        return this.sendKakaoAlimtalk({
          to: dto.to,
          templateCode: dto.templateCode!,
          templateParams: dto.templateParams!,
        });
      default:
        return {
          success: false,
          channel: dto.channel,
          recipient: dto.to,
          error: '지원하지 않는 채널입니다.',
        };
    }
  }

  // SMS 발송
  async sendSms(dto: SendSmsDto): Promise<MessageResult> {
    // 90바이트 초과 시 LMS로 자동 변환
    const byteLength = Buffer.byteLength(dto.message, 'utf8');
    if (byteLength > 90) {
      return this.smsService.sendLms(dto);
    }
    return this.smsService.send(dto);
  }

  // 카카오 알림톡 발송
  async sendKakaoAlimtalk(dto: SendKakaoAlimtalkDto): Promise<MessageResult> {
    return this.kakaoService.sendAlimtalk(dto);
  }

  // 카카오 친구톡 발송
  async sendKakaoFriendtalk(to: string, content: string, buttonUrl?: string): Promise<MessageResult> {
    return this.kakaoService.sendFriendtalk(to, content, buttonUrl);
  }

  // 카카오 알림톡 발송, 실패 시 SMS 대체 발송
  async sendKakaoWithSmsFallback(
    dto: SendKakaoAlimtalkDto,
    smsMessage: string,
  ): Promise<MessageResult> {
    const kakaoResult = await this.sendKakaoAlimtalk(dto);

    if (kakaoResult.success) {
      return kakaoResult;
    }

    this.logger.log(`카카오 알림톡 실패, SMS로 대체 발송: ${dto.to}`);
    return this.sendSms({ to: dto.to, message: smsMessage });
  }

  // === 편의 메서드들 ===

  // 진료기록 공유 알림
  async sendRecordShareNotification(params: {
    phone: string;
    patientName: string;
    clinicName: string;
    visitDate: string;
    shareLink: string;
  }): Promise<MessageResult> {
    const smsMessage = `[${params.clinicName}] ${params.patientName}님, 진료 기록이 공유되었습니다.\n\n앱에서 확인하세요: ${params.shareLink}\n\n※ 앱이 없으시면 링크를 눌러 다운로드할 수 있습니다.`;

    return this.sendKakaoWithSmsFallback(
      {
        to: params.phone,
        templateCode: KakaoTemplates.RECORD_SHARE,
        templateParams: {
          patientName: params.patientName,
          clinicName: params.clinicName,
          visitDate: params.visitDate,
          shareLink: params.shareLink,
        },
      },
      smsMessage,
    );
  }

  // 처방전 공유 알림
  async sendPrescriptionShareNotification(params: {
    phone: string;
    patientName: string;
    clinicName: string;
    formulaName: string;
    prescriptionDate: string;
    shareLink: string;
  }): Promise<MessageResult> {
    const smsMessage = `[${params.clinicName}] ${params.patientName}님, 처방전이 공유되었습니다.\n\n처방: ${params.formulaName}\n\n앱에서 확인하세요: ${params.shareLink}`;

    return this.sendKakaoWithSmsFallback(
      {
        to: params.phone,
        templateCode: KakaoTemplates.PRESCRIPTION_SHARE,
        templateParams: {
          patientName: params.patientName,
          clinicName: params.clinicName,
          formulaName: params.formulaName,
          prescriptionDate: params.prescriptionDate,
          shareLink: params.shareLink,
        },
      },
      smsMessage,
    );
  }

  // 예약 확인 알림
  async sendReservationConfirmNotification(params: {
    phone: string;
    patientName: string;
    clinicName: string;
    clinicAddress: string;
    clinicPhone: string;
    reservationDate: string;
    reservationTime: string;
  }): Promise<MessageResult> {
    const smsMessage = `[${params.clinicName}] ${params.patientName}님의 예약이 확정되었습니다.\n\n예약: ${params.reservationDate} ${params.reservationTime}\n주소: ${params.clinicAddress}\n문의: ${params.clinicPhone}`;

    return this.sendKakaoWithSmsFallback(
      {
        to: params.phone,
        templateCode: KakaoTemplates.RESERVATION_CONFIRM,
        templateParams: {
          patientName: params.patientName,
          clinicName: params.clinicName,
          clinicAddress: params.clinicAddress,
          clinicPhone: params.clinicPhone,
          reservationDate: params.reservationDate,
          reservationTime: params.reservationTime,
        },
      },
      smsMessage,
    );
  }

  // 예약 리마인더 알림
  async sendReservationReminderNotification(params: {
    phone: string;
    patientName: string;
    clinicName: string;
    reservationDate: string;
    reservationTime: string;
  }): Promise<MessageResult> {
    const smsMessage = `[${params.clinicName}] ${params.patientName}님, 내일 예약이 있습니다.\n\n예약: ${params.reservationDate} ${params.reservationTime}\n\n방문 시 보험증을 지참해주세요.`;

    return this.sendKakaoWithSmsFallback(
      {
        to: params.phone,
        templateCode: KakaoTemplates.RESERVATION_REMINDER,
        templateParams: {
          patientName: params.patientName,
          clinicName: params.clinicName,
          reservationDate: params.reservationDate,
          reservationTime: params.reservationTime,
        },
      },
      smsMessage,
    );
  }

  // 복약 알림
  async sendMedicationReminderNotification(params: {
    phone: string;
    patientName: string;
    formulaName: string;
    medicationTime: string;
    dosageInstructions: string;
  }): Promise<MessageResult> {
    const smsMessage = `[한메드] ${params.patientName}님, ${params.medicationTime} 복약 시간입니다.\n\n${params.formulaName}\n${params.dosageInstructions}`;

    return this.sendKakaoWithSmsFallback(
      {
        to: params.phone,
        templateCode: KakaoTemplates.MEDICATION_REMINDER,
        templateParams: {
          patientName: params.patientName,
          formulaName: params.formulaName,
          medicationTime: params.medicationTime,
          dosageInstructions: params.dosageInstructions,
        },
      },
      smsMessage,
    );
  }
}
