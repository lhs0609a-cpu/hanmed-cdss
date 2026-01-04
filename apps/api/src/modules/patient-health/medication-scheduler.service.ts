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

@Injectable()
export class MedicationSchedulerService {
  private readonly logger = new Logger(MedicationSchedulerService.name);
  private readonly sentReminders = new Map<string, Date>(); // 중복 발송 방지
  private readonly reminderCooldown = 5 * 60 * 1000; // 5분 쿨다운

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

      // 오래된 캐시 정리
      this.cleanupSentReminders();
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
    const cacheKey = `${reminder.id}-${this.formatDate(new Date())}`;

    // 중복 발송 체크
    const lastSent = this.sentReminders.get(cacheKey);
    if (lastSent && Date.now() - lastSent.getTime() < this.reminderCooldown) {
      this.logger.debug(`알림 쿨다운 중: ${reminder.id}`);
      return;
    }

    // 환자 정보 조회 (푸시 토큰 포함)
    const patient = await this.patientRepository.findOne({
      where: { id: reminder.patientId },
    });

    if (!patient) {
      this.logger.warn(`환자 없음: ${reminder.patientId}`);
      return;
    }

    // 알림 설정 확인
    const settings = patient.notificationSettings || {};
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
          this.sentReminders.set(cacheKey, new Date());
        } else {
          this.logger.error(`복약 알림 발송 실패: ${result.error}`);
        }
      } catch (error) {
        this.logger.error(`푸시 발송 에러: ${error.message}`);
      }
    } else {
      this.logger.debug(`푸시 토큰 없음: ${reminder.patientId}`);
      this.sentReminders.set(cacheKey, new Date());
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

    const settings = patient.notificationSettings || {};
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

  // 매일 자정에 알림 통계 및 정리
  @Cron('0 0 0 * * *') // 매일 자정
  async dailyCleanup() {
    this.logger.log('일일 정리 작업 시작');

    // 발송 캐시 전체 정리
    this.sentReminders.clear();

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

  // 캐시 정리 (24시간 이상 된 항목 제거)
  private cleanupSentReminders() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24시간

    for (const [key, date] of this.sentReminders.entries()) {
      if (now - date.getTime() > maxAge) {
        this.sentReminders.delete(key);
      }
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
