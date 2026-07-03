import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TossPaymentsService } from './toss-payments.service';
import { TossPaymentsController } from './toss-payments.controller';
import { TossWebhookController } from './toss-webhook.controller';
import { BillingSchedulerService } from './billing-scheduler.service';
import { AddonsController } from './addons.controller';
import { AddonsService } from './addons.service';
import { User } from '../../database/entities/user.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { SubscriptionAddon } from '../../database/entities/subscription-addon.entity';
import { UsageTracking } from '../../database/entities/usage-tracking.entity';
import { Payment } from '../../database/entities/payment.entity';
import { Refund } from '../../database/entities/refund.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Subscription,
      SubscriptionAddon,
      UsageTracking,
      Payment,
      Refund,
    ]),
    EmailModule,
  ],
  controllers: [TossPaymentsController, TossWebhookController, AddonsController],
  providers: [TossPaymentsService, BillingSchedulerService, AddonsService],
  exports: [TossPaymentsService, AddonsService],
})
export class TossPaymentsModule {}
