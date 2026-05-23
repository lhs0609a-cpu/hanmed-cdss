import {
  Controller,
  Post,
  Body,
  HttpCode,
  Logger,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../../database/entities/user.entity';
import { Subscription, SubscriptionStatus } from '../../database/entities/subscription.entity';
import { CacheService } from '../cache/cache.service';
import * as crypto from 'crypto';

// 웹훅 전송 시각이 현재와 이만큼 이상 차이 나면 거부 (재전송 공격 폭 제한)
const WEBHOOK_MAX_SKEW_MS = 5 * 60 * 1000;
// 처리 완료한 transmissionId 보관 기간 (재처리 방지)
const WEBHOOK_DEDUPE_PREFIX = 'webhook:toss:seen';
const WEBHOOK_DEDUPE_TTL_SECONDS = 24 * 60 * 60;

interface TossWebhookPayload {
  eventType: string;
  createdAt: string;
  data: {
    paymentKey?: string;
    orderId?: string;
    status?: string;
    method?: string;
    totalAmount?: number;
    approvedAt?: string;
    billingKey?: string;
    customerKey?: string;
    secret?: string;
    cancels?: Array<{
      cancelReason: string;
      canceledAt: string;
      cancelAmount: number;
    }>;
  };
}

@ApiTags('webhook')
@Controller('webhook')
export class TossWebhookController {
  private readonly logger = new Logger(TossWebhookController.name);
  private readonly secretKey: string;

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    private cacheService: CacheService,
  ) {
    this.secretKey = this.configService.get('TOSS_SECRET_KEY') || '';
  }

  @Post('toss')
  @Public()
  @HttpCode(200)
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: '토스페이먼츠 웹훅 엔드포인트' })
  async handleTossWebhook(
    @Body() payload: TossWebhookPayload,
    @Headers('tosspayments-webhook-signature') signature?: string,
    @Headers('tosspayments-webhook-transmission-time') transmissionTime?: string,
    @Headers('tosspayments-webhook-transmission-id') transmissionId?: string,
  ) {
    this.logger.log(`Received Toss webhook: ${payload.eventType}`);

    // 시그니처 검증 (필수)
    if (!signature || !transmissionTime) {
      this.logger.warn('Missing webhook signature or transmission time');
      throw new BadRequestException('Missing webhook signature');
    }

    // 전송 시각 신선도 검증 — 오래된(또는 미래의) 요청은 재전송 공격으로 간주.
    const sentAt = Date.parse(transmissionTime);
    if (Number.isNaN(sentAt) || Math.abs(Date.now() - sentAt) > WEBHOOK_MAX_SKEW_MS) {
      this.logger.warn(`Webhook transmission time out of range: ${transmissionTime}`);
      throw new BadRequestException('Webhook transmission time out of range');
    }

    const isValid = this.verifyWebhookSignature(
      JSON.stringify(payload),
      transmissionTime,
      signature,
    );

    if (!isValid) {
      this.logger.warn('Invalid webhook signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    // 재처리(replay) 방지 — 동일 transmissionId 는 한 번만 처리하고 이후엔 즉시 ack.
    if (transmissionId) {
      const seen = await this.cacheService.get<boolean>(transmissionId, {
        prefix: WEBHOOK_DEDUPE_PREFIX,
      });
      if (seen) {
        this.logger.log(`Duplicate webhook ignored: ${transmissionId}`);
        return { success: true, duplicate: true };
      }
    }

    try {
      switch (payload.eventType) {
        case 'PAYMENT_STATUS_CHANGED':
          await this.handlePaymentStatusChanged(payload.data);
          break;
        case 'BILLING_KEY_DELETED':
          await this.handleBillingKeyDeleted(payload.data);
          break;
        case 'PAYMENT_DONE':
          await this.handlePaymentDone(payload.data);
          break;
        case 'PAYMENT_CANCELED':
          await this.handlePaymentCanceled(payload.data);
          break;
        case 'PAYMENT_FAILED':
          await this.handlePaymentFailed(payload.data);
          break;
        default:
          this.logger.log(`Unhandled event type: ${payload.eventType}`);
      }

      // 처리 완료 표시 — 이후 동일 transmissionId 재전송은 무시된다.
      if (transmissionId) {
        await this.cacheService.set(transmissionId, true, {
          prefix: WEBHOOK_DEDUPE_PREFIX,
          ttl: WEBHOOK_DEDUPE_TTL_SECONDS,
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Webhook processing error: ${error.message}`, error.stack);
      throw error;
    }
  }

  // HMAC SHA-256 시그니처 검증
  private verifyWebhookSignature(
    payload: string,
    transmissionTime: string,
    signature: string,
  ): boolean {
    try {
      // 보안 키로 HMAC SHA-256 해싱
      const message = `${payload}:${transmissionTime}`;
      const hmac = crypto
        .createHmac('sha256', this.secretKey)
        .update(message)
        .digest('base64');

      // v1: 접두사 제거 후 비교
      const signatureValue = signature.replace('v1:', '');
      const signatureParts = signatureValue.split(',');

      return signatureParts.some((part) => {
        try {
          const decoded = Buffer.from(part.trim(), 'base64').toString();
          return this.timingSafeEqual(decoded, hmac);
        } catch {
          return this.timingSafeEqual(part.trim(), hmac);
        }
      });
    } catch (error) {
      this.logger.error('Signature verification error:', error);
      return false;
    }
  }

  /** 길이가 다르면 즉시 false, 같으면 상수 시간 비교 (타이밍 공격 방지). */
  private timingSafeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  private async handlePaymentStatusChanged(data: TossWebhookPayload['data']) {
    this.logger.log(`Payment status changed: ${data.paymentKey} -> ${data.status}`);

    if (data.status === 'CANCELED' && data.cancels) {
      this.logger.log(
        `Payment canceled: ${data.paymentKey}, reason: ${data.cancels[0]?.cancelReason}`,
      );
    }
  }

  private async handlePaymentDone(data: TossWebhookPayload['data']) {
    this.logger.log(`Payment completed: ${data.paymentKey}`);
    // 결제 완료 후 추가 처리 (이미 서비스에서 처리됨)
  }

  private async handlePaymentCanceled(data: TossWebhookPayload['data']) {
    this.logger.log(`Payment canceled: ${data.paymentKey}`);

    if (data.orderId) {
      // orderId에서 userId 추출 (order_userId_timestamp 형식)
      const parts = data.orderId.split('_');
      if (parts.length >= 2) {
        const userId = parts[1];

        // 해당 구독 찾아서 취소 처리
        const subscription = await this.subscriptionRepository.findOne({
          where: { stripeSubscriptionId: data.paymentKey },
        });

        if (subscription) {
          subscription.status = SubscriptionStatus.CANCELED;
          subscription.canceledAt = new Date();
          await this.subscriptionRepository.save(subscription);
          this.logger.log(`Subscription canceled via webhook: ${subscription.id}`);
        }
      }
    }
  }

  private async handlePaymentFailed(data: TossWebhookPayload['data']) {
    this.logger.log(`Payment failed: ${data.paymentKey}`);

    if (data.orderId) {
      const parts = data.orderId.split('_');
      if (parts.length >= 2) {
        const userId = parts[1];

        // 구독 상태를 PAST_DUE로 변경
        const subscription = await this.subscriptionRepository.findOne({
          where: { userId, status: SubscriptionStatus.ACTIVE },
        });

        if (subscription) {
          subscription.status = SubscriptionStatus.PAST_DUE;
          subscription.lastPaymentError = '결제 실패 (웹훅)';
          await this.subscriptionRepository.save(subscription);
          this.logger.log(`Subscription marked as past_due: ${subscription.id}`);
        }
      }
    }
  }

  private async handleBillingKeyDeleted(data: TossWebhookPayload['data']) {
    this.logger.log(`Billing key deleted: ${data.billingKey}`);

    if (data.customerKey) {
      // customerKey에서 userId 추출 (customer_userId 형식)
      const parts = data.customerKey.split('_');
      if (parts.length >= 2) {
        const userId = parts[1];

        // 사용자의 빌링키 삭제
        await this.userRepository.update(userId, {
          tossBillingKey: null,
        });

        this.logger.log(`Billing key removed for user: ${userId}`);
      }
    }
  }
}
