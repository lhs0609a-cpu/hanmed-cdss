import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Clinic } from './clinic.entity';
import { PatientAccount } from './patient-account.entity';

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
}

export enum CampaignType {
  SEASONAL = 'seasonal',           // 계절성 캠페인
  FOLLOWUP = 'followup',           // 치료 후 팔로업
  REACTIVATION = 'reactivation',   // 재방문 유도
  BIRTHDAY = 'birthday',           // 생일 축하
  WELLNESS = 'wellness',           // 건강 관리 팁
  PROMOTION = 'promotion',         // 프로모션
  CUSTOM = 'custom',               // 커스텀
}

export enum MessageChannel {
  SMS = 'sms',
  KAKAO = 'kakao',
  PUSH = 'push',
  EMAIL = 'email',
}

export enum TriggerType {
  SCHEDULED = 'scheduled',         // 예약 시간
  TREATMENT_COMPLETE = 'treatment_complete',  // 치료 완료 후
  MEDICATION_END = 'medication_end',  // 복약 종료 후
  NO_VISIT = 'no_visit',           // 미방문 기간
  SYMPTOM_SEASON = 'symptom_season',  // 계절성 증상
  HEALTH_SCORE_DROP = 'health_score_drop',  // 건강점수 하락
  BIRTHDAY = 'birthday',           // 생일
  CUSTOM_DATE = 'custom_date',     // 사용자 지정 날짜
}

// 캠페인 (마케팅 캠페인)
@Entity('crm_campaigns')
@Index(['clinicId'])
@Index(['status'])
@Index(['type'])
export class CrmCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @Column('uuid')
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: CampaignType,
  })
  type: CampaignType;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus;

  // 타겟팅 조건
  @Column('jsonb')
  targetingRules: {
    segments?: string[];           // 세그먼트 ID 목록
    symptoms?: string[];           // 특정 증상 환자
    constitutions?: string[];      // 특정 체질
    lastVisitDaysAgo?: { min?: number; max?: number };  // 마지막 방문 N일 전
    ageRange?: { min?: number; max?: number };
    gender?: 'male' | 'female' | 'all';
    treatmentHistory?: string[];   // 특정 치료 이력
    excludePatientIds?: string[];  // 제외할 환자
  };

  // 일정
  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  // 반복 설정
  @Column('jsonb', { nullable: true })
  recurrence: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    daysOfWeek?: number[];  // 0-6
    dayOfMonth?: number;
  };

  // 통계
  @Column('jsonb', { default: {} })
  statistics: {
    targetCount: number;
    sentCount: number;
    deliveredCount: number;
    openedCount: number;
    clickedCount: number;
    convertedCount: number;  // 예약/방문으로 전환
    unsubscribedCount: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 자동 메시지 템플릿
@Entity('crm_auto_messages')
@Index(['clinicId'])
@Index(['triggerType'])
@Index(['isActive'])
export class CrmAutoMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @Column('uuid', { nullable: true })
  campaignId: string;

  @ManyToOne(() => CrmCampaign, { nullable: true })
  @JoinColumn({ name: 'campaignId' })
  campaign: CrmCampaign;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: TriggerType,
  })
  triggerType: TriggerType;

  // 트리거 조건
  @Column('jsonb')
  triggerConditions: {
    daysAfterTreatment?: number;   // 치료 N일 후
    daysAfterMedicationEnd?: number;  // 복약 종료 N일 후
    noVisitDays?: number;          // N일 미방문
    seasonMonth?: number[];        // 특정 월
    symptoms?: string[];           // 특정 증상
    healthScoreDropThreshold?: number;  // 건강점수 N점 이상 하락
    beforeBirthdayDays?: number;   // 생일 N일 전
  };

  @Column({
    type: 'enum',
    enum: MessageChannel,
  })
  channel: MessageChannel;

  // 메시지 내용 (변수 지원: {{환자명}}, {{증상}}, {{한의원명}} 등)
  @Column('text')
  messageTemplate: string;

  // 카카오 알림톡 템플릿 코드
  @Column({ nullable: true })
  kakaoTemplateCode: string;

  // 발송 시간 설정
  @Column('jsonb', { nullable: true })
  sendTimeConfig: {
    preferredHour?: number;        // 선호 발송 시간 (0-23)
    excludeWeekends?: boolean;
    excludeHolidays?: boolean;
  };

  // 액션 버튼
  @Column('jsonb', { nullable: true })
  actionButtons: Array<{
    text: string;
    url?: string;
    action?: 'reservation' | 'call' | 'link';
  }>;

  @Column({ default: true })
  isActive: boolean;

  // 통계
  @Column('jsonb', { default: {} })
  statistics: {
    sentCount: number;
    deliveredCount: number;
    clickedCount: number;
    convertedCount: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 환자 세그먼트
@Entity('crm_patient_segments')
@Index(['clinicId'])
export class CrmPatientSegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  // 세그먼트 규칙
  @Column('jsonb')
  rules: {
    conditions: Array<{
      field: string;           // 'lastVisit', 'symptom', 'constitution', 'age', 'visitCount' 등
      operator: 'equals' | 'contains' | 'gt' | 'lt' | 'between' | 'in';
      value: any;
    }>;
    logic: 'and' | 'or';
  };

  // 자동 업데이트 여부
  @Column({ default: true })
  autoUpdate: boolean;

  // 캐시된 환자 수
  @Column({ default: 0 })
  patientCount: number;

  @Column({ nullable: true })
  lastUpdatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 메시지 발송 이력
@Entity('crm_message_logs')
@Index(['patientId'])
@Index(['campaignId'])
@Index(['sentAt'])
@Index(['status'])
export class CrmMessageLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  clinicId: string;

  @Column('uuid')
  patientId: string;

  @ManyToOne(() => PatientAccount)
  @JoinColumn({ name: 'patientId' })
  patient: PatientAccount;

  @Column('uuid', { nullable: true })
  campaignId: string;

  @ManyToOne(() => CrmCampaign, { nullable: true })
  @JoinColumn({ name: 'campaignId' })
  campaign: CrmCampaign;

  @Column('uuid', { nullable: true })
  autoMessageId: string;

  @ManyToOne(() => CrmAutoMessage, { nullable: true })
  @JoinColumn({ name: 'autoMessageId' })
  autoMessage: CrmAutoMessage;

  @Column({
    type: 'enum',
    enum: MessageChannel,
  })
  channel: MessageChannel;

  @Column('text')
  messageContent: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'sent', 'delivered', 'failed', 'opened', 'clicked'],
    default: 'pending',
  })
  status: string;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ type: 'timestamp' })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  openedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  clickedAt: Date;

  // 전환 추적
  @Column({ default: false })
  converted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  convertedAt: Date;

  @Column({ nullable: true })
  conversionType: string;  // 'reservation', 'visit', 'purchase'

  @CreateDateColumn()
  createdAt: Date;
}

// CRM 퍼널 단계 (환자 여정)
@Entity('crm_funnel_stages')
@Index(['clinicId'])
@Index(['order'])
export class CrmFunnelStage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ type: 'int' })
  order: number;

  // 이 단계 진입 조건
  @Column('jsonb')
  entryConditions: {
    triggers: Array<{
      type: string;
      value: any;
    }>;
  };

  // 이 단계에서 실행할 액션
  @Column('jsonb')
  actions: Array<{
    type: 'send_message' | 'create_task' | 'update_tag' | 'notify_staff';
    config: any;
  }>;

  // 다음 단계로 이동 조건
  @Column('jsonb', { nullable: true })
  exitConditions: {
    triggers: Array<{
      type: string;
      value: any;
    }>;
    nextStageId?: string;
  };

  // 통계
  @Column({ default: 0 })
  currentPatientCount: number;

  @Column({ default: 0 })
  totalEnteredCount: number;

  @Column({ default: 0 })
  convertedCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 환자별 퍼널 상태
@Entity('crm_patient_funnel_status')
@Index(['patientId'])
@Index(['stageId'])
export class CrmPatientFunnelStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  patientId: string;

  @ManyToOne(() => PatientAccount)
  @JoinColumn({ name: 'patientId' })
  patient: PatientAccount;

  @Column('uuid')
  stageId: string;

  @ManyToOne(() => CrmFunnelStage)
  @JoinColumn({ name: 'stageId' })
  stage: CrmFunnelStage;

  @Column({ type: 'timestamp' })
  enteredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  exitedAt: Date;

  // 이 단계에서 수행된 액션
  @Column('jsonb', { default: [] })
  actionsPerformed: Array<{
    actionType: string;
    performedAt: Date;
    result?: any;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
