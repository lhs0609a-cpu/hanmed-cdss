import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { MedicationGuide } from './medication-guide.entity';

/**
 * 환자가 "오늘 먹었어요" 를 누른 날.
 *
 * 예전에는 이 기록이 환자 기기의 localStorage 에만 있었다. 기기를 바꾸거나
 * 카톡 링크를 다른 기기에서 열면 며칠째인지가 사라졌고, 한의사는 환자가
 * 실제로 복용했는지 알 방법이 없었다. "효과가 없다" 는 호소가 미복용 때문인지
 * 처방 때문인지 구분되지 않으면 다음 처방을 고칠 근거가 없다.
 *
 * 그래서 서버에 둔다. 다만 이 표에도 식별정보는 없다 — 안내서 id 와 날짜뿐이다.
 *
 * 날짜는 서버가 KST 기준으로 정한다. 클라이언트가 보낸 날짜를 믿으면
 * 기기 시계로 미래·과거를 채워 넣을 수 있다.
 */
@Entity('medication_guide_doses')
@Unique('UQ_medication_guide_doses_day', ['guideId', 'takenOn'])
@Index(['guideId', 'takenOn'])
export class MedicationGuideDose {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  guideId: string;

  @ManyToOne(() => MedicationGuide, (g) => g.doses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guideId' })
  guide: MedicationGuide;

  /** 복용한 날 (KST 기준 YYYY-MM-DD) */
  @Column({ type: 'date' })
  takenOn: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
