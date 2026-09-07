import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, AdminOnly, SuperAdminOnly, SupportOnly } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../../database/entities/enums';
import { AdminUsersService } from '../services/admin-users.service';
import {
  GetUsersQueryDto,
  SuspendUserDto,
  ChangeUserRoleDto,
  UpdateUserDto,
  RejectLicenseDto,
} from '../dto';

@ApiTags('Admin - Users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: '사용자 목록 조회' })
  @SupportOnly() // SUPPORT 이상
  async getUsers(@Query() query: GetUsersQueryDto) {
    return this.adminUsersService.getUsers(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '사용자 상세 조회' })
  @SupportOnly()
  async getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminUsersService.getUserById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '사용자 정보 수정' })
  @AdminOnly() // ADMIN 이상
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    return this.adminUsersService.updateUser(adminId, id, dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: '사용자 계정 정지' })
  @AdminOnly()
  async suspendUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendUserDto,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    return this.adminUsersService.suspendUser(adminId, id, dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post(':id/activate')
  @ApiOperation({ summary: '사용자 계정 활성화' })
  @AdminOnly()
  async activateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    return this.adminUsersService.activateUser(adminId, id, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post(':id/ban')
  @ApiOperation({ summary: '사용자 영구 차단' })
  @AdminOnly()
  async banUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendUserDto,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    return this.adminUsersService.banUser(adminId, id, dto.reason, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get(':id/license-file')
  @ApiOperation({ summary: '면허증 사본 열람 URL (짧게 만료되는 서명 URL)' })
  @AdminOnly()
  async getLicenseFile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    return this.adminUsersService.getLicenseFileUrl(adminId, id, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post(':id/license/approve')
  @ApiOperation({ summary: '한의사 면허 검수 승인' })
  @AdminOnly()
  async approveLicense(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    return this.adminUsersService.approveLicense(adminId, id, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post(':id/license/reject')
  @ApiOperation({ summary: '한의사 면허 검수 반려' })
  @AdminOnly()
  async rejectLicense(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectLicenseDto,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    return this.adminUsersService.rejectLicense(adminId, id, dto.reason, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch(':id/role')
  @ApiOperation({ summary: '사용자 역할 변경 (SUPER_ADMIN 전용)' })
  @SuperAdminOnly() // SUPER_ADMIN만
  async changeUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeUserRoleDto,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    return this.adminUsersService.changeUserRole(adminId, id, dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: '비밀번호 초기화' })
  @AdminOnly()
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    return this.adminUsersService.resetPassword(adminId, id, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
