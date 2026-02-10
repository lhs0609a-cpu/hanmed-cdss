import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Res,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PracticeAnalyticsService } from './practice-analytics.service';
import { PeriodType } from './dto';

// 이벤트 타입 정의
interface TrackedEvent {
  type: string;
  properties: Record<string, unknown>;
  timestamp: string;
  sessionId: string;
  userId?: string;
  userTier?: string;
  userAgent: string;
  screenSize: string;
  locale: string;
}

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: PracticeAnalyticsService) {}

  /**
   * 대시보드 요약 데이터
   */
  @Get('dashboard')
  @ApiOperation({
    summary: '대시보드 요약',
    description: '한의사의 진료 성과 대시보드 데이터를 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '대시보드 데이터 조회 성공' })
  async getDashboard(@Request() req: any) {
    const result = await this.analyticsService.getDashboardData(req.user.id);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 기간별 통계 조회
   */
  @Get('statistics')
  @ApiOperation({
    summary: '기간별 통계',
    description: '지정된 기간의 진료 통계를 조회합니다.',
  })
  @ApiQuery({ name: 'period', enum: PeriodType, description: '기간 타입' })
  @ApiQuery({ name: 'startDate', description: '시작 날짜 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', description: '종료 날짜 (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: '통계 조회 성공' })
  async getStatistics(
    @Request() req: any,
    @Query('period') period: 'daily' | 'weekly' | 'monthly',
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const result = await this.analyticsService.getStatistics(
      req.user.id,
      period,
      new Date(startDate),
      new Date(endDate),
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 벤치마크 비교
   */
  @Get('benchmark')
  @ApiOperation({
    summary: '벤치마크 비교',
    description: '전국 평균 대비 나의 성과를 비교합니다.',
  })
  @ApiResponse({ status: 200, description: '벤치마크 조회 성공' })
  async getBenchmark(@Request() req: any) {
    const result = await this.analyticsService.getBenchmark(req.user.id);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 처방 패턴 분석
   */
  @Get('patterns')
  @ApiOperation({
    summary: '처방 패턴 분석',
    description: '자주 사용하는 처방, 증상, 체질 분포를 분석합니다.',
  })
  @ApiResponse({ status: 200, description: '패턴 분석 조회 성공' })
  async getPrescriptionPatterns(@Request() req: any) {
    const result = await this.analyticsService.getPrescriptionPatterns(req.user.id);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 세금 리포트 데이터
   */
  @Get('export/tax-report')
  @ApiOperation({
    summary: '세금 신고용 리포트',
    description: '연간 진료 통계 리포트를 생성합니다.',
  })
  @ApiQuery({ name: 'year', type: Number, description: '년도' })
  @ApiResponse({ status: 200, description: '세금 리포트 생성 성공' })
  async getTaxReport(
    @Request() req: any,
    @Query('year') year: number,
  ) {
    const result = await this.analyticsService.generateTaxReportData(
      req.user.id,
      Number(year),
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 클라이언트 이벤트 수집
   * 사용자 행동 분석용 이벤트를 배치로 수집합니다.
   */
  @Post('events')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '이벤트 수집',
    description: '클라이언트에서 발생한 사용자 이벤트를 배치로 수집합니다.',
  })
  async collectEvents(@Body() body: { events: TrackedEvent[] }) {
    const { events } = body;

    if (!events || !Array.isArray(events)) {
      return { success: false, message: 'Invalid events format' };
    }

    // 이벤트 처리 (비동기, 실패해도 무시)
    // 실제 프로덕션에서는 Kafka, Redis Queue 등으로 비동기 처리 권장
    try {
      // 간단한 로깅 (개발 환경)
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(`이벤트 수신: ${events.length}건`);
        events.forEach((e) => {
          this.logger.debug(`  - ${e.type}: ${JSON.stringify(e.properties)}`);
        });
      }

      // TODO: 이벤트 저장 로직 구현
      // - Elasticsearch로 전송
      // - 또는 TimescaleDB에 저장
      // - 또는 Google Analytics / Mixpanel로 전달

      // 현재는 집계용 카운터만 업데이트 (메모리 내)
      // 실제로는 DB나 외부 서비스에 저장해야 함
    } catch (error) {
      this.logger.error('이벤트 처리 실패:', error);
      // 실패해도 클라이언트에는 성공 반환 (분석 데이터는 크리티컬하지 않음)
    }

    return { success: true, received: events.length };
  }
}
