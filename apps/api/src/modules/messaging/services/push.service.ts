import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { MessageResult, MessageChannel } from '../dto';

export interface PushNotificationPayload {
  to: string | string[]; // Expo push token(s)
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number; // Time to live in seconds
  expiration?: number; // Unix timestamp
  categoryId?: string;
}

export interface ExpoPushTicket {
  id?: string;
  status: 'ok' | 'error';
  message?: string;
  details?: {
    error?: 'DeviceNotRegistered' | 'InvalidCredentials' | 'MessageTooBig' | 'MessageRateExceeded';
  };
}

export interface ExpoPushReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: {
    error?: string;
  };
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly expoPushUrl = 'https://exp.host/--/api/v2/push/send';
  private readonly expoReceiptsUrl = 'https://exp.host/--/api/v2/push/getReceipts';
  private readonly accessToken: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    // Expo Access Token (선택사항, 높은 처리량이 필요할 때 사용)
    this.accessToken = this.configService.get('EXPO_ACCESS_TOKEN', '');
  }

  // 단일 푸시 발송
  async send(payload: PushNotificationPayload): Promise<MessageResult> {
    const tokens = Array.isArray(payload.to) ? payload.to : [payload.to];

    // Expo 푸시 토큰 형식 검증
    const validTokens = tokens.filter((token) => this.isValidExpoPushToken(token));

    if (validTokens.length === 0) {
      return {
        success: false,
        channel: MessageChannel.PUSH,
        recipient: tokens[0] || '',
        error: '유효한 푸시 토큰이 없습니다.',
      };
    }

    try {
      const messages = validTokens.map((token) => ({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: payload.sound ?? 'default',
        badge: payload.badge,
        channelId: payload.channelId ?? 'default',
        priority: payload.priority ?? 'high',
        ttl: payload.ttl,
        expiration: payload.expiration,
        categoryId: payload.categoryId,
      }));

      const response = await firstValueFrom(
        this.httpService.post<{ data: ExpoPushTicket[] }>(
          this.expoPushUrl,
          messages,
          {
            headers: this.getHeaders(),
          },
        ),
      );

      const tickets = response.data.data;
      const successCount = tickets.filter((t) => t.status === 'ok').length;
      const failedTokens: string[] = [];

      tickets.forEach((ticket, index) => {
        if (ticket.status === 'error') {
          this.logger.error(
            `푸시 발송 실패: ${ticket.message} (${ticket.details?.error})`,
          );

          // DeviceNotRegistered인 경우 토큰 삭제 필요
          if (ticket.details?.error === 'DeviceNotRegistered') {
            failedTokens.push(validTokens[index]);
          }
        }
      });

      if (successCount > 0) {
        this.logger.log(`푸시 발송 성공: ${successCount}/${validTokens.length}`);
        return {
          success: true,
          channel: MessageChannel.PUSH,
          recipient: validTokens.join(', '),
          sentAt: new Date(),
          messageId: tickets.find((t) => t.id)?.id,
        };
      } else {
        return {
          success: false,
          channel: MessageChannel.PUSH,
          recipient: validTokens[0],
          error: tickets[0]?.message || '푸시 발송 실패',
        };
      }
    } catch (error) {
      this.logger.error(`푸시 발송 에러: ${error.message}`);
      return {
        success: false,
        channel: MessageChannel.PUSH,
        recipient: tokens[0],
        error: error.message,
      };
    }
  }

  // 다중 사용자에게 푸시 발송 (배치)
  async sendBatch(
    payloads: PushNotificationPayload[],
  ): Promise<MessageResult[]> {
    // Expo는 한 번에 최대 100개 메시지 처리 가능
    const batchSize = 100;
    const results: MessageResult[] = [];

    for (let i = 0; i < payloads.length; i += batchSize) {
      const batch = payloads.slice(i, i + batchSize);
      const batchPromises = batch.map((payload) => this.send(payload));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  // 푸시 발송 결과 확인 (ticket ID로 조회)
  async getReceipts(ticketIds: string[]): Promise<Record<string, ExpoPushReceipt>> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<{ data: Record<string, ExpoPushReceipt> }>(
          this.expoReceiptsUrl,
          { ids: ticketIds },
          {
            headers: this.getHeaders(),
          },
        ),
      );

      return response.data.data;
    } catch (error) {
      this.logger.error(`푸시 영수증 조회 에러: ${error.message}`);
      return {};
    }
  }

  // === 편의 메서드 ===

  // 진료기록 공유 푸시
  async sendRecordSharePush(
    pushToken: string | string[],
    clinicName: string,
    recordId: string,
  ): Promise<MessageResult> {
    return this.send({
      to: pushToken,
      title: '진료 기록이 공유되었습니다',
      body: `${clinicName}에서 진료 결과를 공유했습니다. 탭하여 확인하세요.`,
      data: {
        type: 'record',
        recordId,
        screen: 'RecordDetail',
      },
      categoryId: 'record',
    });
  }

  // 처방전 공유 푸시
  async sendPrescriptionSharePush(
    pushToken: string | string[],
    clinicName: string,
    prescriptionId: string,
    formulaName: string,
  ): Promise<MessageResult> {
    return this.send({
      to: pushToken,
      title: '처방전이 공유되었습니다',
      body: `${clinicName}에서 "${formulaName}" 처방전을 공유했습니다.`,
      data: {
        type: 'prescription',
        prescriptionId,
        screen: 'PrescriptionDetail',
      },
      categoryId: 'prescription',
    });
  }

  // 예약 확인 푸시
  async sendReservationConfirmPush(
    pushToken: string | string[],
    clinicName: string,
    reservationId: string,
    dateTime: string,
  ): Promise<MessageResult> {
    return this.send({
      to: pushToken,
      title: '예약이 확정되었습니다',
      body: `${clinicName} - ${dateTime}`,
      data: {
        type: 'reservation',
        reservationId,
        screen: 'ReservationDetail',
      },
      categoryId: 'reservation',
    });
  }

  // 예약 리마인더 푸시
  async sendReservationReminderPush(
    pushToken: string | string[],
    clinicName: string,
    reservationId: string,
    dateTime: string,
  ): Promise<MessageResult> {
    return this.send({
      to: pushToken,
      title: '내일 예약이 있습니다',
      body: `${clinicName} - ${dateTime}`,
      data: {
        type: 'reservation_reminder',
        reservationId,
        screen: 'ReservationDetail',
      },
      categoryId: 'reservation',
    });
  }

  // 복약 알림 푸시
  async sendMedicationReminderPush(
    pushToken: string | string[],
    formulaName: string,
    reminderId: string,
    time: string,
  ): Promise<MessageResult> {
    return this.send({
      to: pushToken,
      title: `${time} 복약 시간입니다`,
      body: `${formulaName}을(를) 복용해주세요.`,
      data: {
        type: 'medication',
        reminderId,
        screen: 'Health',
      },
      categoryId: 'medication',
      priority: 'high',
    });
  }

  // 건강 팁 푸시
  async sendHealthTipPush(
    pushToken: string | string[],
    title: string,
    body: string,
    tipId?: string,
  ): Promise<MessageResult> {
    return this.send({
      to: pushToken,
      title,
      body,
      data: {
        type: 'health_tip',
        tipId,
        screen: 'Health',
      },
      categoryId: 'health_tip',
      priority: 'normal',
    });
  }

  // Expo 푸시 토큰 유효성 검사
  private isValidExpoPushToken(token: string): boolean {
    return (
      typeof token === 'string' &&
      (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['))
    );
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }
}
