import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * 지난 비밀번호 기록.
 *
 * 두 가지에 쓴다.
 *
 *  1. 로그인 실패 안내 — 틀린 비밀번호가 "예전에 쓰던 것" 이면 그렇게
 *     알려 준다. "비밀번호가 틀렸습니다" 만 보면 사람은 자기가 아는 그
 *     비밀번호를 계속 다시 넣는다. 바꿨다는 사실을 잊은 것이기 때문이다.
 *     언제 바꿨는지까지 말해 주면 대개 그 자리에서 기억이 돌아온다.
 *
 *  2. 같은 비밀번호로 되돌리는 것을 막을 때. (지금은 안내만 하고 막지는
 *     않는다 — 막는 규칙은 원장이 정할 일이다.)
 *
 * 해시만 담는다. 평문은 어디에도 남기지 않는다. bcrypt 해시는 비교만
 * 가능하고 되돌릴 수 없다.
 *
 * 오래된 것은 지운다. 사람이 기억하는 것은 최근 몇 개뿐이고, 옛 해시를
 * 무한히 쌓아 두는 것은 지켜야 할 것을 늘리는 일이다.
 */
@Entity('password_history')
@Index(['userId', 'changedAt'])
export class PasswordHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** 이 비밀번호를 쓰던 시절의 bcrypt 해시. */
  @Column({ length: 255 })
  passwordHash: string;

  /** 이 비밀번호를 버린 시각 = 새 비밀번호로 바꾼 시각. */
  @Column({ type: 'timestamp' })
  changedAt: Date;

  /** 어떻게 바꿨나 — 재설정 메일인지, 설정 화면에서인지. */
  @Column({ length: 20, default: 'reset' })
  changedVia: string;

  @CreateDateColumn()
  createdAt: Date;
}
