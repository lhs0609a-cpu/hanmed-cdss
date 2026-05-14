import { Test, TestingModule } from '@nestjs/testing';
import { PrescriptionsService } from './prescriptions.service';
import { RecommendationService } from '../ai/services/recommendation.service';
import { InteractionsService } from '../interactions/interactions.service';

/**
 * 처방 추천 + 상호작용 검사 smoke test.
 *
 * 베타 출시 차단 기준:
 *  - CRITICAL 상호작용이면 requiresOverride=true 가 PrescriptionsService 응답에 노출되어야 한다.
 *    (UI 가 이 플래그로 한의사 명시 동의 다이얼로그를 띄움)
 *  - 빈 입력 / 잘못된 타입 입력은 BadRequest 가 아니라 도메인 에러로 막혀야 한다.
 */
describe('PrescriptionsService (smoke)', () => {
  let service: PrescriptionsService;
  let recommendationService: jest.Mocked<RecommendationService>;
  let interactionsService: jest.Mocked<InteractionsService>;

  beforeEach(async () => {
    const recommendationMock: Partial<jest.Mocked<RecommendationService>> = {
      getRecommendation: jest.fn(),
    };
    const interactionsMock: Partial<jest.Mocked<InteractionsService>> = {
      checkInteractions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionsService,
        { provide: RecommendationService, useValue: recommendationMock },
        { provide: InteractionsService, useValue: interactionsMock },
      ],
    }).compile();

    service = module.get<PrescriptionsService>(PrescriptionsService);
    recommendationService = module.get(RecommendationService);
    interactionsService = module.get(InteractionsService);
  });

  describe('getRecommendation', () => {
    it('정상 케이스 — AI 엔진 응답을 success 래퍼로 감싸서 반환', async () => {
      recommendationService.getRecommendation.mockResolvedValue({
        recommendations: [{ formula_name: '보중익기탕' }],
      } as any);

      const out = await service.getRecommendation({
        chiefComplaint: '식욕부진',
        symptoms: [{ name: '피로', severity: 3 }],
      });

      expect(out.success).toBe(true);
      expect(out.data).toEqual({ recommendations: [{ formula_name: '보중익기탕' }] });
      expect(recommendationService.getRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({
          chiefComplaint: '식욕부진',
          symptoms: [{ name: '피로', severity: 3 }],
        }),
      );
    });

    it('AI 엔진 에러는 throw 되어 호출자가 인지할 수 있다', async () => {
      recommendationService.getRecommendation.mockRejectedValue(
        new Error('AI engine timeout'),
      );

      await expect(
        service.getRecommendation({ chiefComplaint: 'x', symptoms: [] }),
      ).rejects.toThrow('AI engine timeout');
    });
  });

  describe('checkInteractions — CRITICAL 차단 플래그 전달', () => {
    it('CRITICAL 상호작용이면 requiresOverride=true 가 상위에 노출된다', async () => {
      interactionsService.checkInteractions.mockResolvedValue({
        hasInteractions: true,
        totalCount: 1,
        bySeverity: {
          critical: [{ blocked: true, drug: '와파린', herb: '당귀' }],
          warning: [],
          info: [],
        },
        requiresOverride: true,
        overrideRequiredReason:
          'CRITICAL 상호작용 1건 — 한의사 동의(override) 없이는 처방 저장 금지.',
      } as any);

      const out = await service.checkInteractions(['당귀'], ['와파린']);

      expect(out.success).toBe(true);
      expect(out.requiresOverride).toBe(true);
      expect((out.data as any).bySeverity.critical).toHaveLength(1);
      expect(interactionsService.checkInteractions).toHaveBeenCalledWith(
        ['당귀'],
        ['와파린'],
      );
    });

    it('WARNING 만 있으면 requiresOverride=false (한의사 판단으로 진행 가능)', async () => {
      interactionsService.checkInteractions.mockResolvedValue({
        hasInteractions: true,
        bySeverity: { critical: [], warning: [{ severity: 'warning' }], info: [] },
        requiresOverride: false,
      } as any);

      const out = await service.checkInteractions(['은행잎'], ['아스피린']);
      expect(out.requiresOverride).toBe(false);
    });

    it('상호작용 없음 → requiresOverride=false', async () => {
      interactionsService.checkInteractions.mockResolvedValue({
        hasInteractions: false,
        bySeverity: { critical: [], warning: [], info: [] },
      } as any);

      const out = await service.checkInteractions(['감초'], ['타이레놀']);
      expect(out.requiresOverride).toBe(false);
    });

    it('입력 공백/빈문자열은 자동 정리 후 검사 진행', async () => {
      interactionsService.checkInteractions.mockResolvedValue({
        hasInteractions: false,
        bySeverity: { critical: [], warning: [], info: [] },
      } as any);

      await service.checkInteractions(['  당귀  ', '', null as any], ['와파린', '  ']);

      expect(interactionsService.checkInteractions).toHaveBeenCalledWith(
        ['당귀'],
        ['와파린'],
      );
    });

    it('배열이 아닌 입력은 도메인 에러로 차단', async () => {
      await expect(
        service.checkInteractions('당귀' as any, ['와파린']),
      ).rejects.toThrow(/배열/);

      await expect(
        service.checkInteractions(['당귀'], null as any),
      ).rejects.toThrow(/배열/);

      expect(interactionsService.checkInteractions).not.toHaveBeenCalled();
    });
  });
});
