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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PracticeAnalyticsService } from './practice-analytics.service';
import { AnalyticsEvent } from '../../database/entities/analytics-event.entity';
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

  constructor(
    private readonly analyticsService: PracticeAnalyticsService,
    @InjectRepository(AnalyticsEvent)
    private readonly eventRepository: Repository<AnalyticsEvent>,
  ) {}

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
   * 최근 활동 피드
   */
  @Get('recent-activity')
  @ApiOperation({ summary: '최근 활동 피드', description: '진료/처방 최근 활동 합산' })
  async getRecentActivity(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    const max = Math.min(50, Math.max(1, Number(limit) || 10));
    const result = await this.analyticsService.getRecentActivityFeed(req.user.id, max);
    return { success: true, data: result };
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

    try {
      const rows = events.map((e) =>
        this.eventRepository.create({
          type: e.type,
          properties: e.properties || {},
          userId: e.userId || null,
          userTier: e.userTier || null,
          sessionId: e.sessionId,
          userAgent: e.userAgent || null,
          screenSize: e.screenSize || null,
          locale: e.locale || null,
          occurredAt: e.timestamp ? new Date(e.timestamp) : null,
        }),
      );
      await this.eventRepository.save(rows, { chunk: 100 });
    } catch (error) {
      this.logger.error('이벤트 저장 실패:', error);
      // 분석 이벤트는 비크리티컬 - 실패해도 200 반환
    }

    return { success: true, received: events.length };
  }
}
