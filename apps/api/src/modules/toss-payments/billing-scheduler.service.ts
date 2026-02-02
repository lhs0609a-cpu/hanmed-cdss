import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TossPaymentsService } from './toss-payments.service';

@Injectable()
export class BillingSchedulerService {
  private readonly logger = new Logger(BillingSchedulerService.name);

  constructor(private readonly tossPaymentsService: TossPaymentsService) {}

  // 매일 오전 9시에 자동 갱신 처리 (한국 시간)
  @Cron('0 0 9 * * *', {
    name: 'auto-renewal',
    timeZone: 'Asia/Seoul',
  })
  async handleAutoRenewal() {
    this.logger.log('자동 갱신 처리 시작...');

    try {
      await this.tossPaymentsService.processAutoRenewals();
      this.logger.log('자동 갱신 처리 완료');
    } catch (error) {
      this.logger.error('자동 갱신 처리 중 오류 발생:', error);
    }
  }

  // 매일 자정에 만료된 구독 처리 (한국 시간)
  @Cron('0 0 0 * * *', {
    name: 'expired-subscriptions',
    timeZone: 'Asia/Seoul',
  })
  async handleExpiredSubscriptions() {
    this.logger.log('만료된 구독 처리 시작...');

    try {
      await this.tossPaymentsService.processExpiredSubscriptions();
      this.logger.log('만료된 구독 처리 완료');
    } catch (error) {
      this.logger.error('만료된 구독 처리 중 오류 발생:', error);
    }
  }

  // 매일 자정에 만료된 체험 처리 (한국 시간)
  @Cron('0 5 0 * * *', {
    name: 'expired-trials',
    timeZone: 'Asia/Seoul',
  })
  async handleExpiredTrials() {
    this.logger.log('만료된 체험 처리 시작...');

    try {
      await this.tossPaymentsService.processExpiredTrials();
      this.logger.log('만료된 체험 처리 완료');
    } catch (error) {
      this.logger.error('만료된 체험 처리 중 오류 발생:', error);
    }
  }

  // 매일 오전 10시에 체험 종료 임박 알림 (한국 시간)
  @Cron('0 0 10 * * *', {
    name: 'trial-ending-notifications',
    timeZone: 'Asia/Seoul',
  })
  async handleTrialEndingNotifications() {
    this.logger.log('체험 종료 임박 알림 처리 시작...');

    try {
      await this.tossPaymentsService.sendTrialEndingNotifications();
      this.logger.log('체험 종료 임박 알림 처리 완료');
    } catch (error) {
      this.logger.error('체험 종료 임박 알림 처리 중 오류 발생:', error);
    }
  }

  // 매시간 결제 실패 재시도 (한국 시간)
  @Cron('0 0 * * * *', {
    name: 'payment-retry',
    timeZone: 'Asia/Seoul',
  })
  async handlePaymentRetry() {
    this.logger.log('결제 실패 재시도 처리 시작...');

    try {
      await this.tossPaymentsService.processPaymentRetries();
      this.logger.log('결제 실패 재시도 처리 완료');
    } catch (error) {
      this.logger.error('결제 실패 재시도 처리 중 오류 발생:', error);
    }
  }
}
