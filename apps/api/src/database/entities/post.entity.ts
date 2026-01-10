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
import { User } from './user.entity';
import { ClinicalCase } from './clinical-case.entity';
import { Comment } from './comment.entity';
import { Attachment } from './attachment.entity';
import { Category } from './category.entity';
import { PostType } from './enums';

// Re-export for backward compatibility
export { PostType } from './enums';

export enum PostStatus {
  ACTIVE = 'active',
  HIDDEN = 'hidden',
  DELETED = 'deleted',
}

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: PostType,
    enumName: 'post_type_enum',
  })
  type: PostType;

  @Column({ nullable: true })
  categoryId: string;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column()
  authorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column({ default: false })
  isAnonymous: boolean;

  @Column({ nullable: true })
  anonymousNickname: string;

  @Column({ nullable: true })
  linkedCaseId: string;

  @ManyToOne(() => ClinicalCase, { nullable: true })
  @JoinColumn({ name: 'linkedCaseId' })
  linkedCase: ClinicalCase;

  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: 0 })
  likeCount: number;

  @Column({ default: 0 })
  commentCount: number;

  @Column({ default: 0 })
  bookmarkCount: number;

  @Column({ default: false })
  isPinned: boolean;

  @Column({ default: false })
  isSolved: boolean; // Q&A용: 해결됨 표시

  @Column({ nullable: true })
  acceptedAnswerId: string;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({
    type: 'enum',
    enum: PostStatus,
    enumName: 'post_status_enum',
    default: PostStatus.ACTIVE,
  })
  status: PostStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  @OneToMany(() => Attachment, (attachment) => attachment.post)
  attachments: Attachment[];
}
