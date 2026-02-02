import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual, LessThanOrEqual, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  CrmCampaign,
  CrmAutoMessage,
  CrmPatientSegment,
  CrmMessageLog,
  CrmFunnelStage,
  CrmPatientFunnelStatus,
  CampaignStatus,
  CampaignType,
  TriggerType,
  MessageChannel,
} from '../../database/entities/crm-campaign.entity';
import { PatientAccount } from '../../database/entities/patient-account.entity';
import { PatientRecord } from '../../database/entities/patient-record.entity';
import { HealthJournal } from '../../database/entities/health-journal.entity';
import { MedicationLog } from '../../database/entities/medication-log.entity';
import { PatientHealthScore } from '../../database/entities/patient-health-score.entity';

@Injectable()
export class CrmService {
  constructor(
    @InjectRepository(CrmCampaign)
    private campaignRepository: Repository<CrmCampaign>,
    @InjectRepository(CrmAutoMessage)
    private autoMessageRepository: Repository<CrmAutoMessage>,
    @InjectRepository(CrmPatientSegment)
    private segmentRepository: Repository<CrmPatientSegment>,
    @InjectRepository(CrmMessageLog)
    private messageLogRepository: Repository<CrmMessageLog>,
    @InjectRepository(CrmFunnelStage)
    private funnelStageRepository: Repository<CrmFunnelStage>,
    @InjectRepository(CrmPatientFunnelStatus)
    private funnelStatusRepository: Repository<CrmPatientFunnelStatus>,
    @InjectRepository(PatientAccount)
    private patientRepository: Repository<PatientAccount>,
    @InjectRepository(PatientRecord)
    private patientRecordRepository: Repository<PatientRecord>,
    @InjectRepository(PatientHealthScore)
    private healthScoreRepository: Repository<PatientHealthScore>,
  ) {}

  // ============ Campaign Management ============

  /**
   * 캠페인 생성
   */
  async createCampaign(
    clinicId: string,
    createdById: string,
    data: {
      name: string;
      description?: string;
      type: CampaignType;
      targetingRules: CrmCampaign['targetingRules'];
      scheduledAt?: Date;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<CrmCampaign> {
    const campaign = this.campaignRepository.create({
      clinicId,
      createdById,
      name: data.name,
      description: data.description,
      type: data.type,
      status: CampaignStatus.DRAFT,
      targetingRules: data.targetingRules,
      scheduledAt: data.scheduledAt,
      startDate: data.startDate,
      endDate: data.endDate,
      statistics: {
        targetCount: 0,
        sentCount: 0,
        deliveredCount: 0,
        openedCount: 0,
        clickedCount: 0,
        convertedCount: 0,
        unsubscribedCount: 0,
      },
    });

    return this.campaignRepository.save(campaign);
  }

  /**
   * 캠페인 조회
   */
  async getCampaigns(
    clinicId: string,
    status?: CampaignStatus,
  ): Promise<CrmCampaign[]> {
    const where: any = { clinicId };
    if (status) where.status = status;

    return this.campaignRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 캠페인 상세 조회
   */
  async getCampaign(campaignId: string): Promise<CrmCampaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('캠페인을 찾을 수 없습니다.');
    }

    return campaign;
  }

  /**
   * 캠페인 업데이트
   */
  async updateCampaign(
    campaignId: string,
    data: Partial<CrmCampaign>,
  ): Promise<CrmCampaign> {
    const campaign = await this.getCampaign(campaignId);

    Object.assign(campaign, data);
    return this.campaignRepository.save(campaign);
  }

  /**
   * 캠페인 시작
   */
  async startCampaign(campaignId: string): Promise<CrmCampaign> {
    const campaign = await this.getCampaign(campaignId);

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.SCHEDULED) {
      throw new BadRequestException('시작할 수 없는 상태입니다.');
    }

    campaign.status = CampaignStatus.ACTIVE;
    campaign.startDate = new Date();

    // 타겟 환자 수 계산
    const targetPatients = await this.getTargetPatients(campaign.clinicId, campaign.targetingRules);
    campaign.statistics.targetCount = targetPatients.length;

    return this.campaignRepository.save(campaign);
  }

  /**
   * 캠페인 일시정지
   */
  async pauseCampaign(campaignId: string): Promise<CrmCampaign> {
    const campaign = await this.getCampaign(campaignId);
    campaign.status = CampaignStatus.PAUSED;
    return this.campaignRepository.save(campaign);
  }

  // ============ Auto Messages ============

  /**
   * 자동 메시지 생성
   */
  async createAutoMessage(
    clinicId: string,
    data: {
      name: string;
      triggerType: TriggerType;
      triggerConditions: CrmAutoMessage['triggerConditions'];
      channel: MessageChannel;
      messageTemplate: string;
      kakaoTemplateCode?: string;
      actionButtons?: CrmAutoMessage['actionButtons'];
      campaignId?: string;
    },
  ): Promise<CrmAutoMessage> {
    const autoMessage = this.autoMessageRepository.create({
      clinicId,
      campaignId: data.campaignId,
      name: data.name,
      triggerType: data.triggerType,
      triggerConditions: data.triggerConditions,
      channel: data.channel,
      messageTemplate: data.messageTemplate,
      kakaoTemplateCode: data.kakaoTemplateCode,
      actionButtons: data.actionButtons,
      isActive: true,
      statistics: {
        sentCount: 0,
        deliveredCount: 0,
        clickedCount: 0,
        convertedCount: 0,
      },
    });

    return this.autoMessageRepository.save(autoMessage);
  }

  /**
   * 자동 메시지 목록 조회
   */
  async getAutoMessages(clinicId: string): Promise<CrmAutoMessage[]> {
    return this.autoMessageRepository.find({
      where: { clinicId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 자동 메시지 토글
   */
  async toggleAutoMessage(messageId: string): Promise<CrmAutoMessage> {
    const message = await this.autoMessageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('자동 메시지를 찾을 수 없습니다.');
    }

    message.isActive = !message.isActive;
    return this.autoMessageRepository.save(message);
  }

  // ============ Patient Segments ============

  /**
   * 세그먼트 생성
   */
  async createSegment(
    clinicId: string,
    data: {
      name: string;
      description?: string;
      rules: CrmPatientSegment['rules'];
      autoUpdate?: boolean;
    },
  ): Promise<CrmPatientSegment> {
    const segment = this.segmentRepository.create({
      clinicId,
      name: data.name,
      description: data.description,
      rules: data.rules,
      autoUpdate: data.autoUpdate ?? true,
      patientCount: 0,
    });

    const saved = await this.segmentRepository.save(segment);

    // 환자 수 계산
    await this.updateSegmentPatientCount(saved.id);

    return this.segmentRepository.findOne({ where: { id: saved.id } });
  }

  /**
   * 세그먼트 목록 조회
   */
  async getSegments(clinicId: string): Promise<CrmPatientSegment[]> {
    return this.segmentRepository.find({
      where: { clinicId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 세그먼트 환자 수 업데이트
   */
  async updateSegmentPatientCount(segmentId: string): Promise<void> {
    const segment = await this.segmentRepository.findOne({
      where: { id: segmentId },
    });

    if (!segment) return;

    // 규칙에 맞는 환자 수 계산 (간단한 구현)
    const patients = await this.getPatientsBySegmentRules(segment.clinicId, segment.rules);

    segment.patientCount = patients.length;
    segment.lastUpdatedAt = new Date();

    await this.segmentRepository.save(segment);
  }

  // ============ Funnel Management ============

  /**
   * 퍼널 스테이지 생성
   */
  async createFunnelStage(
    clinicId: string,
    data: {
      name: string;
      description?: string;
      order: number;
      entryConditions: CrmFunnelStage['entryConditions'];
      actions: CrmFunnelStage['actions'];
      exitConditions?: CrmFunnelStage['exitConditions'];
    },
  ): Promise<CrmFunnelStage> {
    const stage = this.funnelStageRepository.create({
      clinicId,
      ...data,
    });

    return this.funnelStageRepository.save(stage);
  }

  /**
   * 퍼널 스테이지 목록 조회
   */
  async getFunnelStages(clinicId: string): Promise<CrmFunnelStage[]> {
    return this.funnelStageRepository.find({
      where: { clinicId },
      order: { order: 'ASC' },
    });
  }

  /**
   * 환자를 퍼널에 진입시킴
   */
  async enterPatientToFunnel(
    patientId: string,
    stageId: string,
  ): Promise<CrmPatientFunnelStatus> {
    const status = this.funnelStatusRepository.create({
      patientId,
      stageId,
      enteredAt: new Date(),
      actionsPerformed: [],
    });

    // 스테이지 통계 업데이트
    await this.funnelStageRepository.increment(
      { id: stageId },
      'currentPatientCount',
      1,
    );
    await this.funnelStageRepository.increment(
      { id: stageId },
      'totalEnteredCount',
      1,
    );

    return this.funnelStatusRepository.save(status);
  }

  // ============ Message Sending ============

  /**
   * 메시지 발송
   */
  async sendMessage(
    clinicId: string,
    patientId: string,
    channel: MessageChannel,
    message: string,
    options?: {
      campaignId?: string;
      autoMessageId?: string;
    },
  ): Promise<CrmMessageLog> {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('환자를 찾을 수 없습니다.');
    }

    // 메시지 변수 치환
    const processedMessage = this.processMessageTemplate(message, patient);

    // 메시지 로그 생성
    const log = this.messageLogRepository.create({
      clinicId,
      patientId,
      campaignId: options?.campaignId,
      autoMessageId: options?.autoMessageId,
      channel,
      messageContent: processedMessage,
      status: 'pending',
      sentAt: new Date(),
    });

    const saved = await this.messageLogRepository.save(log);

    // 실제 발송 (시뮬레이션)
    await this.simulateSendMessage(saved);

    return saved;
  }

  /**
   * 대량 메시지 발송
   */
  async sendBulkMessages(
    clinicId: string,
    patientIds: string[],
    channel: MessageChannel,
    messageTemplate: string,
    campaignId?: string,
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const patientId of patientIds) {
      try {
        await this.sendMessage(clinicId, patientId, channel, messageTemplate, { campaignId });
        success++;
      } catch (error) {
        failed++;
      }
    }

    // 캠페인 통계 업데이트
    if (campaignId) {
      await this.campaignRepository.increment(
        { id: campaignId },
        'statistics.sentCount',
        success,
      );
    }

    return { success, failed };
  }

  // ============ Automated Triggers ============

  /**
   * 자동 메시지 트리거 체크 (매 시간 실행)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkAutoMessageTriggers(): Promise<void> {
    console.log('Checking auto message triggers...');

    const activeMessages = await this.autoMessageRepository.find({
      where: { isActive: true },
    });

    for (const message of activeMessages) {
      try {
        const patients = await this.getPatientsForTrigger(message);

        for (const patient of patients) {
          // 이미 발송된 메시지 확인
          const alreadySent = await this.messageLogRepository.findOne({
            where: {
              patientId: patient.id,
              autoMessageId: message.id,
              sentAt: MoreThanOrEqual(new Date(Date.now() - 24 * 60 * 60 * 1000)), // 24시간 내
            },
          });

          if (!alreadySent) {
            await this.sendMessage(
              message.clinicId,
              patient.id,
              message.channel,
              message.messageTemplate,
              { autoMessageId: message.id },
            );
          }
        }
      } catch (error) {
        console.error(`Error processing auto message ${message.id}:`, error);
      }
    }
  }

  /**
   * 세그먼트 자동 업데이트 (매일 새벽 2시)
   */
  @Cron('0 2 * * *')
  async updateAllSegments(): Promise<void> {
    console.log('Updating all segments...');

    const segments = await this.segmentRepository.find({
      where: { autoUpdate: true },
    });

    for (const segment of segments) {
      await this.updateSegmentPatientCount(segment.id);
    }
  }

  // ============ Analytics ============

  /**
   * 캠페인 성과 분석
   */
  async getCampaignAnalytics(campaignId: string): Promise<{
    campaign: CrmCampaign;
    metrics: {
      deliveryRate: number;
      openRate: number;
      clickRate: number;
      conversionRate: number;
    };
    timeline: Array<{ date: string; sent: number; opened: number; clicked: number }>;
  }> {
    const campaign = await this.getCampaign(campaignId);

    const logs = await this.messageLogRepository.find({
      where: { campaignId },
    });

    const sent = logs.length;
    const delivered = logs.filter(l => l.deliveredAt).length;
    const opened = logs.filter(l => l.openedAt).length;
    const clicked = logs.filter(l => l.clickedAt).length;
    const converted = logs.filter(l => l.converted).length;

    const metrics = {
      deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
      openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
      clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
      conversionRate: clicked > 0 ? Math.round((converted / clicked) * 100) : 0,
    };

    // 일별 타임라인 (최근 7일)
    const timeline: Array<{ date: string; sent: number; opened: number; clicked: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayLogs = logs.filter(l => l.sentAt.toISOString().startsWith(dateStr));
      timeline.push({
        date: dateStr,
        sent: dayLogs.length,
        opened: dayLogs.filter(l => l.openedAt).length,
        clicked: dayLogs.filter(l => l.clickedAt).length,
      });
    }

    return { campaign, metrics, timeline };
  }

  /**
   * CRM 대시보드 데이터
   */
  async getDashboardData(clinicId: string): Promise<{
    activeCampaigns: number;
    totalMessages: number;
    conversionRate: number;
    topSegments: Array<{ name: string; count: number }>;
    recentActivity: CrmMessageLog[];
  }> {
    const activeCampaigns = await this.campaignRepository.count({
      where: { clinicId, status: CampaignStatus.ACTIVE },
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const messageLogs = await this.messageLogRepository.find({
      where: {
        clinicId,
        sentAt: MoreThanOrEqual(thirtyDaysAgo),
      },
    });

    const totalMessages = messageLogs.length;
    const converted = messageLogs.filter(l => l.converted).length;
    const conversionRate = totalMessages > 0 ? Math.round((converted / totalMessages) * 100) : 0;

    const segments = await this.segmentRepository.find({
      where: { clinicId },
      order: { patientCount: 'DESC' },
      take: 5,
    });

    const topSegments = segments.map(s => ({
      name: s.name,
      count: s.patientCount,
    }));

    const recentActivity = await this.messageLogRepository.find({
      where: { clinicId },
      order: { sentAt: 'DESC' },
      take: 10,
      relations: ['patient'],
    });

    return {
      activeCampaigns,
      totalMessages,
      conversionRate,
      topSegments,
      recentActivity,
    };
  }

  // ============ Private Helpers ============

  private async getTargetPatients(
    clinicId: string,
    rules: CrmCampaign['targetingRules'],
  ): Promise<PatientAccount[]> {
    const queryBuilder = this.patientRepository.createQueryBuilder('patient');

    // 기본 필터: 해당 클리닉의 환자
    // (실제로는 PatientClinicConnection 통해 필터링)

    if (rules.ageRange) {
      const now = new Date();
      if (rules.ageRange.min) {
        const maxBirthDate = new Date(now.getFullYear() - rules.ageRange.min, now.getMonth(), now.getDate());
        queryBuilder.andWhere('patient.birthDate <= :maxBirthDate', { maxBirthDate });
      }
      if (rules.ageRange.max) {
        const minBirthDate = new Date(now.getFullYear() - rules.ageRange.max, now.getMonth(), now.getDate());
        queryBuilder.andWhere('patient.birthDate >= :minBirthDate', { minBirthDate });
      }
    }

    if (rules.gender && rules.gender !== 'all') {
      queryBuilder.andWhere('patient.gender = :gender', { gender: rules.gender });
    }

    return queryBuilder.getMany();
  }

  private async getPatientsBySegmentRules(
    clinicId: string,
    rules: CrmPatientSegment['rules'],
  ): Promise<PatientAccount[]> {
    // 간단한 구현 - 실제로는 더 복잡한 쿼리 필요
    return this.patientRepository.find({ take: 100 });
  }

  private async getPatientsForTrigger(message: CrmAutoMessage): Promise<PatientAccount[]> {
    const conditions = message.triggerConditions;
    const patients: PatientAccount[] = [];

    if (message.triggerType === TriggerType.NO_VISIT && conditions.noVisitDays) {
      // N일 미방문 환자 조회
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - conditions.noVisitDays);

      const records = await this.patientRecordRepository.find({
        where: {
          clinicId: message.clinicId,
          visitDate: LessThanOrEqual(cutoffDate),
        },
        select: ['patientId'],
      });

      const patientIds = [...new Set(records.map(r => r.patientId))];
      if (patientIds.length > 0) {
        const result = await this.patientRepository.find({
          where: { id: In(patientIds) },
        });
        patients.push(...result);
      }
    }

    if (message.triggerType === TriggerType.BIRTHDAY && conditions.beforeBirthdayDays) {
      // 생일 N일 전 환자 조회
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + conditions.beforeBirthdayDays);

      const result = await this.patientRepository.find({
        where: {
          // birthDate 월/일이 targetDate와 같은 환자
        },
      });
      patients.push(...result);
    }

    return patients;
  }

  private processMessageTemplate(template: string, patient: PatientAccount): string {
    return template
      .replace(/\{\{환자명\}\}/g, patient.name || '고객')
      .replace(/\{\{환자이름\}\}/g, patient.name || '고객')
      .replace(/\{\{이름\}\}/g, patient.name || '고객');
  }

  private async simulateSendMessage(log: CrmMessageLog): Promise<void> {
    // 실제 발송 API 호출 시뮬레이션
    // 실제로는 카카오 알림톡, SMS API 등 호출

    // 90% 성공률 시뮬레이션
    const success = Math.random() > 0.1;

    if (success) {
      log.status = 'delivered';
      log.deliveredAt = new Date();
    } else {
      log.status = 'failed';
      log.errorMessage = '발송 실패 (시뮬레이션)';
    }

    await this.messageLogRepository.save(log);
  }
}
