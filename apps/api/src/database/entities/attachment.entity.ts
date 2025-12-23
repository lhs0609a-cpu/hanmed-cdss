import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Post } from './post.entity';
import { Comment } from './comment.entity';

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column()
  originalFilename: string;

  @Column()
  mimeType: string;

  @Column()
  size: number; // bytes

  @Column()
  storagePath: string;

  @Column({ nullable: true })
  thumbnailPath: string;

  @Column({ nullable: true })
  postId: string;

  @ManyToOne(() => Post, (post) => post.attachments, { nullable: true })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @Column({ nullable: true })
  commentId: string;

  @ManyToOne(() => Comment, (comment) => comment.attachments, { nullable: true })
  @JoinColumn({ name: 'commentId' })
  comment: Comment;

  @Column()
  uploaderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaderId' })
  uploader: User;

  @CreateDateColumn()
  createdAt: Date;
}
