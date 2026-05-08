import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../database/entities/user.entity';
import {
  LicenseVerificationStatus,
  PractitionerType,
  UserStatus,
} from '../../database/entities/enums';

interface CreateUserDto {
  email: string;
  passwordHash: string;
  name: string;
  licenseNumber?: string;
  clinicName?: string;
  practitionerType?: PractitionerType;
  licenseVerificationStatus?: LicenseVerificationStatus;
  consentTerms?: boolean;
  consentPrivacy?: boolean;
  consentMarketing?: boolean;
  consentTermsAt?: Date | null;
  consentPrivacyAt?: Date | null;
  consentMarketingAt?: Date | null;
}

const DELETION_GRACE_DAYS = 30

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async updateSubscription(
    userId: string,
    tier: string,
    expiresAt: Date,
  ): Promise<User> {
    await this.usersRepository.update(userId, {
      subscriptionTier: tier as any,
      subscriptionExpiresAt: expiresAt,
    });
    return this.findById(userId) as Promise<User>;
  }

  async addContributionPoints(userId: string, points: number): Promise<User> {
    const user = await this.findById(userId);
    if (user) {
      await this.usersRepository.update(userId, {
        contributionPoints: user.contributionPoints + points,
      });
    }
    return this.findById(userId) as Promise<User>;
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.usersRepository.update(userId, { passwordHash });
  }

  async updateTwoFactor(
    userId: string,
    payload: {
      is2faEnabled?: boolean;
      totpSecretEncrypted?: string | null;
      twoFaBackupCodesEncrypted?: string | null;
    },
  ): Promise<void> {
    await this.usersRepository.update(userId, payload);
  }

  /**
   * 한의사 면허 검수: 관리자/시스템에 의해 호출.
   * verified=true 시 isLicenseVerified=true + licenseVerifiedAt 세팅.
   * verified=false 시 reject 사유 기록 (사용자가 수정 후 재제출 가능).
   */
  async setLicenseVerification(
    userId: string,
    decision: { verified: boolean; verifiedById?: string; rejectionReason?: string },
  ): Promise<void> {
    if (decision.verified) {
      await this.usersRepository.update(userId, {
        isLicenseVerified: true,
        licenseVerificationStatus: LicenseVerificationStatus.VERIFIED,
        licenseVerifiedAt: new Date(),
        licenseVerifiedById: decision.verifiedById ?? null,
        licenseRejectionReason: null,
      });
    } else {
      await this.usersRepository.update(userId, {
        isLicenseVerified: false,
        licenseVerificationStatus: LicenseVerificationStatus.REJECTED,
        licenseRejectionReason: decision.rejectionReason ?? null,
      });
    }
  }

  /**
   * 회원탈퇴 — 30일 grace period 동안 PENDING_DELETION 상태로 보관.
   * grace period 경과 시 별도 배치 잡이 hard-delete + 익명화 수행.
   * 본인 비밀번호 검증으로 오작동 차단.
   */
  async requestAccountDeletion(
    userId: string,
    payload: { password: string; reason?: string; acknowledgeDeletion: boolean },
  ): Promise<{ scheduledFor: Date }> {
    if (!payload.acknowledgeDeletion) {
      throw new BadRequestException('데이터 삭제 고지에 동의해주세요.');
    }
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    const ok = await bcrypt.compare(payload.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');

    const now = new Date();
    const scheduledFor = new Date(now.getTime() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
    await this.usersRepository.update(userId, {
      status: UserStatus.PENDING_DELETION,
      deletionRequestedAt: now,
      deletionScheduledFor: scheduledFor,
      deletionReason: payload.reason ?? null,
    });
    return { scheduledFor };
  }

  /** 탈퇴 취소 (grace period 내). */
  async cancelAccountDeletion(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      status: UserStatus.ACTIVE,
      deletionRequestedAt: null,
      deletionScheduledFor: null,
      deletionReason: null,
    });
  }
}
