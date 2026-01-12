import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { User } from '../../database/entities/user.entity';
import { AdminAuditLog } from '../../database/entities/admin-audit-log.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { UsageTracking } from '../../database/entities/usage-tracking.entity';
import { Payment } from '../../database/entities/payment.entity';
import { PatientAccount } from '../../database/entities/patient-account.entity';
import { Clinic } from '../../database/entities/clinic.entity';

// Services
import { AuditLogService } from './services/audit-log.service';
import { AdminUsersService } from './services/admin-users.service';
import { AdminSubscriptionsService } from './services/admin-subscriptions.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminSeederService } from './services/admin-seeder.service';

// Controllers
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminSubscriptionsController } from './controllers/admin-subscriptions.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminAuditLogsController } from './controllers/admin-audit-logs.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      AdminAuditLog,
      Subscription,
      UsageTracking,
      Payment,
      PatientAccount,
      Clinic,
    ]),
  ],
  controllers: [
    AdminUsersController,
    AdminSubscriptionsController,
    AdminDashboardController,
    AdminAuditLogsController,
  ],
  providers: [
    AuditLogService,
    AdminUsersService,
    AdminSubscriptionsService,
    AdminDashboardService,
    AdminSeederService,
  ],
  exports: [AuditLogService],
})
export class AdminModule {}
