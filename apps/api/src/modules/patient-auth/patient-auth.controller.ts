import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PatientAuthService } from './patient-auth.service';
import { PatientAuthGuard } from './guards/patient-auth.guard';
import {
  SendVerificationDto,
  VerifyCodeDto,
  PatientRegisterDto,
  PatientLoginDto,
  RefreshTokenDto,
  UpdateProfileDto,
  UpdateFcmTokenDto,
} from './dto';

@ApiTags('patient-auth')
@Controller('patient/auth')
export class PatientAuthController {
  constructor(private readonly patientAuthService: PatientAuthService) {}

  @Post('send-verification')
  @ApiOperation({ summary: '휴대폰 인증번호 발송' })
  @ApiResponse({ status: 200, description: '인증번호 발송 성공' })
  @ApiResponse({ status: 409, description: '이미 가입된 번호' })
  async sendVerification(@Body() dto: SendVerificationDto) {
    return this.patientAuthService.sendVerificationCode(dto);
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '인증번호 확인' })
  @ApiResponse({ status: 200, description: '인증 성공' })
  @ApiResponse({ status: 400, description: '인증 실패' })
  async verifyCode(@Body() dto: VerifyCodeDto) {
    return this.patientAuthService.verifyCode(dto);
  }

  @Post('register')
  @ApiOperation({ summary: '환자 회원가입' })
  @ApiResponse({ status: 201, description: '회원가입 성공' })
  @ApiResponse({ status: 400, description: '인증 미완료' })
  @ApiResponse({ status: 409, description: '이미 가입된 번호' })
  async register(@Body() dto: PatientRegisterDto) {
    return this.patientAuthService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '환자 로그인' })
  @ApiResponse({ status: 200, description: '로그인 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async login(@Body() dto: PatientLoginDto) {
    return this.patientAuthService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '토큰 갱신' })
  @ApiResponse({ status: 200, description: '토큰 갱신 성공' })
  @ApiResponse({ status: 401, description: '유효하지 않은 토큰' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.patientAuthService.refreshToken(dto.refreshToken);
  }

  @Get('profile')
  @UseGuards(PatientAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 프로필 조회' })
  @ApiResponse({ status: 200, description: '프로필 조회 성공' })
  async getProfile(@Request() req: any) {
    return this.patientAuthService.getProfile(req.user.id);
  }

  @Patch('profile')
  @UseGuards(PatientAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '프로필 수정' })
  @ApiResponse({ status: 200, description: '프로필 수정 성공' })
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.patientAuthService.updateProfile(req.user.id, dto);
  }

  @Patch('fcm-token')
  @UseGuards(PatientAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'FCM 토큰 업데이트' })
  @ApiResponse({ status: 200, description: 'FCM 토큰 업데이트 성공' })
  async updateFcmToken(@Request() req: any, @Body() dto: UpdateFcmTokenDto) {
    return this.patientAuthService.updateFcmToken(req.user.id, dto.fcmToken);
  }
}
