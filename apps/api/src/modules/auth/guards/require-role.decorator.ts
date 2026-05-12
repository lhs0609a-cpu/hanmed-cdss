import { SetMetadata, applyDecorators } from '@nestjs/common';
import { PractitionerRole } from '../../../database/entities/clinic-practitioner.entity';
import { Permission } from '../permissions';
import {
  PRACTITIONER_ROLES_KEY,
  PRACTITIONER_PERMISSIONS_KEY,
} from './practitioner-role.guard';

/**
 * 한의원 직원 역할 요구 — PractitionerRolesGuard 와 함께 사용.
 *
 * @example
 *   @UseGuards(JwtAuthGuard, PractitionerRolesGuard)
 *   @RequireRole(PractitionerRole.OWNER)
 */
export const RequireRole = (...roles: PractitionerRole[]) =>
  SetMetadata(PRACTITIONER_ROLES_KEY, roles);

/**
 * 한의원 직원 권한 요구 — 하나라도 만족하면 통과.
 *
 * @example
 *   @RequirePermission(Permission.BILLING_WRITE)
 */
export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(PRACTITIONER_PERMISSIONS_KEY, permissions);

/**
 * 편의 — OWNER 전용.
 */
export const OwnerOnly = () =>
  applyDecorators(RequireRole(PractitionerRole.OWNER));
