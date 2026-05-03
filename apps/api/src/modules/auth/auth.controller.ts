import { Controller, Post, Body, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto } from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({ status: 201, description: '회원가입 성공' })
  @ApiResponse({ status: 409, description: '이미 등록된 이메일' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({ status: 200, description: '로그인 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '토큰 갱신' })
  @ApiResponse({ status: 200, description: '토큰 갱신 성공' })
  @ApiResponse({ status: 401, description: '유효하지 않은 리프레시 토큰' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그아웃 (액세스 토큰 폐기)' })
  @ApiResponse({ status: 200, description: '로그아웃 성공' })
  async logout(@Req() req: Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return { message: '로그아웃되었습니다.' };
    }
    const token = authHeader.slice(7);
    const decoded = this.authService.decodeToken(token);
    if (decoded?.jti && decoded?.exp) {
      await this.authService.logout(decoded.jti, decoded.exp);
    }
    return { message: '로그아웃되었습니다.' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '비밀번호 찾기 (재설정 이메일 전송)' })
  @ApiResponse({ status: 200, description: '이메일 전송 성공 (사용자 존재 여부 무관)' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '비밀번호 재설정' })
  @ApiResponse({ status: 200, description: '비밀번호 재설정 성공' })
  @ApiResponse({ status: 400, description: '유효하지 않거나 만료된 토큰' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  // ===== 2FA =====

  @Public()
  @Post('2fa/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '2FA 챌린지 응답 (password 로그인 후 호출)' })
  async twoFactorLogin(@Body() body: { challengeId: string; code: string }) {
    return this.authService.loginWith2fa(body.challengeId, body.code);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '2FA 등록 1단계 (시크릿 + otpauth URL 발급)' })
  async setup2fa(@Req() req: Request & { user: { id: string } }) {
    return this.authService.setup2fa(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '2FA 등록 2단계 (첫 코드로 활성화)' })
  async enable2fa(
    @Req() req: Request & { user: { id: string } },
    @Body() body: { code: string },
  ) {
    return this.authService.enable2fa(req.user.id, body.code);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '2FA 비활성화 (현재 코드 또는 백업 코드 필요)' })
  async disable2fa(
    @Req() req: Request & { user: { id: string } },
    @Body() body: { code: string },
  ) {
    return this.authService.disable2fa(req.user.id, body.code);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('2fa/backup-codes/regenerate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '백업 코드 재발급 (기존 코드 무효화)' })
  async regenerateBackupCodes(
    @Req() req: Request & { user: { id: string } },
    @Body() body: { code: string },
  ) {
    return this.authService.regenerateBackupCodes(req.user.id, body.code);
  }
}
