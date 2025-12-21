import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ClinicalCase } from '../../database/entities/clinical-case.entity';

@Injectable()
export class CasesService {
  private aiEngineUrl: string;

  constructor(
    @InjectRepository(ClinicalCase)
    private casesRepository: Repository<ClinicalCase>,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.aiEngineUrl = this.configService.get('AI_ENGINE_URL') || 'http://localhost:8000';
  }

  async findAll(page = 1, limit = 20) {
    const [cases, total] = await this.casesRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: cases,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    return this.casesRepository.findOne({ where: { id } });
  }

  async findBySourceId(sourceId: string) {
    return this.casesRepository.findOne({ where: { sourceId } });
  }

  async searchSimilar(query: {
    symptoms: string[];
    constitution?: string;
    topK?: number;
  }) {
    try {
      const response = await this.httpService.axiosRef.post(
        `${this.aiEngineUrl}/api/v1/retrieval/search`,
        {
          symptoms: query.symptoms,
          constitution: query.constitution,
          top_k: query.topK || 10,
        },
      );
      return response.data;
    } catch (error) {
      console.error('AI Engine 호출 실패:', error);
      throw error;
    }
  }

  async create(caseData: Partial<ClinicalCase>) {
    const clinicalCase = this.casesRepository.create(caseData);
    return this.casesRepository.save(clinicalCase);
  }

  async getStatistics() {
    const total = await this.casesRepository.count();
    const byConstitution = await this.casesRepository
      .createQueryBuilder('case')
      .select('case.patientConstitution', 'constitution')
      .addSelect('COUNT(*)', 'count')
      .groupBy('case.patientConstitution')
      .getRawMany();

    const byOutcome = await this.casesRepository
      .createQueryBuilder('case')
      .select('case.treatmentOutcome', 'outcome')
      .addSelect('COUNT(*)', 'count')
      .groupBy('case.treatmentOutcome')
      .getRawMany();

    return {
      total,
      byConstitution,
      byOutcome,
    };
  }
}
