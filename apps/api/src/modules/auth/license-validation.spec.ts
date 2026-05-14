import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { CacheService } from '../cache/cache.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { TotpService } from './services/totp.service';
import { PasswordResetToken } from '../../database/entities/password-reset-token.entity';

/**
 * 한의사 면허번호 형식 검증 smoke test.
 *
 * 의료법상 의료인 가입 시 면허 사실 확인은 운영 검수 단계에서 진행되지만,
 * **형식 단에서 명백한 오타/허위 입력을 거르는 1차 가드**가 필요. 이 가드가
 * 깨지면 PENDING 상태로 가짜 데이터가 쌓이고 운영 부담이 폭증한다.
 */
describe('AuthService.validateLicenseNumber', () => {
  let service: AuthService;

  beforeEach(async () => {
    const noop = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: { findByEmail: noop, create: noop } },
        { provide: JwtService, useValue: { sign: noop, verify: noop } },
        { provide: EmailService, useValue: { sendWelcomeEmail: noop, sendPasswordResetEmail: noop } },
        {
          provide: CacheService,
          useValue: { get: noop, set: noop, del: noop, getOrSet: noop },
        },
        { provide: EncryptionService, useValue: { encrypt: noop, decrypt: noop } },
        { provide: TotpService, useValue: { generate: noop, verify: noop } },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: { findOne: noop, save: noop, delete: noop },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('유효한 면허번호', () => {
    it.each([
      '12345',     // 5자리
      '123456',    // 6자리
      '1234567',   // 7자리
      '12345678',  // 8자리
      '99999999',  // 상한
    ])('%s 통과', (value) => {
      expect(service.validateLicenseNumber(value)).toEqual({ ok: true, reason: null });
    });

    it('앞뒤 공백은 trim 후 검증', () => {
      expect(service.validateLicenseNumber('  12345  ')).toEqual({ ok: true, reason: null });
    });
  });

  describe('무효한 면허번호 — 형식 오류', () => {
    it('null / undefined / 빈문자 → 입력 필요', () => {
      expect(service.validateLicenseNumber(null)).toMatchObject({ ok: false });
      expect(service.validateLicenseNumber(undefined)).toMatchObject({ ok: false });
      expect(service.validateLicenseNumber('')).toMatchObject({ ok: false });
      expect(service.validateLicenseNumber('   ')).toMatchObject({ ok: false });
    });

    it('영문/한글/특수문자 포함 → 숫자만 허용', () => {
      expect(service.validateLicenseNumber('abc12345')).toMatchObject({
        ok: false,
        reason: expect.stringContaining('숫자'),
      });
      expect(service.validateLicenseNumber('123-456')).toMatchObject({ ok: false });
      expect(service.validateLicenseNumber('한1234')).toMatchObject({ ok: false });
    });

    it('0으로 시작하면 거부 — 실제 발급 체계에 없음', () => {
      expect(service.validateLicenseNumber('01234')).toMatchObject({
        ok: false,
        reason: expect.stringContaining('0으로 시작'),
      });
      expect(service.validateLicenseNumber('00001')).toMatchObject({ ok: false });
    });

    it.each([
      ['1234', '5자리 미만'],
      ['123', '5자리 미만'],
      ['1', '5자리 미만'],
      ['123456789', '8자리 초과'],
      ['1234567890', '8자리 초과'],
    ])('%s (%s) → 5~8자리 위반', (value) => {
      expect(service.validateLicenseNumber(value)).toMatchObject({
        ok: false,
        reason: expect.stringContaining('5~8자리'),
      });
    });
  });

  it('동일 입력으로 두 번 호출해도 동일 결과 (idempotent)', () => {
    const a = service.validateLicenseNumber('12345');
    const b = service.validateLicenseNumber('12345');
    expect(a).toEqual(b);
  });
});
