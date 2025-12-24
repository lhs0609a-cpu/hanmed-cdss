import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TossPaymentsService } from './toss-payments.service';
import { TossPaymentsController } from './toss-payments.controller';
import { TossWebhookController } from './toss-webhook.controller';
import { BillingSchedulerService } from './billing-scheduler.service';
import { User } from '../../database/entities/user.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { UsageTracking } from '../../database/entities/usage-tracking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Subscription, UsageTracking])],
  controllers: [TossPaymentsController, TossWebhookController],
  providers: [TossPaymentsService, BillingSchedulerService],
  exports: [TossPaymentsService],
})
export class TossPaymentsModule {}
