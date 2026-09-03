import { Controller, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AdminOnly, SupportOnly } from '../../../common/decorators/roles.decorator';
import { AdminOpsService } from '../services/admin-ops.service';

/**
 * 운영 지표와 오류.
 *
 * 기존 admin/dashboard 는 건수를 센다. 여기는 "살아 있나·돈이 들어오나·
 * 무엇이 깨졌나" 에 답하는 쪽이다. 나누는 이유는 화면이 다르기 때문이 아니라,
 * 이쪽 질의가 무겁고 캐시·권한을 따로 걸어야 하기 때문이다.
 */
@ApiTags('Admin - Ops')
@ApiBearerAuth()
@Controller('admin/ops')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminOpsController {
  constructor(private readonly ops: AdminOpsService) {}

  @Get('overview')
  @ApiOperation({ summary: '운영 개요 — 사용자·활동·구독·매출·오류' })
  @SupportOnly()
  async overview() {
    return this.ops.getOverview();
  }

  @Get('retention')
  @ApiOperation({ summary: '주간 코호트 리텐션' })
  @SupportOnly()
  async retention(@Query('weeks') weeks?: string) {
    return this.ops.getRetention(Math.min(Number(weeks) || 8, 26));
  }

  @Get('funnel')
  @ApiOperation({ summary: '가입 → 결제 퍼널' })
  @SupportOnly()
  async funnel() {
    return this.ops.getFunnel();
  }

  @Get('revenue-trend')
  @ApiOperation({ summary: '월별 매출' })
  @AdminOnly()
  async revenueTrend(@Query('months') months?: string) {
    return this.ops.getRevenueTrend(Math.min(Number(months) || 12, 36));
  }

  @Get('signup-trend')
  @ApiOperation({ summary: '일별 신규 가입' })
  @SupportOnly()
  async signupTrend(@Query('days') days?: string) {
    return this.ops.getSignupTrend(Math.min(Number(days) || 30, 180));
  }

  @Get('feature-usage')
  @ApiOperation({ summary: '기능별 사용량' })
  @SupportOnly()
  async featureUsage(@Query('days') days?: string) {
    return this.ops.getFeatureUsage(Math.min(Number(days) || 30, 180));
  }

  @Get('errors')
  @ApiOperation({ summary: '서버 오류 목록 (같은 오류는 묶여 있다)' })
  @SupportOnly()
  async errors(
    @Query('status') status?: 'open' | 'resolved' | 'all',
    @Query('limit') limit?: string,
  ) {
    return this.ops.getErrors({
      status: status ?? 'open',
      limit: Number(limit) || 50,
    });
  }

  @Patch('errors/:id/resolve')
  @ApiOperation({ summary: '오류 처리 완료 표시 (다시 나면 자동으로 열린다)' })
  @AdminOnly()
  async resolveError(@Param('id') id: string, @Request() req) {
    return this.ops.resolveError(id, req.user.id);
  }
}
