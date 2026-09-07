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
  isVerified?: boolean;
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

  /**
   * 사용자 본인 프로필 수정 — 화이트리스트 필드만 반영.
   * (면허 인증 상태·역할·구독 등 권한/결제 관련 필드는 여기서 변경 불가)
   */
  async updateProfile(
    userId: string,
    payload: {
      name?: string;
      clinicName?: string | null;
      licenseNumber?: string | null;
      specialization?: string | null;
      bio?: string | null;
    },
  ): Promise<User> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const updates: Partial<User> = {};
    if (payload.name !== undefined) updates.name = payload.name;
    if (payload.clinicName !== undefined) updates.clinicName = payload.clinicName;
    if (payload.licenseNumber !== undefined) updates.licenseNumber = payload.licenseNumber;
    if (payload.specialization !== undefined) updates.specialization = payload.specialization;
    if (payload.bio !== undefined) updates.bio = payload.bio;

    // 면허번호가 실제로 바뀌면 검수 큐에 다시 넣는다.
    // 이게 없으면 반려당한 사용자는 번호를 고쳐도 영원히 rejected 에 머물고,
    // 가입 후에 번호를 입력한 사용자는 관리자 화면에 아예 나타나지 않는다.
    if (payload.licenseNumber !== undefined) {
      const next = (payload.licenseNumber ?? '').trim();
      const current = (user.licenseNumber ?? '').trim();

      if (next !== current) {
        if (next) {
          updates.licenseVerificationStatus = LicenseVerificationStatus.PENDING;
          updates.isLicenseVerified = false;
          updates.licenseVerifiedAt = null;
          updates.licenseRejectionReason = null;
        } else {
          updates.licenseVerificationStatus = LicenseVerificationStatus.UNSUBMITTED;
          updates.isLicenseVerified = false;
          updates.licenseVerifiedAt = null;
          updates.licenseRejectionReason = null;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      await this.usersRepository.update(userId, updates);
    }
    return this.findById(userId) as Promise<User>;
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
   * 면허증 사본 제출/교체.
   *
   * 사본이 새로 들어오면 검수 큐에 다시 넣는다. 반려당한 사람이 사진을 다시
   * 찍어 올리는 것이 가장 흔한 재제출 경로인데, 상태를 안 바꾸면 그 파일은
   * 아무도 보지 않는다.
   *
   * 옛 파일은 새 경로를 DB 에 쓴 **뒤에** 지운다. 순서를 바꾸면 저장은
   * 실패하고 파일만 사라지는 창이 생긴다.
   */
  async attachLicenseDocument(
    userId: string,
    file: { path: string },
  ): Promise<{ previousPath: string | null }> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const previousPath = user.licenseFilePath;

    await this.usersRepository.update(userId, {
      licenseFilePath: file.path,
      licenseFileUploadedAt: new Date(),
      licenseVerificationStatus: LicenseVerificationStatus.PENDING,
      isLicenseVerified: false,
      licenseVerifiedAt: null,
      licenseRejectionReason: null,
    });

    return { previousPath: previousPath && previousPath !== file.path ? previousPath : null };
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
