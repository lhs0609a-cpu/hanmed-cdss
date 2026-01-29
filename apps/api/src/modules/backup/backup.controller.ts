import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminOnly } from '../../common/decorators/roles.decorator';
import { BackupService, BackupMetadata } from './backup.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';

@Controller('backup')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  /**
   * 백업 상태 조회 (관리자용)
   */
  @Get('status')
  @AdminOnly()
  async getBackupStatus(@CurrentUser() user: User) {
    return this.backupService.getBackupStatus();
  }

  /**
   * 백업 목록 조회 (관리자용)
   */
  @Get('list')
  @AdminOnly()
  async listBackups(@CurrentUser() user: User) {
    return this.backupService.listBackups();
  }

  /**
   * 수동 백업 실행 (관리자용)
   */
  @Post('create')
  @AdminOnly()
  async createBackup(@CurrentUser() user: User) {
    return this.backupService.createFullBackup();
  }

  /**
   * 내 데이터 내보내기 (사용자용 - 데이터 이동권)
   */
  @Get('export/my-data')
  async exportMyData(@CurrentUser() user: User, @Res() res: Response) {
    const { data, filename } = await this.backupService.createUserDataExport(user.id);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).json(data);
  }
}
