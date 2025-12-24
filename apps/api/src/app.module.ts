import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
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
import { HealthController } from './health.controller';

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

    // TypeORM 데이터베이스 연결
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),

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
  ],
  controllers: [HealthController],
})
export class AppModule {}
