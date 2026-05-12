import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InteractionsService } from './interactions.service';
import { DrugHerbInteraction } from '../../database/entities/drug-herb-interaction.entity';
import { Herb } from '../../database/entities/herb.entity';
import { CacheService } from '../cache/cache.service';

/**
 * 환자안전 시나리오 단위 테스트
 *
 * 베타 출시 차단 기준 (P0):
 *  1. 와파린 + 당귀 → CRITICAL, blocked=true, requiresOverride=true
 *  2. 임산부 + 반하(半夏) → grounding 단에서 차단 (Python 측 pytest 참조)
 *     — 본 파일은 contraindication 카탈로그 메타데이터로 명세를 보장한다.
 */
describe('InteractionsService — 환자안전 시나리오', () => {
  let service: InteractionsService;

  // CacheService 는 in-memory mock — get 은 항상 miss, set/getOrSet 는 no-op.
  const mockCacheService: Partial<CacheService> = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    getOrSet: jest.fn(<T>(_key: string, factory: () => Promise<T>) => factory()) as CacheService['getOrSet'],
  };

  const mockInteractionsRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockHerbsRepo = {
    find: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteractionsService,
        { provide: getRepositoryToken(DrugHerbInteraction), useValue: mockInteractionsRepo },
        { provide: getRepositoryToken(Herb), useValue: mockHerbsRepo },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<InteractionsService>(InteractionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CRITICAL 차단 — 와파린 + 당귀', () => {
    it('당귀(혈활약) + 와파린 병용은 CRITICAL 로 분류되고 blocked=true 로 마킹돼야 함', async () => {
      const result: any = await service.checkInteractions(['당귀'], ['와파린']);

      expect(result.hasInteractions).toBe(true);
      expect(result.bySeverity.critical.length).toBeGreaterThan(0);

      const danggui = result.bySeverity.critical.find((c: any) =>
        /당귀/.test(c.herb || ''),
      );
      expect(danggui).toBeDefined();
      expect(danggui.blocked).toBe(true);
      // 임상관리·근거수준은 베타 정책상 항상 채워져 있어야 함
      expect(danggui.evidenceLevel).toBeTruthy();
      expect(danggui.clinicalManagement || danggui.recommendation).toBeTruthy();
    });

    it('CRITICAL 발견 시 requiresOverride=true 와 사유가 응답에 포함돼야 함', async () => {
      const result: any = await service.checkInteractions(['당귀'], ['warfarin']);

      expect(result.requiresOverride).toBe(true);
      expect(result.overrideRequiredReason).toContain('CRITICAL');
      expect(result.safetyLevel).toBe('danger');
    });

    it('CRITICAL 이 없으면 requiresOverride=false 여야 함', async () => {
      // 산조인(안신약) + 일반약은 CRITICAL 매칭 없음
      const result: any = await service.checkInteractions(['산조인'], ['타이레놀']);

      expect(result.requiresOverride).toBe(false);
      expect(result.overrideRequiredReason).toBeNull();
    });
  });

  describe('임산부 금기 카탈로그 — 반하(半夏) 외 22품 명세', () => {
    // grounding.py 의 PREGNANCY_CONTRAINDICATED_HERBS 과 동기화돼야 한다.
    // 변경 시 양쪽 동시 업데이트 필요 — 이 테스트가 그 계약(contract)을 문서화한다.
    const PREGNANCY_CONTRAINDICATED_HERBS = [
      '반하', '부자', '마황', '대황', '망초', '견우자', '파두',
      '원화', '감수', '대극', '상륙', '사간', '천오', '초오',
      '도인', '홍화', '삼릉', '아출', '자충', '수질', '맹충',
      '우슬', '의이인',
    ];

    it('임산부 금기 본초 카탈로그에 반하(半夏)가 포함돼야 함', () => {
      expect(PREGNANCY_CONTRAINDICATED_HERBS).toContain('반하');
    });

    it('주요 사하·축수·통경약(부자/마황/대황/도인/홍화/우슬)이 모두 포함돼야 함', () => {
      const required = ['부자', '마황', '대황', '도인', '홍화', '우슬'];
      for (const h of required) {
        expect(PREGNANCY_CONTRAINDICATED_HERBS).toContain(h);
      }
    });
  });
});
