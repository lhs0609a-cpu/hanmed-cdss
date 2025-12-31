import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum VerificationPurpose {
  REGISTER = 'register',
  LOGIN = 'login',
  PASSWORD_RESET = 'password_reset',
}

@Entity('phone_verifications')
@Index(['phone', 'purpose'])
export class PhoneVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ length: 6 })
  code: string;

  @Column({
    type: 'enum',
    enum: VerificationPurpose,
    default: VerificationPurpose.REGISTER,
  })
  purpose: VerificationPurpose;

  @Column({ default: false })
  isVerified: boolean;

  @Column()
  expiresAt: Date;

  @Column({ default: 0 })
  attemptCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
