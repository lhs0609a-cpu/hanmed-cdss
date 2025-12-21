import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SubscriptionTier {
  STARTER = 'starter',
  PRO = 'pro',
  MASTER = 'master',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  licenseNumber: string;

  @Column({ nullable: true })
  clinicName: string;

  @Column({
    type: 'enum',
    enum: SubscriptionTier,
    default: SubscriptionTier.STARTER,
  })
  subscriptionTier: SubscriptionTier;

  @Column({ nullable: true })
  subscriptionExpiresAt: Date;

  @Column({ default: 0 })
  contributionPoints: number;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  stripeCustomerId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
