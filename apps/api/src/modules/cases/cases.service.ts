import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClinicalCase } from '../../database/entities/clinical-case.entity';
import { CacheService } from '../cache/cache.service';

const CACHE_PREFIX = 'cases';
const CACHE_TTL = 600; // 10 minutes

@Injectable()
export class CasesService {
  constructor(
    @InjectRepository(ClinicalCase)
    private casesRepository: Repository<ClinicalCase>,
    private cacheService: CacheService,
  ) {}

  async findAll(page = 1, limit = 20) {
    const cacheKey = `list:${page}:${limit}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
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
      },
      { prefix: CACHE_PREFIX, ttl: CACHE_TTL },
    );
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
    // 내부 검색으로 변경 - AI 모듈의 CaseSearchService를 사용하거나
    // 데이터베이스에서 직접 검색
    const queryBuilder = this.casesRepository.createQueryBuilder('case');

    // 증상 기반 검색 (간단한 LIKE 검색)
    if (query.symptoms && query.symptoms.length > 0) {
      const symptomConditions = query.symptoms.map((_, idx) =>
        `case.symptoms ILIKE :symptom${idx}`
      );
      query.symptoms.forEach((symptom, idx) => {
        queryBuilder.setParameter(`symptom${idx}`, `%${symptom}%`);
      });
      queryBuilder.andWhere(`(${symptomConditions.join(' OR ')})`);
    }

    // 체질 필터
    if (query.constitution) {
      queryBuilder.andWhere('case.patientConstitution = :constitution', {
        constitution: query.constitution,
      });
    }

    const cases = await queryBuilder
      .orderBy('case.createdAt', 'DESC')
      .take(query.topK || 10)
      .getMany();

    return {
      results: cases,
      total: cases.length,
    };
  }

  async create(caseData: Partial<ClinicalCase>) {
    const clinicalCase = this.casesRepository.create(caseData);
    return this.casesRepository.save(clinicalCase);
  }

  async getStatistics() {
    const cacheKey = 'statistics';

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
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
      },
      { prefix: CACHE_PREFIX, ttl: 3600 }, // 1 hour - statistics don't change frequently
    );
  }
}
