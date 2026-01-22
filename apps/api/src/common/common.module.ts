import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EncryptionService } from './services/encryption.service';
import { PatientAccessLogService } from './services/patient-access-log.service';
import { PatientAccessLog } from '../database/entities/patient-access-log.entity';

/**
 * 공통 모듈
 *
 * 전역에서 사용되는 서비스들을 제공합니다:
 * - EncryptionService: 환자 데이터 암호화/복호화
 * - PatientAccessLogService: 환자 기록 접근 로그
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([PatientAccessLog]),
  ],
  providers: [
    EncryptionService,
    PatientAccessLogService,
  ],
  exports: [
    EncryptionService,
    PatientAccessLogService,
  ],
})
export class CommonModule {}
