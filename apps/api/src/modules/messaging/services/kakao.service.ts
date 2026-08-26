import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SendKakaoAlimtalkDto, MessageResult, MessageChannel, KakaoTemplates } from '../dto';

@Injectable()
export class KakaoService {
  private readonly logger = new Logger(KakaoService.name);
  private readonly baseUrl: string;
  private readonly appKey: string;
  private readonly secretKey: string;
  private readonly plusFriendId: string;
  private readonly enabled: boolean;

  // 템플릿 내용 정의
  private readonly templates: Record<string, { title: string; content: string }> = {
    [KakaoTemplates.RECORD_SHARE]: {
      title: '진료기록 공유',
      content: `[#{clinicName}]
#{patientName}님, 진료 기록이 공유되었습니다.

📅 진료일: #{visitDate}

아래 링크를 눌러 진료 결과를 확인하세요.
#{shareLink}

※ 한의원에서 받으신 진료에 대한 상세 설명과 건강 관리 조언을 확인할 수 있습니다.`,
    },
    [KakaoTemplates.PRESCRIPTION_SHARE]: {
      title: '처방전 공유',
      content: `[#{clinicName}]
#{patientName}님, 처방전이 공유되었습니다.

📋 처방명: #{formulaName}
📅 처방일: #{prescriptionDate}

아래 링크를 눌러 상세 내용을 확인하세요.
#{shareLink}`,
    },
    [KakaoTemplates.RESERVATION_CONFIRM]: {
      title: '예약 확인',
      content: `[#{clinicName}]
#{patientName}님의 예약이 확정되었습니다.

📅 예약일시: #{reservationDate} #{reservationTime}
🏥 한의원: #{clinicName}
📍 주소: #{clinicAddress}

예약 변경이 필요하시면 한의원으로 연락해주세요.
📞 #{clinicPhone}`,
    },
    [KakaoTemplates.RESERVATION_REMINDER]: {
      title: '예약 리마인더',
      content: `[#{clinicName}]
#{patientName}님, 내일 예약이 있습니다.

📅 예약일시: #{reservationDate} #{reservationTime}
🏥 한의원: #{clinicName}

방문 시 보험증을 지참해주세요.`,
    },
    [KakaoTemplates.MEDICATION_TRACK]: {
      title: '복약 안내서',
      content: `[#{clinicName}]
#{patientName}님, 이번에 처방받으신 한약 안내서입니다.

📋 처방: #{formulaName}

아래 링크에서 무엇이 들어 있는지, 어떻게 드시는지, 얼마인지 확인하실 수 있습니다.
복용 중 불편한 점도 같은 곳에 남겨 주시면 한의원에서 확인합니다.
#{trackLink}

※ 수신 거부는 위 링크 하단에서 하실 수 있습니다.`,
    },
    [KakaoTemplates.MEDICATION_CHECKIN]: {
      title: '복약 경과 확인',
      content: `[#{clinicName}]
#{patientName}님, #{dayLabel} 어떠신가요?

오늘 상태를 남겨 주시면 다음 진료 때 한의사가 참고합니다.
#{trackLink}

불편이 심하시면 복용을 멈추고 한의원으로 연락 주세요.

※ 수신 거부는 위 링크 하단에서 하실 수 있습니다.`,
    },
    [KakaoTemplates.MEDICATION_REMINDER]: {
      title: '복약 알림',
      content: `[한메드]
#{patientName}님, #{medicationTime} 복약 시간입니다.

💊 #{formulaName}
📋 #{dosageInstructions}

건강한 하루 되세요! 🌿`,
    },
  };

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    // NHN Cloud 카카오톡 비즈메시지 설정
    this.appKey = this.configService.get('NHN_KAKAO_APP_KEY', '');
    this.secretKey = this.configService.get('NHN_KAKAO_SECRET_KEY', '');
    this.plusFriendId = this.configService.get('KAKAO_PLUS_FRIEND_ID', '@hanmed');
    this.baseUrl = `https://api-alimtalk.cloud.toast.com/alimtalk/v2.3/appkeys/${this.appKey}`;
    this.enabled = !!this.appKey && !!this.secretKey;

    if (!this.enabled) {
      this.logger.warn('카카오 알림톡 서비스가 비활성화되어 있습니다. 환경변수를 확인하세요.');
    }
  }

  /**
   * 실제로 나갈 수 있는 상태인지.
   *
   * 키가 없으면 sendAlimtalk 은 성공을 돌려준다(개발 편의). 그대로 "보냈습니다"
   * 를 화면에 띄우면 아무것도 안 갔는데 보낸 줄 알게 되므로, 호출부가 이 값을
   * 보고 '모의 발송' 임을 구분할 수 있어야 한다.
   */
  isConfigured(): boolean {
    return this.enabled;
  }

  async sendAlimtalk(dto: SendKakaoAlimtalkDto): Promise<MessageResult> {
    const { to, templateCode, templateParams } = dto;

    // 템플릿 내용 생성
    const template = this.templates[templateCode];
    if (!template) {
      return {
        success: false,
        channel: MessageChannel.KAKAO,
        recipient: to,
        error: `존재하지 않는 템플릿: ${templateCode}`,
      };
    }

    const content = this.applyTemplateParams(template.content, templateParams);

    if (!this.enabled) {
      this.logger.log(`[DEV] 카카오 알림톡 발송 시뮬레이션: ${to}`);
      this.logger.log(`템플릿: ${templateCode}`);
      this.logger.log(`내용: ${content}`);
      return {
        success: true,
        channel: MessageChannel.KAKAO,
        recipient: to,
        sentAt: new Date(),
        messageId: `dev-kakao-${Date.now()}`,
      };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/messages`,
          {
            senderKey: this.plusFriendId,
            templateCode: templateCode,
            recipientList: [
              {
                recipientNo: this.formatPhoneNumber(to),
                templateParameter: templateParams,
              },
            ],
          },
          {
            headers: {
              'Content-Type': 'application/json;charset=UTF-8',
              'X-Secret-Key': this.secretKey,
            },
          },
        ),
      );

      const result = response.data;

      if (result.header?.isSuccessful) {
        this.logger.log(`카카오 알림톡 발송 성공: ${to}`);
        return {
          success: true,
          channel: MessageChannel.KAKAO,
          recipient: to,
          sentAt: new Date(),
          messageId: result.body?.data?.requestId,
        };
      } else {
        this.logger.error(`카카오 알림톡 발송 실패: ${result.header?.resultMessage}`);
        // 알림톡 실패 시 SMS 대체 발송 가능
        return {
          success: false,
          channel: MessageChannel.KAKAO,
          recipient: to,
          error: result.header?.resultMessage || '알림톡 발송 실패',
        };
      }
    } catch (error) {
      this.logger.error(`카카오 알림톡 발송 에러: ${error.message}`);
      return {
        success: false,
        channel: MessageChannel.KAKAO,
        recipient: to,
        error: error.message,
      };
    }
  }

  // 친구톡 발송 (마케팅 용도, 수신 동의 필요)
  async sendFriendtalk(to: string, content: string, buttonUrl?: string): Promise<MessageResult> {
    if (!this.enabled) {
      this.logger.log(`[DEV] 카카오 친구톡 발송 시뮬레이션: ${to}`);
      return {
        success: true,
        channel: MessageChannel.KAKAO,
        recipient: to,
        sentAt: new Date(),
        messageId: `dev-friendtalk-${Date.now()}`,
      };
    }

    try {
      const requestBody: any = {
        senderKey: this.plusFriendId,
        recipientList: [
          {
            recipientNo: this.formatPhoneNumber(to),
            content: content,
          },
        ],
      };

      if (buttonUrl) {
        requestBody.recipientList[0].buttons = [
          {
            type: 'WL',
            name: '바로가기',
            linkMo: buttonUrl,
            linkPc: buttonUrl,
          },
        ];
      }

      const response = await firstValueFrom(
        this.httpService.post(
          `https://api-friendtalk.cloud.toast.com/friendtalk/v2.3/appkeys/${this.appKey}/messages`,
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json;charset=UTF-8',
              'X-Secret-Key': this.secretKey,
            },
          },
        ),
      );

      const result = response.data;

      if (result.header?.isSuccessful) {
        return {
          success: true,
          channel: MessageChannel.KAKAO,
          recipient: to,
          sentAt: new Date(),
          messageId: result.body?.data?.requestId,
        };
      } else {
        return {
          success: false,
          channel: MessageChannel.KAKAO,
          recipient: to,
          error: result.header?.resultMessage || '친구톡 발송 실패',
        };
      }
    } catch (error) {
      this.logger.error(`카카오 친구톡 발송 에러: ${error.message}`);
      return {
        success: false,
        channel: MessageChannel.KAKAO,
        recipient: to,
        error: error.message,
      };
    }
  }

  getTemplate(templateCode: string): { title: string; content: string } | null {
    return this.templates[templateCode] || null;
  }

  private applyTemplateParams(content: string, params: Record<string, string>): string {
    let result = content;
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`#{${key}}`, 'g'), value);
    }
    return result;
  }

  private formatPhoneNumber(phone: string): string {
    let formatted = phone.replace(/[^0-9]/g, '');

    if (formatted.startsWith('82')) {
      return formatted;
    }

    if (formatted.startsWith('0')) {
      formatted = '82' + formatted.substring(1);
    }

    return formatted;
  }
}
