import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  MedicationReminder,
  PatientAccount,
  PatientNotification,
  NotificationType,
  MedicationLog,
  MedicationLogStatus,
} from '../../database/entities';
import { PushService } from '../messaging/services/push.service';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';

interface ReminderWithPatient extends MedicationReminder {
  patient: PatientAccount & {
    pushTokens?: Array<{
      token: string;
      deviceType?: string;
      deviceName?: string;
    }>;
    notificationSettings?: {
      medicationEnabled?: boolean;
      quietHoursStart?: string;
      quietHoursEnd?: string;
    };
  };
}

// 중복 발송 방지 락 prefix — Redis 키 네임스페이스
const REMINDER_LOCK_PREFIX = 'med:reminder:sent';
const REMINDER_LOCK_TTL_SECONDS = 5 * 60; // 5분 쿨다운

@Injectable()
export class MedicationSchedulerService {
  private readonly logger = new Logger(MedicationSchedulerService.name);

  constructor(
    @InjectRepository(MedicationReminder)
    private reminderRepository: Repository<MedicationReminder>,
    @InjectRepository(PatientAccount)
    private patientRepository: Repository<PatientAccount>,
    @InjectRepository(PatientNotification)
    private notificationRepository: Repository<PatientNotification>,
    @InjectRepository(MedicationLog)
    private logRepository: Repository<MedicationLog>,
    private pushService: PushService,
    private configService: ConfigService,
    private cacheService: CacheService,
  ) {}

  // 매 분마다 실행
  @Cron(CronExpression.EVERY_MINUTE)
  async checkMedicationReminders() {
    const now = new Date();
    const currentTime = this.formatTime(now);
    const currentDay = now.getDay(); // 0 = Sunday

    this.logger.debug(`복약 알림 체크: ${currentTime}, 요일: ${currentDay}`);

    try {
      // 현재 시간에 해당하는 활성화된 알림 조회
      const reminders = await this.getActiveRemindersForTime(currentTime, currentDay);

      if (reminders.length === 0) {
        return;
      }

      this.logger.log(`발송할 복약 알림: ${reminders.length}건`);

      for (const reminder of reminders) {
        await this.sendMedicationReminder(reminder);
      }

      // Redis TTL 이 자동으로 키를 만료시킴 → 별도 cleanup 불필요
    } catch (error) {
      this.logger.error(`복약 알림 체크 실패: ${error.message}`);
    }
  }

  // 특정 시간대 알림 조회
  private async getActiveRemindersForTime(
    time: string,
    dayOfWeek: number,
  ): Promise<ReminderWithPatient[]> {
    // 시간 범위 계산 (±1분)
    const [hours, minutes] = time.split(':').map(Number);
    const timeStart = this.formatTime(new Date(0, 0, 0, hours, minutes - 1));
    const timeEnd = this.formatTime(new Date(0, 0, 0, hours, minutes + 1));

    const reminders = await this.reminderRepository
      .createQueryBuilder('reminder')
      .leftJoinAndSelect('reminder.patient', 'patient')
      .leftJoinAndSelect('reminder.prescription', 'prescription')
      .where('reminder.isActive = :isActive', { isActive: true })
      .andWhere('reminder.reminderTime >= :timeStart', { timeStart })
      .andWhere('reminder.reminderTime <= :timeEnd', { timeEnd })
      .andWhere(':dayOfWeek = ANY(reminder.reminderDays)', { dayOfWeek })
      .getMany();

    return reminders as ReminderWithPatient[];
  }

  // 복약 알림 발송
  private async sendMedicationReminder(reminder: ReminderWithPatient) {
    const lockKey = `${reminder.id}-${this.formatDate(new Date())}`;

    // 분산 락(SETNX) — 멀티 인스턴스/오토스케일 환경에서도 한 알림은 1회만 발송.
    // Redis 가능 시: 잠금 획득 실패면 다른 워커가 이미 발송함.
    // Redis 다운 시: 단일 인스턴스 가정으로 통과 (안전한 graceful degrade).
    let lockAcquired = true;
    if (this.cacheService.isAvailable()) {
      lockAcquired = await this.cacheService.setNx(
        lockKey,
        Date.now(),
        REMINDER_LOCK_TTL_SECONDS,
        { prefix: REMINDER_LOCK_PREFIX },
      );
      if (!lockAcquired) {
        this.logger.debug(`알림 쿨다운 중(분산): ${reminder.id}`);
        return;
      }
    }

    // 환자 정보 조회 (푸시 토큰 포함)
    const patient = await this.patientRepository.findOne({
      where: { id: reminder.patientId },
    });

    if (!patient) {
      this.logger.warn(`환자 없음: ${reminder.patientId}`);
      // 락을 잡고도 발송 못 한 경우 해제 — 다음 분 사이클에 재시도 가능하게
      if (lockAcquired) {
        await this.cacheService
          .delete(lockKey, { prefix: REMINDER_LOCK_PREFIX })
          .catch(() => undefined);
      }
      return;
    }

    // 알림 설정 확인 (null safety 강화 — JSON 컬럼이 null/문자열일 수 있음)
    const settings =
      patient.notificationSettings && typeof patient.notificationSettings === 'object'
        ? patient.notificationSettings
        : {};
    if (settings.medicationEnabled === false) {
      this.logger.debug(`복약 알림 비활성화: ${reminder.patientId}`);
      return;
    }

    // 방해 금지 시간 확인
    if (this.isInQuietHours(settings.quietHoursStart, settings.quietHoursEnd)) {
      this.logger.debug(`방해 금지 시간: ${reminder.patientId}`);
      return;
    }

    // 알림 메시지 구성
    const title = reminder.title || '복약 시간입니다';
    const body = reminder.prescription
      ? `${reminder.prescription.formulaName}을(를) 복용해주세요.`
      : reminder.notes || '약을 복용해주세요.';

    // DB 알림 저장
    const notification = this.notificationRepository.create({
      patientId: reminder.patientId,
      type: NotificationType.MEDICATION,
      title,
      body,
      data: {
        reminderId: reminder.id,
        prescriptionId: reminder.prescriptionId,
        reminderTime: reminder.reminderTime,
      },
    });
    await this.notificationRepository.save(notification);

    // 푸시 알림 발송
    if (patient.pushTokens?.length) {
      const tokens = patient.pushTokens.map((t) => t.token);
      try {
        const result = await this.pushService.sendMedicationReminderPush(
          tokens,
          reminder.prescription?.formulaName || reminder.title,
          reminder.id,
          this.formatTimeKorean(reminder.reminderTime),
        );

        if (result.success) {
          this.logger.log(`복약 알림 발송 성공: ${reminder.patientId}`);
          // 락은 이미 setNx 로 잡혀 있음 — TTL 만료까지 유지되어 중복 발송 방지
        } else {
          this.logger.error(`복약 알림 발송 실패: ${result.error}`);
          // 발송 실패 시 락 해제 — 다음 사이클에 재시도
          if (lockAcquired && this.cacheService.isAvailable()) {
            await this.cacheService
              .delete(lockKey, { prefix: REMINDER_LOCK_PREFIX })
              .catch(() => undefined);
          }
        }
      } catch (error) {
        this.logger.error(`푸시 발송 에러: ${error.message}`);
        if (lockAcquired && this.cacheService.isAvailable()) {
          await this.cacheService
            .delete(lockKey, { prefix: REMINDER_LOCK_PREFIX })
            .catch(() => undefined);
        }
      }
    } else {
      this.logger.debug(`푸시 토큰 없음: ${reminder.patientId}`);
      // 푸시 토큰 없는 환자도 락 유지 (DB 알림은 저장됨)
    }
  }

  // 미복용 알림 체크 (1시간 후 리마인더)
  @Cron('0 */30 * * * *') // 30분마다
  async checkMissedMedications() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const currentDay = now.getDay();

    try {
      // 1시간 전에 알림이 있었던 활성 리마인더 조회
      const timeOneHourAgo = this.formatTime(oneHourAgo);

      const reminders = await this.reminderRepository
        .createQueryBuilder('reminder')
        .leftJoinAndSelect('reminder.patient', 'patient')
        .leftJoinAndSelect('reminder.prescription', 'prescription')
        .where('reminder.isActive = :isActive', { isActive: true })
        .andWhere('reminder.reminderTime = :time', { time: timeOneHourAgo })
        .andWhere(':dayOfWeek = ANY(reminder.reminderDays)', { dayOfWeek: currentDay })
        .getMany();

      for (const reminder of reminders) {
        await this.checkAndSendMissedReminder(reminder as ReminderWithPatient, oneHourAgo);
      }
    } catch (error) {
      this.logger.error(`미복용 체크 실패: ${error.message}`);
    }
  }

  // 미복용 리마인더 발송
  private async checkAndSendMissedReminder(
    reminder: ReminderWithPatient,
    scheduledTime: Date,
  ) {
    // 해당 시간대에 복약 기록이 있는지 확인
    const startTime = new Date(scheduledTime);
    startTime.setMinutes(startTime.getMinutes() - 30);
    const endTime = new Date(scheduledTime);
    endTime.setMinutes(endTime.getMinutes() + 90);

    const existingLog = await this.logRepository.findOne({
      where: {
        patientId: reminder.patientId,
        reminderId: reminder.id,
        takenAt: In([startTime, endTime]),
      },
    });

    if (existingLog) {
      return; // 이미 복약 기록이 있음
    }

    // 미복용 알림 발송
    const patient = await this.patientRepository.findOne({
      where: { id: reminder.patientId },
    });

    if (!patient?.pushTokens?.length) {
      return;
    }

    const settings =
      patient.notificationSettings && typeof patient.notificationSettings === 'object'
        ? patient.notificationSettings
        : {};
    if (settings.medicationEnabled === false) {
      return;
    }

    const title = '약 드셨나요?';
    const body = reminder.prescription
      ? `${this.formatTimeKorean(reminder.reminderTime)}에 ${reminder.prescription.formulaName} 복용 시간이었습니다.`
      : `${this.formatTimeKorean(reminder.reminderTime)}에 약 복용 시간이었습니다.`;

    // 푸시 발송
    const tokens = patient.pushTokens.map((t) => t.token);
    await this.pushService.send({
      to: tokens,
      title,
      body,
      data: {
        type: 'medication_missed',
        reminderId: reminder.id,
        prescriptionId: reminder.prescriptionId,
      },
      channelId: 'medication',
      priority: 'high',
    });

    this.logger.log(`미복용 알림 발송: ${reminder.patientId}`);
  }

  // 매일 자정에 알림 통계 및 정리 (in-memory 캐시는 더 이상 없음 — Redis TTL 자동 처리)
  @Cron('0 0 0 * * *') // 매일 자정
  async dailyCleanup() {
    this.logger.log('일일 정리 작업 시작');

    // 만료된 처방의 알림 비활성화
    await this.deactivateExpiredReminders();

    this.logger.log('일일 정리 작업 완료');
  }

  // 만료된 처방 알림 비활성화
  private async deactivateExpiredReminders() {
    const today = new Date();
    const result = await this.reminderRepository
      .createQueryBuilder()
      .update(MedicationReminder)
      .set({ isActive: false })
      .where('"prescriptionId" IS NOT NULL')
      .andWhere('"isActive" = true')
      .andWhere(`"prescriptionId" IN (
        SELECT p.id FROM patient_prescriptions p
        WHERE p."endDate" < :today
      )`, { today })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`만료된 알림 비활성화: ${result.affected}건`);
    }
  }

  // 방해 금지 시간 확인
  private isInQuietHours(start?: string, end?: string): boolean {
    if (!start || !end) return false;

    const now = new Date();
    const currentTime = this.formatTime(now);

    if (start < end) {
      return currentTime >= start && currentTime < end;
    } else {
      // 자정을 넘어가는 경우 (예: 22:00 ~ 07:00)
      return currentTime >= start || currentTime < end;
    }
  }

  // 시간 포맷 (HH:mm)
  private formatTime(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  // 날짜 포맷 (YYYY-MM-DD)
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // 한국어 시간 포맷
  private formatTimeKorean(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours < 12 ? '오전' : '오후';
    const displayHours = hours % 12 || 12;
    return `${period} ${displayHours}시${minutes > 0 ? ` ${minutes}분` : ''}`;
  }

  // 수동 알림 발송 (테스트/디버그용)
  async sendTestReminder(reminderId: string) {
    const reminder = await this.reminderRepository.findOne({
      where: { id: reminderId },
      relations: ['patient', 'prescription'],
    });

    if (!reminder) {
      throw new Error('알림을 찾을 수 없습니다.');
    }

    await this.sendMedicationReminder(reminder as ReminderWithPatient);
    return { success: true, message: '테스트 알림 발송 완료' };
  }

  // 환자별 오늘의 알림 일정 조회
  async getTodaySchedule(patientId: string) {
    const today = new Date();
    const dayOfWeek = today.getDay();

    const reminders = await this.reminderRepository.find({
      where: {
        patientId,
        isActive: true,
      },
      relations: ['prescription'],
      order: { reminderTime: 'ASC' },
    });

    // 오늘 요일에 해당하는 알림만 필터링
    const todayReminders = reminders.filter((r) =>
      r.reminderDays.includes(dayOfWeek),
    );

    // 각 알림의 복약 상태 확인
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await this.logRepository.find({
      where: {
        patientId,
        takenAt: In([startOfDay, endOfDay]),
      },
    });

    const logMap = new Map(logs.map((l) => [l.reminderId, l]));

    return todayReminders.map((reminder) => {
      const log = logMap.get(reminder.id);
      const [hours, minutes] = reminder.reminderTime.split(':').map(Number);
      const reminderDateTime = new Date(today);
      reminderDateTime.setHours(hours, minutes, 0, 0);

      let status: 'pending' | 'taken' | 'skipped' | 'missed' = 'pending';

      if (log) {
        status = log.status === MedicationLogStatus.TAKEN ? 'taken' : 'skipped';
      } else if (reminderDateTime < today) {
        status = 'missed';
      }

      return {
        id: reminder.id,
        title: reminder.title,
        time: reminder.reminderTime,
        timeKorean: this.formatTimeKorean(reminder.reminderTime),
        prescriptionId: reminder.prescriptionId,
        prescriptionName: reminder.prescription?.formulaName,
        status,
        logId: log?.id,
      };
    });
  }
}
