import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  UNKNOWN = 'unknown',
}

export enum ConstitutionType {
  TAEYANG = '태양인',
  TAEEUM = '태음인',
  SOYANG = '소양인',
  SOEUM = '소음인',
  UNKNOWN = '미상',
}

export enum TreatmentOutcome {
  CURED = '완치',
  IMPROVED = '호전',
  NO_CHANGE = '불변',
  WORSENED = '악화',
}

// 체열 (寒熱) - 이종대 선생님 기준
export enum BodyHeat {
  COLD = 'cold',       // 한(寒) - 찬 체질
  NEUTRAL = 'neutral', // 평(平) - 중립
  HOT = 'hot',         // 열(熱) - 열 체질
}

// 근실도 (虛實) - 이종대 선생님 기준
export enum BodyStrength {
  DEFICIENT = 'deficient', // 허(虛) - 허약
  NEUTRAL = 'neutral',     // 평(平) - 중립
  EXCESS = 'excess',       // 실(實) - 튼튼
}

@Entity('clinical_cases')
export class ClinicalCase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  sourceId: string; // 원본 기록 번호 (예: LEE-1993-001)

  @Column()
  recordedYear: number;

  @Column({ nullable: true })
  recorderName: string;

  @Column({
    type: 'enum',
    enum: Gender,
    default: Gender.UNKNOWN,
  })
  patientGender: Gender;

  @Column({ nullable: true })
  patientAgeRange: string;

  @Column({
    type: 'enum',
    enum: ConstitutionType,
    nullable: true,
  })
  patientConstitution: ConstitutionType;

  // 체열 (寒熱) - 이종대 선생님 기준
  @Column({
    type: 'enum',
    enum: BodyHeat,
    nullable: true,
  })
  bodyHeat: BodyHeat;

  // 근실도 (虛實) - 이종대 선생님 기준
  @Column({
    type: 'enum',
    enum: BodyStrength,
    nullable: true,
  })
  bodyStrength: BodyStrength;

  // 체열 점수 (-10 극한 ~ +10 극열)
  @Column({ type: 'int', nullable: true })
  bodyHeatScore: number;

  // 근실도 점수 (-10 극허 ~ +10 극실)
  @Column({ type: 'int', nullable: true })
  bodyStrengthScore: number;

  @Column('text')
  chiefComplaint: string; // 주소증

  @Column('text', { nullable: true })
  presentIllness: string; // 현병력

  @Column({ nullable: true })
  pulseDiagnosis: string; // 맥진

  @Column({ nullable: true })
  tongueDiagnosis: string; // 설진

  @Column('text', { nullable: true })
  abdominalDiagnosis: string; // 복진

  @Column({ nullable: true })
  patternDiagnosis: string; // 변증 진단명

  @Column({
    type: 'enum',
    enum: TreatmentOutcome,
    nullable: true,
  })
  treatmentOutcome: TreatmentOutcome;

  @Column('text', { nullable: true })
  clinicalNotes: string;

  @Column('text')
  originalText: string; // 원본 텍스트 전문

  /**
   * 단방·식용약초 치험례의 약재명.
   *
   * 치험례에는 방제 사례만 있는 게 아니다. `●오미자(식용약초) 알레르기성 비염...`
   * 처럼 약재 하나로 치료한 사례가 1,800건 가까이 된다. 처방명이 없다고 버리면
   * 약재 화면에서 쓸 수 있는 임상 근거를 통째로 잃는다.
   *
   * 원문 첫 줄에서 미리 뽑아 여기 저장한다 — 조회할 때마다 원문을 전문 스캔하면
   * 약재 근거 조회가 9초까지 늘어진다(실측).
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  singleHerb: string | null;

  @Column({ nullable: true })
  embeddingVectorId: string; // Pinecone 벡터 ID (legacy)

  // OpenAI text-embedding-3-small (1536d) 임베딩.
  // jsonb 로 저장 — pgvector 미설치 환경에서도 동작. 코사인 유사도는 백엔드에서 in-memory 계산.
  // 검색 빈도가 높아지면 pgvector 마이그레이션으로 전환.
  @Column('jsonb', { nullable: true })
  embedding: number[] | null;

  // 임베딩 생성 시각 — 재생성 시 어느 시점부터 다시 만들지 결정
  @Column({ type: 'timestamp', nullable: true })
  embeddedAt: Date | null;

  @Column('jsonb', { nullable: true })
  symptoms: Array<{
    name: string;
    severity?: number;
    duration?: string;
    bodyPart?: string;
  }>;

  @Column('jsonb', { nullable: true })
  herbalFormulas: Array<{
    formulaName: string;
    herbs: Array<{ name: string; amount: string }>;
    dosage?: string;
  }>;

  // ── 구조화 요약 (현대 한의사가 빠르게 읽고 자기 케이스와 대조하기 위한 것) ──
  //
  // 원문은 한 덩어리다. 한 행에 이 케이스 + 다른 사람 시험복용례 + 고전 인용 +
  // 다른 처방 해설 + 또 다른 활용사례가 섞여 있는 경우가 흔하다(4천자 초과 817건).
  // 그대로 두면 임상에서 못 읽는다. 아래 필드에 이 케이스만 뽑아 단계로 정리한다.

  /** 한 줄 요약 — 누가, 무엇으로, 어떻게 됐나 */
  @Column({ type: 'text', nullable: true })
  summaryOneLine: string | null;

  /** 변증의 결정적 근거가 된 소견 (원문에서 뽑은 짧은 항목들) */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  keyFindings: string[];

  /** 왜 이 변증인가 — 한 문단 */
  @Column({ type: 'text', nullable: true })
  patternReasoning: string | null;

  /** 원방 대비 가감과 그 이유 */
  @Column({ type: 'text', nullable: true })
  modification: string | null;

  /** 복용 경과 단계 — [{ step: '5번째 복용', change: '...' }] */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  courseSteps: Array<{ step: string; change: string }>;

  /** 이 치험례만의 특징 — 흔한 케이스와 무엇이 다른가 */
  @Column({ type: 'text', nullable: true })
  distinctive: string | null;

  /**
   * 본문에서 실제로 쓴 처방명. herbalFormulas 의 이름과 다를 수 있다.
   * (예: 저장된 이름은 보중익기탕인데 본문은 사군자탕)
   */
  @Column({ type: 'varchar', length: 128, nullable: true })
  verifiedFormulaName: string | null;

  /** 저장된 처방명과 본문이 어긋나는가 — 화면에서 경고로 쓴다 */
  @Column({ type: 'boolean', default: false })
  formulaMismatch: boolean;

  /** 원문에 다른 사례·처방 해설이 섞여 있는가 */
  @Column({ type: 'boolean', default: false })
  hasMixedContent: boolean;

  /** 구조화 요약을 만든 시점 — null 이면 아직 안 돌린 것 */
  @Column({ type: 'timestamptz', nullable: true })
  summarizedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
