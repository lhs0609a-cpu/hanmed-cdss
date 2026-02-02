import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum SharedCaseStatus {
  OPEN = 'open',           // 질문 중
  ANSWERED = 'answered',   // 답변됨
  RESOLVED = 'resolved',   // 해결됨
  CLOSED = 'closed',       // 종료
}

export enum CaseDifficulty {
  BEGINNER = 'beginner',     // 초급
  INTERMEDIATE = 'intermediate',  // 중급
  ADVANCED = 'advanced',     // 고급
  EXPERT = 'expert',         // 전문가
}

export enum CaseCategory {
  DIAGNOSIS = 'diagnosis',       // 진단 관련
  TREATMENT = 'treatment',       // 치료 관련
  PRESCRIPTION = 'prescription', // 처방 관련
  ADVERSE = 'adverse',           // 부작용/이상반응
  DIFFICULT = 'difficult',       // 난치 케이스
  DISCUSSION = 'discussion',     // 일반 토론
}

// 익명 케이스 공유
@Entity('shared_cases')
@Index(['authorId'])
@Index(['status'])
@Index(['category'])
@Index(['createdAt'])
export class SharedCase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  authorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author: User;

  // 익명 표시명 (예: "경력 5년 한의사")
  @Column()
  anonymousName: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: CaseCategory,
  })
  category: CaseCategory;

  @Column({
    type: 'enum',
    enum: CaseDifficulty,
    default: CaseDifficulty.INTERMEDIATE,
  })
  difficulty: CaseDifficulty;

  @Column({
    type: 'enum',
    enum: SharedCaseStatus,
    default: SharedCaseStatus.OPEN,
  })
  status: SharedCaseStatus;

  // 익명화된 환자 정보
  @Column('jsonb')
  patientInfo: {
    ageRange: string;      // "40대", "50대" 등
    gender: string;
    constitution?: string;
    mainSymptoms: string[];
    duration?: string;     // "3개월", "1년" 등
  };

  // 시도한 치료/처방
  @Column('jsonb', { nullable: true })
  triedTreatments: Array<{
    treatment: string;
    duration: string;
    result: string;
  }>;

  // 질문/고민 포인트
  @Column('simple-array', { nullable: true })
  questions: string[];

  // 태그
  @Column('simple-array', { nullable: true })
  tags: string[];

  // 첨부 이미지 (익명화된)
  @Column('simple-array', { nullable: true })
  attachments: string[];

  // 채택된 답변
  @Column('uuid', { nullable: true })
  acceptedAnswerId: string;

  // 통계
  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: 0 })
  commentCount: number;

  @Column({ default: 0 })
  voteCount: number;

  @Column({ default: 0 })
  bookmarkCount: number;

  // AI 분석 (유사 케이스 매칭용)
  @Column('jsonb', { nullable: true })
  aiAnalysis: {
    keywords: string[];
    suggestedFormulas: string[];
    similarCaseIds: string[];
    confidenceScore: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 케이스 답변/댓글
@Entity('case_comments')
@Index(['caseId'])
@Index(['authorId'])
@Index(['createdAt'])
export class CaseComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  caseId: string;

  @ManyToOne(() => SharedCase, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'caseId' })
  case: SharedCase;

  @Column('uuid')
  authorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author: User;

  // 익명 표시명
  @Column()
  anonymousName: string;

  // 상위 댓글 (대댓글용)
  @Column('uuid', { nullable: true })
  parentId: string;

  @ManyToOne(() => CaseComment, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent: CaseComment;

  @Column('text')
  content: string;

  // 추천 처방/치료
  @Column('jsonb', { nullable: true })
  suggestedTreatment: {
    formulas?: string[];
    treatments?: string[];
    rationale: string;
  };

  // 근거 자료
  @Column('jsonb', { nullable: true })
  references: Array<{
    type: 'paper' | 'textbook' | 'experience';
    title: string;
    url?: string;
  }>;

  // 채택 여부
  @Column({ default: false })
  isAccepted: boolean;

  // 투표
  @Column({ default: 0 })
  voteCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 케이스/댓글 투표
@Entity('case_votes')
@Index(['caseId'])
@Index(['commentId'])
@Index(['userId'])
export class CaseVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  caseId: string;

  @ManyToOne(() => SharedCase, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'caseId' })
  case: SharedCase;

  @Column('uuid', { nullable: true })
  commentId: string;

  @ManyToOne(() => CaseComment, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commentId' })
  comment: CaseComment;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ['up', 'down'],
  })
  voteType: 'up' | 'down';

  @CreateDateColumn()
  createdAt: Date;
}

// 케이스 북마크
@Entity('case_bookmarks')
@Index(['userId'])
@Index(['caseId'])
export class CaseBookmark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  caseId: string;

  @ManyToOne(() => SharedCase, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'caseId' })
  case: SharedCase;

  @Column('text', { nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;
}

// 멘토링 연결
@Entity('case_mentorships')
@Index(['mentorId'])
@Index(['menteeId'])
@Index(['status'])
export class CaseMentorship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  mentorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'mentorId' })
  mentor: User;

  @Column('uuid')
  menteeId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'menteeId' })
  mentee: User;

  @Column('uuid', { nullable: true })
  caseId: string;

  @ManyToOne(() => SharedCase, { nullable: true })
  @JoinColumn({ name: 'caseId' })
  case: SharedCase;

  @Column({
    type: 'enum',
    enum: ['requested', 'accepted', 'declined', 'completed'],
    default: 'requested',
  })
  status: string;

  @Column('text', { nullable: true })
  requestMessage: string;

  @Column('text', { nullable: true })
  responseMessage: string;

  // 멘토링 세션 기록
  @Column('jsonb', { default: [] })
  sessions: Array<{
    date: Date;
    duration: number;  // minutes
    notes: string;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 전문가 프로필 (멘토 등록용)
@Entity('expert_profiles')
@Index(['userId'])
@Index(['isAvailableForMentoring'])
export class ExpertProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  // 경력
  @Column({ type: 'int' })
  yearsOfExperience: number;

  // 전문 분야
  @Column('simple-array')
  specializations: string[];

  // 주요 치료 증상
  @Column('simple-array', { nullable: true })
  expertSymptoms: string[];

  // 학력/자격
  @Column('jsonb', { nullable: true })
  credentials: Array<{
    type: 'degree' | 'certification' | 'training';
    title: string;
    institution: string;
    year: number;
  }>;

  // 자기소개
  @Column('text', { nullable: true })
  bio: string;

  // 멘토링 가능 여부
  @Column({ default: false })
  isAvailableForMentoring: boolean;

  // 멘토링 조건
  @Column('jsonb', { nullable: true })
  mentoringPreferences: {
    maxMentees: number;
    preferredTopics: string[];
    availableTimes: string[];
  };

  // 평점
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ default: 0 })
  reviewCount: number;

  // 활동 통계
  @Column({ default: 0 })
  answerCount: number;

  @Column({ default: 0 })
  acceptedAnswerCount: number;

  @Column({ default: 0 })
  helpfulVoteCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
