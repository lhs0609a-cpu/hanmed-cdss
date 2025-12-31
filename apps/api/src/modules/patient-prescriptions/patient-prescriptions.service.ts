import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  PatientPrescription,
  PrescriptionStatus,
  PatientRecord,
  Herb,
  Formula,
  DrugHerbInteraction,
  PatientAccount,
} from '../../database/entities';
import {
  CreatePrescriptionDto,
  UpdatePrescriptionDto,
  GetPrescriptionsDto,
} from './dto';

@Injectable()
export class PatientPrescriptionsService {
  constructor(
    @InjectRepository(PatientPrescription)
    private prescriptionRepository: Repository<PatientPrescription>,
    @InjectRepository(PatientRecord)
    private recordRepository: Repository<PatientRecord>,
    @InjectRepository(Herb)
    private herbRepository: Repository<Herb>,
    @InjectRepository(Formula)
    private formulaRepository: Repository<Formula>,
    @InjectRepository(DrugHerbInteraction)
    private interactionRepository: Repository<DrugHerbInteraction>,
    @InjectRepository(PatientAccount)
    private patientRepository: Repository<PatientAccount>,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  // 처방 생성 (의료진용)
  async create(clinicId: string, dto: CreatePrescriptionDto) {
    // 환자 확인
    const patient = await this.patientRepository.findOne({
      where: { id: dto.patientId },
    });
    if (!patient) {
      throw new NotFoundException('환자를 찾을 수 없습니다.');
    }

    // 약재 상세 정보 보강
    const enrichedHerbs = await this.enrichHerbsDetail(dto.herbsDetail);

    // 약물 상호작용 확인 (환자의 현재 복용 중인 약과)
    const interactions = await this.checkDrugInteractions(
      enrichedHerbs,
      patient.currentMedications || [],
    );

    // 과학적 근거 생성
    const scientificEvidence = await this.generateScientificEvidence(
      dto.formulaName,
      enrichedHerbs,
    );

    const prescription = this.prescriptionRepository.create({
      ...dto,
      herbsDetail: enrichedHerbs,
      drugInteractions: interactions,
      scientificEvidence,
      startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
      endDate: dto.durationDays
        ? new Date(Date.now() + dto.durationDays * 24 * 60 * 60 * 1000)
        : undefined,
    });

    const saved = await this.prescriptionRepository.save(prescription);

    // 진료 기록에 연결
    if (dto.recordId) {
      await this.recordRepository.update(dto.recordId, {
        prescriptionId: saved.id,
      });
    }

    return saved;
  }

  // 처방 수정
  async update(prescriptionId: string, dto: UpdatePrescriptionDto) {
    const prescription = await this.prescriptionRepository.findOne({
      where: { id: prescriptionId },
    });

    if (!prescription) {
      throw new NotFoundException('처방을 찾을 수 없습니다.');
    }

    Object.assign(prescription, dto);

    if (dto.durationDays && prescription.startDate) {
      prescription.endDate = new Date(
        prescription.startDate.getTime() + dto.durationDays * 24 * 60 * 60 * 1000,
      );
    }

    return this.prescriptionRepository.save(prescription);
  }

  // 환자용 처방 목록
  async findByPatient(patientId: string, dto: GetPrescriptionsDto) {
    const { status, activeOnly, page = 1, limit = 20 } = dto;

    const queryBuilder = this.prescriptionRepository
      .createQueryBuilder('prescription')
      .leftJoinAndSelect('prescription.formula', 'formula')
      .where('prescription.patientId = :patientId', { patientId });

    if (status) {
      queryBuilder.andWhere('prescription.status = :status', { status });
    }

    if (activeOnly) {
      queryBuilder.andWhere('prescription.status = :activeStatus', {
        activeStatus: PrescriptionStatus.ACTIVE,
      });
    }

    queryBuilder.orderBy('prescription.createdAt', 'DESC');

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [prescriptions, total] = await queryBuilder.getManyAndCount();

    return {
      data: prescriptions.map((p) => this.formatPrescriptionForPatient(p)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 현재 복용 중인 처방
  async findActivePrescriptions(patientId: string) {
    const prescriptions = await this.prescriptionRepository.find({
      where: {
        patientId,
        status: PrescriptionStatus.ACTIVE,
      },
      relations: ['formula'],
      order: { startDate: 'DESC' },
    });

    return prescriptions.map((p) => this.formatPrescriptionForPatient(p));
  }

  // 처방 상세 (환자용)
  async findByIdForPatient(prescriptionId: string, patientId: string) {
    const prescription = await this.prescriptionRepository.findOne({
      where: { id: prescriptionId, patientId },
      relations: ['formula'],
    });

    if (!prescription) {
      throw new NotFoundException('처방을 찾을 수 없습니다.');
    }

    return this.formatPrescriptionDetailForPatient(prescription);
  }

  // 약재 상세 정보 (환자용)
  async getHerbDetail(prescriptionId: string, herbName: string, patientId: string) {
    const prescription = await this.prescriptionRepository.findOne({
      where: { id: prescriptionId, patientId },
    });

    if (!prescription) {
      throw new NotFoundException('처방을 찾을 수 없습니다.');
    }

    const herb = prescription.herbsDetail.find(
      (h) => h.name === herbName || h.herbId === herbName,
    );

    if (!herb) {
      throw new NotFoundException('약재 정보를 찾을 수 없습니다.');
    }

    // DB에서 추가 정보 조회
    let additionalInfo = null;
    if (herb.herbId) {
      additionalInfo = await this.herbRepository.findOne({
        where: { id: herb.herbId },
      });
    }

    return {
      ...herb,
      additionalInfo: additionalInfo
        ? {
            category: additionalInfo.category,
            properties: additionalInfo.properties,
            meridianTropism: additionalInfo.meridianTropism,
            contraindications: additionalInfo.contraindications,
          }
        : null,
    };
  }

  // 약재 상세 정보 보강
  private async enrichHerbsDetail(herbs: any[]) {
    const enriched = [];

    for (const herb of herbs) {
      let dbHerb = null;

      if (herb.herbId) {
        dbHerb = await this.herbRepository.findOne({
          where: { id: herb.herbId },
        });
      } else {
        // 이름으로 검색
        dbHerb = await this.herbRepository.findOne({
          where: [
            { standardName: herb.name },
            { hanjaName: herb.name },
          ],
        });
      }

      enriched.push({
        herbId: dbHerb?.id || herb.herbId,
        name: herb.name,
        hanja: dbHerb?.hanjaName || herb.hanja,
        amount: herb.amount,
        purpose: herb.purpose,
        efficacy: dbHerb?.efficacy || herb.efficacy || '',
        scientificInfo: dbHerb
          ? {
              activeCompounds: dbHerb.activeCompounds || [],
              mechanism: '',
              studies: (dbHerb.pubmedReferences || []).map((pmid: string) => ({
                pmid,
                title: '',
                summary: '',
              })),
            }
          : herb.scientificInfo,
        cautions: dbHerb?.contraindications
          ? [dbHerb.contraindications]
          : herb.cautions || [],
      });
    }

    return enriched;
  }

  // 약물 상호작용 확인
  private async checkDrugInteractions(herbs: any[], medications: string[]) {
    if (!medications || medications.length === 0) {
      return [];
    }

    const herbIds = herbs.map((h) => h.herbId).filter(Boolean);
    if (herbIds.length === 0) {
      return [];
    }

    const interactions = await this.interactionRepository.find({
      where: {
        herbId: In(herbIds),
      },
    });

    // 현재 복용 중인 약과 매칭
    return interactions
      .filter((i) =>
        medications.some(
          (med) =>
            med.toLowerCase().includes(i.drugName.toLowerCase()) ||
            i.drugName.toLowerCase().includes(med.toLowerCase()),
        ),
      )
      .map((i) => ({
        drugName: i.drugName,
        herbName: herbs.find((h) => h.herbId === i.herbId)?.name || '',
        interactionType: i.interactionType,
        severity: i.severity,
        description: i.mechanism,
        recommendation: i.recommendation,
      }));
  }

  // 과학적 근거 생성
  private async generateScientificEvidence(formulaName: string, herbs: any[]) {
    // AI 엔진 호출 또는 기본 데이터 반환
    const aiEngineUrl = this.configService.get('AI_ENGINE_URL');

    if (aiEngineUrl) {
      try {
        const response = await firstValueFrom(
          this.httpService.post(`${aiEngineUrl}/api/v1/scientific-evidence/generate`, {
            formulaName,
            herbs: herbs.map((h) => h.name),
          }),
        );
        return response.data;
      } catch (error) {
        console.error('AI 과학적 근거 생성 실패:', error);
      }
    }

    // 기본 응답
    return {
      studies: [],
      mechanism: `${formulaName}은(는) 한의학적 원리에 따라 조제된 처방입니다.`,
      expectedEffects: [],
      evidenceLevel: 'C',
    };
  }

  // 환자용 처방 포맷
  private formatPrescriptionForPatient(prescription: PatientPrescription) {
    return {
      id: prescription.id,
      formulaName: prescription.formulaName,
      formulaDescription: prescription.formulaDescription,
      dosageFrequency: prescription.dosageFrequency,
      dosageTiming: prescription.dosageTiming,
      durationDays: prescription.durationDays,
      status: prescription.status,
      startDate: prescription.startDate,
      endDate: prescription.endDate,
      herbsCount: prescription.herbsDetail?.length || 0,
      hasInteractions:
        prescription.drugInteractions && prescription.drugInteractions.length > 0,
      createdAt: prescription.createdAt,
    };
  }

  // 환자용 처방 상세 포맷
  private formatPrescriptionDetailForPatient(prescription: PatientPrescription) {
    return {
      id: prescription.id,
      formulaName: prescription.formulaName,
      formulaDescription: prescription.formulaDescription,
      // 약재 정보
      herbs: prescription.herbsDetail.map((h) => ({
        name: h.name,
        hanja: h.hanja,
        amount: h.amount,
        purpose: h.purpose,
        efficacy: h.efficacy,
        hasScientificInfo: !!h.scientificInfo,
        cautions: h.cautions,
      })),
      // 복용 안내
      dosageInstructions: prescription.dosageInstructions,
      dosageFrequency: prescription.dosageFrequency,
      dosageTiming: prescription.dosageTiming,
      durationDays: prescription.durationDays,
      // 주의사항
      precautions: prescription.precautions,
      drugInteractions: prescription.drugInteractions,
      // 과학적 근거
      scientificEvidence: prescription.scientificEvidence,
      expectedEffects: prescription.expectedEffects,
      // 상태
      status: prescription.status,
      startDate: prescription.startDate,
      endDate: prescription.endDate,
      createdAt: prescription.createdAt,
    };
  }
}
