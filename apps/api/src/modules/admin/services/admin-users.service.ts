import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../../database/entities/user.entity';
import {
  UserRole,
  UserStatus,
  LicenseVerificationStatus,
} from '../../../database/entities/enums';
import { AuditLogService } from './audit-log.service';
import { LicenseDocumentService } from '../../users/license-document.service';
import { AuditActions } from '../../../database/entities/admin-audit-log.entity';
import {
  GetUsersQueryDto,
  SuspendUserDto,
  ChangeUserRoleDto,
  UpdateUserDto,
  PaginatedUsersResponseDto,
} from '../dto';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private auditLogService: AuditLogService,
    private licenseDocuments: LicenseDocumentService,
  ) {}

  async getUsers(query: GetUsersQueryDto): Promise<PaginatedUsersResponseDto> {
    const {
      search,
      role,
      status,
      subscriptionTier,
      licenseStatus,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // 검색 필터
    if (search) {
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // 역할 필터
    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    // 상태 필터
    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    // 구독 티어 필터
    if (subscriptionTier) {
      queryBuilder.andWhere('user.subscriptionTier = :subscriptionTier', {
        subscriptionTier,
      });
    }

    // 면허 검수 상태 필터
    if (licenseStatus) {
      queryBuilder.andWhere('user.licenseVerificationStatus = :licenseStatus', {
        licenseStatus,
      });
    }

    // 정렬
    const allowedSortFields = [
      'createdAt',
      'name',
      'email',
      'role',
      'status',
      'subscriptionTier',
      'licenseVerificationStatus',
    ];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`user.${sortField}`, sortOrder);

    // 페이지네이션
    const [users, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      users: users.map((user) => this.toUserResponse(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['suspendedBy'],
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  async updateUser(
    adminId: string,
    userId: string,
    dto: UpdateUserDto,
    requestInfo?: { ip?: string; userAgent?: string },
  ): Promise<User> {
    const user = await this.getUserById(userId);
    const oldValue = { ...user };

    // 업데이트
    Object.assign(user, dto);
    const updatedUser = await this.userRepository.save(user);

    // 감사 로그
    await this.auditLogService.log({
      adminId,
      action: 'user:update',
      targetType: 'user',
      targetId: userId,
      oldValue: {
        name: oldValue.name,
        email: oldValue.email,
        licenseNumber: oldValue.licenseNumber,
        clinicName: oldValue.clinicName,
      },
      newValue: dto,
      ipAddress: requestInfo?.ip,
      userAgent: requestInfo?.userAgent,
    });

    return updatedUser;
  }

  async suspendUser(
    adminId: string,
    userId: string,
    dto: SuspendUserDto,
    requestInfo?: { ip?: string; userAgent?: string },
  ): Promise<User> {
    const user = await this.getUserById(userId);

    // 자기 자신 정지 불가
    if (user.id === adminId) {
      throw new ForbiddenException('자기 자신을 정지할 수 없습니다.');
    }

    // 상위 관리자 정지 불가
    const admin = await this.getUserById(adminId);
    if (this.isHigherRole(user.role, admin.role)) {
      throw new ForbiddenException('상위 권한의 사용자를 정지할 수 없습니다.');
    }

    const oldStatus = user.status;

    user.status = UserStatus.SUSPENDED;
    user.suspendedAt = new Date();
    user.suspendedReason = dto.reason;
    user.suspendedById = adminId;

    const updatedUser = await this.userRepository.save(user);

    // 감사 로그
    await this.auditLogService.log({
      adminId,
      action: AuditActions.USER_SUSPEND,
      targetType: 'user',
      targetId: userId,
      oldValue: { status: oldStatus },
      newValue: { status: UserStatus.SUSPENDED, reason: dto.reason },
      ipAddress: requestInfo?.ip,
      userAgent: requestInfo?.userAgent,
    });

    return updatedUser;
  }

  async activateUser(
    adminId: string,
    userId: string,
    requestInfo?: { ip?: string; userAgent?: string },
  ): Promise<User> {
    const user = await this.getUserById(userId);
    const oldStatus = user.status;

    user.status = UserStatus.ACTIVE;
    user.suspendedAt = null;
    user.suspendedReason = null;
    user.suspendedById = null;

    const updatedUser = await this.userRepository.save(user);

    // 감사 로그
    await this.auditLogService.log({
      adminId,
      action: AuditActions.USER_ACTIVATE,
      targetType: 'user',
      targetId: userId,
      oldValue: { status: oldStatus },
      newValue: { status: UserStatus.ACTIVE },
      ipAddress: requestInfo?.ip,
      userAgent: requestInfo?.userAgent,
    });

    return updatedUser;
  }

  async banUser(
    adminId: string,
    userId: string,
    reason: string,
    requestInfo?: { ip?: string; userAgent?: string },
  ): Promise<User> {
    const user = await this.getUserById(userId);

    // 자기 자신 차단 불가
    if (user.id === adminId) {
      throw new ForbiddenException('자기 자신을 차단할 수 없습니다.');
    }

    // 상위 관리자 차단 불가
    const admin = await this.getUserById(adminId);
    if (this.isHigherRole(user.role, admin.role)) {
      throw new ForbiddenException('상위 권한의 사용자를 차단할 수 없습니다.');
    }

    const oldStatus = user.status;

    user.status = UserStatus.BANNED;
    user.suspendedAt = new Date();
    user.suspendedReason = reason;
    user.suspendedById = adminId;

    const updatedUser = await this.userRepository.save(user);

    // 감사 로그
    await this.auditLogService.log({
      adminId,
      action: AuditActions.USER_BAN,
      targetType: 'user',
      targetId: userId,
      oldValue: { status: oldStatus },
      newValue: { status: UserStatus.BANNED, reason },
      ipAddress: requestInfo?.ip,
      userAgent: requestInfo?.userAgent,
    });

    return updatedUser;
  }

  async changeUserRole(
    adminId: string,
    userId: string,
    dto: ChangeUserRoleDto,
    requestInfo?: { ip?: string; userAgent?: string },
  ): Promise<User> {
    const user = await this.getUserById(userId);
    const admin = await this.getUserById(adminId);

    // SUPER_ADMIN만 역할 변경 가능
    if (admin.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('역할 변경은 최고 관리자만 가능합니다.');
    }

    // 자기 자신의 역할 변경 불가
    if (user.id === adminId) {
      throw new ForbiddenException('자기 자신의 역할은 변경할 수 없습니다.');
    }

    const oldRole = user.role;
    user.role = dto.role;

    const updatedUser = await this.userRepository.save(user);

    // 감사 로그
    await this.auditLogService.log({
      adminId,
      action: AuditActions.USER_ROLE_CHANGE,
      targetType: 'user',
      targetId: userId,
      oldValue: { role: oldRole },
      newValue: { role: dto.role },
      ipAddress: requestInfo?.ip,
      userAgent: requestInfo?.userAgent,
    });

    return updatedUser;
  }

  /**
   * 한의사 면허 검수 승인.
   * 면허번호가 비어 있으면 승인할 대상이 없으므로 막는다 — 빈 승인은
   * PractitionerGuard 를 무의미하게 만든다.
   */
  async approveLicense(
    adminId: string,
    userId: string,
    requestInfo?: { ip?: string; userAgent?: string },
  ): Promise<User> {
    const user = await this.getUserById(userId);

    if (!user.licenseNumber?.trim()) {
      throw new BadRequestException(
        '면허번호가 입력되지 않은 사용자는 승인할 수 없습니다.',
      );
    }

    const oldStatus = user.licenseVerificationStatus;

    user.isLicenseVerified = true;
    user.licenseVerificationStatus = LicenseVerificationStatus.VERIFIED;
    user.licenseVerifiedAt = new Date();
    user.licenseVerifiedById = adminId;
    user.licenseRejectionReason = null;

    const updatedUser = await this.userRepository.save(user);

    await this.auditLogService.log({
      adminId,
      action: AuditActions.USER_LICENSE_APPROVE,
      targetType: 'user',
      targetId: userId,
      oldValue: { licenseVerificationStatus: oldStatus },
      newValue: {
        licenseVerificationStatus: LicenseVerificationStatus.VERIFIED,
        licenseNumber: user.licenseNumber,
      },
      ipAddress: requestInfo?.ip,
      userAgent: requestInfo?.userAgent,
    });

    return updatedUser;
  }

  /**
   * 한의사 면허 검수 반려.
   * 사유는 사용자 설정 화면에 그대로 노출되므로 반드시 남긴다.
   * 사용자가 면허번호를 고쳐 저장하면 다시 pending 으로 돌아온다.
   */
  async rejectLicense(
    adminId: string,
    userId: string,
    reason: string,
    requestInfo?: { ip?: string; userAgent?: string },
  ): Promise<User> {
    const user = await this.getUserById(userId);

    if (!reason?.trim()) {
      throw new BadRequestException('반려 사유를 입력해야 합니다.');
    }

    const oldStatus = user.licenseVerificationStatus;

    user.isLicenseVerified = false;
    user.licenseVerificationStatus = LicenseVerificationStatus.REJECTED;
    user.licenseVerifiedAt = null;
    user.licenseVerifiedById = adminId;
    user.licenseRejectionReason = reason.trim();

    const updatedUser = await this.userRepository.save(user);

    await this.auditLogService.log({
      adminId,
      action: AuditActions.USER_LICENSE_REJECT,
      targetType: 'user',
      targetId: userId,
      oldValue: { licenseVerificationStatus: oldStatus },
      newValue: {
        licenseVerificationStatus: LicenseVerificationStatus.REJECTED,
        reason: reason.trim(),
      },
      ipAddress: requestInfo?.ip,
      userAgent: requestInfo?.userAgent,
    });

    return updatedUser;
  }

  /**
   * 면허증 사본 열람 URL 발급.
   *
   * 볼 때마다 감사로그를 남긴다. 면허증은 이름·생년월일이 함께 찍힌 개인정보라
   * "누가 언제 봤는지" 가 남지 않으면 열람 자체를 정당화할 수 없다.
   */
  async getLicenseFileUrl(
    adminId: string,
    userId: string,
    requestInfo?: { ip?: string; userAgent?: string },
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const user = await this.getUserById(userId);

    if (!user.licenseFilePath) {
      throw new NotFoundException('제출된 면허증 사본이 없습니다.');
    }

    const signed = await this.licenseDocuments.createSignedUrl(user.licenseFilePath);

    await this.auditLogService.log({
      adminId,
      action: AuditActions.USER_LICENSE_FILE_VIEW,
      targetType: 'user',
      targetId: userId,
      ipAddress: requestInfo?.ip,
      userAgent: requestInfo?.userAgent,
    });

    return signed;
  }

  async resetPassword(
    adminId: string,
    userId: string,
    requestInfo?: { ip?: string; userAgent?: string },
  ): Promise<{ temporaryPassword: string }> {
    const user = await this.getUserById(userId);

    // 임시 비밀번호 생성 (8자리 랜덤)
    const temporaryPassword = this.generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    user.passwordHash = hashedPassword;
    await this.userRepository.save(user);

    // 감사 로그
    await this.auditLogService.log({
      adminId,
      action: AuditActions.USER_PASSWORD_RESET,
      targetType: 'user',
      targetId: userId,
      newValue: { passwordReset: true },
      ipAddress: requestInfo?.ip,
      userAgent: requestInfo?.userAgent,
    });

    return { temporaryPassword };
  }

  // 헬퍼 메서드들
  private toUserResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      licenseNumber: user.licenseNumber,
      clinicName: user.clinicName,
      role: user.role,
      status: user.status,
      subscriptionTier: user.subscriptionTier,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      isVerified: user.isVerified,
      isLicenseVerified: user.isLicenseVerified,
      licenseVerificationStatus: user.licenseVerificationStatus,
      licenseVerifiedAt: user.licenseVerifiedAt,
      licenseRejectionReason: user.licenseRejectionReason,
      // 경로는 목록에 싣지 않는다. 열람은 별도 요청으로만 — 그래야 감사로그가 남는다.
      hasLicenseFile: Boolean(user.licenseFilePath),
      licenseFileUploadedAt: user.licenseFileUploadedAt,
      practitionerType: user.practitionerType,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      suspendedAt: user.suspendedAt,
      suspendedReason: user.suspendedReason,
    };
  }

  private isHigherRole(targetRole: UserRole, adminRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.SUPER_ADMIN]: 100,
      [UserRole.ADMIN]: 80,
      [UserRole.CONTENT_MANAGER]: 60,
      [UserRole.SUPPORT]: 40,
      [UserRole.USER]: 0,
    };

    return roleHierarchy[targetRole] >= roleHierarchy[adminRole];
  }

  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
