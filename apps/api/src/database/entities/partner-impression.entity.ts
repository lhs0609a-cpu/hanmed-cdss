import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Partner, PartnerPlacement } from './partner.entity';
import { User } from './user.entity';

/**
 * 파트너 노출/클릭 이벤트 로그.
 *
 * 정산 + 한도(monthlyImpressionCap) 체크 + 클릭율(CTR) 분석에 사용.
 * 한의사 단위 식별자 외에 환자 식별 정보는 절대 저장하지 않는다.
 */
@Entity('partner_impressions')
@Index(['partnerId', 'occurredAt'])
@Index(['userId', 'occurredAt'])
export class PartnerImpression {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  partnerId: string;

  @ManyToOne(() => Partner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'partnerId' })
  partner: Partner;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: PartnerPlacement })
  placement: PartnerPlacement;

  /** 'impression' | 'click' */
  @Column({ length: 20, default: 'impression' })
  eventType: string;

  /** 노출 컨텍스트(어떤 처방/한약재로 매칭됐는지) */
  @Column({ type: 'json', nullable: true })
  context: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'occurredAt' })
  occurredAt: Date;
}
