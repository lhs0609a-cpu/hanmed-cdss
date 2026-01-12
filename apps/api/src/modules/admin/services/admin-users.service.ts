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
import { UserRole, UserStatus } from '../../../database/entities/enums';
import { AuditLogService } from './audit-log.service';
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
  ) {}

  async getUsers(query: GetUsersQueryDto): Promise<PaginatedUsersResponseDto> {
    const {
      search,
      role,
      status,
      subscriptionTier,
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

    // 정렬
    const allowedSortFields = ['createdAt', 'name', 'email', 'role', 'status', 'subscriptionTier'];
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
