import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PatientNotificationsService } from './patient-notifications.service';
import { PatientAuthGuard } from '../patient-auth/guards/patient-auth.guard';
import {
  GetNotificationsDto,
  MarkReadDto,
  RegisterPushTokenDto,
  UpdateNotificationSettingsDto,
} from './dto';

@ApiTags('patient-notifications')
@Controller('patient-notifications')
@UseGuards(PatientAuthGuard)
@ApiBearerAuth()
export class PatientNotificationsController {
  constructor(
    private readonly notificationsService: PatientNotificationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: '알림 목록 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async getNotifications(@Request() req: any, @Query() dto: GetNotificationsDto) {
    return this.notificationsService.getNotifications(req.user.id, dto);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '읽지 않은 알림 수' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async getUnreadCount(@Request() req: any) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Post('mark-read')
  @ApiOperation({ summary: '알림 읽음 처리' })
  @ApiResponse({ status: 200, description: '처리 성공' })
  async markAsRead(@Request() req: any, @Body() dto: MarkReadDto) {
    return this.notificationsService.markAsRead(req.user.id, dto.notificationIds);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: '모든 알림 읽음 처리' })
  @ApiResponse({ status: 200, description: '처리 성공' })
  async markAllAsRead(@Request() req: any) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '알림 삭제' })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  async deleteNotification(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.deleteNotification(id, req.user.id);
  }

  // ===== 푸시 토큰 관리 =====

  @Post('push-token')
  @ApiOperation({ summary: '푸시 토큰 등록' })
  @ApiResponse({ status: 200, description: '등록 성공' })
  async registerPushToken(
    @Request() req: any,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.notificationsService.registerPushToken(req.user.id, dto);
  }

  @Delete('push-token/:token')
  @ApiOperation({ summary: '푸시 토큰 해제' })
  @ApiResponse({ status: 200, description: '해제 성공' })
  async unregisterPushToken(
    @Param('token') token: string,
    @Request() req: any,
  ) {
    return this.notificationsService.unregisterPushToken(req.user.id, token);
  }

  // ===== 알림 설정 =====

  @Get('settings')
  @ApiOperation({ summary: '알림 설정 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async getNotificationSettings(@Request() req: any) {
    return this.notificationsService.getNotificationSettings(req.user.id);
  }

  @Post('settings')
  @ApiOperation({ summary: '알림 설정 업데이트' })
  @ApiResponse({ status: 200, description: '업데이트 성공' })
  async updateNotificationSettings(
    @Request() req: any,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.notificationsService.updateNotificationSettings(req.user.id, dto);
  }
}
