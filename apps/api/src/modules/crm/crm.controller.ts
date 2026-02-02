import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { CrmService } from './crm.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CreateAutoMessageDto,
  CreateSegmentDto,
  CreateFunnelStageDto,
  SendMessageDto,
} from './dto';
import { CampaignStatus, MessageChannel } from '../../database/entities/crm-campaign.entity';

@ApiTags('CRM')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  // ============ Campaigns ============

  @Post('campaigns')
  @ApiOperation({ summary: '캠페인 생성' })
  async createCampaign(
    @Request() req: any,
    @Body() dto: CreateCampaignDto,
  ) {
    const result = await this.crmService.createCampaign(
      req.user.clinicId || req.user.id,
      req.user.id,
      {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        targetingRules: dto.targetingRules,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    );
    return { success: true, data: result };
  }

  @Get('campaigns')
  @ApiOperation({ summary: '캠페인 목록 조회' })
  @ApiQuery({ name: 'status', enum: CampaignStatus, required: false })
  async getCampaigns(
    @Request() req: any,
    @Query('status') status?: CampaignStatus,
  ) {
    const result = await this.crmService.getCampaigns(
      req.user.clinicId || req.user.id,
      status,
    );
    return { success: true, data: result };
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: '캠페인 상세 조회' })
  @ApiParam({ name: 'id', description: '캠페인 ID' })
  async getCampaign(@Param('id') id: string) {
    const result = await this.crmService.getCampaign(id);
    return { success: true, data: result };
  }

  @Put('campaigns/:id')
  @ApiOperation({ summary: '캠페인 수정' })
  @ApiParam({ name: 'id', description: '캠페인 ID' })
  async updateCampaign(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    const result = await this.crmService.updateCampaign(id, dto);
    return { success: true, data: result };
  }

  @Post('campaigns/:id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '캠페인 시작' })
  @ApiParam({ name: 'id', description: '캠페인 ID' })
  async startCampaign(@Param('id') id: string) {
    const result = await this.crmService.startCampaign(id);
    return { success: true, data: result };
  }

  @Post('campaigns/:id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '캠페인 일시정지' })
  @ApiParam({ name: 'id', description: '캠페인 ID' })
  async pauseCampaign(@Param('id') id: string) {
    const result = await this.crmService.pauseCampaign(id);
    return { success: true, data: result };
  }

  @Get('campaigns/:id/analytics')
  @ApiOperation({ summary: '캠페인 성과 분석' })
  @ApiParam({ name: 'id', description: '캠페인 ID' })
  async getCampaignAnalytics(@Param('id') id: string) {
    const result = await this.crmService.getCampaignAnalytics(id);
    return { success: true, data: result };
  }

  // ============ Auto Messages ============

  @Post('auto-messages')
  @ApiOperation({ summary: '자동 메시지 생성' })
  async createAutoMessage(
    @Request() req: any,
    @Body() dto: CreateAutoMessageDto,
  ) {
    const result = await this.crmService.createAutoMessage(
      req.user.clinicId || req.user.id,
      {
        name: dto.name,
        triggerType: dto.triggerType,
        triggerConditions: dto.triggerConditions,
        channel: dto.channel,
        messageTemplate: dto.messageTemplate,
        kakaoTemplateCode: dto.kakaoTemplateCode,
        actionButtons: dto.actionButtons,
      },
    );
    return { success: true, data: result };
  }

  @Get('auto-messages')
  @ApiOperation({ summary: '자동 메시지 목록 조회' })
  async getAutoMessages(@Request() req: any) {
    const result = await this.crmService.getAutoMessages(
      req.user.clinicId || req.user.id,
    );
    return { success: true, data: result };
  }

  @Post('auto-messages/:id/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '자동 메시지 활성화/비활성화' })
  @ApiParam({ name: 'id', description: '자동 메시지 ID' })
  async toggleAutoMessage(@Param('id') id: string) {
    const result = await this.crmService.toggleAutoMessage(id);
    return { success: true, data: result };
  }

  // ============ Segments ============

  @Post('segments')
  @ApiOperation({ summary: '세그먼트 생성' })
  async createSegment(
    @Request() req: any,
    @Body() dto: CreateSegmentDto,
  ) {
    const result = await this.crmService.createSegment(
      req.user.clinicId || req.user.id,
      {
        name: dto.name,
        description: dto.description,
        rules: {
          conditions: dto.conditions,
          logic: dto.logic,
        },
        autoUpdate: dto.autoUpdate,
      },
    );
    return { success: true, data: result };
  }

  @Get('segments')
  @ApiOperation({ summary: '세그먼트 목록 조회' })
  async getSegments(@Request() req: any) {
    const result = await this.crmService.getSegments(
      req.user.clinicId || req.user.id,
    );
    return { success: true, data: result };
  }

  @Post('segments/:id/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '세그먼트 환자 수 새로고침' })
  @ApiParam({ name: 'id', description: '세그먼트 ID' })
  async refreshSegment(@Param('id') id: string) {
    await this.crmService.updateSegmentPatientCount(id);
    return { success: true, message: '세그먼트가 업데이트되었습니다.' };
  }

  // ============ Funnels ============

  @Post('funnels/stages')
  @ApiOperation({ summary: '퍼널 스테이지 생성' })
  async createFunnelStage(
    @Request() req: any,
    @Body() dto: CreateFunnelStageDto,
  ) {
    const result = await this.crmService.createFunnelStage(
      req.user.clinicId || req.user.id,
      dto,
    );
    return { success: true, data: result };
  }

  @Get('funnels/stages')
  @ApiOperation({ summary: '퍼널 스테이지 목록 조회' })
  async getFunnelStages(@Request() req: any) {
    const result = await this.crmService.getFunnelStages(
      req.user.clinicId || req.user.id,
    );
    return { success: true, data: result };
  }

  // ============ Messages ============

  @Post('messages/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '메시지 발송' })
  async sendMessages(
    @Request() req: any,
    @Body() dto: SendMessageDto,
  ) {
    const result = await this.crmService.sendBulkMessages(
      req.user.clinicId || req.user.id,
      dto.patientIds,
      dto.channel,
      dto.message,
    );
    return { success: true, data: result };
  }

  // ============ Dashboard ============

  @Get('dashboard')
  @ApiOperation({ summary: 'CRM 대시보드' })
  async getDashboard(@Request() req: any) {
    const result = await this.crmService.getDashboardData(
      req.user.clinicId || req.user.id,
    );
    return { success: true, data: result };
  }
}
