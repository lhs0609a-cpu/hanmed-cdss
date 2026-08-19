import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MedicationGuide } from './medication-guide.entity';

/**
 * 환자가 복용 중에 남긴 자가 기록.
 *
 * 소비자원 한방 피해구제에서 신청 사유 1위가 부작용(45.7%)이고, 그중 간 기능
 * 이상을 호소한 사례가 있었다. 문제는 환자가 이상을 느껴도 다음 내원까지
 * 말할 데가 없다는 것이다. 안내서에서 바로 남기게 하고, 이상반응이 붙은
 * 기록은 한의사 화면에서 먼저 보이게 한다.
 *
 * 환자 인증 없이 링크만으로 쓰므로 식별정보는 받지 않는다.
 */
@Entity('medication_guide_reports')
@Index(['guideId', 'reportedAt'])
export class MedicationGuideReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  guideId: string;

  @ManyToOne(() => MedicationGuide, (g) => g.reports, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guideId' })
  guide: MedicationGuide;

  /** 증상 정도 0(없음)~10(심함). 안 고르면 null. */
  @Column({ type: 'smallint', nullable: true })
  symptomScore: number | null;

  /** 이상반응 체크 항목 — 황달, 심한 피로 등 */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  adverseFlags: string[];

  @Column({ type: 'text', nullable: true })
  note: string | null;

  /** 한의사가 확인한 시점 — null 이면 아직 안 본 기록이다. */
  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  reportedAt: Date;
}
