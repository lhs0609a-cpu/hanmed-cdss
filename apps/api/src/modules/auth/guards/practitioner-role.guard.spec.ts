// PractitionerRolesGuard 테넌트 격리 검증.
//
// 이 가드는 patient-records / insurance / prognosis 등 clinic 스코프 엔드포인트의
// IDOR 방어선이다. URL 의 clinicId 로 "요청자가 그 한의원 소속인가"를 검증한다.
// 소속 레코드가 없으면 ForbiddenException 으로 차단되어야 한다.
//
// 외부 DB 불필요 — Reflector 와 repository 를 스텁으로 주입한다.
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PractitionerRolesGuard } from './practitioner-role.guard';
import { Permission } from '../permissions';
import { PractitionerRole } from '../../../database/entities/clinic-practitioner.entity';

function makeContext({
  userId,
  clinicId,
}: {
  userId?: string;
  clinicId?: string;
}): any {
  const req: any = {
    user: userId ? { id: userId } : undefined,
    params: clinicId ? { clinicId } : {},
    body: {},
    query: {},
    headers: {},
  };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
    __req: req,
  };
}

/** requiredPermissions 메타데이터를 항상 반환하는 Reflector 스텁 */
function reflectorWith(permissions: Permission[]): Reflector {
  return {
    getAllAndOverride: (key: string) => {
      if (key === 'practitionerPermissions') return permissions;
      return undefined;
    },
  } as any;
}

/** membership 조회 결과를 제어하는 repository 스텁 */
function repoReturning(membership: any) {
  const calls: any[] = [];
  return {
    calls,
    repo: {
      findOne: async (opts: any) => {
        calls.push(opts);
        return membership;
      },
    } as any,
  };
}

describe('PractitionerRolesGuard — 테넌트 격리', () => {
  const CHART_READ = [Permission.CHART_READ];

  it('소속 직원이면 통과하고 role/practitionerId 를 주입한다', async () => {
    const { repo } = repoReturning({
      id: 'membership_1',
      role: PractitionerRole.PRACTITIONER,
      clinicId: 'clinic_A',
      userId: 'user_1',
    });
    const guard = new PractitionerRolesGuard(reflectorWith(CHART_READ), repo);
    const ctx = makeContext({ userId: 'user_1', clinicId: 'clinic_A' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(ctx.__req.practitionerRole).toBe(PractitionerRole.PRACTITIONER);
    expect(ctx.__req.practitionerId).toBe('membership_1');
  });

  it('타 한의원 clinicId 로 접근하면 (소속 레코드 없음) 차단한다 — IDOR 방어', async () => {
    // 공격자는 로그인돼 있으나(user_2) clinic_A 소속이 아님 → findOne 이 null
    const { repo, calls } = repoReturning(null);
    const guard = new PractitionerRolesGuard(reflectorWith(CHART_READ), repo);
    const ctx = makeContext({ userId: 'user_2', clinicId: 'clinic_A' });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
    // 소속 조회는 (clinicId, userId) 쌍으로 이뤄져야 한다
    expect(calls[0].where).toEqual({ clinicId: 'clinic_A', userId: 'user_2' });
  });

  it('인증되지 않은 요청은 차단한다', async () => {
    const { repo } = repoReturning(null);
    const guard = new PractitionerRolesGuard(reflectorWith(CHART_READ), repo);
    const ctx = makeContext({ clinicId: 'clinic_A' }); // user 없음

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('clinicId 가 없으면 차단한다', async () => {
    const { repo } = repoReturning({ id: 'm', role: PractitionerRole.OWNER });
    const guard = new PractitionerRolesGuard(reflectorWith(CHART_READ), repo);
    const ctx = makeContext({ userId: 'user_1' }); // clinicId 없음

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('직역 권한이 없으면 (예: VIEWER 가 CHART_WRITE) 소속이어도 차단한다', async () => {
    const { repo } = repoReturning({
      id: 'membership_v',
      role: PractitionerRole.VIEWER,
      clinicId: 'clinic_A',
      userId: 'user_3',
    });
    const guard = new PractitionerRolesGuard(
      reflectorWith([Permission.CHART_WRITE]),
      repo,
    );
    const ctx = makeContext({ userId: 'user_3', clinicId: 'clinic_A' });

    // VIEWER 는 CHART_WRITE 권한이 없음 → 차단
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
