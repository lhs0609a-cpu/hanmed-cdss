import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientAccessLog } from '../../database/entities/patient-access-log.entity';

export interface AccessLogContext {
  userId: string;
  userName: string;
  userRole: string;
  patientId: string;
  patientName?: string;
  recordType: string;
  recordId?: string;
  action: string;
  reason?: string;
  ipAddress: string;
  userAgent?: string;
  clinicId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 환자 기록 접근 로그 서비스
 *
 * 의료법 준수를 위한 PHI(Protected Health Information) 접근 로그 기록
 *
 * 사용 예시:
 * ```typescript
 * await this.accessLogService.log({
 *   userId: req.user.id,
 *   userName: req.user.name,
 *   userRole: req.user.role,
 *   patientId: patient.id,
 *   patientName: patient.name,
 *   recordType: 'medical_record',
 *   action: 'view',
 *   ipAddress: req.ip,
 *   userAgent: req.headers['user-agent'],
 * });
 * ```
 */
@Injectable()
export class PatientAccessLogService {
  private readonly logger = new Logger(PatientAccessLogService.name);

  constructor(
    @InjectRepository(PatientAccessLog)
    private readonly accessLogRepository: Repository<PatientAccessLog>,
  ) {}

  /**
   * 환자 이름 마스킹 (김현성 → 김**)
   */
  private maskPatientName(name?: string): string {
    if (!name || name.length === 0) return '***';
    if (name.length === 1) return '*';
    if (name.length === 2) return name[0] + '*';
    return name[0] + '*'.repeat(name.length - 1);
  }

  /**
   * 접근 로그 기록
   */
  async log(context: AccessLogContext): Promise<PatientAccessLog> {
    try {
      const log = this.accessLogRepository.create({
        userId: context.userId,
        userName: context.userName,
        userRole: context.userRole,
        patientId: context.patientId,
        patientNameMasked: this.maskPatientName(context.patientName),
        recordType: context.recordType,
        recordId: context.recordId,
        action: context.action,
        reason: context.reason,
        ipAddress: context.ipAddress || 'unknown',
        userAgent: context.userAgent,
        clinicId: context.clinicId,
        sessionId: context.sessionId,
        metadata: context.metadata,
        result: 'success',
      });

      const saved = await this.accessLogRepository.save(log);

      this.logger.log(
        `PHI 접근: ${context.userName}(${context.userRole}) → ` +
        `환자 ${this.maskPatientName(context.patientName)} ` +
        `[${context.recordType}/${context.action}]`
      );

      return saved;
    } catch (error) {
      this.logger.error(`접근 로그 기록 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 접근 거부 로그 기록
   */
  async logDenied(
    context: AccessLogContext,
    failureReason: string,
  ): Promise<PatientAccessLog> {
    try {
      const log = this.accessLogRepository.create({
        ...context,
        patientNameMasked: this.maskPatientName(context.patientName),
        ipAddress: context.ipAddress || 'unknown',
        result: 'denied',
        failureReason,
      });

      const saved = await this.accessLogRepository.save(log);

      this.logger.warn(
        `PHI 접근 거부: ${context.userName}(${context.userRole}) → ` +
        `환자 ${this.maskPatientName(context.patientName)} ` +
        `[${context.recordType}/${context.action}] 사유: ${failureReason}`
      );

      return saved;
    } catch (error) {
      this.logger.error(`접근 거부 로그 기록 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 특정 환자의 접근 기록 조회 (감사용)
   */
  async getPatientAccessHistory(
    patientId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ logs: PatientAccessLog[]; total: number }> {
    const qb = this.accessLogRepository
      .createQueryBuilder('log')
      .where('log.patientId = :patientId', { patientId })
      .orderBy('log.accessedAt', 'DESC');

    if (options?.startDate) {
      qb.andWhere('log.accessedAt >= :startDate', { startDate: options.startDate });
    }

    if (options?.endDate) {
      qb.andWhere('log.accessedAt <= :endDate', { endDate: options.endDate });
    }

    const total = await qb.getCount();

    if (options?.limit) {
      qb.take(options.limit);
    }

    if (options?.offset) {
      qb.skip(options.offset);
    }

    const logs = await qb.getMany();

    return { logs, total };
  }

  /**
   * 특정 사용자의 접근 기록 조회 (감사용)
   */
  async getUserAccessHistory(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ logs: PatientAccessLog[]; total: number }> {
    const qb = this.accessLogRepository
      .createQueryBuilder('log')
      .where('log.userId = :userId', { userId })
      .orderBy('log.accessedAt', 'DESC');

    if (options?.startDate) {
      qb.andWhere('log.accessedAt >= :startDate', { startDate: options.startDate });
    }

    if (options?.endDate) {
      qb.andWhere('log.accessedAt <= :endDate', { endDate: options.endDate });
    }

    const total = await qb.getCount();

    if (options?.limit) {
      qb.take(options.limit);
    }

    if (options?.offset) {
      qb.skip(options.offset);
    }

    const logs = await qb.getMany();

    return { logs, total };
  }

  /**
   * 이상 접근 패턴 감지 (대량 조회 등)
   */
  async detectAnomalousAccess(
    userId: string,
    timeWindowMinutes: number = 60,
    threshold: number = 50,
  ): Promise<boolean> {
    const since = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

    const count = await this.accessLogRepository
      .createQueryBuilder('log')
      .where('log.userId = :userId', { userId })
      .andWhere('log.accessedAt >= :since', { since })
      .getCount();

    if (count > threshold) {
      this.logger.warn(
        `⚠️ 이상 접근 패턴 감지: userId=${userId}, ` +
        `${timeWindowMinutes}분 내 ${count}회 접근 (임계값: ${threshold})`
      );
      return true;
    }

    return false;
  }
}
