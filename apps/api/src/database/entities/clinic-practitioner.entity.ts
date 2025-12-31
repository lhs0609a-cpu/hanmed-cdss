import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Clinic } from './clinic.entity';
import { User } from './user.entity';

export enum PractitionerRole {
  OWNER = 'owner',
  PRACTITIONER = 'practitioner',
}

@Entity('clinic_practitioners')
@Unique(['clinicId', 'userId'])
export class ClinicPractitioner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: PractitionerRole,
    default: PractitionerRole.PRACTITIONER,
  })
  role: PractitionerRole;

  @Column({ nullable: true, length: 100 })
  displayName: string;

  @Column('text', { array: true, default: [] })
  specialties: string[];

  @Column('text', { nullable: true })
  bio: string;

  @Column({ nullable: true })
  profileImageUrl: string;

  @Column({ default: true })
  isAcceptingPatients: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
