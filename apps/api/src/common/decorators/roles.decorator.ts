import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../database/entities/enums';
import { ROLES_KEY } from '../guards/roles.guard';

/**
 * 특정 역할만 접근 가능하도록 설정하는 데코레이터
 * 역할 계층에 따라 상위 역할은 하위 역할의 권한을 포함합니다.
 *
 * @example
 * // ADMIN 이상만 접근 가능
 * @Roles(UserRole.ADMIN)
 *
 * @example
 * // SUPPORT 또는 CONTENT_MANAGER 이상 접근 가능
 * @Roles(UserRole.SUPPORT, UserRole.CONTENT_MANAGER)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * SUPER_ADMIN만 접근 가능
 */
export const SuperAdminOnly = () => Roles(UserRole.SUPER_ADMIN);

/**
 * ADMIN 이상만 접근 가능 (ADMIN, SUPER_ADMIN)
 */
export const AdminOnly = () => Roles(UserRole.ADMIN);

/**
 * SUPPORT 이상만 접근 가능 (SUPPORT, CONTENT_MANAGER, ADMIN, SUPER_ADMIN)
 */
export const SupportOnly = () => Roles(UserRole.SUPPORT);

/**
 * CONTENT_MANAGER 이상만 접근 가능 (CONTENT_MANAGER, ADMIN, SUPER_ADMIN)
 */
export const ContentManagerOnly = () => Roles(UserRole.CONTENT_MANAGER);
