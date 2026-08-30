import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  Reference,
  ReferenceCategory,
  ReferenceEvidenceType,
  ReferenceSource,
} from '../../database/entities/reference.entity';

/**
 * 문헌 자료실 조회.
 *
 * 검색이 안 되면 1만 건은 자산이 아니라 짐이다. 그래서 이 파일이 자료실의
 * 값어치를 사실상 결정한다.
 */

export interface ReferenceQuery {
  search?: string;
  category?: ReferenceCategory;
  evidenceType?: ReferenceEvidenceType;
  source?: ReferenceSource;
  language?: string;
  yearFrom?: number;
  sort?: 'recent' | 'evidence';
  page?: number;
  limit?: number;
}

/** 목록 한 줄 — 초록 전문 대신 앞부분만 */
const LIST_TEASER_CHARS = 220;

/**
 * 근거 수준 정렬 순서.
 *
 * 체계적 고찰이 맨 위, 알 수 없는 것이 맨 아래다. 임상에서 무게가 다른 것을
 * 같은 줄에 섞어 놓으면 목록이 판단을 왜곡한다.
 */
const EVIDENCE_RANK: Record<ReferenceEvidenceType, number> = {
  [ReferenceEvidenceType.SYSTEMATIC_REVIEW]: 1,
  [ReferenceEvidenceType.RCT]: 2,
  [ReferenceEvidenceType.GUIDELINE]: 3,
  [ReferenceEvidenceType.OBSERVATIONAL]: 4,
  [ReferenceEvidenceType.CASE_REPORT]: 5,
  [ReferenceEvidenceType.REVIEW]: 6,
  [ReferenceEvidenceType.UNKNOWN]: 7,
};

@Injectable()
export class ReferencesService {
  constructor(
    @InjectRepository(Reference)
    private readonly refs: Repository<Reference>,
  ) {}

  private applyFilters(
    qb: SelectQueryBuilder<Reference>,
    q: ReferenceQuery,
  ): SelectQueryBuilder<Reference> {
    if (q.category) qb.andWhere('r.category = :category', { category: q.category });
    if (q.evidenceType) {
      qb.andWhere('r."evidenceType" = :evidenceType', { evidenceType: q.evidenceType });
    }
    if (q.source) qb.andWhere('r.source = :source', { source: q.source });
    if (q.language) qb.andWhere('r.language = :language', { language: q.language });
    if (q.yearFrom) {
      qb.andWhere('r."publishedYear" >= :yearFrom', { yearFrom: q.yearFrom });
    }

    if (q.search?.trim()) {
      const term = q.search.trim();
      // 세 갈래로 찾는다.
      //  1) 전문검색 — 마이그레이션의 GIN 인덱스와 식이 글자 그대로 같아야
      //     인덱스를 탄다. 한쪽만 고치면 조용히 순차 스캔으로 떨어진다.
      //  2) 키워드(MeSH) 완전일치 — 배열 GIN 인덱스를 탄다.
      //  3) 제목 부분일치 — 'simple' 사전은 공백으로만 끊어서 "슬관절" 같은
      //     한글 부분어를 못 잡는다. 트라이그램 인덱스가 이쪽을 받친다.
      qb.andWhere(
        `(
          to_tsvector('simple',
            coalesce(r."title", '') || ' ' ||
            coalesce(r."titleKo", '') || ' ' ||
            coalesce(r."abstract", '')
          ) @@ plainto_tsquery('simple', :term)
          OR r."keywords" && ARRAY[:term]::text[]
          OR r."title" ILIKE :like
          OR r."titleKo" ILIKE :like
        )`,
        { term, like: `%${term}%` },
      );
    }
    return qb;
  }

  async search(q: ReferenceQuery) {
    const page = Math.max(q.page ?? 1, 1);
    const limit = Math.min(Math.max(q.limit ?? 20, 1), 50);

    const qb = this.applyFilters(this.refs.createQueryBuilder('r'), q);

    if (q.sort === 'evidence') {
      // enum 은 알파벳 순으로 정렬되므로 그대로 쓰면 의미 없는 순서가 나온다.
      // 임상적 무게 순서를 CASE 로 명시한다.
      const cases = Object.entries(EVIDENCE_RANK)
        .map(([k, v]) => `WHEN '${k}' THEN ${v}`)
        .join(' ');
      qb.addSelect(`CASE r."evidenceType" ${cases} ELSE 99 END`, 'evidence_rank')
        .orderBy('evidence_rank', 'ASC')
        .addOrderBy('r."publishedAt"', 'DESC', 'NULLS LAST');
    } else {
      qb.orderBy('r."publishedAt"', 'DESC', 'NULLS LAST').addOrderBy(
        'r."createdAt"',
        'DESC',
      );
    }

    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: rows.map((r) => this.toListItem(r)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 목록용 축약.
   *
   * 초록 전문을 목록에 실으면 한 페이지가 수백 KB 가 되고, 정작 화면에서는
   * 두 줄만 보인다. 치험례와 달리 잠글 이유는 없다 — 공개된 문헌이고
   * 원문 링크도 같이 준다. 순전히 무게 문제다.
   */
  private toListItem(r: Reference) {
    return {
      id: r.id,
      source: r.source,
      externalId: r.externalId,
      title: r.title,
      titleKo: r.titleKo,
      abstractPreview: r.abstract
        ? r.abstract.length > LIST_TEASER_CHARS
          ? `${r.abstract.slice(0, LIST_TEASER_CHARS)}…`
          : r.abstract
        : null,
      authors: r.authors.slice(0, 5),
      authorCount: r.authors.length,
      journal: r.journal,
      publishedYear: r.publishedYear,
      doi: r.doi,
      url: r.url,
      keywords: r.keywords.slice(0, 8),
      category: r.category,
      evidenceType: r.evidenceType,
      language: r.language,
    };
  }

  async findById(id: string) {
    const r = await this.refs.findOne({ where: { id } });
    if (!r) return null;
    return {
      ...this.toListItem(r),
      // 상세에서는 초록 원문을 그대로 준다. 요약하지 않는다 —
      // 인용의 근거는 원문이어야 한다.
      abstract: r.abstract,
      authors: r.authors,
      keywords: r.keywords,
      publishedAt: r.publishedAt,
    };
  }

  /** 화면 상단 요약 — 몇 건이 있고 어떤 분포인지 */
  async facets() {
    const rows = await this.refs
      .createQueryBuilder('r')
      .select('r.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.category')
      .getRawMany<{ category: string; count: string }>();

    const total = await this.refs.count();
    return {
      total,
      categories: rows.map((x) => ({
        category: x.category,
        count: parseInt(x.count, 10),
      })),
    };
  }
}
