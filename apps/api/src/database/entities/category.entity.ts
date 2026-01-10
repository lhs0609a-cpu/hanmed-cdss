import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { SubscriptionTier } from './user.entity';

// PostType enum 정의 (순환 의존성 방지)
export enum CategoryPostType {
  CASE_DISCUSSION = 'case_discussion',
  QNA = 'qna',
  GENERAL = 'general',
  FORUM = 'forum',
}

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string | null;

  @Column({ unique: true })
  slug: string; // URL용 (예: 'herbology', 'shanghanlun')

  @Column({
    type: 'varchar',
    length: 50,
  })
  postType: CategoryPostType;

  @Column({ nullable: true })
  parentId: string | null;

  @ManyToOne(() => Category, (category) => category.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: Category | null;

  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  @Column({ nullable: true })
  iconName: string | null; // Lucide 아이콘 이름

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'free',
  })
  requiredTier: SubscriptionTier;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
