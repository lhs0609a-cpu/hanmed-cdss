import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationService, RecommendationRequest } from './recommendation.service';
import { LlmService } from './llm.service';
import { BodyHeat, BodyStrength } from '../../../database/entities/clinical-case.entity';

describe('RecommendationService', () => {
  let service: RecommendationService;
  let llmService: jest.Mocked<LlmService>;

  const mockLlmResponse = {
    analysis: '환자의 증상은 비위허한(脾胃虛寒)으로 분석됩니다.',
    recommendations: [
      {
        formula_name: '이중탕',
        confidence_score: 0.92,
        rationale: '비위를 따뜻하게 하고 소화기능을 강화합니다.',
        herbs: [
          { name: '인삼', amount: '6g', role: '군' },
          { name: '건강', amount: '6g', role: '신' },
          { name: '백출', amount: '6g', role: '좌' },
          { name: '감초', amount: '3g', role: '사' },
        ],
      },
      {
        formula_name: '보중익기탕',
        confidence_score: 0.85,
        rationale: '기운을 보충하고 비위 기능을 강화합니다.',
        herbs: [
          { name: '황기', amount: '9g', role: '군' },
          { name: '인삼', amount: '6g', role: '신' },
        ],
      },
    ],
    isAiGenerated: true,
    modelUsed: 'gpt-4o-mini',
  };

  beforeEach(async () => {
    const mockLlmService = {
      generateRecommendation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        { provide: LlmService, useValue: mockLlmService },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
    llmService = module.get(LlmService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecommendation', () => {
    const baseRequest: RecommendationRequest = {
      patientAge: 45,
      patientGender: 'male',
      chiefComplaint: '소화불량, 복부냉감',
      symptoms: [
        { name: '소화불량', severity: 7 },
        { name: '복부냉감', severity: 6 },
        { name: '피로', severity: 5 },
      ],
      bodyHeat: BodyHeat.COLD,
      bodyStrength: BodyStrength.DEFICIENT,
    };

    it('증상에 기반한 처방 추천을 반환해야 함', async () => {
      llmService.generateRecommendation.mockResolvedValue(mockLlmResponse);

      const result = await service.getRecommendation(baseRequest);

      expect(result.recommendations).toHaveLength(2);
      expect(result.recommendations[0].formula_name).toBe('이중탕');
      expect(result.isAiGenerated).toBe(true);
    });

    it('LLM 서비스에 올바른 환자 정보를 전달해야 함', async () => {
      llmService.generateRecommendation.mockResolvedValue(mockLlmResponse);

      await service.getRecommendation(baseRequest);

      expect(llmService.generateRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({
          age: baseRequest.patientAge,
          gender: baseRequest.patientGender,
          chiefComplaint: baseRequest.chiefComplaint,
          symptoms: baseRequest.symptoms,
          bodyHeat: BodyHeat.COLD,
          bodyStrength: BodyStrength.DEFICIENT,
        }),
      );
    });

    it('체열/근실도 정보가 없으면 경고를 포함해야 함', async () => {
      llmService.generateRecommendation.mockResolvedValue(mockLlmResponse);

      const requestWithoutConstitution: RecommendationRequest = {
        ...baseRequest,
        bodyHeat: undefined,
        bodyStrength: undefined,
      };

      const result = await service.getRecommendation(requestWithoutConstitution);

      expect(result.constitutionValidation).toBeDefined();
      expect(result.constitutionValidation!.warnings).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('체열'),
        }),
      );
      expect(result.constitutionValidation!.warnings).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('근실도'),
        }),
      );
    });

    it('체열만 없을 때도 경고를 포함해야 함', async () => {
      llmService.generateRecommendation.mockResolvedValue(mockLlmResponse);

      const requestWithoutHeat: RecommendationRequest = {
        ...baseRequest,
        bodyHeat: undefined,
      };

      const result = await service.getRecommendation(requestWithoutHeat);

      const warnings = result.constitutionValidation?.warnings || [];
      const heatWarning = warnings.find((w) => w.message.includes('체열'));
      const strengthWarning = warnings.find((w) => w.message.includes('근실도'));

      expect(heatWarning).toBeDefined();
      expect(strengthWarning).toBeUndefined();
    });

    it('근실도만 없을 때도 경고를 포함해야 함', async () => {
      llmService.generateRecommendation.mockResolvedValue(mockLlmResponse);

      const requestWithoutStrength: RecommendationRequest = {
        ...baseRequest,
        bodyStrength: undefined,
      };

      const result = await service.getRecommendation(requestWithoutStrength);

      const warnings = result.constitutionValidation?.warnings || [];
      const strengthWarning = warnings.find((w) => w.message.includes('근실도'));

      expect(strengthWarning).toBeDefined();
    });
  });

  describe('validateRecommendations (체열/근실도 검증)', () => {
    it('한증 환자에게 열성 처방 추천 시 경고해야 함', async () => {
      const coldPatientResponse = {
        ...mockLlmResponse,
        recommendations: [
          {
            formula_name: '황련해독탕', // 한량성 처방
            confidence_score: 0.9,
            rationale: '열을 내리는 처방',
            herbs: [],
          },
        ],
      };
      llmService.generateRecommendation.mockResolvedValue(coldPatientResponse);

      const coldPatientRequest: RecommendationRequest = {
        chiefComplaint: '복통',
        symptoms: [{ name: '복통', severity: 5 }],
        bodyHeat: BodyHeat.COLD, // 한증 환자
        bodyStrength: BodyStrength.DEFICIENT,
      };

      const result = await service.getRecommendation(coldPatientRequest);

      const warnings = result.constitutionValidation?.warnings || [];
      const heatMismatchWarning = warnings.find(
        (w) => w.formulaName === '황련해독탕' && w.type === 'critical',
      );

      expect(heatMismatchWarning).toBeDefined();
      expect(heatMismatchWarning?.reason).toContain('한');
    });

    it('열증 환자에게 온열 처방 추천 시 경고해야 함', async () => {
      const hotPatientResponse = {
        ...mockLlmResponse,
        recommendations: [
          {
            formula_name: '부자이중탕', // 열성 처방
            confidence_score: 0.88,
            rationale: '속을 따뜻하게',
            herbs: [],
          },
        ],
      };
      llmService.generateRecommendation.mockResolvedValue(hotPatientResponse);

      const hotPatientRequest: RecommendationRequest = {
        chiefComplaint: '구갈',
        symptoms: [{ name: '구갈', severity: 6 }],
        bodyHeat: BodyHeat.HOT, // 열증 환자
        bodyStrength: BodyStrength.EXCESS,
      };

      const result = await service.getRecommendation(hotPatientRequest);

      const warnings = result.constitutionValidation?.warnings || [];
      const heatMismatchWarning = warnings.find(
        (w) => w.formulaName === '부자이중탕' && w.type === 'critical',
      );

      expect(heatMismatchWarning).toBeDefined();
    });

    it('허증 환자에게 사법 처방 추천 시 경고해야 함', async () => {
      const deficientPatientResponse = {
        ...mockLlmResponse,
        recommendations: [
          {
            formula_name: '대승기탕', // 사법 처방
            confidence_score: 0.85,
            rationale: '통변',
            herbs: [],
          },
        ],
      };
      llmService.generateRecommendation.mockResolvedValue(deficientPatientResponse);

      const deficientPatientRequest: RecommendationRequest = {
        chiefComplaint: '변비',
        symptoms: [{ name: '변비', severity: 4 }],
        bodyHeat: BodyHeat.NEUTRAL,
        bodyStrength: BodyStrength.DEFICIENT, // 허증 환자
      };

      const result = await service.getRecommendation(deficientPatientRequest);

      const warnings = result.constitutionValidation?.warnings || [];
      const strengthMismatchWarning = warnings.find(
        (w) => w.formulaName === '대승기탕' && w.type === 'critical',
      );

      expect(strengthMismatchWarning).toBeDefined();
    });

    it('체열/근실도가 맞는 처방은 경고 없이 통과해야 함', async () => {
      const matchingResponse = {
        ...mockLlmResponse,
        recommendations: [
          {
            formula_name: '이중탕', // 온성, 보법
            confidence_score: 0.95,
            rationale: '비위허한에 적합',
            herbs: [],
          },
        ],
      };
      llmService.generateRecommendation.mockResolvedValue(matchingResponse);

      const matchingRequest: RecommendationRequest = {
        chiefComplaint: '소화불량',
        symptoms: [{ name: '소화불량', severity: 6 }],
        bodyHeat: BodyHeat.COLD, // 한증
        bodyStrength: BodyStrength.DEFICIENT, // 허증
      };

      const result = await service.getRecommendation(matchingRequest);

      const criticalWarnings = result.constitutionValidation?.warnings.filter(
        (w) => w.type === 'critical' && w.formulaName === '이중탕',
      );

      expect(criticalWarnings).toHaveLength(0);
    });
  });

  describe('에러 처리', () => {
    it('LLM 서비스 오류 시 에러를 전파해야 함', async () => {
      llmService.generateRecommendation.mockRejectedValue(new Error('LLM API 오류'));

      const request: RecommendationRequest = {
        chiefComplaint: '두통',
        symptoms: [{ name: '두통', severity: 5 }],
      };

      await expect(service.getRecommendation(request)).rejects.toThrow('LLM API 오류');
    });
  });
});
