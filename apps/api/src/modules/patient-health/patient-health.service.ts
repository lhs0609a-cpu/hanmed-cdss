import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import {
  HealthJournal,
  MedicationReminder,
  MedicationLog,
  MedicationLogStatus,
  PatientAccount,
} from '../../database/entities';
import {
  CreateHealthJournalDto,
  GetHealthJournalDto,
  CreateMedicationReminderDto,
  UpdateMedicationReminderDto,
  CreateMedicationLogDto,
  GetMedicationLogsDto,
} from './dto';

@Injectable()
export class PatientHealthService {
  constructor(
    @InjectRepository(HealthJournal)
    private journalRepository: Repository<HealthJournal>,
    @InjectRepository(MedicationReminder)
    private reminderRepository: Repository<MedicationReminder>,
    @InjectRepository(MedicationLog)
    private logRepository: Repository<MedicationLog>,
    @InjectRepository(PatientAccount)
    private patientRepository: Repository<PatientAccount>,
  ) {}

  // ===== 건강 일지 =====

  // 건강 일지 생성
  async createJournal(patientId: string, dto: CreateHealthJournalDto) {
    const journal = this.journalRepository.create({
      ...dto,
      patientId,
      recordedDate: new Date(dto.recordedDate),
    });

    return this.journalRepository.save(journal);
  }

  // 건강 일지 수정
  async updateJournal(
    journalId: string,
    patientId: string,
    dto: Partial<CreateHealthJournalDto>,
  ) {
    const journal = await this.journalRepository.findOne({
      where: { id: journalId, patientId },
    });

    if (!journal) {
      throw new NotFoundException('건강 일지를 찾을 수 없습니다.');
    }

    Object.assign(journal, dto);
    return this.journalRepository.save(journal);
  }

  // 건강 일지 목록
  async getJournals(patientId: string, dto: GetHealthJournalDto) {
    const { startDate, endDate, page = 1, limit = 30 } = dto;

    const queryBuilder = this.journalRepository
      .createQueryBuilder('journal')
      .where('journal.patientId = :patientId', { patientId });

    if (startDate) {
      queryBuilder.andWhere('journal.recordedDate >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('journal.recordedDate <= :endDate', { endDate });
    }

    queryBuilder.orderBy('journal.recordedDate', 'DESC');

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [journals, total] = await queryBuilder.getManyAndCount();

    return {
      data: journals,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 특정 날짜 건강 일지
  async getJournalByDate(patientId: string, date: string) {
    return this.journalRepository.findOne({
      where: {
        patientId,
        recordedDate: new Date(date),
      },
    });
  }

  // 건강 리포트 (기간별 통계)
  async getHealthReport(patientId: string, startDate: string, endDate: string) {
    const journals = await this.journalRepository.find({
      where: {
        patientId,
        recordedDate: Between(new Date(startDate), new Date(endDate)),
      },
      order: { recordedDate: 'ASC' },
    });

    if (journals.length === 0) {
      return {
        period: { startDate, endDate },
        totalDays: 0,
        recordedDays: 0,
        averages: null,
        trends: null,
        symptomsSummary: [],
      };
    }

    // 평균 계산
    const avgCondition =
      journals
        .filter((j) => j.overallCondition)
        .reduce((sum, j) => sum + j.overallCondition!, 0) /
      journals.filter((j) => j.overallCondition).length;

    const avgSleep =
      journals
        .filter((j) => j.sleepHours)
        .reduce((sum, j) => sum + Number(j.sleepHours), 0) /
      journals.filter((j) => j.sleepHours).length;

    const avgEnergy =
      journals
        .filter((j) => j.energyLevel)
        .reduce((sum, j) => sum + j.energyLevel!, 0) /
      journals.filter((j) => j.energyLevel).length;

    const avgStress =
      journals
        .filter((j) => j.stressLevel)
        .reduce((sum, j) => sum + j.stressLevel!, 0) /
      journals.filter((j) => j.stressLevel).length;

    // 증상 빈도
    const symptomFrequency: Record<string, number> = {};
    journals.forEach((j) => {
      j.symptoms?.forEach((s) => {
        symptomFrequency[s.name] = (symptomFrequency[s.name] || 0) + 1;
      });
    });

    const symptomsSummary = Object.entries(symptomFrequency)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // 복용 준수율
    const medicationDays = journals.filter((j) => j.medicationTaken === true).length;
    const totalRecordedDays = journals.length;
    const adherenceRate =
      totalRecordedDays > 0 ? (medicationDays / totalRecordedDays) * 100 : 0;

    // 트렌드 데이터
    const trends = journals.map((j) => ({
      date: j.recordedDate,
      condition: j.overallCondition,
      energy: j.energyLevel,
      sleep: j.sleepHours,
      stress: j.stressLevel,
    }));

    return {
      period: { startDate, endDate },
      totalDays: Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
      recordedDays: totalRecordedDays,
      averages: {
        condition: avgCondition || null,
        sleep: avgSleep || null,
        energy: avgEnergy || null,
        stress: avgStress || null,
      },
      medicationAdherence: {
        rate: Math.round(adherenceRate),
        takenDays: medicationDays,
        totalDays: totalRecordedDays,
      },
      symptomsSummary,
      trends,
    };
  }

  // ===== 복약 알림 =====

  // 알림 생성
  async createReminder(patientId: string, dto: CreateMedicationReminderDto) {
    const reminder = this.reminderRepository.create({
      ...dto,
      patientId,
    });

    return this.reminderRepository.save(reminder);
  }

  // 알림 수정
  async updateReminder(
    reminderId: string,
    patientId: string,
    dto: UpdateMedicationReminderDto,
  ) {
    const reminder = await this.reminderRepository.findOne({
      where: { id: reminderId, patientId },
    });

    if (!reminder) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }

    Object.assign(reminder, dto);
    return this.reminderRepository.save(reminder);
  }

  // 알림 삭제
  async deleteReminder(reminderId: string, patientId: string) {
    const reminder = await this.reminderRepository.findOne({
      where: { id: reminderId, patientId },
    });

    if (!reminder) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }

    await this.reminderRepository.remove(reminder);
    return { success: true };
  }

  // 알림 목록
  async getReminders(patientId: string) {
    return this.reminderRepository.find({
      where: { patientId },
      relations: ['prescription'],
      order: { reminderTime: 'ASC' },
    });
  }

  // 활성 알림
  async getActiveReminders(patientId: string) {
    return this.reminderRepository.find({
      where: { patientId, isActive: true },
      relations: ['prescription'],
      order: { reminderTime: 'ASC' },
    });
  }

  // ===== 복약 기록 =====

  // 복약 기록 생성
  async createMedicationLog(patientId: string, dto: CreateMedicationLogDto) {
    const log = this.logRepository.create({
      ...dto,
      patientId,
      takenAt: new Date(dto.takenAt),
      status: dto.status || MedicationLogStatus.TAKEN,
    });

    return this.logRepository.save(log);
  }

  // 복약 기록 조회
  async getMedicationLogs(patientId: string, dto: GetMedicationLogsDto) {
    const { prescriptionId, startDate, endDate } = dto;

    const queryBuilder = this.logRepository
      .createQueryBuilder('log')
      .where('log.patientId = :patientId', { patientId });

    if (prescriptionId) {
      queryBuilder.andWhere('log.prescriptionId = :prescriptionId', {
        prescriptionId,
      });
    }

    if (startDate) {
      queryBuilder.andWhere('log.takenAt >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      queryBuilder.andWhere('log.takenAt <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    queryBuilder.orderBy('log.takenAt', 'DESC');

    return queryBuilder.getMany();
  }

  // 오늘 복약 기록
  async getTodayLogs(patientId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.logRepository.find({
      where: {
        patientId,
        takenAt: Between(today, tomorrow),
      },
      relations: ['prescription', 'reminder'],
      order: { takenAt: 'DESC' },
    });
  }

  // 복약 통계 (기간별)
  async getMedicationStats(
    patientId: string,
    prescriptionId: string,
    startDate: string,
    endDate: string,
  ) {
    const logs = await this.logRepository.find({
      where: {
        patientId,
        prescriptionId,
        takenAt: Between(new Date(startDate), new Date(endDate)),
      },
    });

    const takenCount = logs.filter(
      (l) => l.status === MedicationLogStatus.TAKEN,
    ).length;
    const skippedCount = logs.filter(
      (l) => l.status === MedicationLogStatus.SKIPPED,
    ).length;
    const delayedCount = logs.filter(
      (l) => l.status === MedicationLogStatus.DELAYED,
    ).length;

    const totalCount = takenCount + skippedCount + delayedCount;
    const adherenceRate = totalCount > 0 ? (takenCount / totalCount) * 100 : 0;

    // 부작용 집계
    const sideEffects: Record<string, number> = {};
    logs.forEach((l) => {
      l.sideEffects?.forEach((se) => {
        sideEffects[se.symptom] = (sideEffects[se.symptom] || 0) + 1;
      });
    });

    return {
      period: { startDate, endDate },
      total: totalCount,
      taken: takenCount,
      skipped: skippedCount,
      delayed: delayedCount,
      adherenceRate: Math.round(adherenceRate),
      sideEffects: Object.entries(sideEffects).map(([symptom, count]) => ({
        symptom,
        count,
      })),
    };
  }
}
