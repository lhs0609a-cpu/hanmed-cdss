import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Like, Not, Raw, Repository } from 'typeorm';
import {
  CaseCorpus,
  ClinicalCase,
} from '../../database/entities/clinical-case.entity';
import { Formula } from '../../database/entities/formula.entity';
import { Herb } from '../../database/entities/herb.entity';
import {
  Reference,
  ReferenceSource,
} from '../../database/entities/reference.entity';
import {
  CASE_SOURCE_ID_PATTERN,
  CLASSICAL_BOOKS,
  FORMULA_NAME_MAX_LENGTH,
  FORMULA_NAME_PATTERN,
  HERB_NAME_MAX_LENGTH,
  HERB_NAME_PATTERN,
  bookKorean,
  caseSlug,
  formulaSlug,
  herbSlug,
  JOURNAL_MIN_PAPERS,
  JOURNAL_NAME_MAX_LENGTH,
  JOURNAL_NAME_PATTERN,
  journalSlug,
  parseCaseSlug,
  parseReferenceSlug,
  referenceSlug,
  sourceLine,
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

/**
 * 공개해도 되는 고전 의안의 조건. 한 곳에서만 정의한다.
 *
 * 책은 sourceId 로 건다. 예전에는 `sourceEdition` 이 채워져 있는지로 걸렀는데,
 * 그 칸은 원 자료가 영인본을 적어 줬을 때만 찬다 — 저자와 연도가 멀쩡한
 * 1,508건이 그 이유 하나로 잠겨 있었다. 공개 여부는 사람이 확인한 책 목록
 * (CLASSICAL_BOOKS)이 정한다.
 *
 * 새 인스턴스를 돌려준다 — FindOperator 를 여러 질의가 나눠 쓰지 않게.
 */
const publicCaseWhere = () => ({
  corpus: CaseCorpus.CLASSICAL,
  excludedReason: IsNull(),
  summaryOneLine: Not(IsNull()),
  hasMixedContent: false,
  formulaMismatch: false,
  sourceId: Raw((alias) => `${alias} ~ :casePattern`, {
    casePattern: CASE_SOURCE_ID_PATTERN,
  }),
});

/**
 * 주소를 만들 수 있는 처방만. 거르는 일을 질의가 한다.
 *
 * 읽어 온 뒤 자바스크립트로 걸러 내면 total 은 404 를 말하는데 실제로 받는
 * 것은 386 이 된다. 한 쪽에 50건을 달라 했는데 48건이 오고, total 을 믿고
 * 쪽을 넘기는 쪽은 끝까지 채우지 못해 멈추지 않는다.
 *
 * 새 인스턴스를 돌려준다 — FindOperator 를 여러 질의가 나눠 쓰지 않게.
 */
const publicFormulaWhere = () => ({
  name: Raw(
    (alias) =>
      `btrim(${alias}) ~ :pattern AND char_length(btrim(${alias})) BETWEEN 1 AND :maxLength`,
    { pattern: FORMULA_NAME_PATTERN, maxLength: FORMULA_NAME_MAX_LENGTH },
  ),
});

/**
 * 주소를 만들 수 있는 본초만. 처방과 같은 이유로 거르는 일을 질의가 한다.
 */
const publicHerbWhere = () => ({
  standardName: Raw(
    (alias) =>
      `btrim(${alias}) ~ :herbPattern AND char_length(btrim(${alias})) BETWEEN 1 AND :herbMaxLength`,
    { herbPattern: HERB_NAME_PATTERN, herbMaxLength: HERB_NAME_MAX_LENGTH },
  ),
});

/**
 * 공개하는 논문의 조건.
 *
 * 원문 링크가 없는 것은 넣지 않는다 — 확인할 수 없는 자료는 자료가 아니고,
 * 검색으로 들어온 한의사가 원문에 닿지 못하면 그 쪽은 막다른 길이다.
 */
const PUBLIC_REFERENCE_WHERE = {
  source: In([ReferenceSource.PUBMED, ReferenceSource.KCI]),
  url: Not(IsNull()),
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

/**
 * 본초 티저 칼럼.
 *
 * 공정서 값(학명·라틴생약명·약용부위·수재 공정서)은 식약처가 준 공식
 * 정보라 그대로 공개한다. 성미·귀경·효능은 AI 가 고전 기술을 정리한
 * 참고값이므로 화면에서 출처를 갈라 표기한다 — 한의사가 무엇을 믿을지
 * 스스로 판단할 수 있어야 한다.
 */
const HERB_TEASER_COLUMNS = [
  'standardName',
  'hanjaName',
  'aliases',
  'category',
  'scientificName',
  'latinName',
  'englishName',
  'medicinalPart',
  'pharmacopoeia',
  'taxonomy',
  'properties',
  'meridianTropism',
  'efficacy',
  'updatedAt',
] as const;

/**
 * 논문 티저 칼럼.
 *
 * abstract 가 여기 없는 것은 실수가 아니다. 초록의 저작권은 대개 출판사에
 * 있어서 인증한 한의사에게만 보인다(reference.entity.ts 참고). 공개 쪽에
 * 싣는 한국어 요약(summaryKo)은 우리가 쓴 것이라 우리 것이다.
 */
const REFERENCE_TEASER_COLUMNS = [
  'source',
  'externalId',
  'title',
  'titleKo',
  'summaryKo',
  'authors',
  'journal',
  'publishedYear',
  'doi',
  'url',
  'keywords',
  'category',
  'evidenceType',
  'language',
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
export const HERB_LOCKED = [
  '임상 용량과 용법',
  '배합 금기와 상호작용',
  '이 약재가 들어가는 처방',
  '유효 성분과 약리 근거',
];
export const REFERENCE_LOCKED = [
  '초록 원문',
  '구조 요약 (배경·방법·결과·한계)',
  '관련 처방과 본초 연결',
  '같은 주제 문헌 묶음',
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

export type HerbTeaser = {
  slug: string;
  name: string;
  hanja: string | null;
  aliases: string[];
  category: string;
  scientificName: string | null;
  latinName: string | null;
  englishName: string | null;
  medicinalPart: string | null;
  pharmacopoeia: string | null;
  taxonomy: string | null;
  /** 성미 — AI 가 고전 기술을 정리한 참고값. 출처를 함께 준다. */
  properties: { nature?: string; flavor?: string; text?: string } | null;
  meridianTropism: string[];
  efficacy: string | null;
  locked: string[];
};

export type ReferenceTeaser = {
  slug: string;
  source: string;
  externalId: string;
  title: string;
  titleKo: string | null;
  summaryKo: string | null;
  authors: string[];
  journal: string | null;
  publishedYear: number | null;
  doi: string | null;
  url: string;
  keywords: string[];
  category: string;
  evidenceType: string;
  language: string;
  locked: string[];
};

/**
 * 한 번에 내주는 최대 건수.
 *
 * 50 이던 것을 올렸다. 문헌이 42,182건이라 50건씩이면 프리렌더가 844번을
 * 왕복하고, 그 한 번마다 서버가 전체 건수를 다시 센다 — 배포 한 번에
 * 30분이 넘게 걸렸다. 빌드가 한도에 걸려 죽으면 직전 배포가 그대로 남아
 * 새 콘텐츠가 통째로 안 나간다.
 *
 * 티저만 실어 보내므로 200건이라도 응답은 작다(본문·초록은 애초에 질의에
 * 없다). 더 올리지 않는 것은 인증 없는 경로라 한 번에 퍼 갈 수 있는 양을
 * 계속 열어 둘 이유가 없어서다.
 */
/**
 * 분류가 붙지 않은 약재의 category 값.
 *
 * 636종 중 490종이 여기 해당한다. 필터 단추로 내보내면 "미분류 490" 이
 * 가장 큰 칸을 차지해 나머지 열여덟 분류를 덮는다 — 고르라고 내놓은
 * 목록이 고를 것을 가리는 셈이다.
 */
const HERB_CATEGORY_UNSET = '미분류';

/** 원자료에 섞인 줄바꿈·연속 공백을 한 칸으로 줄인다. */
const collapse = (value: string | null | undefined) =>
  value ? value.replace(/\s+/g, ' ').trim() || null : null;

export const MAX_LIMIT = 200;

@Injectable()
export class PublicContentService {
  constructor(
    @InjectRepository(ClinicalCase)
    private readonly cases: Repository<ClinicalCase>,
    @InjectRepository(Formula)
    private readonly formulas: Repository<Formula>,
    @InjectRepository(Herb)
    private readonly herbs: Repository<Herb>,
    @InjectRepository(Reference)
    private readonly references: Repository<Reference>,
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
        ...publicCaseWhere(),
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
      where: { ...publicCaseWhere(), sourceId },
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
      where: publicFormulaWhere(),
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

  async listHerbs(page = 1, limit = 20, category?: string) {
    const take = Math.min(Math.max(1, limit), MAX_LIMIT);
    const skip = (Math.max(1, page) - 1) * take;
    const [rows, total] = await this.herbs.findAndCount({
      select: [...HERB_TEASER_COLUMNS],
      where: {
        ...publicHerbWhere(),
        ...(category ? { category } : {}),
      },
      order: { standardName: 'ASC' },
      skip,
      take,
    });
    return {
      items: rows
        .map((r) => this.toHerbTeaser(r))
        .filter((t): t is HerbTeaser => t !== null),
      total,
      page: Math.max(1, page),
      limit: take,
    };
  }

  async getHerb(slug: string): Promise<HerbTeaser> {
    const name = herbSlug(slug);
    if (!name) throw new NotFoundException('공개된 약재가 아닙니다.');
    const row = await this.herbs.findOne({
      select: [...HERB_TEASER_COLUMNS],
      where: { standardName: name },
    });
    const teaser = row && this.toHerbTeaser(row);
    if (!teaser) throw new NotFoundException('공개된 약재가 아닙니다.');
    return teaser;
  }

  /** 본초 분류 목록 — 공개 색인 화면의 길잡이. */
  async herbCategories() {
    const rows = await this.herbs
      .createQueryBuilder('h')
      .select('h.category', 'category')
      .addSelect('COUNT(*)::int', 'count')
      .where(`btrim(h."standardName") ~ :herbPattern`, {
        herbPattern: HERB_NAME_PATTERN,
      })
      .groupBy('h.category')
      .orderBy('count', 'DESC')
      .getRawMany<{ category: string; count: number }>();
    return rows.filter((r) => r.category && r.category !== HERB_CATEGORY_UNSET);
  }

  /**
   * 논문 목록.
   *
   * 네이버는 한국어 본문이 없는 쪽을 색인하지 않는다. 그래서 언어 필터를
   * 쿼리스트링으로 받아 한국어 자료만 도는 목록을 따로 만들 수 있게 둔다.
   */
  async listReferences(
    page = 1,
    limit = 20,
    filter: {
      source?: string;
      category?: string;
      evidenceType?: string;
      journal?: string;
    } = {},
  ) {
    const take = Math.min(Math.max(1, limit), MAX_LIMIT);
    const skip = (Math.max(1, page) - 1) * take;
    const source =
      filter.source === 'pubmed' || filter.source === 'kci'
        ? (filter.source as ReferenceSource)
        : undefined;
    const [rows, total] = await this.references.findAndCount({
      select: [...REFERENCE_TEASER_COLUMNS],
      where: {
        ...PUBLIC_REFERENCE_WHERE,
        ...(source ? { source } : {}),
        ...(filter.category ? { category: filter.category as never } : {}),
        ...(filter.evidenceType
          ? { evidenceType: filter.evidenceType as never }
          : {}),
        // 학술지 이름은 주소에서 오므로 규칙을 통과한 것만 쓴다.
        ...(filter.journal && journalSlug(filter.journal)
          ? { journal: filter.journal }
          : {}),
      },
      order: { publishedYear: 'DESC', externalId: 'ASC' },
      skip,
      take,
    });
    return {
      items: rows
        .map((r) => this.toReferenceTeaser(r))
        .filter((t): t is ReferenceTeaser => t !== null),
      total,
      page: Math.max(1, page),
      limit: take,
    };
  }

  /**
   * 학술지 허브 목록.
   *
   * 편수가 적은 학술지는 빼고 센다. 세 편짜리 목록은 읽을 것이 없는데
   * 주소만 늘어 — 색인에서는 그런 쪽을 빈껍데기로 읽는다.
   */
  async referenceJournals() {
    const rows = await this.references
      .createQueryBuilder('r')
      .select('r.journal', 'journal')
      .addSelect('COUNT(*)::int', 'count')
      .where('r.journal IS NOT NULL')
      .andWhere(`btrim(r.journal) ~ :journalPattern`, {
        journalPattern: JOURNAL_NAME_PATTERN,
      })
      .andWhere(`char_length(btrim(r.journal)) BETWEEN 1 AND :journalMax`, {
        journalMax: JOURNAL_NAME_MAX_LENGTH,
      })
      .groupBy('r.journal')
      .having('COUNT(*) >= :min', { min: JOURNAL_MIN_PAPERS })
      .orderBy('count', 'DESC')
      .getRawMany<{ journal: string; count: number }>();
    return rows
      .map((r) => ({ ...r, slug: journalSlug(r.journal) }))
      .filter((r): r is { journal: string; count: number; slug: string } =>
        Boolean(r.slug),
      );
  }

  async getReference(slug: string): Promise<ReferenceTeaser> {
    const parsed = parseReferenceSlug(slug);
    if (!parsed) throw new NotFoundException('공개된 문헌이 아닙니다.');
    const row = await this.references.findOne({
      select: [...REFERENCE_TEASER_COLUMNS],
      where: {
        source: parsed.source as ReferenceSource,
        externalId: parsed.externalId,
      },
    });
    const teaser = row && this.toReferenceTeaser(row);
    if (!teaser) throw new NotFoundException('공개된 문헌이 아닙니다.');
    return teaser;
  }

  /**
   * 사이트맵용 주소 목록. 본문은 싣지 않는다 — 주소와 갱신 시점만 필요하다.
   * 한 번에 전부 준다. 3,479 + 404 건이라 쪽 나누기가 오히려 번거롭다.
   */
  async sitemapEntries() {
    const [cases, formulas, herbs, references] = await Promise.all([
      this.cases.find({
        select: ['sourceId', 'updatedAt'],
        where: publicCaseWhere(),
        order: { sourceId: 'ASC' },
      }),
      this.formulas.find({
        select: ['name', 'updatedAt'],
        where: publicFormulaWhere(),
        order: { name: 'ASC' },
      }),
      this.herbs.find({
        select: ['standardName', 'updatedAt'],
        where: publicHerbWhere(),
        order: { standardName: 'ASC' },
      }),
      this.references.find({
        select: ['source', 'externalId', 'updatedAt'],
        where: PUBLIC_REFERENCE_WHERE,
        order: { externalId: 'ASC' },
      }),
    ]);
    const day = (d: Date) => new Date(d).toISOString().slice(0, 10);
    const kept = (rows: { slug: string | null; lastmod: string }[]) =>
      rows.filter((r): r is { slug: string; lastmod: string } => r.slug !== null);
    return {
      cases: kept(
        cases.map((c) => ({
          slug: caseSlug(c.sourceId),
          lastmod: day(c.updatedAt),
        })),
      ),
      formulas: kept(
        formulas.map((f) => ({
          slug: formulaSlug(f.name),
          lastmod: day(f.updatedAt),
        })),
      ),
      herbs: kept(
        herbs.map((h) => ({
          slug: herbSlug(h.standardName),
          lastmod: day(h.updatedAt),
        })),
      ),
      references: kept(
        references.map((r) => ({
          slug: referenceSlug(r.source, r.externalId),
          lastmod: day(r.updatedAt),
        })),
      ),
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
      sourceEdition: sourceLine(row.sourceId!, row.sourceEdition ?? null) ?? '',
      locked: CASE_LOCKED,
    };
  }

  private toHerbTeaser(row: Partial<Herb>): HerbTeaser | null {
    const slug = herbSlug(row.standardName!);
    if (!slug) return null;
    return {
      slug,
      name: row.standardName!,
      hanja: row.hanjaName ?? null,
      aliases: row.aliases ?? [],
      category: row.category!,
      // 식약처 원자료에 줄바꿈이 섞여 있다(기원식물이 여럿인 약재). 그대로
      // 내보내면 화면에서 한 줄이 세 줄로 깨지고 머리말에도 줄바꿈이 들어간다.
      scientificName: collapse(row.scientificName),
      latinName: row.latinName ?? null,
      englishName: row.englishName ?? null,
      medicinalPart: row.medicinalPart ?? null,
      pharmacopoeia: row.pharmacopoeia ?? null,
      taxonomy: row.taxonomy ?? null,
      properties: row.properties ?? null,
      meridianTropism: row.meridianTropism ?? [],
      efficacy: row.efficacy ?? null,
      locked: HERB_LOCKED,
    };
  }

  private toReferenceTeaser(row: Partial<Reference>): ReferenceTeaser | null {
    const slug = referenceSlug(row.source!, row.externalId!);
    if (!slug) return null;
    return {
      slug,
      source: row.source!,
      externalId: row.externalId!,
      title: row.title!,
      titleKo: row.titleKo ?? null,
      summaryKo: row.summaryKo ?? null,
      authors: row.authors ?? [],
      journal: row.journal ?? null,
      publishedYear: row.publishedYear ?? null,
      doi: row.doi ?? null,
      url: row.url!,
      keywords: row.keywords ?? [],
      category: row.category!,
      evidenceType: row.evidenceType!,
      language: row.language!,
      locked: REFERENCE_LOCKED,
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
