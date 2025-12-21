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
