import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PatientsModule } from './modules/patients/patients.module';
import { CasesModule } from './modules/cases/cases.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { InteractionsModule } from './modules/interactions/interactions.module';
import { FormulasModule } from './modules/formulas/formulas.module';
import { HerbsModule } from './modules/herbs/herbs.module';
import { CombosModule } from './modules/combos/combos.module';
import { CommunityModule } from './modules/community/community.module';
import { TossPaymentsModule } from './modules/toss-payments/toss-payments.module';
import { PatientAuthModule } from './modules/patient-auth/patient-auth.module';
import { ClinicsModule } from './modules/clinics/clinics.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { PatientRecordsModule } from './modules/patient-records/patient-records.module';
import { PatientPrescriptionsModule } from './modules/patient-prescriptions/patient-prescriptions.module';
import { PatientHealthModule } from './modules/patient-health/patient-health.module';
import { PatientNotificationsModule } from './modules/patient-notifications/patient-notifications.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { AiModule } from './modules/ai/ai.module';
import { AdminModule } from './modules/admin/admin.module';
import { CommonModule } from './common/common.module';
import { EmailModule } from './modules/email/email.module';
import { HealthController } from './health.controller';
import { PatientAccessLog } from './database/entities/patient-access-log.entity';

@Module({
  imports: [
    // 환경 변수 설정
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // HTTP 모듈
    HttpModule,

    // 스케줄러 모듈 (크론잡)
    ScheduleModule.forRoot(),

    // Rate Limiting (브루트포스 공격 방지)
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1초
        limit: 3,  // 초당 3회
      },
      {
        name: 'medium',
        ttl: 10000, // 10초
        limit: 20,  // 10초당 20회
      },
      {
        name: 'long',
        ttl: 60000, // 1분
        limit: 100, // 분당 100회
      },
    ]),

    // TypeORM 데이터베이스 연결
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: true, // TODO: 프로덕션에서는 마이그레이션 사용 권장
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),

    // 환자 접근 로그 테이블
    TypeOrmModule.forFeature([PatientAccessLog]),

    // 공통 모듈 (암호화, 접근 로그 등)
    CommonModule,

    // 이메일 모듈 (비밀번호 재설정 등)
    EmailModule,

    // 기능 모듈
    AuthModule,
    UsersModule,
    PatientsModule,
    CasesModule,
    PrescriptionsModule,
    InteractionsModule,
    FormulasModule,
    HerbsModule,
    CombosModule,
    CommunityModule,
    TossPaymentsModule,

    // 환자 앱 모듈
    PatientAuthModule,
    ClinicsModule,
    ReservationsModule,
    PatientRecordsModule,
    PatientPrescriptionsModule,
    PatientHealthModule,
    PatientNotificationsModule,
    MessagingModule,
    AiModule,

    // 관리자 모듈
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    // 전역 Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
