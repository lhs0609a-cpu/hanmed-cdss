import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PatientInsightsService } from './patient-insights.service';
import {
  GetSymptomSummaryDto,
  PreVisitAnalysisDto,
  AdherenceReportDto,
} from './dto';

@ApiTags('Patient Insights')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('patient-insights')
export class PatientInsightsController {
  constructor(private readonly patientInsightsService: PatientInsightsService) {}

  /**
   * 환자 증상 트렌드 요약 조회
   */
  @Get('symptom-summary/:patientId')
  @ApiOperation({
    summary: '환자 증상 트렌드 요약',
    description: '환자의 증상 일지 데이터를 분석하여 트렌드를 제공합니다.',
  })
  @ApiParam({ name: 'patientId', description: '환자 ID' })
  @ApiQuery({ name: 'startDate', required: false, description: '시작 날짜 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: '종료 날짜 (YYYY-MM-DD)' })
  @ApiResponse({
    status: 200,
    description: '증상 트렌드 요약 조회 성공',
    schema: {
      example: {
        success: true,
        data: {
          patientId: 'uuid',
          period: { start: '2024-01-01', end: '2024-01-31' },
          totalEntries: 25,
          symptomTrends: [
            {
              name: '두통',
              currentSeverity: 4.5,
              previousSeverity: 6.2,
              changeRate: -27,
              trend: 'improving',
              dailyData: [],
            },
          ],
          overallStatus: 'improving',
          insights: ['두통 증상이 호전되고 있습니다.'],
        },
      },
    },
  })
  async getSymptomSummary(
    @Request() req: any,
    @Param('patientId') patientId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const result = await this.patientInsightsService.getPatientSymptomSummary(
      patientId,
      req.user.id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 진료 전 AI 사전 분석
   */
  @Get('pre-visit/:patientId')
  @ApiOperation({
    summary: '진료 전 AI 사전 분석',
    description: '다음 진료 전 환자 상태를 AI가 분석하여 제공합니다.',
  })
  @ApiParam({ name: 'patientId', description: '환자 ID' })
  @ApiQuery({ name: 'reservationId', required: false, description: '예약 ID' })
  @ApiResponse({
    status: 200,
    description: '사전 분석 조회 성공',
    schema: {
      example: {
        success: true,
        data: {
          patientId: 'uuid',
          lastVisitDate: '2024-01-15',
          daysSinceLastVisit: 14,
          recentSymptomSummary: {
            topSymptoms: [{ name: '두통', avgSeverity: 5.2, frequency: 12 }],
            newSymptoms: ['어지러움'],
            resolvedSymptoms: ['피로감'],
          },
          adherenceRate: 85,
          healthScoreChange: { current: 72, previous: 68, change: 4 },
          aiAnalysis: {
            summary: '전반적으로 호전 추세입니다.',
            focusAreas: ['신규 증상 평가'],
            suggestedQuestions: ['어지러움은 언제부터 시작되었나요?'],
          },
        },
      },
    },
  })
  async getPreVisitAnalysis(
    @Param('patientId') patientId: string,
    @Query('reservationId') reservationId?: string,
  ) {
    const result = await this.patientInsightsService.generatePreVisitAnalysis(
      patientId,
      reservationId,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 복약 순응도 리포트
   */
  @Get('adherence/:patientId')
  @ApiOperation({
    summary: '복약 순응도 리포트',
    description: '환자의 복약 순응도와 패턴을 분석합니다.',
  })
  @ApiParam({ name: 'patientId', description: '환자 ID' })
  @ApiQuery({ name: 'prescriptionId', required: false, description: '처방 ID' })
  @ApiResponse({
    status: 200,
    description: '복약 순응도 조회 성공',
    schema: {
      example: {
        success: true,
        data: {
          patientId: 'uuid',
          prescriptionId: null,
          adherenceRate: 78,
          medicationLog: {
            totalDoses: 90,
            takenDoses: 70,
            missedDoses: 20,
            skipReasons: [{ reason: '깜빡함', count: 12 }],
          },
          pattern: {
            bestTime: '아침',
            worstTime: '저녁',
            weekdayVsWeekend: { weekdayRate: 82, weekendRate: 65 },
          },
          suggestions: ['복약 시간에 알림을 설정하면 도움이 됩니다.'],
        },
      },
    },
  })
  async getAdherenceReport(
    @Param('patientId') patientId: string,
    @Query('prescriptionId') prescriptionId?: string,
  ) {
    const result = await this.patientInsightsService.getMedicationAdherenceReport(
      patientId,
      prescriptionId,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 환자 알림 조회
   */
  @Get('alerts/:patientId')
  @ApiOperation({
    summary: '환자 알림 조회',
    description: '특정 환자의 이상 징후 알림을 조회합니다.',
  })
  @ApiParam({ name: 'patientId', description: '환자 ID' })
  @ApiResponse({
    status: 200,
    description: '알림 조회 성공',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'alert-uuid',
            patientId: 'uuid',
            patientName: '홍길동',
            type: 'symptom_worsening',
            severity: 'high',
            message: '두통, 어지러움 증상이 악화되고 있습니다.',
            createdAt: '2024-01-31T10:00:00Z',
          },
        ],
      },
    },
  })
  async getPatientAlerts(@Param('patientId') patientId: string) {
    const result = await this.patientInsightsService.checkPatientAlerts(patientId);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 모든 환자 알림 조회 (한의사용)
   */
  @Get('alerts')
  @ApiOperation({
    summary: '모든 환자 알림 조회',
    description: '한의사의 모든 환자에 대한 이상 징후 알림을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '알림 목록 조회 성공',
  })
  async getAllPatientAlerts(@Request() req: any) {
    const result = await this.patientInsightsService.getAllPatientAlerts(req.user.id);

    return {
      success: true,
      data: result,
    };
  }
}
