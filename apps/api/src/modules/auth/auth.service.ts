import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { PasswordResetToken } from '../../database/entities/password-reset-token.entity';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name, licenseNumber, clinicName } = registerDto;

    // 이메일 중복 확인
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('이미 등록된 이메일입니다.');
    }

    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 10);

    // 사용자 생성
    const user = await this.usersService.create({
      email,
      passwordHash,
      name,
      licenseNumber,
      clinicName,
    });

    // 토큰 발급
    const tokens = this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscriptionTier,
      },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 사용자 조회
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // 토큰 발급
    const tokens = this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscriptionTier,
        isVerified: user.isVerified,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.REFRESH_TOKEN_SECRET,
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }

      return this.generateTokens(user.id, user.email);
    } catch {
      throw new UnauthorizedException('토큰 갱신에 실패했습니다.');
    }
  }

  private generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.REFRESH_TOKEN_SECRET,
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
    });

    return { accessToken, refreshToken };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // 사용자 조회
    const user = await this.usersService.findByEmail(email);

    // 보안: 사용자 존재 여부와 관계없이 같은 응답 반환
    if (!user) {
      this.logger.log(`비밀번호 재설정 요청 - 존재하지 않는 이메일: ${email}`);
      return {
        message: '해당 이메일로 비밀번호 재설정 안내를 전송했습니다.',
      };
    }

    // 기존 토큰 무효화
    await this.passwordResetTokenRepository.update(
      { userId: user.id, used: false },
      { used: true },
    );

    // 새 토큰 생성 (32바이트 = 64자 hex)
    const token = crypto.randomBytes(32).toString('hex');

    // 토큰 만료 시간 (1시간)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // 토큰 저장
    const resetToken = this.passwordResetTokenRepository.create({
      token,
      userId: user.id,
      expiresAt,
    });
    await this.passwordResetTokenRepository.save(resetToken);

    // 이메일 전송
    await this.emailService.sendPasswordResetEmail(email, token);

    this.logger.log(`비밀번호 재설정 이메일 전송: ${email}`);

    return {
      message: '해당 이메일로 비밀번호 재설정 안내를 전송했습니다.',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    // 토큰 조회 (사용되지 않고 만료되지 않은 토큰)
    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: {
        token,
        used: false,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });

    if (!resetToken) {
      throw new BadRequestException(
        '유효하지 않거나 만료된 토큰입니다. 비밀번호 재설정을 다시 요청해주세요.',
      );
    }

    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // 비밀번호 업데이트
    await this.usersService.updatePassword(resetToken.userId, passwordHash);

    // 토큰 사용 처리
    resetToken.used = true;
    await this.passwordResetTokenRepository.save(resetToken);

    this.logger.log(`비밀번호 재설정 완료: ${resetToken.user.email}`);

    return {
      message: '비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요.',
    };
  }
}
