import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  PatientRecord,
  PatientAccount,
  PatientClinicConnection,
  PatientNotification,
  NotificationType,
  ClinicalCase,
} from '../../database/entities';
import {
  CreatePatientRecordDto,
  UpdatePatientRecordDto,
  ShareRecordDto,
  GetRecordsDto,
} from './dto';
import { MessagingService } from '../messaging/messaging.service';
import { PushService } from '../messaging/services/push.service';
import { PatientExplanationService } from '../ai/services/patient-explanation.service';

@Injectable()
export class PatientRecordsService {
  constructor(
    @InjectRepository(PatientRecord)
    private recordRepository: Repository<PatientRecord>,
    @InjectRepository(PatientAccount)
    private patientRepository: Repository<PatientAccount>,
    @InjectRepository(PatientClinicConnection)
    private connectionRepository: Repository<PatientClinicConnection>,
    @InjectRepository(PatientNotification)
    private notificationRepository: Repository<PatientNotification>,
    @InjectRepository(ClinicalCase)
    private clinicalCaseRepository: Repository<ClinicalCase>,
    private configService: ConfigService,
    private messagingService: MessagingService,
    private pushService: PushService,
    private patientExplanationService: PatientExplanationService,
  ) {}

  // 진료 기록 생성 (의료진용)
  async create(
    practitionerId: string,
    clinicId: string,
    dto: CreatePatientRecordDto,
  ) {
    // 환자 확인
    const patient = await this.patientRepository.findOne({
      where: { id: dto.patientId },
    });
    if (!patient) {
      throw new NotFoundException('환자를 찾을 수 없습니다.');
    }

    const record = this.recordRepository.create({
      ...dto,
      clinicId,
      practitionerId,
      visitDate: new Date(dto.visitDate),
      nextVisitRecommended: dto.nextVisitRecommended
        ? new Date(dto.nextVisitRecommended)
        : undefined,
    });

    return this.recordRepository.save(record);
  }

  // 진료 기록 수정 (의료진용)
  async update(
    recordId: string,
    practitionerId: string,
    clinicId: string,
    dto: UpdatePatientRecordDto,
  ) {
    const record = await this.recordRepository.findOne({
      where: { id: recordId, clinicId },
    });

    if (!record) {
      throw new NotFoundException('진료 기록을 찾을 수 없습니다.');
    }

    Object.assign(record, {
      ...dto,
      nextVisitRecommended: dto.nextVisitRecommended
        ? new Date(dto.nextVisitRecommended)
        : record.nextVisitRecommended,
    });

    return this.recordRepository.save(record);
  }

  // 환자에게 기록 공유
  async shareWithPatient(
    recordId: string,
    practitionerId: string,
    clinicId: string,
    generateAiExplanation: boolean = true,
  ) {
    const record = await this.recordRepository.findOne({
      where: { id: recordId, clinicId },
      relations: ['patient', 'clinic', 'prescription'],
    });

    if (!record) {
      throw new NotFoundException('진료 기록을 찾을 수 없습니다.');
    }

    // AI 설명 생성
    if (generateAiExplanation) {
      try {
        const aiExplanation = await this.generatePatientExplanation(record);
        record.aiHealthInsights = aiExplanation.healthInsights;
        record.lifestyleRecommendations = aiExplanation.lifestyleRecommendations;
        record.dietRecommendations = aiExplanation.dietRecommendations;
        record.exerciseRecommendations = aiExplanation.exerciseRecommendations;
      } catch (error) {
        console.error('AI 설명 생성 실패:', error);
      }
    }

    // 공유 상태 업데이트
    record.isSharedWithPatient = true;
    record.sharedAt = new Date();

    await this.recordRepository.save(record);

    // 환자에게 알림 발송
    const notification = this.notificationRepository.create({
      patientId: record.patientId,
      type: NotificationType.RECORD,
      title: '진료 기록이 공유되었습니다',
      body: `${record.clinic?.name || '한의원'}에서 ${new Date(record.visitDate).toLocaleDateString('ko-KR')} 진료 기록을 공유했습니다.`,
      data: {
        recordId: record.id,
        clinicId: record.clinicId,
      },
    });
    await this.notificationRepository.save(notification);

    // 푸시 알림 발송
    if (record.patient?.pushTokens?.length) {
      const tokens = record.patient.pushTokens.map((t) => t.token);
      await this.pushService.sendRecordSharePush(
        tokens,
        record.clinic?.name || '한의원',
        record.id,
      );
    }

    return record;
  }

  // 환자용 진료 기록 목록
  async findByPatient(patientId: string, dto: GetRecordsDto) {
    const { startDate, endDate, clinicId, page = 1, limit = 20 } = dto;

    const queryBuilder = this.recordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.clinic', 'clinic')
      .leftJoinAndSelect('record.practitioner', 'practitioner')
      .leftJoinAndSelect('record.prescription', 'prescription')
      .where('record.patientId = :patientId', { patientId })
      .andWhere('record.isSharedWithPatient = :shared', { shared: true });

    if (startDate) {
      queryBuilder.andWhere('record.visitDate >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('record.visitDate <= :endDate', { endDate });
    }

    if (clinicId) {
      queryBuilder.andWhere('record.clinicId = :clinicId', { clinicId });
    }

    queryBuilder.orderBy('record.visitDate', 'DESC');

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [records, total] = await queryBuilder.getManyAndCount();

    return {
      data: records.map((r) => this.formatRecordForPatient(r)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 환자용 진료 기록 상세
  async findByIdForPatient(recordId: string, patientId: string) {
    const record = await this.recordRepository.findOne({
      where: {
        id: recordId,
        patientId,
        isSharedWithPatient: true,
      },
      relations: ['clinic', 'practitioner', 'prescription', 'prescription.formula'],
    });

    if (!record) {
      throw new NotFoundException('진료 기록을 찾을 수 없습니다.');
    }

    return this.formatRecordDetailForPatient(record);
  }

  // 의료진용 진료 기록 목록
  async findByClinic(clinicId: string, dto: GetRecordsDto & { patientId?: string }) {
    const { startDate, endDate, patientId, page = 1, limit = 20 } = dto;

    const queryBuilder = this.recordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.patient', 'patient')
      .leftJoinAndSelect('record.practitioner', 'practitioner')
      .where('record.clinicId = :clinicId', { clinicId });

    if (startDate) {
      queryBuilder.andWhere('record.visitDate >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('record.visitDate <= :endDate', { endDate });
    }

    if (patientId) {
      queryBuilder.andWhere('record.patientId = :patientId', { patientId });
    }

    queryBuilder.orderBy('record.visitDate', 'DESC');

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [records, total] = await queryBuilder.getManyAndCount();

    return {
      data: records,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 공유 링크 생성
  async generateShareLink(recordId: string, clinicId: string) {
    const record = await this.recordRepository.findOne({
      where: { id: recordId, clinicId },
      relations: ['patient', 'clinic'],
    });

    if (!record) {
      throw new NotFoundException('진료 기록을 찾을 수 없습니다.');
    }

    const baseUrl = this.configService.get('PATIENT_APP_URL') || 'https://patient.hanmed.co.kr';
    const shareLink = `${baseUrl}/record/${recordId}`;

    return {
      shareLink,
      recordId: record.id,
      patientName: record.patient?.name,
      patientPhone: record.patient?.phone,
      clinicName: record.clinic?.name,
      visitDate: record.visitDate,
    };
  }

  // SMS로 공유 링크 발송
  async sendShareLinkViaSms(
    recordId: string,
    practitionerId: string,
    clinicId: string,
    generateAiExplanation: boolean = true,
  ) {
    // 먼저 공유 처리
    const record = await this.shareWithPatient(
      recordId,
      practitionerId,
      clinicId,
      generateAiExplanation,
    );

    const patient = await this.patientRepository.findOne({
      where: { id: record.patientId },
    });

    if (!patient?.phone) {
      throw new BadRequestException('환자 연락처가 없습니다.');
    }

    const { shareLink, clinicName, visitDate } = await this.generateShareLink(recordId, clinicId);

    // MessagingService를 통해 SMS 발송
    const result = await this.messagingService.sendRecordShareNotification({
      phone: patient.phone,
      patientName: patient.name,
      clinicName: clinicName || '한의원',
      visitDate: visitDate ? new Date(visitDate).toLocaleDateString('ko-KR') : '',
      shareLink,
    });

    return {
      success: result.success,
      shareLink,
      sentTo: patient.phone,
      channel: 'sms',
      messageId: result.messageId,
      message: result.success ? 'SMS 발송 완료' : result.error,
    };
  }

  // 카카오톡으로 공유 링크 발송
  async sendShareLinkViaKakao(
    recordId: string,
    practitionerId: string,
    clinicId: string,
    generateAiExplanation: boolean = true,
  ) {
    // 먼저 공유 처리
    const record = await this.shareWithPatient(
      recordId,
      practitionerId,
      clinicId,
      generateAiExplanation,
    );

    const patient = await this.patientRepository.findOne({
      where: { id: record.patientId },
    });

    if (!patient?.phone) {
      throw new BadRequestException('환자 연락처가 없습니다.');
    }

    const { shareLink, clinicName, visitDate } = await this.generateShareLink(recordId, clinicId);

    // MessagingService를 통해 카카오 알림톡 발송 (실패 시 SMS 대체)
    const result = await this.messagingService.sendRecordShareNotification({
      phone: patient.phone,
      patientName: patient.name,
      clinicName: clinicName || '한의원',
      visitDate: visitDate ? new Date(visitDate).toLocaleDateString('ko-KR') : '',
      shareLink,
    });

    return {
      success: result.success,
      shareLink,
      sentTo: patient.phone,
      channel: result.channel,
      messageId: result.messageId,
      message: result.success ? '카카오톡 알림이 발송되었습니다.' : result.error,
    };
  }

  // AI 환자용 설명 생성
  private async generatePatientExplanation(record: PatientRecord) {
    try {
      const result = await this.patientExplanationService.explainHealthRecord({
        visitDate: record.visitDate?.toISOString() || new Date().toISOString(),
        chiefComplaint: record.chiefComplaintPatient || '',
        symptoms: [],
        diagnosis: record.diagnosisSummary,
        treatment: record.prescription?.formulaName,
        patientInfo: {
          constitution: record.constitutionResult,
        },
      });

      const healthTips = await this.patientExplanationService.generateHealthTips({
        constitution: record.constitutionResult,
        mainSymptoms: record.symptomsSummary ? [record.symptomsSummary] : [],
        currentPrescription: record.prescription?.formulaName,
      });

      return {
        healthInsights: {
          summary: result.explanation,
          keyFindings: result.keyPoints,
        },
        lifestyleRecommendations: healthTips.lifestyleAdvice,
        dietRecommendations: {
          recommended: healthTips.dietRecommendations,
          avoid: [],
          generalAdvice: healthTips.tips,
        },
        exerciseRecommendations: [],
      };
    } catch (error) {
      console.error('AI 설명 생성 실패:', error);
      // 기본 응답 반환
      return {
        healthInsights: {
          summary: record.diagnosisSummary || '진료 결과를 확인해주세요.',
          keyFindings: [],
        },
        lifestyleRecommendations: [],
        dietRecommendations: { recommended: [], avoid: [], generalAdvice: [] },
        exerciseRecommendations: [],
      };
    }
  }

  // 환자용 기록 포맷
  private formatRecordForPatient(record: PatientRecord) {
    return {
      id: record.id,
      visitDate: record.visitDate,
      visitType: record.visitType,
      clinic: record.clinic
        ? {
            id: record.clinic.id,
            name: record.clinic.name,
          }
        : null,
      practitioner: record.practitioner
        ? {
            id: record.practitioner.id,
            name: record.practitioner.name,
          }
        : null,
      chiefComplaint: record.chiefComplaintPatient,
      diagnosisSummary: record.diagnosisSummary,
      constitutionResult: record.constitutionResult,
      hasPrescription: !!record.prescription,
      sharedAt: record.sharedAt,
    };
  }

  // 환자용 상세 기록 포맷
  private formatRecordDetailForPatient(record: PatientRecord) {
    return {
      id: record.id,
      visitDate: record.visitDate,
      visitType: record.visitType,
      clinic: record.clinic
        ? {
            id: record.clinic.id,
            name: record.clinic.name,
            phone: record.clinic.phone,
            address: record.clinic.addressRoad,
          }
        : null,
      practitioner: record.practitioner
        ? {
            id: record.practitioner.id,
            name: record.practitioner.name,
          }
        : null,
      // 증상 및 진단
      chiefComplaint: record.chiefComplaintPatient,
      symptomsSummary: record.symptomsSummary,
      diagnosisSummary: record.diagnosisSummary,
      constitutionResult: record.constitutionResult,
      patternDiagnosis: record.patternDiagnosisPatient,
      // 처방 정보
      prescription: record.prescription
        ? {
            id: record.prescription.id,
            formulaName: record.prescription.formulaName,
            dosageInstructions: record.prescription.dosageInstructions,
            durationDays: record.prescription.durationDays,
          }
        : null,
      // AI 분석 결과
      aiHealthInsights: record.aiHealthInsights,
      lifestyleRecommendations: record.lifestyleRecommendations,
      dietRecommendations: record.dietRecommendations,
      exerciseRecommendations: record.exerciseRecommendations,
      // 다음 방문
      nextVisitRecommended: record.nextVisitRecommended,
      nextVisitNotes: record.nextVisitNotes,
      sharedAt: record.sharedAt,
    };
  }
}
