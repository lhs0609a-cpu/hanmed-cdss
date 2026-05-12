import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ClinicPractitioner,
  PractitionerRole,
} from '../../../database/entities/clinic-practitioner.entity';
import { Permission, hasAnyPermission } from '../permissions';

export const PRACTITIONER_ROLES_KEY = 'practitionerRoles';
export const PRACTITIONER_PERMISSIONS_KEY = 'practitionerPermissions';

/**
 * 한의원 직원(ClinicPractitioner) 역할 기반 권한 게이트.
 *
 * 사용 예:
 *   @RequireRole(PractitionerRole.OWNER, PractitionerRole.BILLING)
 *   @RequirePermission(Permission.BILLING_WRITE)
 *
 * 두 메타데이터 중 하나라도 만족하면 통과. clinicId는 다음 순서로 추출:
 *   1. params.clinicId
 *   2. body.clinicId
 *   3. query.clinicId
 *   4. headers['x-clinic-id']  ← 멀티-클리닉 직원 대응
 */
@Injectable()
export class PractitionerRolesGuard implements CanActivate {
  private readonly logger = new Logger(PractitionerRolesGuard.name);

  constructor(
    private reflector: Reflector,
    @InjectRepository(ClinicPractitioner)
    private readonly practitionerRepo: Repository<ClinicPractitioner>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<PractitionerRole[]>(
      PRACTITIONER_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PRACTITIONER_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 메타데이터 없으면 통과
    if (
      (!requiredRoles || requiredRoles.length === 0) &&
      (!requiredPermissions || requiredPermissions.length === 0)
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.id) {
      throw new ForbiddenException('인증이 필요합니다.');
    }

    const clinicId =
      request.params?.clinicId ??
      request.body?.clinicId ??
      request.query?.clinicId ??
      request.headers?.['x-clinic-id'];

    if (!clinicId) {
      throw new ForbiddenException('한의원을 지정해야 합니다.');
    }

    const membership = await this.practitionerRepo.findOne({
      where: { clinicId, userId: user.id },
    });

    if (!membership) {
      throw new ForbiddenException('해당 한의원에 소속된 직원이 아닙니다.');
    }

    // 요청에 컨텍스트 주입 — 컨트롤러에서 활용
    request.practitionerRole = membership.role;
    request.practitionerId = membership.id;

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(membership.role)) {
        throw new ForbiddenException(
          `이 작업은 ${requiredRoles.join(', ')} 역할만 수행할 수 있습니다.`,
        );
      }
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      if (!hasAnyPermission(membership.role, requiredPermissions)) {
        throw new ForbiddenException('이 작업을 수행할 권한이 없습니다.');
      }
    }

    return true;
  }
}
