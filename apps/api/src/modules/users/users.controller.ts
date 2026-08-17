import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { UsersService } from './users.service';
import { DeleteAccountDto } from '../auth/dto';
import { PractitionerPatientsService } from '../practitioner-patients/practitioner-patients.service';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  clinicName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly practitionerPatients: PractitionerPatientsService,
  ) {}

  /**
   * 내 데이터 전체 내보내기 — 개인정보 열람·이동권 대응.
   *
   * 설정 화면의 "데이터 다운로드"가 이 경로를 부르고 있었는데 엔드포인트가 없어
   * 계속 404 였다. 환자 명부를 서버에 보관하기 시작한 이상, 한의사가 자기 데이터를
   * 언제든 원본 형태로 가져갈 수 있어야 한다.
   */
  @Get('me/export')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 계정·환자·진료 데이터 전체 내보내기' })
  async exportMyData(@Request() req: any) {
    const user = await this.usersService.findById(req.user.id);
    const { patients, visits } = await this.practitionerPatients.exportAll(req.user.id);
    return {
      exportedAt: new Date().toISOString(),
      account: {
        id: user?.id,
        email: user?.email,
        name: user?.name,
        clinicName: user?.clinicName,
        licenseNumber: user?.licenseNumber,
        subscriptionTier: user?.subscriptionTier,
        createdAt: user?.createdAt,
      },
      patients,
      visits,
    };
  }

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
      specialization: user?.specialization,
      bio: user?.bio,
      practitionerType: user?.practitionerType,
      isLicenseVerified: user?.isLicenseVerified,
      licenseVerificationStatus: user?.licenseVerificationStatus,
      licenseRejectionReason: user?.licenseRejectionReason,
      subscriptionTier: user?.subscriptionTier,
      contributionPoints: user?.contributionPoints,
      postCount: user?.postCount,
      commentCount: user?.commentCount,
      acceptedAnswerCount: user?.acceptedAnswerCount,
      isVerified: user?.isVerified,
      role: user?.role,
      status: user?.status,
      deletionScheduledFor: user?.deletionScheduledFor,
      createdAt: user?.createdAt,
    };
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '본인 프로필 수정' })
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    const user = await this.usersService.updateProfile(req.user.id, dto);
    return {
      id: user.id,
      name: user.name,
      clinicName: user.clinicName,
      licenseNumber: user.licenseNumber,
      specialization: user.specialization,
      bio: user.bio,
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
