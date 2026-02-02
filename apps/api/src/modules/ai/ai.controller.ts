import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { RecommendationService } from './services/recommendation.service';
import { PatientExplanationService } from './services/patient-explanation.service';
import { CaseSearchService } from './services/case-search.service';
import { HealthScoreCalculatorService } from './services/health-score-calculator.service';
import { ScientificRationaleService } from './services/scientific-rationale.service';
import { PharmacologyReportService } from './services/pharmacology-report.service';
import { TreatmentStatisticsService } from './services/treatment-statistics.service';
import { ComprehensiveReportService } from './services/comprehensive-report.service';
import {
  RecommendationRequestDto,
  CaseSearchRequestDto,
  RecordExplanationRequestDto,
  PrescriptionExplanationRequestDto,
  HerbExplanationRequestDto,
  HealthTipsRequestDto,
  MedicationReminderRequestDto,
  SimilarCaseStatsRequestDto,
  HealthScoreRequestDto,
  HealthScoreWithTrendRequestDto,
  ScientificRationaleRequestDto,
  QuickSummaryRequestDto,
  HerbEvidenceRequestDto,
  PharmacologyReportRequestDto,
  HerbPharmacologyRequestDto,
  CompoundTargetsRequestDto,
  SimilarPatientStatisticsRequestDto,
  FormulaStatisticsRequestDto,
  FormulaComparisonRequestDto,
  SymptomStatisticsRequestDto,
  ChartDataRequestDto,
  ComprehensiveReportRequestDto,
  GenerateReportHtmlRequestDto,
} from './dto';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private recommendationService: RecommendationService,
    private patientExplanationService: PatientExplanationService,
    private caseSearchService: CaseSearchService,
    private healthScoreCalculatorService: HealthScoreCalculatorService,
    private scientificRationaleService: ScientificRationaleService,
    private pharmacologyReportService: PharmacologyReportService,
    private treatmentStatisticsService: TreatmentStatisticsService,
    private comprehensiveReportService: ComprehensiveReportService,
  ) {}

  // ============ Recommendation Endpoints ============

  @Post('recommend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'AI 기반 처방 추천' })
  @ApiResponse({ status: 200, description: '처방 추천 성공' })
  async getRecommendation(@Body() request: RecommendationRequestDto) {
    const result = await this.recommendationService.getRecommendation({
      patientAge: request.patientAge,
      patientGender: request.patientGender,
      constitution: request.constitution,
      chiefComplaint: request.chiefComplaint,
      symptoms: request.symptoms,
      currentMedications: request.currentMedications,
      topK: request.topK,
    });

    return {
      success: true,
      data: result,
    };
  }

  // ============ Case Search Endpoints ============

  @Post('cases/search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '치험례 검색' })
  @ApiResponse({ status: 200, description: '검색 성공' })
  async searchCases(@Body() request: CaseSearchRequestDto) {
    const result = await this.caseSearchService.search({
      patientInfo: request.patientInfo || {},
      chiefComplaint: request.chiefComplaint,
      symptoms: request.symptoms || [],
      diagnosis: request.diagnosis,
      formula: request.formula,
      options: request.options,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Get('cases/list')
  @ApiOperation({ summary: '치험례 목록 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'constitution', required: false, type: String })
  async listCases(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('constitution') constitution?: string,
  ) {
    const result = await this.caseSearchService.listCases({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search,
      constitution,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Get('cases/stats')
  @ApiOperation({ summary: '치험례 통계' })
  async getCaseStats() {
    const result = await this.caseSearchService.getStatistics();

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 유사 환자 성공 사례 통계 (킬러 피처)
   * 환자 증상을 기반으로 유사 치험례의 치료 성공률을 분석
   */
  @Post('cases/similar-success-stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '유사 환자 성공 사례 통계',
    description: '입력한 증상과 유사한 치험례들의 치료 성공률과 효과적인 처방을 분석합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '유사 케이스 성공률 분석 결과',
    schema: {
      example: {
        success: true,
        data: {
          totalSimilarCases: 127,
          successRate: 85,
          outcomeBreakdown: { cured: 45, improved: 63, noChange: 15, worsened: 4 },
          averageTreatmentDuration: '2-4주',
          topSuccessfulFormulas: [
            { formulaName: '소요산', caseCount: 28, successRate: 89 },
          ],
          confidenceLevel: 'high',
          matchCriteria: ['주소증: "소화불량"', '증상 3개: 복통, 설사, 피로'],
        },
      },
    },
  })
  async getSimilarCaseSuccessStats(@Body() request: SimilarCaseStatsRequestDto) {
    const result = await this.caseSearchService.getSimilarCaseSuccessStats({
      chiefComplaint: request.chiefComplaint,
      symptoms: request.symptoms.map(s => ({ name: s.name, severity: s.severity })),
      diagnosis: request.diagnosis,
      bodyHeat: request.bodyHeat,
      bodyStrength: request.bodyStrength,
    });

    return {
      success: true,
      data: result,
    };
  }

  // ============ Patient Explanation Endpoints ============

  @Post('patient-explanation/record')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '진료 기록 설명' })
  async explainRecord(@Body() request: RecordExplanationRequestDto) {
    const result = await this.patientExplanationService.explainHealthRecord({
      visitDate: request.visitDate,
      chiefComplaint: request.chiefComplaint,
      symptoms: request.symptoms,
      diagnosis: request.diagnosis,
      treatment: request.treatment,
      patientInfo: request.patientInfo,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Post('patient-explanation/prescription')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '처방 설명' })
  async explainPrescription(@Body() request: PrescriptionExplanationRequestDto) {
    const result = await this.patientExplanationService.explainPrescription({
      formulaName: request.formulaName,
      herbs: request.herbs,
      dosageInstructions: request.dosageInstructions,
      purpose: request.purpose,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Post('patient-explanation/herb')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '약재 설명' })
  async explainHerb(@Body() request: HerbExplanationRequestDto) {
    const result = await this.patientExplanationService.explainHerb({
      name: request.name,
      category: request.category,
      efficacy: request.efficacy,
      usage: request.usage,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Post('patient-explanation/health-tips')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '건강 팁 생성' })
  async generateHealthTips(@Body() request: HealthTipsRequestDto) {
    const result = await this.patientExplanationService.generateHealthTips({
      constitution: request.constitution,
      mainSymptoms: request.mainSymptoms,
      currentPrescription: request.currentPrescription,
      season: request.season,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Post('patient-explanation/medication-reminder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '복약 알림 메시지 생성' })
  async generateMedicationReminder(@Body() request: MedicationReminderRequestDto) {
    const result = await this.patientExplanationService.generateMedicationReminder({
      prescriptionName: request.prescriptionName,
      timeOfDay: request.timeOfDay,
      patientName: request.patientName,
    });

    return {
      success: true,
      data: result,
    };
  }

  // ============ Health Score Endpoints ============

  /**
   * 환자 건강 점수 계산
   * 체열, 근실도, 장부 기능, 종합 건강 지수를 계산합니다.
   */
  @Post('patient-health/score')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '환자 건강 점수 계산',
    description: '환자 데이터를 기반으로 체열, 근실도, 장부 기능 점수 및 종합 건강 지수를 계산합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '건강 점수 계산 성공',
    schema: {
      example: {
        success: true,
        data: {
          bodyHeatScore: -3.5,
          bodyHeatInterpretation: {
            traditional: '한증(寒證): 양기가 부족하여 몸이 찬 편입니다.',
            modern: '말초순환 저하, 대사율 감소 경향이 있습니다.',
            relatedSymptoms: ['손발 차가움', '찬 것 싫어함'],
            recommendations: ['따뜻한 음식 섭취', '보온 주의'],
          },
          bodyStrengthScore: -2.0,
          circulationScore: 65,
          organFunctionScores: {
            spleen: 62,
            lung: 75,
            kidney: 68,
            liver: 70,
            heart: 72,
          },
          overallHealthIndex: 68,
          overallInterpretation: '양호한 상태이나 일부 개선이 필요합니다.',
          confidenceLevel: 0.75,
          trend: {
            changeFromLast: 5.2,
            direction: 'improving',
            interpretation: '이전 대비 5.2점 상승했습니다. 건강 상태가 호전되고 있습니다.',
          },
        },
      },
    },
  })
  async calculateHealthScore(@Body() request: HealthScoreWithTrendRequestDto) {
    const result = await this.healthScoreCalculatorService.calculateHealthScore({
      patientId: request.patientId,
      patientRecordId: request.patientRecordId,
      symptoms: request.symptoms.map(s => ({
        name: s.name,
        severity: s.severity,
        duration: s.duration,
      })),
      diagnosis: request.diagnosis,
      patternDiagnosis: request.patternDiagnosis,
      constitution: request.constitution,
      bodyHeat: request.bodyHeat,
      bodyStrength: request.bodyStrength,
      bodyHeatScore: request.bodyHeatScore,
      bodyStrengthScore: request.bodyStrengthScore,
      vitalSigns: request.vitalSigns,
      previousScore: request.previousScore ? {
        overallHealthIndex: request.previousScore.overallHealthIndex,
        evaluatedAt: new Date(request.previousScore.evaluatedAt),
      } : undefined,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 건강 점수 해석 가이드
   * 각 점수 범위의 의미와 해석 방법을 제공합니다.
   */
  @Public()
  @Get('patient-health/score-guide')
  @ApiOperation({
    summary: '건강 점수 해석 가이드',
    description: '체열, 근실도, 장부 기능 점수의 범위와 의미를 설명합니다.',
  })
  @ApiResponse({ status: 200, description: '점수 해석 가이드' })
  async getHealthScoreGuide() {
    return {
      success: true,
      data: {
        bodyHeatScore: {
          range: [-10, 10],
          description: '체열 점수 (寒熱)',
          levels: [
            { range: [-10, -7], label: '극한(極寒)', description: '극심한 대사 저하, 사지냉증, 설사 경향' },
            { range: [-6, -3], label: '한(寒)', description: '찬 것 싫어함, 따뜻한 것 선호' },
            { range: [-2, 2], label: '평(平)', description: '한열 균형 상태' },
            { range: [3, 6], label: '열(熱)', description: '더운 것 싫어함, 찬 것 선호' },
            { range: [7, 10], label: '극열(極熱)', description: '심한 염증 반응, 갈증, 구건' },
          ],
          modernInterpretation: {
            cold: '기초대사율 저하, 말초순환 장애, 갑상선 기능 저하 가능성',
            hot: '염증 반응 활성, 교감신경 항진, 대사 항진',
          },
        },
        bodyStrengthScore: {
          range: [-10, 10],
          description: '근실도 점수 (虛實)',
          levels: [
            { range: [-10, -7], label: '극허(極虛)', description: '극심한 기력 저하, 무력감' },
            { range: [-6, -3], label: '허(虛)', description: '피로감, 소화력 약함' },
            { range: [-2, 2], label: '평(平)', description: '허실 균형 상태' },
            { range: [3, 6], label: '실(實)', description: '체력 충만, 울체 경향' },
            { range: [7, 10], label: '극실(極實)', description: '과잉/정체/울체' },
          ],
          modernInterpretation: {
            deficient: '면역력 저하, 에너지 결핍, 피로 증후군',
            excess: '대사산물 축적, 울혈, 자율신경 불균형',
          },
        },
        organFunctionScores: {
          range: [0, 100],
          organs: {
            spleen: { name: '비위(脾胃)', function: '소화 기능' },
            lung: { name: '폐(肺)', function: '호흡/면역 기능' },
            kidney: { name: '신(腎)', function: '신장/생식/골격 기능' },
            liver: { name: '간(肝)', function: '간/해독/근육 기능' },
            heart: { name: '심(心)', function: '심장/순환/정신 기능' },
          },
          levels: [
            { range: [80, 100], label: '양호', description: '기능이 정상적입니다.' },
            { range: [60, 79], label: '경미한 저하', description: '약간의 관리가 필요합니다.' },
            { range: [40, 59], label: '중등도 저하', description: '적극적인 관리가 필요합니다.' },
            { range: [0, 39], label: '심각한 저하', description: '전문적인 치료가 필요합니다.' },
          ],
        },
        overallHealthIndex: {
          range: [0, 100],
          description: '종합 건강 지수',
          levels: [
            { range: [80, 100], label: '건강', description: '전반적으로 건강한 상태입니다.' },
            { range: [60, 79], label: '양호', description: '양호하나 일부 개선이 필요합니다.' },
            { range: [40, 59], label: '관리 필요', description: '건강 관리가 필요한 상태입니다.' },
            { range: [0, 39], label: '주의', description: '전문적인 진료와 치료가 필요합니다.' },
          ],
        },
      },
    };
  }

  // ============ Scientific Rationale Endpoints ============

  /**
   * 과학적 처방 근거 생성
   * 전통의학 + 현대약리학 + 통계적 근거를 통합 제공
   */
  @Post('scientific-rationale/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '과학적 처방 근거 생성',
    description: '처방에 대한 전통의학, 현대약리학, 통계적 근거를 종합하여 제공합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '과학적 근거 생성 성공',
    schema: {
      example: {
        success: true,
        data: {
          formulaName: '보중익기탕',
          summary: {
            oneLiner: '기력을 보충하고 비위를 튼튼하게 하는 대표 처방',
            patientFriendlyExplanation: '몸의 기운을 북돋아주는 처방입니다.',
            keyPoints: ['비위 기능 강화', '면역력 증진', '피로 개선'],
          },
          traditionalEvidence: {
            treatmentMethods: [{ name: '보기익기법', description: '기운을 보충하는 치료법' }],
          },
          modernPharmacologicalEvidence: {
            molecularTargets: [{ name: 'AMPK', action: 'activation', effect: '에너지 대사 증진' }],
          },
          statisticalEvidence: {
            overallEvidenceLevel: 'B',
            clinicalStudies: [{ title: '보중익기탕의 면역증강 효과', year: 2023 }],
          },
        },
      },
    },
  })
  async generateScientificRationale(@Body() request: ScientificRationaleRequestDto) {
    const result = await this.scientificRationaleService.generateScientificRationale({
      formulaNameOrId: request.formulaNameOrId,
      herbs: request.herbs,
      patientContext: request.patientContext,
      detailLevel: request.detailLevel,
      includeEvidence: request.includeEvidence,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 처방 근거 빠른 요약
   */
  @Post('scientific-rationale/quick-summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '처방 근거 빠른 요약',
    description: '처방에 대한 간략한 과학적 근거 요약을 제공합니다.',
  })
  async getQuickSummary(@Body() request: QuickSummaryRequestDto) {
    const result = await this.scientificRationaleService.generateQuickSummary(
      request.formulaName,
      request.herbs
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 약재별 과학적 근거 조회
   */
  @Post('scientific-rationale/herb-evidence')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '약재 과학적 근거 조회',
    description: '개별 약재에 대한 전통의학 및 현대약리학 근거를 제공합니다.',
  })
  async getHerbEvidence(@Body() request: HerbEvidenceRequestDto) {
    const result = await this.scientificRationaleService.getHerbScientificEvidence(
      request.herbName
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 근거 수준 가이드
   */
  @Public()
  @Get('scientific-rationale/evidence-levels')
  @ApiOperation({
    summary: '근거 수준 가이드',
    description: 'A/B/C/D 근거 수준의 정의와 해석 방법을 제공합니다.',
  })
  async getEvidenceLevelGuide() {
    return {
      success: true,
      data: {
        levels: {
          A: {
            label: '강한 근거',
            description: '잘 설계된 무작위 대조 시험(RCT) 또는 메타분석에서 일관된 결과',
            reliability: '높음',
            examples: ['대규모 RCT', '체계적 문헌고찰', 'Cochrane 리뷰'],
          },
          B: {
            label: '중등도 근거',
            description: 'RCT 1개 또는 잘 설계된 비무작위 연구에서 도출된 결과',
            reliability: '중간',
            examples: ['소규모 RCT', '코호트 연구', '환자-대조군 연구'],
          },
          C: {
            label: '약한 근거',
            description: '관찰 연구, 증례 보고, 또는 전문가 의견에 기반',
            reliability: '낮음',
            examples: ['증례 시리즈', '전문가 합의', '임상 경험'],
          },
          D: {
            label: '매우 약한 근거',
            description: '전임상 연구(시험관/동물 실험) 또는 이론적 근거만 존재',
            reliability: '매우 낮음',
            examples: ['동물 실험', '시험관 연구', '전통의학 문헌'],
          },
        },
        interpretation: {
          patientGuidance: '근거 수준이 낮더라도 오랜 임상 경험에 기반한 전통의학의 가치를 부정하지 않습니다. 다만, 현대 과학적 검증의 정도를 나타내는 지표입니다.',
          clinicalDecision: '근거 수준은 치료 결정의 참고 자료일 뿐, 개인의 상태와 전문가의 판단이 더 중요합니다.',
        },
      },
    };
  }

  // ============ Pharmacology Report Endpoints ============

  /**
   * 약리 기전 보고서 생성
   * 약재/처방의 분자 수준 작용 기전을 분석
   */
  @Post('pharmacology/report')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '약리 기전 보고서 생성',
    description: '약재/처방의 활성 성분, 분자 타겟, 신호전달경로, ADME를 분석하여 약리 기전 보고서를 생성합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '약리 기전 보고서 생성 성공',
    schema: {
      example: {
        success: true,
        data: {
          title: '보중익기탕 약리 기전 보고서',
          herbs: [
            {
              name: '인삼',
              activeCompounds: [
                {
                  name: 'Ginsenoside Rb1',
                  nameKo: '진세노사이드 Rb1',
                  targets: [
                    { name: 'AMPK', action: 'activation', effect: '에너지 대사 촉진' },
                  ],
                },
              ],
            },
          ],
          mechanismFlowchart: {
            nodes: [
              { id: 'herb_1', type: 'herb', label: '인삼' },
              { id: 'compound_1', type: 'compound', label: 'Ginsenoside Rb1' },
              { id: 'target_1', type: 'target', label: 'AMPK' },
              { id: 'effect_1', type: 'effect', label: '에너지 대사 촉진' },
            ],
            edges: [
              { source: 'herb_1', target: 'compound_1' },
              { source: 'compound_1', target: 'target_1', type: 'activation' },
              { source: 'target_1', target: 'effect_1' },
            ],
          },
          patientSummary: {
            oneLiner: '보중익기탕의 약리학적 작용 기전 분석',
            howItWorks: '인삼의 진세노사이드가 AMPK를 활성화하여 에너지 대사를 촉진합니다.',
          },
          overallEvidenceLevel: 'B',
        },
      },
    },
  })
  async generatePharmacologyReport(@Body() request: PharmacologyReportRequestDto) {
    const result = await this.pharmacologyReportService.generatePharmacologyReport({
      herbs: request.herbs,
      formulaName: request.formulaName,
      detailLevel: request.detailLevel,
      includeSections: request.includeSections,
      patientContext: request.patientContext,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 특정 약재의 약리 정보 조회
   */
  @Post('pharmacology/herb')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '약재 약리 정보 조회',
    description: '특정 약재의 활성 성분, 분자 타겟, 약리 작용 정보를 조회합니다.',
  })
  async getHerbPharmacology(@Body() request: HerbPharmacologyRequestDto) {
    const result = await this.pharmacologyReportService.getHerbPharmacology(request.herbName);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 특정 성분의 분자 타겟 조회
   */
  @Post('pharmacology/compound-targets')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '성분 분자 타겟 조회',
    description: '특정 활성 성분의 분자 타겟 정보를 조회합니다.',
  })
  async getCompoundTargets(@Body() request: CompoundTargetsRequestDto) {
    const result = await this.pharmacologyReportService.getCompoundTargets(request.compoundName);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 약리 작용 타입 가이드
   */
  @Public()
  @Get('pharmacology/action-types')
  @ApiOperation({
    summary: '약리 작용 타입 가이드',
    description: '약리 작용 유형 (항염증, 항산화 등)의 정의와 설명을 제공합니다.',
  })
  async getPharmacologicalActionTypes() {
    return {
      success: true,
      data: {
        actionTypes: {
          anti_inflammatory: { label: '항염증', description: '염증 반응을 억제하는 작용' },
          antioxidant: { label: '항산화', description: '활성산소를 제거하고 산화 스트레스를 감소시키는 작용' },
          immunomodulatory: { label: '면역조절', description: '면역 기능을 조절하는 작용' },
          metabolic_regulation: { label: '대사조절', description: '에너지 대사를 조절하는 작용' },
          neuroprotective: { label: '신경보호', description: '신경세포를 보호하는 작용' },
          cardioprotective: { label: '심혈관보호', description: '심장과 혈관을 보호하는 작용' },
          hepatoprotective: { label: '간보호', description: '간세포를 보호하는 작용' },
          gastroprotective: { label: '위장보호', description: '위장 점막을 보호하는 작용' },
          antimicrobial: { label: '항균', description: '세균의 성장을 억제하는 작용' },
          antiviral: { label: '항바이러스', description: '바이러스의 복제를 억제하는 작용' },
          anticancer: { label: '항암', description: '암세포의 성장을 억제하는 작용' },
          analgesic: { label: '진통', description: '통증을 감소시키는 작용' },
          sedative: { label: '진정', description: '중추신경을 진정시키는 작용' },
          adaptogenic: { label: '적응원성', description: '스트레스에 대한 적응력을 높이는 작용' },
        },
        targetTypes: {
          enzyme: { label: '효소', description: '화학 반응을 촉매하는 단백질' },
          receptor: { label: '수용체', description: '신호 분자와 결합하는 단백질' },
          channel: { label: '이온채널', description: '세포막의 이온 통과 통로' },
          transporter: { label: '수송체', description: '물질을 세포 안팎으로 운반하는 단백질' },
          transcription_factor: { label: '전사인자', description: '유전자 발현을 조절하는 단백질' },
        },
        actionModalities: {
          activation: { label: '활성화', description: '타겟의 기능을 증가시킴' },
          inhibition: { label: '억제', description: '타겟의 기능을 감소시킴' },
          modulation: { label: '조절', description: '타겟의 기능을 양방향으로 조절' },
        },
      },
    };
  }

  // ============ Treatment Statistics Endpoints ============

  /**
   * 유사 환자 통계 조회
   * 환자 정보를 기반으로 유사한 케이스들의 통계를 분석
   */
  @Post('statistics/similar-patients')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '유사 환자 통계 조회',
    description: '환자 정보를 기반으로 유사한 케이스들의 치료 성공률, 효과적인 처방, 예후 예측을 제공합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '유사 환자 통계 조회 성공',
    schema: {
      example: {
        success: true,
        data: {
          totalSimilarPatients: 127,
          overallSuccessRate: 85,
          outcomeDistribution: { cured: 19, markedlyImproved: 32, improved: 57, noChange: 15, worsened: 4 },
          averageTreatmentDuration: '2-4주',
          topEffectiveFormulas: [
            { rank: 1, formulaName: '보중익기탕', caseCount: 28, successRate: 89 },
          ],
          prognosisPrediction: {
            expectedOutcome: '호전',
            confidence: 0.8,
            timeToImprovement: '2-3주',
          },
          confidenceLevel: 'high',
        },
      },
    },
  })
  async getSimilarPatientStatistics(@Body() request: SimilarPatientStatisticsRequestDto) {
    const result = await this.treatmentStatisticsService.getSimilarPatientStatistics({
      chiefComplaint: request.chiefComplaint,
      symptoms: request.symptoms.map(s => ({ name: s.name, severity: s.severity })),
      diagnosis: request.diagnosis,
      bodyHeat: request.bodyHeat,
      bodyStrength: request.bodyStrength,
      age: request.age,
      gender: request.gender,
      constitution: request.constitution,
      formulaFilter: request.formulaFilter,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 처방별 상세 통계
   */
  @Post('statistics/formula')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '처방별 상세 통계',
    description: '특정 처방의 성공률, 결과 분포, 적응증 등 상세 통계를 조회합니다.',
  })
  async getFormulaStatistics(@Body() request: FormulaStatisticsRequestDto) {
    const result = await this.treatmentStatisticsService.getFormulaStatistics(request.formulaName);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 처방 효과 비교
   */
  @Post('statistics/compare-formulas')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '처방 효과 비교',
    description: '여러 처방의 효과를 비교 분석합니다.',
  })
  async compareFormulas(@Body() request: FormulaComparisonRequestDto) {
    const result = await this.treatmentStatisticsService.compareFormulas({
      formulas: request.formulas,
      indicationFilter: request.indicationFilter,
      constitutionFilter: request.constitutionFilter,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 증상별 통계
   */
  @Post('statistics/symptom')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '증상별 통계',
    description: '특정 증상에 대한 치료 통계 및 효과적인 처방을 조회합니다.',
  })
  async getSymptomStatistics(@Body() request: SymptomStatisticsRequestDto) {
    const result = await this.treatmentStatisticsService.getSymptomStatistics(request.symptomName);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 인구통계학적 통계
   */
  @Get('statistics/demographics')
  @ApiOperation({
    summary: '인구통계학적 통계',
    description: '연령대별, 성별, 체질별, 체열/근실도별 치료 통계를 조회합니다.',
  })
  async getDemographicStatistics() {
    const result = await this.treatmentStatisticsService.getDemographicStatistics();

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 종합 치료 통계
   */
  @Get('statistics/comprehensive')
  @ApiOperation({
    summary: '종합 치료 통계',
    description: '전체 치험례 데이터베이스의 종합 통계를 조회합니다.',
  })
  async getComprehensiveStatistics() {
    const result = await this.treatmentStatisticsService.getComprehensiveStatistics();

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 통계 차트 데이터
   */
  @Post('statistics/chart-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '통계 차트 데이터',
    description: '특정 유형의 차트 데이터를 조회합니다.',
  })
  async getChartData(@Body() request: ChartDataRequestDto) {
    const result = await this.treatmentStatisticsService.getChartData(request.chartType);

    return {
      success: true,
      data: result,
    };
  }

  // ============ Comprehensive Report Endpoints ============

  /**
   * 종합 환자 보고서 생성
   * 건강 점수, 처방 근거, 약리 기전, 통계 데이터를 통합한 보고서
   */
  @Post('report/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '종합 환자 보고서 생성',
    description: '건강 점수, 처방 근거, 약리 기전, 통계 데이터를 통합한 종합 환자 보고서를 생성합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '종합 보고서 생성 성공',
    schema: {
      example: {
        success: true,
        data: {
          reportId: 'uuid',
          title: '환자님의 과학적 진료 보고서',
          healthScore: { overallHealthIndex: 72, bodyHeatScore: -2, bodyStrengthScore: -1 },
          prescription: { formulaName: '보중익기탕', herbs: [] },
          scientificEvidence: { overallEvidenceLevel: 'B', statisticalEvidence: { successRate: 85 } },
          prognosis: { expectedOutcome: '호전', expectedDuration: '2-4주' },
          executiveSummary: { oneLiner: '요약...', keyPoints: [] },
        },
      },
    },
  })
  async generateComprehensiveReport(@Body() request: ComprehensiveReportRequestDto) {
    const result = await this.comprehensiveReportService.generateComprehensiveReport({
      patientId: request.patientId,
      patientRecordId: request.patientRecordId,
      patientInfo: request.patientInfo,
      consultationInfo: {
        date: request.consultationInfo.date,
        chiefComplaint: request.consultationInfo.chiefComplaint,
        symptoms: request.consultationInfo.symptoms.map(s => ({
          name: s.name,
          severity: s.severity,
          duration: s.duration,
        })),
        diagnosis: request.consultationInfo.diagnosis,
        patternDiagnosis: request.consultationInfo.patternDiagnosis,
      },
      healthScore: request.healthScore,
      prescription: {
        formulaName: request.prescription.formulaName,
        formulaHanja: request.prescription.formulaHanja,
        herbs: request.prescription.herbs,
        dosageInstructions: request.prescription.dosageInstructions,
      },
      includeSections: request.includeSections,
      reportType: request.reportType,
      detailLevel: request.detailLevel,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 종합 보고서 HTML 생성
   * PDF 변환 또는 웹뷰 표시용 HTML 출력
   */
  @Post('report/generate-html')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '종합 보고서 HTML 생성',
    description: 'PDF 변환 또는 웹뷰 표시를 위한 HTML 형식의 보고서를 생성합니다.',
  })
  @ApiResponse({
    status: 200,
    description: 'HTML 보고서 생성 성공',
    schema: {
      example: {
        success: true,
        data: {
          html: '<!DOCTYPE html>...',
          reportId: 'uuid',
        },
      },
    },
  })
  async generateReportHtml(@Body() request: GenerateReportHtmlRequestDto) {
    const report = await this.comprehensiveReportService.generateComprehensiveReport({
      patientId: request.patientId,
      patientRecordId: request.patientRecordId,
      patientInfo: request.patientInfo,
      consultationInfo: {
        date: request.consultationInfo.date,
        chiefComplaint: request.consultationInfo.chiefComplaint,
        symptoms: request.consultationInfo.symptoms.map(s => ({
          name: s.name,
          severity: s.severity,
          duration: s.duration,
        })),
        diagnosis: request.consultationInfo.diagnosis,
        patternDiagnosis: request.consultationInfo.patternDiagnosis,
      },
      healthScore: request.healthScore,
      prescription: {
        formulaName: request.prescription.formulaName,
        formulaHanja: request.prescription.formulaHanja,
        herbs: request.prescription.herbs,
        dosageInstructions: request.prescription.dosageInstructions,
      },
      includeSections: request.includeSections,
      reportType: request.reportType,
      detailLevel: request.detailLevel,
    });

    const html = await this.comprehensiveReportService.generateReportHtml(report, request.htmlOptions);

    return {
      success: true,
      data: {
        html,
        reportId: report.reportId,
      },
    };
  }

  // ============ Health Check ============

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'AI 서비스 상태 확인' })
  async healthCheck() {
    return {
      success: true,
      data: {
        status: 'healthy',
        service: 'ai-engine-integrated',
        version: '1.0.0',
      },
    };
  }
}
