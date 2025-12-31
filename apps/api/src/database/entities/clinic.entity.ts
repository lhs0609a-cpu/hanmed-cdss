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

export interface OperatingHours {
  open: string;
  close: string;
  break?: {
    start: string;
    end: string;
  };
  closed?: boolean;
}

export interface ClinicImage {
  url: string;
  type: 'exterior' | 'interior' | 'treatment' | 'other';
  caption?: string;
}

@Entity('clinics')
export class Clinic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  ownerId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  // 기본 정보
  @Column({ length: 200 })
  name: string;

  @Column({ unique: true, nullable: true, length: 20 })
  businessNumber: string;

  @Column({ nullable: true, length: 50 })
  licenseNumber: string;

  // 연락처
  @Column({ nullable: true, length: 20 })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  websiteUrl: string;

  // 위치
  @Column({ nullable: true, length: 300 })
  addressRoad: string;

  @Column({ nullable: true, length: 200 })
  addressDetail: string;

  @Column({ nullable: true, length: 300 })
  addressJibun: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ nullable: true, length: 10 })
  regionCode: string;

  // 운영 정보
  @Column('jsonb', { nullable: true })
  operatingHours: Record<string, OperatingHours>;

  @Column('text', { array: true, default: [] })
  specialties: string[];

  // 예약 설정
  @Column({ default: true })
  reservationEnabled: boolean;

  @Column({ default: 30 })
  reservationInterval: number;

  @Column({ default: 50 })
  maxDailyReservations: number;

  // 부가 정보
  @Column('text', { nullable: true })
  description: string;

  @Column('jsonb', { default: [] })
  images: ClinicImage[];

  // HanMed 연동
  @Column({ default: false })
  isHanmedVerified: boolean;

  @Column({ nullable: true, length: 20 })
  subscriptionTier: string;

  // 평점/리뷰
  @Column({ type: 'decimal', precision: 2, scale: 1, default: 0 })
  ratingAverage: number;

  @Column({ default: 0 })
  reviewCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
