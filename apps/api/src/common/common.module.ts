import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EncryptionService } from './services/encryption.service';
import { PatientAccessLogService } from './services/patient-access-log.service';
import { PatientAccessLog } from '../database/entities/patient-access-log.entity';
import { ErrorLogService } from './services/error-log.service';
import { ErrorLog } from '../database/entities/error-log.entity';

/**
 * 공통 모듈
 *
 * 전역에서 사용되는 서비스들을 제공합니다:
 * - EncryptionService: 환자 데이터 암호화/복호화
 * - PatientAccessLogService: 환자 기록 접근 로그
 * - ErrorLogService: 서버 오류를 표에 쌓는다(관리자 화면에서 본다)
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([PatientAccessLog, ErrorLog]),
  ],
  providers: [
    EncryptionService,
    PatientAccessLogService,
    ErrorLogService,
  ],
  exports: [
    EncryptionService,
    PatientAccessLogService,
    ErrorLogService,
  ],
})
export class CommonModule {}
