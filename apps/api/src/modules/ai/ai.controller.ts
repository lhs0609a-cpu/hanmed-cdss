import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { RecommendationService } from './services/recommendation.service';
import { PatientExplanationService } from './services/patient-explanation.service';
import { CaseSearchService } from './services/case-search.service';
import {
  RecommendationRequestDto,
  CaseSearchRequestDto,
  RecordExplanationRequestDto,
  PrescriptionExplanationRequestDto,
  HerbExplanationRequestDto,
  HealthTipsRequestDto,
  MedicationReminderRequestDto,
} from './dto';

@ApiTags('AI')
@Controller('api/v1')
export class AiController {
  constructor(
    private recommendationService: RecommendationService,
    private patientExplanationService: PatientExplanationService,
    private caseSearchService: CaseSearchService,
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

  // ============ Health Check ============

  @Get('ai/health')
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
