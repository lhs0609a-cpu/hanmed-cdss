import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { SupportOnly } from '../../../common/decorators/roles.decorator';
import { AdminDashboardService } from '../services/admin-dashboard.service';

@ApiTags('Admin - Dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  @ApiOperation({ summary: '대시보드 전체 데이터 조회' })
  @SupportOnly()
  async getDashboard() {
    return this.adminDashboardService.getDashboard();
  }

  @Get('stats')
  @ApiOperation({ summary: '통계 데이터만 조회' })
  @SupportOnly()
  async getStats() {
    return this.adminDashboardService.getStats();
  }

  @Get('activities')
  @ApiOperation({ summary: '최근 관리자 활동 조회' })
  @SupportOnly()
  async getRecentActivities(@Query('limit') limit?: number) {
    return this.adminDashboardService.getRecentActivities(limit || 10);
  }

  @Get('signups')
  @ApiOperation({ summary: '일별 가입자 추이 조회' })
  @SupportOnly()
  async getDailySignups(@Query('days') days?: number) {
    return this.adminDashboardService.getDailySignups(days || 30);
  }
}
