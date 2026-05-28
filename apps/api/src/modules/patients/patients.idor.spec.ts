// 환자 세션 IDOR 수정 검증 — 실제 PatientsService 를 인메모리(CacheService 폴백)로
// 인스턴스화하고, 교차 소유자 접근을 다량 시도해 PHI 누출이 없는지 퍼즈한다.
// 외부 DB/Redis 불필요 — 100% 안전.
import { PatientsService } from './patients.service';

// CacheService 가 사용 불가(false) → PatientsService 내부 memoryFallback(Map) 사용
const memoryOnlyCache = { isAvailable: () => false } as any;

function rid() {
  return 'user_' + Math.random().toString(36).slice(2, 10);
}
function randPatient() {
  return {
    age: Math.floor(Math.random() * 120),
    gender: Math.random() > 0.5 ? 'male' : 'female',
    chiefComplaint: '증상' + Math.random().toString(36).slice(2, 8),
    currentMedications: Math.random() > 0.5 ? ['약' + Math.floor(Math.random() * 99)] : [],
  };
}

describe('PatientsService IDOR (실제 코드 퍼즈 100x)', () => {
  let service: PatientsService;

  beforeEach(() => {
    service = new PatientsService(memoryOnlyCache);
  });

  it('소유자는 자기 세션을 읽고/수정/삭제할 수 있다 (100회)', async () => {
    for (let i = 0; i < 100; i++) {
      const owner = rid();
      const created = await service.createSession(randPatient(), owner);
      expect(created.sessionId).toBeTruthy();
      expect(created.ownerId).toBe(owner);

      const got = await service.getSession(created.sessionId, owner);
      expect(got).not.toBeNull();
      expect(got.sessionId).toBe(created.sessionId);

      const updated = await service.updateSession(created.sessionId, { age: 33 }, owner);
      expect(updated).not.toBeNull();
      expect(updated.age).toBe(33);

      const deleted = await service.deleteSession(created.sessionId, owner);
      expect(deleted).toBe(true);
    }
  });

  it('다른 사용자는 남의 세션에 절대 접근할 수 없다 (100회, PHI 누출 0)', async () => {
    let leaks = 0;
    for (let i = 0; i < 100; i++) {
      const owner = rid();
      let attacker = rid();
      while (attacker === owner) attacker = rid();

      const created = await service.createSession(randPatient(), owner);

      // 공격자(다른 userId)가 읽기 시도 → 반드시 null
      const stolen = await service.getSession(created.sessionId, attacker);
      if (stolen !== null) leaks++;

      // 공격자가 수정 시도 → 반드시 null (수정 안 됨)
      const tampered = await service.updateSession(
        created.sessionId,
        { chiefComplaint: 'HACKED' },
        attacker,
      );
      if (tampered !== null) leaks++;

      // 공격자가 삭제 시도 → 반드시 false (삭제 안 됨)
      const wiped = await service.deleteSession(created.sessionId, attacker);
      if (wiped !== false) leaks++;

      // 원 소유자 데이터는 여전히 멀쩡해야 함 (공격자가 못 건드림)
      const ownerView = await service.getSession(created.sessionId, owner);
      if (!ownerView || ownerView.chiefComplaint === 'HACKED') leaks++;
    }
    expect(leaks).toBe(0);
  });
});
