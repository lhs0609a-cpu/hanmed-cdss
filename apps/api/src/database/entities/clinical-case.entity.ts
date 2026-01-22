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

  @Column({ nullable: true })
  embeddingVectorId: string; // Pinecone 벡터 ID

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
