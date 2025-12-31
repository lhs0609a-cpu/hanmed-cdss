import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PatientHealthService } from './patient-health.service';
import { MedicationSchedulerService } from './medication-scheduler.service';
import { PatientAuthGuard } from '../patient-auth/guards/patient-auth.guard';
import {
  CreateHealthJournalDto,
  GetHealthJournalDto,
  CreateMedicationReminderDto,
  UpdateMedicationReminderDto,
  CreateMedicationLogDto,
  GetMedicationLogsDto,
} from './dto';

@ApiTags('patient-health')
@Controller('patient-health')
@UseGuards(PatientAuthGuard)
@ApiBearerAuth()
export class PatientHealthController {
  constructor(
    private readonly healthService: PatientHealthService,
    private readonly schedulerService: MedicationSchedulerService,
  ) {}

  // ===== 건강 일지 =====

  @Post('journal')
  @ApiOperation({ summary: '건강 일지 작성' })
  @ApiResponse({ status: 201, description: '작성 성공' })
  async createJournal(@Request() req: any, @Body() dto: CreateHealthJournalDto) {
    return this.healthService.createJournal(req.user.id, dto);
  }

  @Patch('journal/:id')
  @ApiOperation({ summary: '건강 일지 수정' })
  @ApiResponse({ status: 200, description: '수정 성공' })
  async updateJournal(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: Partial<CreateHealthJournalDto>,
  ) {
    return this.healthService.updateJournal(id, req.user.id, dto);
  }

  @Get('journal')
  @ApiOperation({ summary: '건강 일지 목록' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async getJournals(@Request() req: any, @Query() dto: GetHealthJournalDto) {
    return this.healthService.getJournals(req.user.id, dto);
  }

  @Get('journal/date/:date')
  @ApiOperation({ summary: '특정 날짜 건강 일지' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async getJournalByDate(@Request() req: any, @Param('date') date: string) {
    return this.healthService.getJournalByDate(req.user.id, date);
  }

  @Get('report')
  @ApiOperation({ summary: '건강 리포트 (기간별 통계)' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async getHealthReport(
    @Request() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.healthService.getHealthReport(req.user.id, startDate, endDate);
  }

  // ===== 복약 알림 =====

  @Post('reminders')
  @ApiOperation({ summary: '복약 알림 생성' })
  @ApiResponse({ status: 201, description: '생성 성공' })
  async createReminder(
    @Request() req: any,
    @Body() dto: CreateMedicationReminderDto,
  ) {
    return this.healthService.createReminder(req.user.id, dto);
  }

  @Patch('reminders/:id')
  @ApiOperation({ summary: '복약 알림 수정' })
  @ApiResponse({ status: 200, description: '수정 성공' })
  async updateReminder(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateMedicationReminderDto,
  ) {
    return this.healthService.updateReminder(id, req.user.id, dto);
  }

  @Delete('reminders/:id')
  @ApiOperation({ summary: '복약 알림 삭제' })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  async deleteReminder(@Param('id') id: string, @Request() req: any) {
    return this.healthService.deleteReminder(id, req.user.id);
  }

  @Get('reminders')
  @ApiOperation({ summary: '복약 알림 목록' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async getReminders(@Request() req: any) {
    return this.healthService.getReminders(req.user.id);
  }

  @Get('reminders/active')
  @ApiOperation({ summary: '활성 복약 알림' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async getActiveReminders(@Request() req: any) {
    return this.healthService.getActiveReminders(req.user.id);
  }

  @Get('reminders/today')
  @ApiOperation({ summary: '오늘의 복약 일정' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async getTodaySchedule(@Request() req: any) {
    return this.schedulerService.getTodaySchedule(req.user.id);
  }

  // ===== 복약 기록 =====

  @Post('medication-logs')
  @ApiOperation({ summary: '복약 기록 생성' })
  @ApiResponse({ status: 201, description: '생성 성공' })
  async createMedicationLog(
    @Request() req: any,
    @Body() dto: CreateMedicationLogDto,
  ) {
    return this.healthService.createMedicationLog(req.user.id, dto);
  }

  @Get('medication-logs')
  @ApiOperation({ summary: '복약 기록 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async getMedicationLogs(
    @Request() req: any,
    @Query() dto: GetMedicationLogsDto,
  ) {
    return this.healthService.getMedicationLogs(req.user.id, dto);
  }

  @Get('medication-logs/today')
  @ApiOperation({ summary: '오늘 복약 기록' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async getTodayLogs(@Request() req: any) {
    return this.healthService.getTodayLogs(req.user.id);
  }

  @Get('medication-stats/:prescriptionId')
  @ApiOperation({ summary: '복약 통계' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async getMedicationStats(
    @Param('prescriptionId') prescriptionId: string,
    @Request() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.healthService.getMedicationStats(
      req.user.id,
      prescriptionId,
      startDate,
      endDate,
    );
  }
}
