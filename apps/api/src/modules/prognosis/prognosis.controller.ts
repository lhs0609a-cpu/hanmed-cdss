import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrognosisService } from './prognosis.service';
import {
  PredictPrognosisDto,
  SimilarCaseStatisticsDto,
  RecordActualOutcomeDto,
} from './dto';

@ApiTags('Prognosis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prognosis')
export class PrognosisController {
  constructor(private readonly prognosisService: PrognosisService) {}

  /**
   * 예후 예측 생성
   */
  @Post('predict/:recordId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '예후 예측 생성',
    description: '진료 기록을 기반으로 AI 예후 예측을 생성합니다.',
  })
  @ApiParam({ name: 'recordId', description: '진료 기록 ID' })
  @ApiResponse({
    status: 200,
    description: '예후 예측 성공',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          recordId: 'uuid',
          patientId: 'uuid',
          prediction: {
            expectedDuration: { optimistic: 14, typical: 21, conservative: 35 },
            improvementRate: { week1: 20, week2: 45, week4: 70, week8: 90 },
            confidenceScore: 0.78,
            relapseProbability: 0.15,
            factors: [
              { factor: '젊은 연령', impact: 'positive', weight: 0.3 },
            ],
          },
          evidence: {
            similarCases: 127,
            avgOutcome: 78.5,
            dataSource: 'clinical_cases',
            modelVersion: '1.0.0',
          },
          createdAt: '2024-01-01T00:00:00Z',
        },
      },
    },
  })
  async predictPrognosis(@Param('recordId') recordId: string) {
    const result = await this.prognosisService.predictPrognosis(recordId);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 예측 결과 조회
   */
  @Get(':predictionId')
  @ApiOperation({
    summary: '예측 결과 조회',
    description: '예측 ID로 예후 예측 결과를 조회합니다.',
  })
  @ApiParam({ name: 'predictionId', description: '예측 ID' })
  @ApiResponse({ status: 200, description: '예측 결과 조회 성공' })
  async getPrediction(@Param('predictionId') predictionId: string) {
    const result = await this.prognosisService.getPrediction(predictionId);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 진료 기록의 예측 조회
   */
  @Get('record/:recordId')
  @ApiOperation({
    summary: '진료 기록의 예측 조회',
    description: '진료 기록 ID로 해당 기록의 예후 예측을 조회합니다.',
  })
  @ApiParam({ name: 'recordId', description: '진료 기록 ID' })
  @ApiResponse({ status: 200, description: '예측 결과 조회 성공' })
  async getPredictionByRecord(@Param('recordId') recordId: string) {
    const result = await this.prognosisService.getPredictionByRecord(recordId);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 유사 케이스 통계 조회
   */
  @Post('similar-cases')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '유사 케이스 통계 조회',
    description: '증상, 체질, 처방 기반으로 유사 케이스 통계를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '유사 케이스 통계 조회 성공',
    schema: {
      example: {
        success: true,
        data: {
          totalCases: 127,
          avgDuration: 21,
          avgImprovementRate: 78,
          topFormulas: [
            { name: '보중익기탕', count: 28, successRate: 89 },
          ],
          outcomeDistribution: {
            cured: 45,
            improved: 63,
            noChange: 15,
            worsened: 4,
          },
        },
      },
    },
  })
  async getSimilarCaseStatistics(@Body() dto: SimilarCaseStatisticsDto) {
    const result = await this.prognosisService.getSimilarCaseStatistics(
      dto.symptoms,
      dto.constitution,
      dto.formula,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 실제 결과 기록
   */
  @Post(':predictionId/outcome')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '실제 결과 기록',
    description: '예측에 대한 실제 치료 결과를 기록합니다. (학습 데이터로 활용)',
  })
  @ApiParam({ name: 'predictionId', description: '예측 ID' })
  @ApiResponse({ status: 200, description: '실제 결과 기록 성공' })
  async recordActualOutcome(
    @Param('predictionId') predictionId: string,
    @Body() dto: RecordActualOutcomeDto,
  ) {
    const result = await this.prognosisService.recordActualOutcome(predictionId, {
      actualDuration: dto.actualDuration,
      actualImprovement: dto.actualImprovement,
      notes: dto.notes,
    });
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 예후 리포트 데이터 조회
   */
  @Get(':predictionId/report')
  @ApiOperation({
    summary: '예후 리포트 데이터 조회',
    description: '예후 예측 리포트용 데이터를 조회합니다.',
  })
  @ApiParam({ name: 'predictionId', description: '예측 ID' })
  @ApiResponse({ status: 200, description: '리포트 데이터 조회 성공' })
  async getPrognosisReport(@Param('predictionId') predictionId: string) {
    const result = await this.prognosisService.generatePrognosisReportData(predictionId);
    return {
      success: true,
      data: result,
    };
  }
}
