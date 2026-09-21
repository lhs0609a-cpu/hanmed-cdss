import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Like, Not, Repository } from 'typeorm';
import {
  CaseCorpus,
  ClinicalCase,
} from '../../database/entities/clinical-case.entity';
import { Formula } from '../../database/entities/formula.entity';
import {
  CLASSICAL_BOOKS,
  bookKorean,
  caseSlug,
  formulaSlug,
  parseCaseSlug,
} from './public-slug';

/**
 * 로그인 없이 보여주는 조각.
 *
 * 무엇을 가리는지는 화면이 아니라 여기서 정한다. 프런트에서 감추는 방식은
 * 응답에 전문이 실려 나가므로 가린 것이 아니다 — 개발자도구만 열면 보인다.
 * 그래서 select 로 티저 칼럼만 읽는다.
 *
 * 한국 임상 치험례(corpus=korean)는 공개하지 않는다. 실제 진료 기록이라
 * 요약에도 나이·성별·내원 시기·의료기관이 남아 있고, 성 한 글자만 지운
 * 마스킹은 가명처리가 아니다. 공개 대상은 수백 년 전 공개 문헌인 고전
 * 의안뿐이다.
 */

/** 공개해도 되는 고전 의안의 조건. 한 곳에서만 정의한다. */
const PUBLIC_CASE_WHERE = {
  corpus: CaseCorpus.CLASSICAL,
  excludedReason: IsNull(),
  sourceEdition: Not(IsNull()),
  summaryOneLine: Not(IsNull()),
  hasMixedContent: false,
  formulaMismatch: false,
};

/** 티저에 실어 보내는 칼럼. 여기 없는 것은 응답에 존재하지 않는다. */
const CASE_TEASER_COLUMNS = [
  'sourceId',
  'recordedYear',
  'sourceEdition',
  'chiefComplaint',
  'summaryOneLine',
  'updatedAt',
] as const;

const FORMULA_TEASER_COLUMNS = [
  'name',
  'hanja',
  'aliases',
  'category',
  'source',
  'indication',
  'updatedAt',
] as const;

/** 로그인하면 보이는 것 — 이름만 알려주고 내용은 주지 않는다. */
export const CASE_LOCKED = [
  '처방과 구성 약재',
  '치료 경과',
  '한문 원문과 국역 전문',
  '가감과 변증 해설',
];
export const FORMULA_LOCKED = [
  '구성 약재와 용량',
  '병기 해설',
  '가감 운용',
  '금기와 주의',
  '보험 코드',
];

export type CaseTeaser = {
  slug: string;
  book: string;
  title: string;
  chiefComplaint: string;
  recordedYear: number;
  sourceEdition: string;
  locked: string[];
};

export type FormulaTeaser = {
  slug: string;
  name: string;
  hanja: string | null;
  aliases: string[];
  category: string;
  source: string | null;
  indication: string | null;
  locked: string[];
};

const MAX_LIMIT = 50;

@Injectable()
export class PublicContentService {
  constructor(
    @InjectRepository(ClinicalCase)
    private readonly cases: Repository<ClinicalCase>,
    @InjectRepository(Formula)
    private readonly formulas: Repository<Formula>,
  ) {}

  /** 책 목록 — 공개 색인 화면의 길잡이. */
  books() {
    return CLASSICAL_BOOKS.map((b) => ({ ...b }));
  }

  /**
   * 책 필터는 쿼리에서 건다. 읽어 온 쪽을 나중에 걸러 내면 한 쪽에 20건을
   * 달라 했는데 3건만 돌아가고 total 도 전체 수를 가리킨다.
   */
  async listCases(page = 1, limit = 20, book?: string) {
    const take = Math.min(Math.max(1, limit), MAX_LIMIT);
    const skip = (Math.max(1, page) - 1) * take;
    const hanja = book
      ? CLASSICAL_BOOKS.find((b) => b.korean === book)?.hanja
      : undefined;
    if (book && !hanja) return { items: [], total: 0, page: 1, limit: take };
    const [rows, total] = await this.cases.findAndCount({
      select: [...CASE_TEASER_COLUMNS],
      where: {
        ...PUBLIC_CASE_WHERE,
        ...(hanja ? { sourceId: Like(`jicheng-${hanja}-%`) } : {}),
      },
      order: { sourceId: 'ASC' },
      skip,
      take,
    });
    return {
      items: rows
        .map((r) => this.toCaseTeaser(r))
        .filter((t): t is CaseTeaser => t !== null),
      total,
      page: Math.max(1, page),
      limit: take,
    };
  }

  async getCase(slug: string): Promise<CaseTeaser> {
    const sourceId = parseCaseSlug(slug);
    if (!sourceId) throw new NotFoundException('공개된 기록이 아닙니다.');
    const row = await this.cases.findOne({
      select: [...CASE_TEASER_COLUMNS],
      where: { ...PUBLIC_CASE_WHERE, sourceId },
    });
    const teaser = row && this.toCaseTeaser(row);
    if (!teaser) throw new NotFoundException('공개된 기록이 아닙니다.');
    return teaser;
  }

  async listFormulas(page = 1, limit = 20) {
    const take = Math.min(Math.max(1, limit), MAX_LIMIT);
    const skip = (Math.max(1, page) - 1) * take;
    const [rows, total] = await this.formulas.findAndCount({
      select: [...FORMULA_TEASER_COLUMNS],
      order: { name: 'ASC' },
      skip,
      take,
    });
    return {
      items: rows
        .map((r) => this.toFormulaTeaser(r))
        .filter((t): t is FormulaTeaser => t !== null),
      total,
      page: Math.max(1, page),
      limit: take,
    };
  }

  async getFormula(slug: string): Promise<FormulaTeaser> {
    const name = formulaSlug(slug);
    if (!name) throw new NotFoundException('공개된 처방이 아닙니다.');
    const row = await this.formulas.findOne({
      select: [...FORMULA_TEASER_COLUMNS],
      where: { name },
    });
    const teaser = row && this.toFormulaTeaser(row);
    if (!teaser) throw new NotFoundException('공개된 처방이 아닙니다.');
    return teaser;
  }

  /**
   * 사이트맵용 주소 목록. 본문은 싣지 않는다 — 주소와 갱신 시점만 필요하다.
   * 한 번에 전부 준다. 3,479 + 404 건이라 쪽 나누기가 오히려 번거롭다.
   */
  async sitemapEntries() {
    const [cases, formulas] = await Promise.all([
      this.cases.find({
        select: ['sourceId', 'updatedAt'],
        where: PUBLIC_CASE_WHERE,
        order: { sourceId: 'ASC' },
      }),
      this.formulas.find({ select: ['name', 'updatedAt'], order: { name: 'ASC' } }),
    ]);
    const day = (d: Date) => new Date(d).toISOString().slice(0, 10);
    return {
      cases: cases
        .map((c) => ({ slug: caseSlug(c.sourceId), lastmod: day(c.updatedAt) }))
        .filter((c): c is { slug: string; lastmod: string } => c.slug !== null),
      formulas: formulas
        .map((f) => ({ slug: formulaSlug(f.name), lastmod: day(f.updatedAt) }))
        .filter((f): f is { slug: string; lastmod: string } => f.slug !== null),
    };
  }

  private toCaseTeaser(row: Partial<ClinicalCase>): CaseTeaser | null {
    const slug = caseSlug(row.sourceId!);
    const book = bookKorean(row.sourceId!);
    if (!slug || !book) return null;
    return {
      slug,
      book,
      title: row.summaryOneLine!,
      chiefComplaint: row.chiefComplaint!,
      recordedYear: row.recordedYear!,
      sourceEdition: row.sourceEdition!,
      locked: CASE_LOCKED,
    };
  }

  private toFormulaTeaser(row: Partial<Formula>): FormulaTeaser | null {
    const slug = formulaSlug(row.name!);
    if (!slug) return null;
    return {
      slug,
      name: row.name!,
      hanja: row.hanja ?? null,
      aliases: row.aliases ?? [],
      category: row.category!,
      source: row.source ?? null,
      indication: row.indication ?? null,
      locked: FORMULA_LOCKED,
    };
  }
}
