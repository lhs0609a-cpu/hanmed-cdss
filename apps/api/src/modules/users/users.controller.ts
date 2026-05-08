import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { DeleteAccountDto } from '../auth/dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '현재 로그인한 사용자 정보 조회' })
  async getProfile(@Request() req: any) {
    const user = await this.usersService.findById(req.user.id);
    return {
      id: user?.id,
      email: user?.email,
      name: user?.name,
      licenseNumber: user?.licenseNumber,
      clinicName: user?.clinicName,
      practitionerType: user?.practitionerType,
      isLicenseVerified: user?.isLicenseVerified,
      licenseVerificationStatus: user?.licenseVerificationStatus,
      licenseRejectionReason: user?.licenseRejectionReason,
      subscriptionTier: user?.subscriptionTier,
      contributionPoints: user?.contributionPoints,
      isVerified: user?.isVerified,
      role: user?.role,
      status: user?.status,
      deletionScheduledFor: user?.deletionScheduledFor,
      createdAt: user?.createdAt,
    };
  }

  @Delete('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: '회원탈퇴 신청 (30일 grace period)',
    description:
      '본인 비밀번호 확인 후 PENDING_DELETION 상태로 전환. 30일 이내 재로그인하여 취소 가능.',
  })
  @HttpCode(200)
  async deleteAccount(@Request() req: any, @Body() dto: DeleteAccountDto) {
    const result = await this.usersService.requestAccountDeletion(req.user.id, dto);
    return {
      message:
        '탈퇴 신청이 접수되었습니다. 30일 이내 다시 로그인하시면 취소할 수 있으며, 이후 모든 데이터는 영구 삭제 또는 익명화됩니다.',
      scheduledFor: result.scheduledFor,
    };
  }

  @Post('me/cancel-deletion')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '탈퇴 신청 취소 (grace period 내)' })
  @HttpCode(200)
  async cancelDeletion(@Request() req: any) {
    await this.usersService.cancelAccountDeletion(req.user.id);
    return { message: '탈퇴 신청이 취소되었습니다.' };
  }
}
