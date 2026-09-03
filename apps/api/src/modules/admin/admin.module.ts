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
import { ErrorLog } from '../../database/entities/error-log.entity';

// Services
import { AuditLogService } from './services/audit-log.service';
import { AdminUsersService } from './services/admin-users.service';
import { AdminSubscriptionsService } from './services/admin-subscriptions.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminSeederService } from './services/admin-seeder.service';
import { AdminClinicsService } from './services/admin-clinics.service';
import { AdminContentService } from './services/admin-content.service';
import { AdminOpsService } from './services/admin-ops.service';

// Controllers
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminSubscriptionsController } from './controllers/admin-subscriptions.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminAuditLogsController } from './controllers/admin-audit-logs.controller';
import { AdminClinicsController } from './controllers/admin-clinics.controller';
import { AdminContentController } from './controllers/admin-content.controller';
import { AdminCaseAccessController } from './controllers/admin-case-access.controller';
import { AdminOpsController } from './controllers/admin-ops.controller';

// 치험례 열람 통제 — 유출 역추적·잠금 해제를 관리자 화면에서 쓰려면 필요하다.
import { CasesModule } from '../cases/cases.module';

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
      ErrorLog,
    ]),
    CasesModule,
  ],
  controllers: [
    AdminUsersController,
    AdminSubscriptionsController,
    AdminDashboardController,
    AdminOpsController,
    AdminAuditLogsController,
    AdminClinicsController,
    AdminContentController,
    AdminCaseAccessController,
  ],
  providers: [
    AuditLogService,
    AdminUsersService,
    AdminSubscriptionsService,
    AdminDashboardService,
    AdminSeederService,
    AdminClinicsService,
    AdminContentService,
    AdminOpsService,
  ],
  exports: [AuditLogService],
})
export class AdminModule {}
