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
import { PasswordHistory } from '../../database/entities/password-history.entity';
import { User } from '../../database/entities/user.entity';
import { UserStatus } from '../../database/entities/enums';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
import {
  LicenseVerificationStatus,
  PractitionerType,
} from '../../database/entities/enums';

const TOKEN_BLACKLIST_PREFIX = 'auth:revoked';
const TWOFA_CHALLENGE_PREFIX = 'auth:2fa-challenge';
const TWOFA_CHALLENGE_TTL_SECONDS = 5 * 60; // 5분 내 코드 입력

/**
 * JWT 블랙리스트 1차 캐시.
 * 모든 인증 요청마다 Redis 를 치는 비용을 줄이기 위한 짧은 로컬 캐시.
 *
 * 보안 요구사항:
 *  - 캐시 미스(=블랙리스트 아님)만 fast path 로 처리 — false positive 절대 금지.
 *  - 캐시에 "revoked" 가 들어가면 즉시 차단(보수적).
 *  - 캐시에 "valid" 가 들어가면 BLACKLIST_NEGATIVE_TTL 동안만 신뢰.
 *  - 로그아웃 호출 시 해당 jti 캐시 무효화 + 'revoked' 강제 마킹.
 */
const BLACKLIST_LOCAL_CACHE_MAX = 5000;
const BLACKLIST_NEGATIVE_TTL_MS = 5 * 60 * 1000; // 5분 — false positive 차단 폭

type BlacklistCacheValue = 'revoked' | 'valid';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /**
   * 로컬 1차 블랙리스트 캐시(LRU).
   * value === 'revoked' → 즉시 차단 (Redis 확인 생략).
   * value === 'valid' + expiresAt > now → Redis 확인 생략, 통과.
   * 그 외 → Redis 조회 후 캐시 갱신.
   */
  private readonly blacklistLocalCache = new Map<
    string,
    { value: BlacklistCacheValue; expiresAt: number }
  >();

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private cacheService: CacheService,
    private encryptionService: EncryptionService,
    private totpService: TotpService,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(PasswordHistory)
    private passwordHistoryRepository: Repository<PasswordHistory>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  private blacklistCacheGet(jti: string): BlacklistCacheValue | null {
    const entry = this.blacklistLocalCache.get(jti);
    if (!entry) return null;
    // revoked 는 영원히 캐시 (TTL 없이) — 안전한 쪽으로 기울임
    if (entry.value === 'revoked') {
      // LRU 갱신
      this.blacklistLocalCache.delete(jti);
      this.blacklistLocalCache.set(jti, entry);
      return 'revoked';
    }
    // valid 는 짧은 TTL
    if (entry.expiresAt > Date.now()) {
      this.blacklistLocalCache.delete(jti);
      this.blacklistLocalCache.set(jti, entry);
      return 'valid';
    }
    this.blacklistLocalCache.delete(jti);
    return null;
  }

  private blacklistCacheSet(jti: string, value: BlacklistCacheValue) {
    // LRU 크기 캡
    while (this.blacklistLocalCache.size >= BLACKLIST_LOCAL_CACHE_MAX) {
      const oldest = this.blacklistLocalCache.keys().next().value;
      if (oldest === undefined) break;
      this.blacklistLocalCache.delete(oldest);
    }
    this.blacklistLocalCache.set(jti, {
      value,
      expiresAt:
        value === 'revoked'
          ? Number.MAX_SAFE_INTEGER
          : Date.now() + BLACKLIST_NEGATIVE_TTL_MS,
    });
  }

  async isTokenRevoked(jti: string): Promise<boolean> {
    if (!jti) return false;

    // 1차: 로컬 LRU 캐시
    const local = this.blacklistCacheGet(jti);
    if (local === 'revoked') return true;
    if (local === 'valid') return false;

    // 2차: Redis (정답)
    const value = await this.cacheService.get<number>(jti, { prefix: TOKEN_BLACKLIST_PREFIX });
    const revoked = value !== null;

    // 캐시 갱신 — revoked 만 영구 캐시, valid 는 짧은 TTL
    this.blacklistCacheSet(jti, revoked ? 'revoked' : 'valid');

    return revoked;
  }

  async logout(jti: string, exp: number): Promise<void> {
    if (!jti || !exp) return;
    const ttlSeconds = exp - Math.floor(Date.now() / 1000);
    if (ttlSeconds <= 0) return;
    await this.cacheService.set(jti, 1, { prefix: TOKEN_BLACKLIST_PREFIX, ttl: ttlSeconds });
    // 모든 인스턴스에서 즉시 차단되려면 Redis pub/sub 가 필요하지만,
    // 최소한 현재 인스턴스의 로컬 캐시는 즉시 갱신해서 stale valid 제거.
    this.blacklistCacheSet(jti, 'revoked');
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
    const {
      email,
      password,
      name,
      licenseNumber,
      clinicName,
      role,
      consentTerms,
      consentPrivacy,
      consentMarketing,
    } = registerDto;

    // 필수 동의 확인
    if (!consentTerms || !consentPrivacy) {
      throw new ConflictException('이용약관과 개인정보처리방침에 동의해주세요.');
    }

    const practitionerType = role ?? PractitionerType.PRACTITIONER;

    // 면허·허가 번호 검증. 직역마다 번호 체계가 다르다.
    if (practitionerType === PractitionerType.PRACTITIONER) {
      const check = this.validateLicenseNumber(licenseNumber);
      if (!check.ok) {
        throw new BadRequestException(
          `${check.reason} 학생/공보의는 가입 유형에서 변경하세요.`,
        );
      }
    } else if (practitionerType === PractitionerType.HERBAL_PHARMACIST) {
      // 한약사 면허번호는 한의사보다 짧다. 1996년에 시작해 배출 인원이
      // 적어 네 자리에 머무는 번호가 많다. 5자리 하한을 그대로 쓰면
      // 실재하는 면허가 거절된다.
      const check = this.validateNumericLicense(licenseNumber, {
        label: '한약사 면허번호',
        min: 3,
        max: 8,
      });
      if (!check.ok) throw new BadRequestException(check.reason);
    } else if (practitionerType === PractitionerType.HERB_DEALER) {
      // 한약업자 허가번호는 시·도지사가 발급하고 형식이 지역마다 다르다
      // ("제2020-3호" 처럼 한글과 기호가 섞인다). 숫자 규칙을 씌우면
      // 정상 허가번호가 막히므로 길이만 본다. 진짜 확인은 사람이 한다.
      const raw = (licenseNumber ?? '').trim();
      if (raw.length < 2 || raw.length > 30) {
        throw new BadRequestException(
          '한약업자 허가번호를 허가증에 적힌 그대로 입력해주세요.',
        );
      }
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

    // 면허 검증 상태: 번호를 낸 직역은 PENDING(검수 대기), 그 외 UNSUBMITTED.
    //
    // 한약사·한약업자도 번호를 받는다. 검수 대상에서 빼면 아무나 그 직역을
    // 고를 수 있고, 그러면 직역 표시가 아무것도 보증하지 않는 말이 된다.
    const LICENSED_TYPES: PractitionerType[] = [
      PractitionerType.PRACTITIONER,
      PractitionerType.HERBAL_PHARMACIST,
      PractitionerType.HERB_DEALER,
    ];
    const licenseVerificationStatus =
      LICENSED_TYPES.includes(practitionerType) && licenseNumber
        ? LicenseVerificationStatus.PENDING
        : LicenseVerificationStatus.UNSUBMITTED;

    // 사용자 생성
    const user = await this.usersService.create({
      email,
      passwordHash,
      name,
      licenseNumber,
      clinicName,
      practitionerType,
      licenseVerificationStatus,
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
        practitionerType: user.practitionerType,
        isLicenseVerified: user.isLicenseVerified,
        licenseVerificationStatus: user.licenseVerificationStatus,
      },
      ...tokens,
    };
  }

  /**
   * 로그인 실패를 무엇 때문인지 알려 준다.
   *
   * 예전에는 무엇이 틀렸든 "이메일 또는 비밀번호가 올바르지 않습니다" 하나만
   * 보냈다. 보안 교과서가 권하는 방식이고 이유도 분명하다 — 어느 이메일이
   * 가입돼 있는지 알려 주지 않는다(사용자 열거 방지).
   *
   * 그런데 그 대가를 실제로 치르는 사람은 공격자가 아니라 원장이다. 오타를
   * 냈는지, 다른 이메일로 가입했는지, 비밀번호를 바꿨다는 걸 잊었는지 알 수
   * 없어 같은 값을 대여섯 번 다시 넣는다. 우리 사용자는 한의사 수천 명 규모의
   * 전문가 집단이고, 이메일이 가입돼 있다는 사실 자체가 비밀이 아니다.
   *
   * 그래서 원장 지시대로 이유를 갈라 알려 주되, 열거 위험은 다른 방법으로
   * 줄인다.
   *
   *   - 라우트에 분당 시도 제한(@Throttle)을 건다.
   *   - 계정마다 5회 실패면 10분 잠근다. 실패가 이어지면 잠금이 길어진다.
   *   - 실패 횟수와 잠금은 DB 에 센다. Redis 가 없는 환경에서 캐시로 세면
   *     잠금이 아예 걸리지 않는다.
   *
   * 반환 형식: code 는 화면이 분기하는 값, message 는 사람이 읽는 문장이다.
   * 전역 예외 필터가 error·message 두 칸만 남기므로 code 를 error 에 싣는다.
   */
  private loginError(
    code: string,
    message: string,
    extra?: Record<string, unknown>,
  ): never {
    throw new UnauthorizedException({ error: code, message, ...(extra ?? {}) });
  }

  /** 5회부터 잠근다. 반복되면 길어진다 — 10분 → 30분 → 2시간. */
  private lockDurationMinutes(failedAttempts: number): number {
    if (failedAttempts >= 15) return 120;
    if (failedAttempts >= 10) return 30;
    return 10;
  }

  private static readonly MAX_ATTEMPTS = 5;

  /**
   * 지난 비밀번호와 맞는지 본다.
   *
   * 최근 다섯 개만 본다. bcrypt 비교는 한 번에 100ms 쯤 걸려서 전부 뒤지면
   * 로그인 실패가 느려지고, 그 느림 자체가 "이 계정은 존재한다" 는 신호가
   * 된다. 사람이 기억하는 것도 최근 몇 개뿐이다.
   */
  private async matchOldPassword(
    userId: string,
    password: string,
  ): Promise<PasswordHistory | null> {
    const history = await this.passwordHistoryRepository.find({
      where: { userId },
      order: { changedAt: 'DESC' },
      take: 5,
    });
    for (const row of history) {
      if (await bcrypt.compare(password, row.passwordHash)) return row;
    }
    return null;
  }

  private async recordFailure(user: User): Promise<number> {
    const attempts = (user.failedLoginAttempts ?? 0) + 1;
    const patch: Partial<User> = {
      failedLoginAttempts: attempts,
      lastFailedLoginAt: new Date(),
    };
    if (attempts >= AuthService.MAX_ATTEMPTS) {
      const until = new Date();
      until.setMinutes(until.getMinutes() + this.lockDurationMinutes(attempts));
      patch.lockedUntil = until;
    }
    await this.userRepository.update({ id: user.id }, patch);
    return attempts;
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 사용자 조회
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.loginError(
        'EMAIL_NOT_FOUND',
        '등록되지 않은 이메일입니다. 오타가 없는지 확인해 주세요.',
      );
    }

    // 잠금 확인 — 비밀번호가 맞아도 들여보내지 않는다.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.max(
        1,
        Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000),
      );
      this.loginError(
        'ACCOUNT_LOCKED',
        `비밀번호를 여러 번 잘못 입력해 잠겼습니다. ${minutes}분 뒤에 다시 시도하거나 비밀번호를 재설정해 주세요.`,
        { lockedUntil: user.lockedUntil.toISOString(), retryAfterMinutes: minutes },
      );
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // 예전 비밀번호를 넣은 것인가. 이 안내가 있으면 대개 그 자리에서
      // 기억이 돌아온다 — "비밀번호가 틀렸습니다" 만 보면 같은 값을 계속
      // 다시 넣는다.
      const old = await this.matchOldPassword(user.id, password);
      const attempts = await this.recordFailure(user);
      const left = Math.max(0, AuthService.MAX_ATTEMPTS - attempts);

      if (old) {
        const when = old.changedAt.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        this.loginError(
          'OLD_PASSWORD',
          `예전에 쓰시던 비밀번호입니다. ${when}에 새 비밀번호로 바꾸셨습니다.`,
          { changedAt: old.changedAt.toISOString(), attemptsLeft: left },
        );
      }

      if (left === 0) {
        const minutes = this.lockDurationMinutes(attempts);
        this.loginError(
          'ACCOUNT_LOCKED',
          `비밀번호를 ${attempts}회 잘못 입력해 ${minutes}분간 잠겼습니다. 비밀번호를 재설정해 주세요.`,
          { retryAfterMinutes: minutes },
        );
      }

      this.loginError(
        'WRONG_PASSWORD',
        `비밀번호가 일치하지 않습니다. ${left}회 더 틀리면 계정이 잠깁니다.`,
        { attemptsLeft: left },
      );
    }

    // 여기서부터는 본인이 맞다. 계정 상태를 본다.
    //
    // 예전에는 이 확인이 아예 없어서 정지된 계정도 그대로 들어왔다.
    if (user.status === UserStatus.SUSPENDED) {
      this.loginError(
        'ACCOUNT_SUSPENDED',
        user.suspendedReason
          ? `이용이 일시 정지된 계정입니다. 사유: ${user.suspendedReason}`
          : '이용이 일시 정지된 계정입니다. 고객센터로 문의해 주세요.',
      );
    }
    if (user.status === UserStatus.BANNED) {
      this.loginError(
        'ACCOUNT_BANNED',
        '이용이 중지된 계정입니다. 고객센터로 문의해 주세요.',
      );
    }
    if (user.deletionRequestedAt) {
      // 탈퇴 유예 기간이다. 막지 않고 알려 준다 — 돌아온 사람을 문 앞에서
      // 돌려보낼 이유가 없다.
      this.logger.log(`탈퇴 유예 중 로그인: ${user.email}`);
    }

    // 성공했으니 실패 기록을 지운다.
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.userRepository.update(
        { id: user.id },
        { failedLoginAttempts: 0, lockedUntil: null },
      );
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
        // 면허 상태 — settings 페이지에서 검증 배지/거부 사유 UI 에 사용
        licenseNumber: user.licenseNumber,
        clinicName: user.clinicName,
        isLicenseVerified: user.isLicenseVerified,
        licenseVerificationStatus: user.licenseVerificationStatus,
        licenseRejectionReason: user.licenseRejectionReason,
      },
      ...tokens,
    };
  }

  /**
   * 체험 모드 로그인.
   * 고정된 데모 계정(free 티어)을 find-or-create 하여 정식 토큰을 발급한다.
   * 비밀번호 없이 누구나 호출 가능한 공개 엔드포인트이므로,
   * 데모 계정은 항상 free 티어 + 면허 검증 완료 상태로만 유지된다.
   */
  async demoLogin() {
    const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@ongojisin.ai';

    let user = await this.usersService.findByEmail(demoEmail);
    if (!user) {
      // 사용 불가능한 랜덤 비밀번호 — 데모 계정은 password 로그인을 허용하지 않는다.
      const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10);
      const now = new Date();
      user = await this.usersService.create({
        email: demoEmail,
        passwordHash,
        name: '체험 계정',
        clinicName: '온고지신 체험 한의원',
        practitionerType: PractitionerType.PRACTITIONER,
        licenseVerificationStatus: LicenseVerificationStatus.VERIFIED,
        isVerified: true,
        consentTerms: true,
        consentPrivacy: true,
        consentMarketing: false,
        consentTermsAt: now,
        consentPrivacyAt: now,
        consentMarketingAt: null,
      });
    }

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
        licenseNumber: user.licenseNumber,
        clinicName: user.clinicName,
        isLicenseVerified: user.isLicenseVerified,
        licenseVerificationStatus: user.licenseVerificationStatus,
        licenseRejectionReason: user.licenseRejectionReason,
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

  /**
   * 한의사 면허번호 형식 검증.
   *
   * 룰:
   *   - 숫자만
   *   - 5~8자리 (현행 한의사 면허번호 자릿수 범위)
   *   - 0으로 시작 금지 (실제 면허번호 체계에 0번대 발급 없음 — 오타·테스트 데이터 거름망)
   *
   * 검증 결과를 { ok, reason } 으로 반환해 호출자가 사용자에게 표시할 수
   * 있는 사유 메시지를 그대로 사용한다. 가입 외에 면허 정정 API 등에서도
   * 동일 규칙을 재사용 가능하도록 public 으로 노출.
   */
  validateLicenseNumber(
    licenseNumber: string | null | undefined,
  ): { ok: true; reason: null } | { ok: false; reason: string } {
    const raw = (licenseNumber ?? '').trim();
    if (!raw) {
      return { ok: false, reason: '한의사 면허번호를 입력해주세요.' };
    }
    if (!/^\d+$/.test(raw)) {
      return { ok: false, reason: '면허번호는 숫자만 입력 가능합니다.' };
    }
    if (raw.startsWith('0')) {
      return { ok: false, reason: '면허번호는 0으로 시작할 수 없습니다.' };
    }
    if (raw.length < 5 || raw.length > 8) {
      return { ok: false, reason: '면허번호는 5~8자리 숫자여야 합니다.' };
    }
    return { ok: true, reason: null };
  }

  /**
   * 숫자로만 된 면허번호 검증. 자릿수 범위만 직역마다 달리 준다.
   *
   * validateLicenseNumber 를 그대로 쓰지 않는 이유는 하한 때문이다. 한의사는
   * 5자리부터지만 한약사는 네 자리 번호가 실재한다. 규칙을 하나로 묶으면
   * 둘 중 하나는 반드시 틀린다.
   */
  validateNumericLicense(
    licenseNumber: string | null | undefined,
    opts: { label: string; min: number; max: number },
  ): { ok: true; reason: null } | { ok: false; reason: string } {
    const raw = (licenseNumber ?? '').trim();
    if (!raw) return { ok: false, reason: `${opts.label}를 입력해주세요.` };
    if (!/^\d+$/.test(raw)) {
      return { ok: false, reason: `${opts.label}는 숫자만 입력 가능합니다.` };
    }
    if (raw.startsWith('0')) {
      return { ok: false, reason: `${opts.label}는 0으로 시작할 수 없습니다.` };
    }
    if (raw.length < opts.min || raw.length > opts.max) {
      return {
        ok: false,
        reason: `${opts.label}는 ${opts.min}~${opts.max}자리 숫자여야 합니다.`,
      };
    }
    return { ok: true, reason: null };
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

    // jsonwebtoken은 options.jwtid를 주면 페이로드에 jti를 자동 추가한다.
    // 페이로드에 직접 jti를 넣으면 "payload already has jti" 에러가 발생하므로
    // options.jwtid 쪽만 사용한다.
    const accessToken = this.jwtService.sign(basePayload, { jwtid: accessJti });
    const refreshToken = this.jwtService.sign(basePayload, {
      secret: process.env.REFRESH_TOKEN_SECRET,
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
      jwtid: refreshJti,
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

  /** 최근 다섯 개만 남긴다. */
  private async trimPasswordHistory(userId: string): Promise<void> {
    const rows = await this.passwordHistoryRepository.find({
      where: { userId },
      order: { changedAt: 'DESC' },
      select: { id: true },
      skip: 5,
    });
    if (rows.length > 0) {
      await this.passwordHistoryRepository.delete(rows.map((r) => r.id));
    }
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

    // 새 비밀번호가 지금 쓰는 것과 같으면 알려 준다. 막지는 않는다 —
    // 막는 규칙(재사용 금지 N개)은 원장이 정할 일이고, 지금은 사람이
    // 헷갈리지 않게 하는 것이 목적이다.
    const samePassword = await bcrypt.compare(
      newPassword,
      resetToken.user.passwordHash,
    );

    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // 쓰던 비밀번호를 기록에 남긴다.
    //
    // 다음에 그 비밀번호로 로그인을 시도하면 "예전에 쓰던 것" 이라고
    // 알려 줄 수 있다. 해시만 남기므로 평문은 어디에도 없다.
    if (!samePassword) {
      await this.passwordHistoryRepository.save(
        this.passwordHistoryRepository.create({
          userId: resetToken.userId,
          passwordHash: resetToken.user.passwordHash,
          changedAt: new Date(),
          changedVia: 'reset',
        }),
      );
      // 오래된 것은 지운다. 사람이 기억하는 것은 최근 몇 개뿐이고, 옛 해시를
      // 무한히 쌓는 것은 지켜야 할 것을 늘리는 일이다.
      await this.trimPasswordHistory(resetToken.userId);
    }

    // 비밀번호 업데이트
    await this.usersService.updatePassword(resetToken.userId, passwordHash);
    await this.userRepository.update(
      { id: resetToken.userId },
      {
        passwordChangedAt: new Date(),
        // 비밀번호를 새로 정했으면 잠금과 실패 기록을 푼다. 재설정을
        // 마쳤는데도 잠긴 채로 두면 사람이 갈 곳이 없다.
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    );

    // 토큰 사용 처리
    resetToken.used = true;
    await this.passwordResetTokenRepository.save(resetToken);

    this.logger.log(`비밀번호 재설정 완료: ${resetToken.user.email}`);

    return {
      message: '비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요.',
    };
  }
}
