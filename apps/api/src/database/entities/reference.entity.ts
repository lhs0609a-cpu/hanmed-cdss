import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * 한의사가 참고하는 외부 문헌·자료.
 *
 * 왜 게시판(posts)이 아니라 별도 테이블인가:
 * 커뮤니티는 사람이 쓴 글이 있어야 커뮤니티다. 봇이 올린 논문 초록 1만 건 옆에
 * 사람 글 스무 개가 있으면 그건 포럼 껍데기를 쓴 데이터베이스지 커뮤니티가 아니다.
 * 자료는 자료대로 검색되게 두고, 게시판에는 그중 값어치 있는 것만 사람이 골라
 * 소개한다. 그러면 "문헌 1만 건" 도 "게시글 1만 건" 도 각각 사실이 된다.
 *
 * 여기 들어오는 것은 전부 출처가 있고 링크가 살아 있는 실물이다. 지어낸 문장은
 * 한 줄도 넣지 않는다 — 한의사가 이걸 보고 처방을 정한다.
 */

export enum ReferenceSource {
  /** PubMed (NCBI E-utilities) — 침구·한약 영문 문헌 */
  PUBMED = 'pubmed',
  /** 한국학술지인용색인 */
  KCI = 'kci',
  /** 한의학술정보포털 (한국한의학연구원) */
  OASIS = 'oasis',
  /** 건강보험심사평가원 — 급여기준·심사지침·고시 */
  HIRA = 'hira',
  /** 식품의약품안전처 — 한약재 안전성·DUR */
  MFDS = 'mfds',
}

/**
 * 임상 분류.
 *
 * 검색이 아니라 "오늘 뭘 읽을까" 를 위한 축이다. 그래서 학술 분류를 그대로
 * 옮기지 않고 진료실에서 나뉘는 대로 나눴다 — 행정·청구가 한 칸을 차지하는 것도
 * 그래서다(2025 경기도한의사회 설문에서 행정절차가 관심 2위였다).
 */
export enum ReferenceCategory {
  ACUPUNCTURE = 'acupuncture', // 침구
  HERBAL = 'herbal', // 한약·처방
  DIAGNOSIS = 'diagnosis', // 진단·변증
  REHAB = 'rehab', // 추나·재활
  SAFETY = 'safety', // 안전성·상호작용
  ADMIN = 'admin', // 행정·청구·심사
  OTHER = 'other',
}

/**
 * 연구 유형 — 임상적 무게를 가른다.
 *
 * 체계적 고찰 한 편과 증례보고 한 편을 같은 줄에 놓으면 목록이 거짓말을 한다.
 * 정렬·필터의 기준이 되므로 추측해서 채우지 않는다. 원자료가 말해 주지 않으면
 * UNKNOWN 이다.
 */
export enum ReferenceEvidenceType {
  SYSTEMATIC_REVIEW = 'systematic_review', // 체계적 고찰·메타분석
  RCT = 'rct', // 무작위 대조 시험
  OBSERVATIONAL = 'observational', // 관찰 연구
  CASE_REPORT = 'case_report', // 증례 보고
  GUIDELINE = 'guideline', // 진료지침·고시·심사지침
  REVIEW = 'review', // 일반 종설
  UNKNOWN = 'unknown',
}

// 테이블명이 'references' 가 아닌 이유: REFERENCES 는 SQL 예약어다. TypeORM 이
// 따옴표로 감싸 주긴 하지만, 마이그레이션이나 psql 에서 손으로 쿼리를 칠 때마다
// 따옴표를 잊으면 문법 오류가 난다. 이름 하나로 살 필요 없는 함정이다.
@Entity('clinical_references')
// 같은 출처의 같은 문서는 한 번만. 재수집이 중복을 쌓지 않게 하는 핵심 제약이다.
@Unique('UQ_reference_source_external', ['source', 'externalId'])
// 목록의 기본 정렬(최신순) + 분류 필터가 같이 걸린다.
@Index(['category', 'publishedAt'])
@Index(['evidenceType', 'publishedAt'])
export class Reference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ReferenceSource })
  @Index()
  source: ReferenceSource;

  /** 원 출처의 식별자 — PMID, KCI 논문 ID, 고시번호 등 */
  @Column({ length: 128 })
  externalId: string;

  @Column({ length: 500 })
  title: string;

  /**
   * 한국어 제목.
   *
   * 영문 문헌을 기계번역해서 채우지 않는다. 번역된 처방명·혈위명은 원어와
   * 미묘하게 어긋나고, 그 어긋남이 임상에서 사고가 된다. 원자료에 한국어
   * 제목이 있을 때만 채운다.
   */
  @Column({ length: 500, nullable: true })
  titleKo: string | null;

  /**
   * 초록 원문. 요약하거나 다시 쓰지 않는다 — 인용의 근거는 원문이어야 한다.
   *
   * 저작권에 대해: 초록의 저작권은 대개 출판사에 있다. 전문을 저장하고
   * 보여주는 것은 회색지대다. 그걸 알고 택했다(2026-08).
   *   - 초록이 있어야 검색이 산다. 제목·MeSH 만으로는 찾고 싶은 것을 못 찾는다.
   *   - 인증한 한의사에게만 보이고, 원문 링크를 항상 함께 준다.
   *   - 게시판 소개 글에는 300자 발췌만 인용한다(seed-community-references.ts).
   * 출판사에서 문제를 제기하면 화면 노출을 발췌로 줄이는 것이 첫 대응이다 —
   * 그때 컬럼을 지울 필요가 없도록 저장과 노출을 분리해 두었다.
   */
  @Column('text', { nullable: true })
  abstract: string | null;

  /**
   * 한국어 요약 3~4줄 — 기계가 만든 것.
   *
   * 초록을 통째로 번역하지 않는 이유: 초록에는 용량·투여횟수·혈위·처방명이 들어
   * 있다. "3 times daily" 를 "3일마다" 로, 황련해독탕을 황금탕으로 한 글자만
   * 틀려도 그걸 보고 처방하는 사람이 생긴다.
   *
   * 그래서 요약은 "무엇을 대상으로, 무엇과 비교해, 어떤 결과가 나왔나" 까지만
   * 담는다. 용량과 프로토콜은 원문(abstract)을 보게 한다. 번역본이 원문을
   * 대체하지 않으므로 오역이 처방으로 이어지지 않는다.
   *
   * 화면에서는 기계가 만든 것임을 표시한다. 한의사가 이걸 근거로 삼기 전에
   * 원문을 확인해야 한다는 것을 알아야 한다.
   */
  @Column('text', { nullable: true })
  summaryKo: string | null;

  /**
   * 초록의 한국어 구조 요약 — 배경 / 방법 / 결과 / 한계.
   *
   * summaryKo 는 목록에서 훑으라고 만든 3~4문장이고, 이건 상세 화면에서
   * 한 편을 읽으라고 만든 것이다. 커뮤니티 소개글 본문에 영문 초록을
   * 그대로 붙여 놓았더니 한글 게시판 한가운데가 영어였다.
   *
   * 초록을 통째로 번역하지 않고 다시 쓴다. 초록 저작권은 대개 출판사에
   * 있어 전문 번역은 2차적 저작물이 되고, 무엇보다 초록에는 용량과 시술
   * 프로토콜이 들어 있어 옮기다 틀리면 그걸 보고 처방하는 사람이 생긴다.
   * 여기에도 용량은 넣지 않는다 — 그 정보가 필요한 사람은 원문을 본다.
   */
  @Column('text', { nullable: true })
  abstractKo: string | null;

  @Column('text', { array: true, default: () => "'{}'" })
  authors: string[];

  @Column({ length: 300, nullable: true })
  journal: string | null;

  /** 발행일. 연도만 아는 경우가 흔해 1월 1일로 채우고 publishedYear 를 따로 둔다. */
  @Column({ type: 'date', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  publishedYear: number | null;

  @Column({ length: 200, nullable: true })
  doi: string | null;

  /** 원문으로 가는 링크. 이게 없으면 넣지 않는다 — 확인할 수 없는 자료는 자료가 아니다. */
  @Column({ length: 1000 })
  url: string;

  @Column('text', { array: true, default: () => "'{}'" })
  keywords: string[];

  @Column({ type: 'enum', enum: ReferenceCategory, default: ReferenceCategory.OTHER })
  category: ReferenceCategory;

  @Column({
    type: 'enum',
    enum: ReferenceEvidenceType,
    default: ReferenceEvidenceType.UNKNOWN,
  })
  evidenceType: ReferenceEvidenceType;

  /** 'ko' | 'en' 등. 화면에서 한국어만 보기 위한 필터. */
  @Column({ length: 8, default: 'en' })
  language: string;

  /**
   * 제목·DOI 정규화 해시.
   *
   * 같은 논문이 PubMed 와 KCI 에 각각 올라온다. source+externalId 유니크만으로는
   * 그 둘을 못 묶으므로, 화면에서 중복으로 보이는 것을 막으려면 이 값이 필요하다.
   */
  @Column({ length: 64 })
  @Index()
  contentHash: string;

  /** 게시판에 소개된 적이 있는가 — 같은 자료를 두 번 소개하지 않으려고 둔다. */
  @Column({ default: false })
  featuredInCommunity: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
