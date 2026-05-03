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
import { CacheService } from '../cache/cache.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { TotpService } from './services/totp.service';
import { PasswordResetToken } from '../../database/entities/password-reset-token.entity';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto';

const TOKEN_BLACKLIST_PREFIX = 'auth:revoked';
const TWOFA_CHALLENGE_PREFIX = 'auth:2fa-challenge';
const TWOFA_CHALLENGE_TTL_SECONDS = 5 * 60; // 5분 내 코드 입력

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private cacheService: CacheService,
    private encryptionService: EncryptionService,
    private totpService: TotpService,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
  ) {}

  async isTokenRevoked(jti: string): Promise<boolean> {
    if (!jti) return false;
    const value = await this.cacheService.get<number>(jti, { prefix: TOKEN_BLACKLIST_PREFIX });
    return value !== null;
  }

  async logout(jti: string, exp: number): Promise<void> {
    if (!jti || !exp) return;
    const ttlSeconds = exp - Math.floor(Date.now() / 1000);
    if (ttlSeconds <= 0) return;
    await this.cacheService.set(jti, 1, { prefix: TOKEN_BLACKLIST_PREFIX, ttl: ttlSeconds });
  }

  decodeToken(token: string): { jti?: string; exp?: number; sub?: string } | null {
    try {
      const decoded = this.jwtService.decode(token);
      if (!decoded || typeof decoded !== 'object') return null;
      return decoded as { jti?: string; exp?: number; sub?: string };
    } catch {
      return null;
    }
  }

  async register(registerDto: RegisterDto) {
    const { email, password, name, licenseNumber, clinicName, consentTerms, consentPrivacy, consentMarketing } = registerDto;

    // 필수 동의 확인
    if (!consentTerms || !consentPrivacy) {
      throw new ConflictException('이용약관과 개인정보처리방침에 동의해주세요.');
    }

    // 이메일 중복 확인
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('이미 등록된 이메일입니다.');
    }

    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 10);

    // 동의 시간 기록
    const now = new Date();

    // 사용자 생성
    const user = await this.usersService.create({
      email,
      passwordHash,
      name,
      licenseNumber,
      clinicName,
      consentTerms,
      consentPrivacy,
      consentMarketing: consentMarketing || false,
      consentTermsAt: now,
      consentPrivacyAt: now,
      consentMarketingAt: consentMarketing ? now : null,
    });

    // 토큰 발급
    const tokens = this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscriptionTier,
        isVerified: user.isVerified,
        role: user.role,
        status: user.status,
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

    // 2FA 활성화된 사용자: 토큰을 발급하지 않고 챌린지 ID만 반환.
    // 클라이언트는 /auth/2fa/login에 챌린지 ID + 6자리 코드를 보내야 한다.
    if (user.is2faEnabled) {
      const challengeId = crypto.randomUUID();
      await this.cacheService.set(
        challengeId,
        { userId: user.id, createdAt: Date.now() },
        { prefix: TWOFA_CHALLENGE_PREFIX, ttl: TWOFA_CHALLENGE_TTL_SECONDS },
      );
      return {
        twoFactorRequired: true,
        challengeId,
      };
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
        role: user.role,
        status: user.status,
      },
      ...tokens,
    };
  }

  /**
   * 2FA 챌린지 응답: password 로그인 직후 받은 challengeId + 6자리 TOTP 코드로 완전 인증.
   */
  async loginWith2fa(challengeId: string, code: string) {
    const challenge = await this.cacheService.get<{ userId: string }>(challengeId, {
      prefix: TWOFA_CHALLENGE_PREFIX,
    });
    if (!challenge) {
      throw new UnauthorizedException('2FA 챌린지가 만료되었습니다. 다시 로그인해주세요.');
    }

    const user = await this.usersService.findById(challenge.userId);
    if (!user || !user.is2faEnabled || !user.totpSecretEncrypted) {
      throw new UnauthorizedException('2FA 정보를 확인할 수 없습니다.');
    }

    const secret = this.encryptionService.decrypt(user.totpSecretEncrypted);
    const totpOk = this.totpService.verify(code, secret);
    const backupOk = !totpOk && (await this.tryConsumeBackupCode(user, code));

    if (!totpOk && !backupOk) {
      throw new UnauthorizedException('인증 코드가 올바르지 않습니다.');
    }

    // 챌린지 1회 소비
    await this.cacheService.delete(challengeId, { prefix: TWOFA_CHALLENGE_PREFIX });

    const tokens = this.generateTokens(user.id, user.email);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscriptionTier,
        isVerified: user.isVerified,
        role: user.role,
        status: user.status,
      },
      ...tokens,
    };
  }

  /**
   * 2FA 등록 1단계: 새 시크릿 생성 + otpauth URL 반환. 사용자가 인증 앱에 추가하고
   * /auth/2fa/enable로 첫 코드를 보내면 활성화된다.
   */
  async setup2fa(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('사용자를 찾을 수 없습니다.');

    const secret = this.totpService.generateSecret();
    const encrypted = this.encryptionService.encrypt(secret);

    // 활성화는 아직 X. 시크릿만 저장하고 사용자 확인 후 활성화한다.
    await this.usersService.updateTwoFactor(userId, {
      totpSecretEncrypted: encrypted,
      is2faEnabled: false,
    });

    return {
      secret,
      otpAuthUrl: this.totpService.buildOtpAuthUrl(user.email, secret),
    };
  }

  async enable2fa(userId: string, code: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.totpSecretEncrypted) {
      throw new BadRequestException('먼저 2FA 설정을 진행해주세요.');
    }
    const secret = this.encryptionService.decrypt(user.totpSecretEncrypted);
    if (!this.totpService.verify(code, secret)) {
      throw new UnauthorizedException('인증 코드가 올바르지 않습니다.');
    }

    // 백업 코드 10개 발급 (사용자에게 1회만 평문 노출)
    const backupCodes = this.generateBackupCodes();
    const hashed = await Promise.all(
      backupCodes.map((c) => bcrypt.hash(c, 10)),
    );
    const encrypted = this.encryptionService.encrypt(JSON.stringify(hashed));

    await this.usersService.updateTwoFactor(userId, {
      is2faEnabled: true,
      twoFaBackupCodesEncrypted: encrypted,
    });

    return {
      message: '2단계 인증이 활성화되었습니다.',
      backupCodes,
      warning: '이 백업 코드는 다시 표시되지 않습니다. 안전한 곳에 저장하세요.',
    };
  }

  async disable2fa(userId: string, code: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.is2faEnabled || !user.totpSecretEncrypted) {
      throw new BadRequestException('2FA가 활성화되어 있지 않습니다.');
    }

    // 일반 TOTP 코드 또는 백업 코드 둘 다 허용 (분실 대응)
    const secret = this.encryptionService.decrypt(user.totpSecretEncrypted);
    const totpOk = this.totpService.verify(code, secret);
    const backupOk = !totpOk && (await this.tryConsumeBackupCode(user, code));

    if (!totpOk && !backupOk) {
      throw new UnauthorizedException('인증 코드가 올바르지 않습니다.');
    }

    await this.usersService.updateTwoFactor(userId, {
      is2faEnabled: false,
      totpSecretEncrypted: null,
      twoFaBackupCodesEncrypted: null,
    });
    return { message: '2단계 인증이 비활성화되었습니다.' };
  }

  /**
   * 백업 코드 재발급 (분실/소진 시). 기존 백업 코드는 모두 무효화.
   * 호출자는 현재 TOTP 코드로 본인 확인을 먼저 해야 한다.
   */
  async regenerateBackupCodes(userId: string, code: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.is2faEnabled || !user.totpSecretEncrypted) {
      throw new BadRequestException('2FA가 활성화되어 있지 않습니다.');
    }
    const secret = this.encryptionService.decrypt(user.totpSecretEncrypted);
    if (!this.totpService.verify(code, secret)) {
      throw new UnauthorizedException('인증 코드가 올바르지 않습니다.');
    }

    const backupCodes = this.generateBackupCodes();
    const hashed = await Promise.all(backupCodes.map((c) => bcrypt.hash(c, 10)));
    const encrypted = this.encryptionService.encrypt(JSON.stringify(hashed));

    await this.usersService.updateTwoFactor(userId, {
      twoFaBackupCodesEncrypted: encrypted,
    });

    return {
      message: '백업 코드가 재발급되었습니다. 기존 코드는 무효화되었습니다.',
      backupCodes,
      warning: '이 백업 코드는 다시 표시되지 않습니다. 안전한 곳에 저장하세요.',
    };
  }

  /** 사람이 수기 입력하기 쉬운 형식: xxxx-xxxx (영숫자 9자, 모호 문자 제외) */
  private generateBackupCodes(count = 10): string[] {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // I, O, 0, 1 제외
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const buf = crypto.randomBytes(8);
      let raw = '';
      for (const byte of buf) raw += alphabet[byte % alphabet.length];
      codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
    }
    return codes;
  }

  /**
   * 백업 코드 검증 + 1회용 소비. 매칭되는 코드가 있으면 해당 항목을 제거하고 저장.
   */
  private async tryConsumeBackupCode(
    user: { id: string; twoFaBackupCodesEncrypted: string | null },
    code: string,
  ): Promise<boolean> {
    if (!user.twoFaBackupCodesEncrypted) return false;
    const normalized = code.trim().toUpperCase();
    let hashes: string[];
    try {
      hashes = JSON.parse(this.encryptionService.decrypt(user.twoFaBackupCodesEncrypted));
    } catch {
      return false;
    }

    for (let i = 0; i < hashes.length; i++) {
      if (await bcrypt.compare(normalized, hashes[i])) {
        hashes.splice(i, 1);
        const encrypted = hashes.length
          ? this.encryptionService.encrypt(JSON.stringify(hashes))
          : null;
        await this.usersService.updateTwoFactor(user.id, {
          twoFaBackupCodesEncrypted: encrypted,
        });
        return true;
      }
    }
    return false;
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.REFRESH_TOKEN_SECRET,
      });

      if (payload.jti && (await this.isTokenRevoked(payload.jti))) {
        throw new UnauthorizedException('취소된 토큰입니다.');
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }

      // 회전: 기존 refresh token JTI도 폐기하여 재사용 차단
      if (payload.jti && payload.exp) {
        await this.logout(payload.jti, payload.exp);
      }

      return this.generateTokens(user.id, user.email);
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('토큰 갱신에 실패했습니다.');
    }
  }

  private generateTokens(userId: string, email: string) {
    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();
    const basePayload = { sub: userId, email };

    const accessToken = this.jwtService.sign(
      { ...basePayload, jti: accessJti },
      { jwtid: accessJti },
    );
    const refreshToken = this.jwtService.sign(
      { ...basePayload, jti: refreshJti },
      {
        secret: process.env.REFRESH_TOKEN_SECRET,
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
        jwtid: refreshJti,
      },
    );

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
