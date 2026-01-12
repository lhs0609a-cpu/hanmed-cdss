import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AdminOnly, SupportOnly } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AdminSubscriptionsService } from '../services/admin-subscriptions.service';
import {
  ChangeSubscriptionPlanDto,
  ExtendSubscriptionDto,
  ResetUsageDto,
} from '../dto';

@ApiTags('Admin - Subscriptions')
@ApiBearerAuth()
@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminSubscriptionsController {
  constructor(
    private readonly adminSubscriptionsService: AdminSubscriptionsService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: '구독 통계 조회' })
  @SupportOnly()
  async getStats() {
    return this.adminSubscriptionsService.getSubscriptionStats();
  }

  @Get('users/:userId/usage')
  @ApiOperation({ summary: '사용자 사용량 조회' })
  @SupportOnly()
  async getUserUsage(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.adminSubscriptionsService.getUserUsage(userId);
  }

  @Patch('users/:userId/plan')
  @ApiOperation({ summary: '구독 플랜 변경' })
  @AdminOnly()
  async changeSubscriptionPlan(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: ChangeSubscriptionPlanDto,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    return this.adminSubscriptionsService.changeSubscriptionPlan(
      adminId,
      userId,
      dto,
      {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  @Post('users/:userId/extend')
  @ApiOperation({ summary: '구독 기간 연장' })
  @AdminOnly()
  async extendSubscription(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: ExtendSubscriptionDto,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    return this.adminSubscriptionsService.extendSubscription(
      adminId,
      userId,
      dto,
      {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  @Post('users/:userId/cancel')
  @ApiOperation({ summary: '구독 강제 취소' })
  @AdminOnly()
  async cancelSubscription(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    return this.adminSubscriptionsService.cancelSubscription(adminId, userId, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('users/:userId/reset-usage')
  @ApiOperation({ summary: '사용량 초기화' })
  @AdminOnly()
  async resetUsage(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: ResetUsageDto,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    await this.adminSubscriptionsService.resetUsage(
      adminId,
      userId,
      dto.newCount,
      {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
    return { success: true, message: '사용량이 초기화되었습니다.' };
  }
}
