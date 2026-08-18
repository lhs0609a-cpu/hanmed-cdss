import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import {
  ClinicalCase,
  TreatmentOutcome,
} from '../../database/entities/clinical-case.entity';
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

  /**
   * 유사 치험례 성공률 통계 — 진료 결과 화면의 "유사 환자들은 어떻게 됐나" 카드용.
   *
   * 1) 임베딩 검색으로 유사 치험례를 최대 50건 모으고,
   * 2) 임베딩이 없거나 OPENAI_API_KEY 가 없는 환경에서는 주소증·증상 텍스트 매칭으로 폴백한다.
   * 3) 모인 치험례의 treatmentOutcome 분포로 성공률(완치+호전)을 집계한다.
   *
   * 데이터에 없는 값은 만들어 내지 않는다 — 치험례에 치료 기간 필드가 없으므로
   * averageTreatmentDuration 은 null 로 돌려주고 화면에서 숨긴다.
   */
  async getSimilarSuccessStats(input: {
    chiefComplaint: string;
    symptoms?: Array<{ name: string; severity?: number }>;
    diagnosis?: string;
    constitution?: string;
  }) {
    const symptomNames = (input.symptoms || [])
      .map((s) => (typeof s === 'string' ? s : s?.name))
      .filter(Boolean) as string[];

    const query = [input.chiefComplaint, ...symptomNames, input.diagnosis]
      .filter(Boolean)
      .join(' ')
      .trim();

    const empty = {
      totalSimilarCases: 0,
      successRate: 0,
      outcomeBreakdown: { cured: 0, improved: 0, noChange: 0, worsened: 0 },
      averageTreatmentDuration: null as string | null,
      topSuccessfulFormulas: [] as Array<{
        formulaName: string;
        caseCount: number;
        successRate: number;
      }>,
      confidenceLevel: 'low' as 'high' | 'medium' | 'low',
      matchCriteria: [] as string[],
    };

    if (!query) return empty;

    const matchCriteria: string[] = [];
    let cases: ClinicalCase[] = [];

    // 1) AI 유사도 검색 우선
    // searchSimilar 는 캐시 히트 시 unknown 을 돌려주므로 필요한 필드만 좁혀서 읽는다.
    const similar = (await this.searchSimilar({
      query,
      topK: 50,
      threshold: 0.3,
      constitution: input.constitution,
    })) as { results?: Array<{ id: string }> } | undefined;
    const ids = (similar?.results || []).map((r) => r.id);
    if (ids.length > 0) {
      cases = await this.casesRepository
        .createQueryBuilder('c')
        .where('c.id IN (:...ids)', { ids })
        .getMany();
      matchCriteria.push('AI 임베딩 유사도 매칭');
    }

    // 2) 폴백 — 임베딩 미구축/키 미설정 환경에서도 실제 통계를 보여준다.
    if (cases.length === 0) {
      const qb = this.casesRepository.createQueryBuilder('c');
      const terms = [input.chiefComplaint, ...symptomNames].filter(Boolean);
      terms.forEach((term, i) => {
        const param = `t${i}`;
        const clause = `(c.chiefComplaint ILIKE :${param} OR c.presentIllness ILIKE :${param} OR c.patternDiagnosis ILIKE :${param})`;
        if (i === 0) qb.where(clause, { [param]: `%${term}%` });
        else qb.orWhere(clause, { [param]: `%${term}%` });
      });
      if (input.constitution) {
        qb.andWhere('c.patientConstitution = :constitution', {
          constitution: input.constitution,
        });
      }
      cases = await qb.take(50).getMany();
      if (cases.length > 0) matchCriteria.push('주소증·증상 텍스트 매칭');
    }

    if (cases.length === 0) return empty;

    if (input.constitution) matchCriteria.push(`체질 일치 (${input.constitution})`);
    if (symptomNames.length > 0) {
      matchCriteria.push(`증상 ${symptomNames.length}개 기준`);
    }

    const outcomeBreakdown = { cured: 0, improved: 0, noChange: 0, worsened: 0 };
    for (const c of cases) {
      switch (c.treatmentOutcome) {
        case TreatmentOutcome.CURED:
          outcomeBreakdown.cured += 1;
          break;
        case TreatmentOutcome.IMPROVED:
          outcomeBreakdown.improved += 1;
          break;
        case TreatmentOutcome.NO_CHANGE:
          outcomeBreakdown.noChange += 1;
          break;
        case TreatmentOutcome.WORSENED:
          outcomeBreakdown.worsened += 1;
          break;
        default:
          break; // 결과 미기록 케이스는 분모에서 제외
      }
    }

    const withOutcome =
      outcomeBreakdown.cured +
      outcomeBreakdown.improved +
      outcomeBreakdown.noChange +
      outcomeBreakdown.worsened;

    if (withOutcome === 0) return { ...empty, totalSimilarCases: 0 };

    const successRate = Math.round(
      ((outcomeBreakdown.cured + outcomeBreakdown.improved) / withOutcome) * 100,
    );

    // 처방별 집계 — 첫 번째 처방(주 처방)만 센다.
    const byFormula = new Map<string, { total: number; success: number }>();
    for (const c of cases) {
      const name = Array.isArray(c.herbalFormulas)
        ? c.herbalFormulas[0]?.formulaName
        : undefined;
      if (!name) continue;
      const entry = byFormula.get(name) || { total: 0, success: 0 };
      entry.total += 1;
      if (
        c.treatmentOutcome === TreatmentOutcome.CURED ||
        c.treatmentOutcome === TreatmentOutcome.IMPROVED
      ) {
        entry.success += 1;
      }
      byFormula.set(name, entry);
    }

    const topSuccessfulFormulas = [...byFormula.entries()]
      .map(([formulaName, v]) => ({
        formulaName,
        caseCount: v.total,
        successRate: Math.round((v.success / v.total) * 100),
      }))
      .sort((a, b) => b.caseCount - a.caseCount || b.successRate - a.successRate)
      .slice(0, 5);

    // 표본 수 기반 신뢰도 — 임상 해석을 과대평가하지 않도록 보수적으로 둔다.
    const confidenceLevel: 'high' | 'medium' | 'low' =
      withOutcome >= 30 ? 'high' : withOutcome >= 10 ? 'medium' : 'low';

    return {
      totalSimilarCases: withOutcome,
      successRate,
      outcomeBreakdown,
      averageTreatmentDuration: null,
      topSuccessfulFormulas,
      confidenceLevel,
      matchCriteria,
    };
  }


  /**
   * 처방명 또는 변증명으로 실제 치험례를 모아 경과까지 집계한다.
   *
   * 이 제품의 축은 치험례다. 처방 카탈로그·변증 도구가 이름만 나열하면
   * 한의사에게는 종이 사전과 다를 게 없다. 어떤 처방을 볼 때
   * "실제로 몇 건 쓰였고 어떻게 끝났는지" 가 같이 보여야 의미가 생긴다.
   *
   * kind='formula' → herbalFormulas 안에서 처방명 매칭
   * kind='pattern' → patternDiagnosis 매칭
   */
  async getCaseEvidence(input: {
    kind: 'formula' | 'pattern';
    name: string;
    limit?: number;
  }) {
    const name = (input.name || '').trim();
    const limit = Math.min(Math.max(input.limit ?? 5, 1), 20);
    if (!name) {
      return { name, kind: input.kind, total: 0, successRate: null, outcomeBreakdown: {}, cases: [] };
    }

    const cacheKey = `evidence:${input.kind}:${name}:${limit}`;
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const qb = this.casesRepository.createQueryBuilder('c');
        if (input.kind === 'formula') {
          // JSON 전체를 ILIKE 하면 약재명·비고까지 걸려 건수가 부풀려진다.
          // formulaName 필드만 정확히 본다.
          qb.where(
            `EXISTS (
               SELECT 1 FROM jsonb_array_elements("c"."herbalFormulas") AS f
               WHERE f->>'formulaName' ILIKE :n
             )`,
            { n: `%${name}%` },
          );
        } else {
          qb.where('c.patternDiagnosis ILIKE :n', { n: `%${name}%` });
        }

        const total = await qb.getCount();

        // 경과 분포 — 완치/호전을 성공으로 본다.
        const outcomeRows = await qb
          .clone()
          .select('c.treatmentOutcome', 'outcome')
          .addSelect('COUNT(*)', 'cnt')
          .groupBy('c.treatmentOutcome')
          .getRawMany();

        const outcomeBreakdown: Record<string, number> = {};
        for (const r of outcomeRows) {
          if (r.outcome) outcomeBreakdown[r.outcome] = parseInt(r.cnt, 10);
        }
        const graded = Object.values(outcomeBreakdown).reduce((a, b) => a + b, 0);
        const good = (outcomeBreakdown['완치'] || 0) + (outcomeBreakdown['호전'] || 0);
        // 경과가 기록된 건이 5건 미만이면 성공률을 내지 않는다 — 3건 중 3건 성공을
        // "100%" 로 띄우면 통계처럼 읽히지만 근거가 없다.
        const successRate = graded >= 5 ? Math.round((good / graded) * 100) : null;

        const rows = await qb
          .clone()
          .orderBy('c.createdAt', 'DESC')
          .take(limit)
          .getMany();

        return {
          name,
          kind: input.kind,
          total,
          gradedCount: graded,
          successRate,
          outcomeBreakdown,
          cases: rows.map((c) => ({
            id: c.id,
            chiefComplaint: c.chiefComplaint,
            patternDiagnosis: c.patternDiagnosis,
            outcome: c.treatmentOutcome,
            constitution: c.patientConstitution,
            formulaName: c.herbalFormulas?.[0]?.formulaName ?? '',
            ageRange: c.patientAgeRange,
            gender: c.patientGender,
          })),
        };
      },
      { prefix: CACHE_PREFIX, ttl: 600 },
    );
  }


  /**
   * 여러 처방/변증의 치험례 건수를 한 번에.
   *
   * 목록 화면에서 카드마다 개별 호출하면 한 페이지에 20번이 나간다.
   * 목록은 "이 처방에 임상 기록이 있는가" 만 알면 되므로 건수만 묶어서 돌려준다.
   */
  async getCaseCounts(input: { kind: 'formula' | 'pattern'; names: string[] }) {
    const names = Array.from(
      new Set((input.names || []).map((n) => (n || '').trim()).filter(Boolean)),
    ).slice(0, 50);
    if (names.length === 0) return {};

    const cacheKey = `counts:${input.kind}:${names.join('|')}`;
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const out: Record<string, number> = {};
        // 이름별 ILIKE 라 한 방 쿼리로 묶기 어렵다. 50개 상한 + 10분 캐시로 감당한다.
        await Promise.all(
          names.map(async (name) => {
            const qb = this.casesRepository.createQueryBuilder('c');
            if (input.kind === 'formula') {
              // JSON 전체를 ILIKE 하면 약재명·비고까지 걸려 건수가 부풀려진다.
          // formulaName 필드만 정확히 본다.
          qb.where(
            `EXISTS (
               SELECT 1 FROM jsonb_array_elements("c"."herbalFormulas") AS f
               WHERE f->>'formulaName' ILIKE :n
             )`,
            { n: `%${name}%` },
          );
            } else {
              qb.where('c.patternDiagnosis ILIKE :n', { n: `%${name}%` });
            }
            out[name] = await qb.getCount();
          }),
        );
        return out;
      },
      { prefix: CACHE_PREFIX, ttl: 600 },
    );
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
            qb.andWhere('c.chiefComplaint ILIKE :search OR "c"."symptoms"::text ILIKE :search', { search: searchParam });
          } else if (filters.searchField === 'formula') {
            qb.andWhere('"c"."herbalFormulas"::text ILIKE :search', { search: searchParam });
          } else if (filters.searchField === 'diagnosis') {
            qb.andWhere('c.patternDiagnosis ILIKE :search', { search: searchParam });
          } else {
            // 전체 검색
            qb.andWhere(
              '(c.chiefComplaint ILIKE :search OR c.patternDiagnosis ILIKE :search OR c.originalText ILIKE :search OR "c"."herbalFormulas"::text ILIKE :search OR "c"."symptoms"::text ILIKE :search)',
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
