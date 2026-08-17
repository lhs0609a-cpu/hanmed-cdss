import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CasesService } from './cases.service';
import { CacheService } from '../cache/cache.service';
import {
  ClinicalCase,
  TreatmentOutcome,
} from '../../database/entities/clinical-case.entity';

/**
 * 유사 치험례 성공률 통계 — 진료 결과 화면의 "유사 환자 통계" 카드가 쓰는 집계.
 *
 * 검증 포인트:
 *  - 성공률 = (완치 + 호전) / 결과가 기록된 치험례
 *  - 결과 미기록 케이스는 분모에서 빠진다 (성공률을 부풀리지 않는다)
 *  - 임베딩 검색이 비면 텍스트 매칭으로 폴백해도 실제 통계를 낸다
 *  - 표본이 적으면 신뢰도를 낮게 표기한다
 */
describe('CasesService.getSimilarSuccessStats', () => {
  let service: CasesService;
  let qb: Record<string, jest.Mock>;

  const makeCase = (
    outcome: TreatmentOutcome | null,
    formulaName?: string,
  ): Partial<ClinicalCase> => ({
    id: Math.random().toString(36).slice(2),
    treatmentOutcome: outcome as TreatmentOutcome,
    herbalFormulas: formulaName
      ? [{ formulaName, herbs: [] as Array<{ name: string; amount: string }> }]
      : [],
  });

  const setup = async (cases: Array<Partial<ClinicalCase>>) => {
    qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(cases),
    };

    const repoMock = { createQueryBuilder: jest.fn(() => qb) };
    const cacheMock = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      getOrSet: jest.fn(),
      getOrSetWithLock: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CasesService,
        { provide: getRepositoryToken(ClinicalCase), useValue: repoMock },
        { provide: CacheService, useValue: cacheMock },
        // OPENAI_API_KEY 미설정 → 임베딩 검색은 비고, 텍스트 폴백 경로를 탄다.
        { provide: ConfigService, useValue: { get: jest.fn(() => undefined) } },
      ],
    }).compile();

    service = module.get<CasesService>(CasesService);
  };

  it('성공률은 (완치+호전)/결과기록 건수 로 계산한다', async () => {
    await setup([
      makeCase(TreatmentOutcome.CURED, '보중익기탕'),
      makeCase(TreatmentOutcome.CURED, '보중익기탕'),
      makeCase(TreatmentOutcome.IMPROVED, '보중익기탕'),
      makeCase(TreatmentOutcome.NO_CHANGE, '사물탕'),
    ]);

    const stats = await service.getSimilarSuccessStats({
      chiefComplaint: '소화불량',
      symptoms: [{ name: '피로' }],
    });

    expect(stats.totalSimilarCases).toBe(4);
    expect(stats.successRate).toBe(75);
    expect(stats.outcomeBreakdown).toEqual({
      cured: 2,
      improved: 1,
      noChange: 1,
      worsened: 0,
    });
  });

  it('결과가 기록되지 않은 치험례는 분모에서 제외한다', async () => {
    await setup([
      makeCase(TreatmentOutcome.CURED, '보중익기탕'),
      makeCase(null),
      makeCase(null),
    ]);

    const stats = await service.getSimilarSuccessStats({
      chiefComplaint: '두통',
    });

    // 결과 기록 1건뿐 → 100% 이지만 표본 수도 1 로 정직하게 노출
    expect(stats.totalSimilarCases).toBe(1);
    expect(stats.successRate).toBe(100);
    expect(stats.confidenceLevel).toBe('low');
  });

  it('처방별 성공률을 건수 순으로 집계한다', async () => {
    await setup([
      makeCase(TreatmentOutcome.CURED, '보중익기탕'),
      makeCase(TreatmentOutcome.IMPROVED, '보중익기탕'),
      makeCase(TreatmentOutcome.NO_CHANGE, '보중익기탕'),
      makeCase(TreatmentOutcome.CURED, '사물탕'),
    ]);

    const stats = await service.getSimilarSuccessStats({
      chiefComplaint: '소화불량',
    });

    expect(stats.topSuccessfulFormulas[0]).toEqual({
      formulaName: '보중익기탕',
      caseCount: 3,
      successRate: 67,
    });
    expect(stats.topSuccessfulFormulas[1]).toEqual({
      formulaName: '사물탕',
      caseCount: 1,
      successRate: 100,
    });
  });

  it('매칭되는 치험례가 없으면 0건으로 반환한다 (카드는 숨겨진다)', async () => {
    await setup([]);

    const stats = await service.getSimilarSuccessStats({
      chiefComplaint: '희귀증상',
    });

    expect(stats.totalSimilarCases).toBe(0);
    expect(stats.topSuccessfulFormulas).toEqual([]);
  });

  it('주소증이 비면 조회 없이 빈 통계를 반환한다', async () => {
    await setup([makeCase(TreatmentOutcome.CURED, '보중익기탕')]);

    const stats = await service.getSimilarSuccessStats({ chiefComplaint: '' });

    expect(stats.totalSimilarCases).toBe(0);
    expect(qb.getMany).not.toHaveBeenCalled();
  });

  it('치료 기간 필드가 없으므로 값을 지어내지 않는다', async () => {
    await setup([makeCase(TreatmentOutcome.CURED, '보중익기탕')]);

    const stats = await service.getSimilarSuccessStats({
      chiefComplaint: '소화불량',
    });

    expect(stats.averageTreatmentDuration).toBeNull();
  });
});
