import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SendSmsDto, MessageResult, MessageChannel } from '../dto';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly baseUrl: string;
  private readonly appKey: string;
  private readonly secretKey: string;
  private readonly sendNo: string;
  private readonly enabled: boolean;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    // NHN Cloud SMS 설정
    this.appKey = this.configService.get('NHN_SMS_APP_KEY', '');
    this.secretKey = this.configService.get('NHN_SMS_SECRET_KEY', '');
    this.sendNo = this.configService.get('NHN_SMS_SEND_NO', '');
    this.baseUrl = `https://api-sms.cloud.toast.com/sms/v3.0/appKeys/${this.appKey}`;
    this.enabled = !!this.appKey && !!this.secretKey;

    if (!this.enabled) {
      this.logger.warn('SMS 서비스가 비활성화되어 있습니다. 환경변수를 확인하세요.');
    }
  }

  async send(dto: SendSmsDto): Promise<MessageResult> {
    const { to, message, from } = dto;
    const sendNo = from || this.sendNo;

    if (!this.enabled) {
      this.logger.log(`[DEV] SMS 발송 시뮬레이션: ${to} - ${message}`);
      return {
        success: true,
        channel: MessageChannel.SMS,
        recipient: to,
        sentAt: new Date(),
        messageId: `dev-${Date.now()}`,
      };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/sender/sms`,
          {
            body: message,
            sendNo: sendNo,
            recipientList: [
              {
                recipientNo: this.formatPhoneNumber(to),
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
        this.logger.log(`SMS 발송 성공: ${to}`);
        return {
          success: true,
          channel: MessageChannel.SMS,
          recipient: to,
          sentAt: new Date(),
          messageId: result.body?.data?.requestId,
        };
      } else {
        this.logger.error(`SMS 발송 실패: ${result.header?.resultMessage}`);
        return {
          success: false,
          channel: MessageChannel.SMS,
          recipient: to,
          error: result.header?.resultMessage || 'SMS 발송 실패',
        };
      }
    } catch (error) {
      this.logger.error(`SMS 발송 에러: ${error.message}`);
      return {
        success: false,
        channel: MessageChannel.SMS,
        recipient: to,
        error: error.message,
      };
    }
  }

  async sendLms(dto: SendSmsDto): Promise<MessageResult> {
    const { to, message, from } = dto;
    const sendNo = from || this.sendNo;

    if (!this.enabled) {
      this.logger.log(`[DEV] LMS 발송 시뮬레이션: ${to} - ${message}`);
      return {
        success: true,
        channel: MessageChannel.SMS,
        recipient: to,
        sentAt: new Date(),
        messageId: `dev-lms-${Date.now()}`,
      };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/sender/mms`,
          {
            body: message,
            sendNo: sendNo,
            recipientList: [
              {
                recipientNo: this.formatPhoneNumber(to),
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
        this.logger.log(`LMS 발송 성공: ${to}`);
        return {
          success: true,
          channel: MessageChannel.SMS,
          recipient: to,
          sentAt: new Date(),
          messageId: result.body?.data?.requestId,
        };
      } else {
        return {
          success: false,
          channel: MessageChannel.SMS,
          recipient: to,
          error: result.header?.resultMessage || 'LMS 발송 실패',
        };
      }
    } catch (error) {
      this.logger.error(`LMS 발송 에러: ${error.message}`);
      return {
        success: false,
        channel: MessageChannel.SMS,
        recipient: to,
        error: error.message,
      };
    }
  }

  private formatPhoneNumber(phone: string): string {
    // 한국 전화번호 포맷 정리 (하이픈 제거, 국제번호 추가)
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
