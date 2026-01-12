import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, UserStatus, ROLE_HIERARCHY } from '../../database/entities/enums';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 필요한 역할 가져오기
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 역할 제한이 없으면 통과
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 사용자가 없으면 거부
    if (!user) {
      throw new ForbiddenException('인증이 필요합니다.');
    }

    // 계정 상태 확인
    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('계정이 일시 정지되었습니다. 관리자에게 문의하세요.');
    }

    if (user.status === UserStatus.BANNED) {
      throw new ForbiddenException('계정이 영구 차단되었습니다.');
    }

    // 역할 계층 기반 권한 확인
    const userRoleLevel = ROLE_HIERARCHY[user.role] || 0;
    const hasRequiredRole = requiredRoles.some((role) => {
      const requiredLevel = ROLE_HIERARCHY[role] || 0;
      return userRoleLevel >= requiredLevel;
    });

    if (!hasRequiredRole) {
      throw new ForbiddenException('이 작업을 수행할 권한이 없습니다.');
    }

    return true;
  }
}

// 관리자 여부 확인 헬퍼 함수
export function isAdmin(role: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[UserRole.SUPPORT];
}

// SUPER_ADMIN 여부 확인 헬퍼 함수
export function isSuperAdmin(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN;
}
