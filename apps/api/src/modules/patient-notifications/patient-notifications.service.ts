import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  PatientNotification,
  NotificationType,
  PatientAccount,
} from '../../database/entities';
import {
  GetNotificationsDto,
  CreateNotificationDto,
  RegisterPushTokenDto,
  UpdateNotificationSettingsDto,
} from './dto';
import { PushService } from '../messaging/services/push.service';

@Injectable()
export class PatientNotificationsService {
  private readonly logger = new Logger(PatientNotificationsService.name);

  constructor(
    @InjectRepository(PatientNotification)
    private notificationRepository: Repository<PatientNotification>,
    @InjectRepository(PatientAccount)
    private patientRepository: Repository<PatientAccount>,
    private pushService: PushService,
  ) {}

  // 알림 목록 조회
  async getNotifications(patientId: string, dto: GetNotificationsDto) {
    const { type, isRead, page = 1, limit = 20 } = dto;

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.patientId = :patientId', { patientId });

    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    if (isRead !== undefined) {
      queryBuilder.andWhere('notification.isRead = :isRead', { isRead });
    }

    queryBuilder.orderBy('notification.createdAt', 'DESC');

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [notifications, total] = await queryBuilder.getManyAndCount();

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 읽지 않은 알림 수
  async getUnreadCount(patientId: string) {
    const count = await this.notificationRepository.count({
      where: { patientId, isRead: false },
    });

    return { unreadCount: count };
  }

  // 알림 읽음 처리
  async markAsRead(patientId: string, notificationIds: string[]) {
    await this.notificationRepository.update(
      {
        id: In(notificationIds),
        patientId,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    );

    return { success: true, markedCount: notificationIds.length };
  }

  // 모든 알림 읽음 처리
  async markAllAsRead(patientId: string) {
    const result = await this.notificationRepository.update(
      { patientId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    return { success: true, markedCount: result.affected || 0 };
  }

  // 알림 삭제
  async deleteNotification(notificationId: string, patientId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, patientId },
    });

    if (!notification) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }

    await this.notificationRepository.remove(notification);
    return { success: true };
  }

  // 알림 생성 (내부 서비스용)
  async createNotification(dto: CreateNotificationDto) {
    const notification = this.notificationRepository.create({
      patientId: dto.patientId,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      data: dto.data,
    });

    const saved = await this.notificationRepository.save(notification);

    // 푸시 알림 발송
    if (dto.sendPush !== false) {
      await this.sendPushNotification(dto.patientId, saved);
    }

    return saved;
  }

  // 푸시 토큰 등록
  async registerPushToken(patientId: string, dto: RegisterPushTokenDto) {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('환자를 찾을 수 없습니다.');
    }

    // 기존 푸시 토큰 목록에 추가 또는 업데이트
    const existingTokens = patient.pushTokens || [];
    const tokenIndex = existingTokens.findIndex(
      (t) => t.token === dto.pushToken,
    );

    if (tokenIndex >= 0) {
      existingTokens[tokenIndex] = {
        token: dto.pushToken,
        deviceType: dto.deviceType,
        deviceName: dto.deviceName,
        updatedAt: new Date().toISOString(),
      };
    } else {
      existingTokens.push({
        token: dto.pushToken,
        deviceType: dto.deviceType,
        deviceName: dto.deviceName,
        createdAt: new Date().toISOString(),
      });
    }

    patient.pushTokens = existingTokens;
    await this.patientRepository.save(patient);

    return { success: true };
  }

  // 푸시 토큰 해제
  async unregisterPushToken(patientId: string, pushToken: string) {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('환자를 찾을 수 없습니다.');
    }

    const existingTokens = patient.pushTokens || [];
    patient.pushTokens = existingTokens.filter((t) => t.token !== pushToken);
    await this.patientRepository.save(patient);

    return { success: true };
  }

  // 알림 설정 조회
  async getNotificationSettings(patientId: string) {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('환자를 찾을 수 없습니다.');
    }

    return (
      patient.notificationSettings || {
        reservationEnabled: true,
        medicationEnabled: true,
        recordEnabled: true,
        healthTipEnabled: true,
        promotionEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
      }
    );
  }

  // 알림 설정 업데이트
  async updateNotificationSettings(
    patientId: string,
    dto: UpdateNotificationSettingsDto,
  ) {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('환자를 찾을 수 없습니다.');
    }

    const currentSettings = patient.notificationSettings || {};
    patient.notificationSettings = {
      ...currentSettings,
      ...dto,
    };

    await this.patientRepository.save(patient);
    return patient.notificationSettings;
  }

  // Expo Push 알림 발송
  private async sendPushNotification(
    patientId: string,
    notification: PatientNotification,
  ) {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient?.pushTokens?.length) {
      this.logger.debug(`환자 ${patientId}: 등록된 푸시 토큰 없음`);
      return;
    }

    // 알림 설정 확인
    const settings = patient.notificationSettings || {};
    const typeSettingMap: Record<NotificationType, string> = {
      [NotificationType.RESERVATION]: 'reservationEnabled',
      [NotificationType.MEDICATION]: 'medicationEnabled',
      [NotificationType.RECORD]: 'recordEnabled',
      [NotificationType.PRESCRIPTION]: 'recordEnabled',
      [NotificationType.HEALTH_TIP]: 'healthTipEnabled',
      [NotificationType.PROMOTION]: 'promotionEnabled',
      [NotificationType.SYSTEM]: 'systemEnabled',
    };

    const settingKey = typeSettingMap[notification.type];
    if (settingKey && settings[settingKey] === false) {
      this.logger.debug(`환자 ${patientId}: ${notification.type} 알림 비활성화됨`);
      return;
    }

    // 방해 금지 시간 확인
    if (settings.quietHoursStart && settings.quietHoursEnd) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const isInQuietHours =
        settings.quietHoursStart < settings.quietHoursEnd
          ? currentTime >= settings.quietHoursStart &&
            currentTime < settings.quietHoursEnd
          : currentTime >= settings.quietHoursStart ||
            currentTime < settings.quietHoursEnd;

      if (isInQuietHours) {
        this.logger.debug(`환자 ${patientId}: 방해 금지 시간`);
        return;
      }
    }

    // Expo Push 발송
    try {
      const tokens = patient.pushTokens.map((t) => t.token);
      const result = await this.pushService.send({
        to: tokens,
        title: notification.title,
        body: notification.body,
        data: {
          notificationId: notification.id,
          type: notification.type,
          ...(notification.data || {}),
        },
        channelId: this.getChannelId(notification.type),
        priority: this.getPriority(notification.type),
      });

      if (result.success) {
        this.logger.log(`푸시 발송 성공: 환자 ${patientId}, 알림 ${notification.id}`);
        await this.notificationRepository.update(notification.id, {
          pushSent: true,
          pushSentAt: new Date(),
        });
      } else {
        this.logger.error(`푸시 발송 실패: ${result.error}`);
      }
    } catch (error) {
      this.logger.error(`푸시 발송 에러: ${error.message}`);
    }
  }

  // 알림 유형별 채널 ID
  private getChannelId(type: NotificationType): string {
    const channelMap: Record<NotificationType, string> = {
      [NotificationType.RESERVATION]: 'reservation',
      [NotificationType.MEDICATION]: 'medication',
      [NotificationType.RECORD]: 'record',
      [NotificationType.PRESCRIPTION]: 'prescription',
      [NotificationType.HEALTH_TIP]: 'health_tip',
      [NotificationType.PROMOTION]: 'promotion',
      [NotificationType.SYSTEM]: 'system',
    };
    return channelMap[type] || 'default';
  }

  // 알림 유형별 우선순위
  private getPriority(type: NotificationType): 'high' | 'normal' | 'default' {
    const highPriorityTypes = [
      NotificationType.MEDICATION,
      NotificationType.RESERVATION,
    ];
    return highPriorityTypes.includes(type) ? 'high' : 'normal';
  }

  // ===== 편의 메서드 (다른 서비스에서 호출) =====

  // 예약 알림
  async sendReservationNotification(
    patientId: string,
    title: string,
    body: string,
    reservationId: string,
    clinicId?: string,
  ) {
    return this.createNotification({
      patientId,
      type: NotificationType.RESERVATION,
      title,
      body,
      data: { reservationId, clinicId },
    });
  }

  // 진료 기록 공유 알림
  async sendRecordSharedNotification(
    patientId: string,
    recordId: string,
    clinicName: string,
  ) {
    return this.createNotification({
      patientId,
      type: NotificationType.RECORD,
      title: '새 진료 기록이 공유되었습니다',
      body: `${clinicName}에서 진료 기록을 공유했습니다. 확인해보세요.`,
      data: { recordId },
    });
  }

  // 처방 알림
  async sendPrescriptionNotification(
    patientId: string,
    prescriptionId: string,
    clinicName: string,
  ) {
    return this.createNotification({
      patientId,
      type: NotificationType.PRESCRIPTION,
      title: '새 처방전이 등록되었습니다',
      body: `${clinicName}에서 처방전을 등록했습니다. 복약 안내를 확인해보세요.`,
      data: { prescriptionId },
    });
  }

  // 복약 알림
  async sendMedicationReminder(
    patientId: string,
    title: string,
    prescriptionId?: string,
  ) {
    return this.createNotification({
      patientId,
      type: NotificationType.MEDICATION,
      title,
      body: '복약 시간입니다. 건강을 위해 잊지 말고 복용해주세요.',
      data: { prescriptionId },
    });
  }

  // 건강 팁 알림
  async sendHealthTip(patientId: string, title: string, body: string) {
    return this.createNotification({
      patientId,
      type: NotificationType.HEALTH_TIP,
      title,
      body,
    });
  }
}
