import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { ClinicalCase } from '../../database/entities/clinical-case.entity';
import { CacheService } from '../cache/cache.service';

const CACHE_PREFIX = 'cases';
const CACHE_TTL = 600; // 10 minutes
const EMBED_MODEL = 'text-embedding-3-small';
const SIMILAR_CACHE_TTL = 300; // 5분 — 같은 쿼리 반복 호출 방지

@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name);
  private readonly openai: OpenAI | null;

  constructor(
    @InjectRepository(ClinicalCase)
    private casesRepository: Repository<ClinicalCase>,
    private cacheService: CacheService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
  }

  /**
   * 코사인 유사도 — a, b 둘 다 정규화 안 된 임베딩이라고 가정.
   */
  private static cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i += 1) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
  }

  /**
   * 쿼리 임베딩 생성 — OPENAI_API_KEY 없으면 null. 호출자가 ILIKE 폴백 결정.
   */
  private async embedQuery(query: string): Promise<number[] | null> {
    if (!this.openai) return null;
    try {
      const resp = await this.openai.embeddings.create({
        model: EMBED_MODEL,
        input: query,
      });
      return resp.data[0].embedding;
    } catch (err: any) {
      this.logger.warn(`임베딩 생성 실패: ${err?.message?.slice(0, 200)}`);
      return null;
    }
  }

  /**
   * AI 유사도 기반 치험례 검색.
   * 1) 쿼리를 임베딩
   * 2) embedding 컬럼이 있는 모든 case 와 cosine similarity 계산
   * 3) 임계값(threshold) 이상 + 상위 topK 반환, 매칭 % 부여
   *
   * 임베딩 미생성 환경(컬럼이 다 NULL)에서는 빈 결과 + 안내 메시지 반환.
   */
  async searchSimilar(input: {
    query: string;
    topK?: number;
    threshold?: number; // 0~1, 기본 0.3
    constitution?: string;
    outcome?: string;
  }) {
    const topK = Math.min(input.topK ?? 10, 50);
    const threshold = input.threshold ?? 0.3;

    if (!input.query || !input.query.trim()) {
      return {
        query: input.query,
        results: [],
        mode: 'ai-similar',
        meta: { error: '검색어를 입력해주세요.' },
      };
    }

    const cacheKey = `similar:${input.query}:${topK}:${threshold}:${input.constitution || ''}:${input.outcome || ''}`;
    const cached = await this.cacheService.get(cacheKey, { prefix: CACHE_PREFIX });
    if (cached) return cached;

    const queryEmbedding = await this.embedQuery(input.query);
    if (!queryEmbedding) {
      return {
        query: input.query,
        results: [],
        mode: 'ai-similar',
        meta: {
          error: 'AI 검색을 사용할 수 없습니다. OPENAI_API_KEY 설정과 임베딩 생성이 필요합니다.',
        },
      };
    }

    // embedding 컬럼이 있는 케이스만 가져옴. 추가 필터(체질·결과)도 적용.
    const qb = this.casesRepository
      .createQueryBuilder('c')
      .where('c.embedding IS NOT NULL');
    if (input.constitution) {
      qb.andWhere('c.patientConstitution = :constitution', {
        constitution: input.constitution,
      });
    }
    if (input.outcome) {
      qb.andWhere('c.treatmentOutcome = :outcome', { outcome: input.outcome });
    }

    const candidates = await qb.getMany();
    if (candidates.length === 0) {
      return {
        query: input.query,
        results: [],
        mode: 'ai-similar',
        meta: {
          error:
            '임베딩이 생성된 치험례가 없습니다. `pnpm --filter @hanmed/api embed:cases` 를 먼저 실행하세요.',
        },
      };
    }

    // in-memory 코사인 유사도 — N=6,454, 1536d 이면 약 80ms (V8). 운영 부담 큰 빈도면 pgvector로 옮길 것.
    const scored = candidates
      .map((c) => ({
        case: c,
        score: CasesService.cosineSimilarity(queryEmbedding, c.embedding as number[]),
      }))
      .filter((s) => s.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    const result = {
      query: input.query,
      mode: 'ai-similar' as const,
      results: scored.map(({ case: c, score }) => ({
        id: c.id,
        sourceId: c.sourceId,
        // 매칭 %: 0~1 → 50~99% 범위로 매핑 (임상에서 100% 라고 보장 X)
        matchPercent: Math.round(50 + Math.min(score, 0.98) * 50),
        rawScore: Number(score.toFixed(4)),
        formulaName:
          Array.isArray(c.herbalFormulas) && c.herbalFormulas[0]?.formulaName
            ? c.herbalFormulas[0].formulaName
            : '',
        chiefComplaint: c.chiefComplaint,
        patternDiagnosis: c.patternDiagnosis,
        treatmentOutcome: c.treatmentOutcome,
        constitution: c.patientConstitution,
        patientGender: c.patientGender,
        patientAge: c.patientAgeRange ? parseInt(String(c.patientAgeRange), 10) || null : null,
        symptoms: Array.isArray(c.symptoms)
          ? c.symptoms.map((s: any) => (typeof s === 'string' ? s : s?.name)).filter(Boolean)
          : [],
        originalText: c.originalText,
        dataSource: c.recorderName,
      })),
      meta: {
        candidates: candidates.length,
        threshold,
        embedModel: EMBED_MODEL,
      },
    };

    await this.cacheService.set(cacheKey, result, {
      prefix: CACHE_PREFIX,
      ttl: SIMILAR_CACHE_TTL,
    });
    return result;
  }

  async findAll(
    page = 1,
    limit = 20,
    filters?: {
      search?: string;
      searchField?: string;
      constitution?: string;
      outcome?: string;
    },
  ) {
    const cacheKey = `list:${page}:${limit}:${JSON.stringify(filters || {})}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const qb = this.casesRepository.createQueryBuilder('c');

        // 텍스트 검색
        if (filters?.search) {
          const searchParam = `%${filters.search}%`;
          if (filters.searchField === 'symptoms') {
            qb.andWhere('c.chiefComplaint ILIKE :search OR c.symptoms::text ILIKE :search', { search: searchParam });
          } else if (filters.searchField === 'formula') {
            qb.andWhere('c.herbalFormulas::text ILIKE :search', { search: searchParam });
          } else if (filters.searchField === 'diagnosis') {
            qb.andWhere('c.patternDiagnosis ILIKE :search', { search: searchParam });
          } else {
            // 전체 검색
            qb.andWhere(
              '(c.chiefComplaint ILIKE :search OR c.patternDiagnosis ILIKE :search OR c.originalText ILIKE :search OR c.herbalFormulas::text ILIKE :search OR c.symptoms::text ILIKE :search)',
              { search: searchParam },
            );
          }
        }

        // 체질 필터
        if (filters?.constitution) {
          qb.andWhere('c.patientConstitution = :constitution', {
            constitution: filters.constitution,
          });
        }

        // 치료 결과 필터
        if (filters?.outcome) {
          qb.andWhere('c.treatmentOutcome = :outcome', {
            outcome: filters.outcome,
          });
        }

        qb.orderBy('c.createdAt', 'DESC')
          .skip((page - 1) * limit)
          .take(limit);

        const [cases, total] = await qb.getManyAndCount();

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

  // searchSimilar 는 임베딩 기반 버전이 위쪽에 정의됨 — 옛 ILIKE 기반은 제거.

  async create(caseData: Partial<ClinicalCase>) {
    const clinicalCase = this.casesRepository.create(caseData);
    return this.casesRepository.save(clinicalCase);
  }

  async getStatistics() {
    // 전역 통계 — 모든 사용자 동일 키 공유. 2,000명 동시 사용 시 캐시 만료 직후
    // 다수의 워커가 한꺼번에 동일 쿼리를 돌려 DB 가 마비될 수 있음(Thundering Herd).
    // 분산 락 + stale fallback 으로 첫 워커만 DB 를 치도록 만든다.
    const cacheKey = 'statistics';

    return this.cacheService.getOrSetWithLock(
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
      {
        prefix: CACHE_PREFIX,
        ttl: 3600,          // 통계 1h
        lockTtl: 15,        // 통계 쿼리는 길어야 수초
        lockWaitMs: 4_000,  // 대시보드 응답이 끊기지 않게
        staleTtl: 6 * 3600, // stale fallback 6h 보존
      },
    );
  }
}
