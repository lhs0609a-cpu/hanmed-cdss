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
import { ClinicalCase } from '../../database/entities/clinical-case.entity';
import { Formula } from '../../database/entities/formula.entity';
import { FormulaHerb } from '../../database/entities/formula-herb.entity';
import { Herb } from '../../database/entities/herb.entity';
import { DrugHerbInteraction } from '../../database/entities/drug-herb-interaction.entity';

// Services
import { AuditLogService } from './services/audit-log.service';
import { AdminUsersService } from './services/admin-users.service';
import { AdminSubscriptionsService } from './services/admin-subscriptions.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminSeederService } from './services/admin-seeder.service';
import { AdminClinicsService } from './services/admin-clinics.service';
import { AdminContentService } from './services/admin-content.service';

// Controllers
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminSubscriptionsController } from './controllers/admin-subscriptions.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminAuditLogsController } from './controllers/admin-audit-logs.controller';
import { AdminClinicsController } from './controllers/admin-clinics.controller';
import { AdminContentController } from './controllers/admin-content.controller';

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
      ClinicalCase,
      Formula,
      FormulaHerb,
      Herb,
      DrugHerbInteraction,
    ]),
  ],
  controllers: [
    AdminUsersController,
    AdminSubscriptionsController,
    AdminDashboardController,
    AdminAuditLogsController,
    AdminClinicsController,
    AdminContentController,
  ],
  providers: [
    AuditLogService,
    AdminUsersService,
    AdminSubscriptionsService,
    AdminDashboardService,
    AdminSeederService,
    AdminClinicsService,
    AdminContentService,
  ],
  exports: [AuditLogService],
})
export class AdminModule {}
