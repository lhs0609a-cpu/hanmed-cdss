import { Logger } from '@nestjs/common';
import { validateSecrets } from './validate-secrets';

describe('validateSecrets', () => {
  const originalEnv = { ...process.env };
  let exitSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let logger: Logger;

  const validSecrets = {
    DATABASE_URL: 'postgresql://u:p@db:5432/x',
    JWT_SECRET: 'a'.repeat(64),
    REFRESH_TOKEN_SECRET: 'b'.repeat(64),
    ENCRYPTION_KEY: 'c'.repeat(64),
    INTERNAL_API_KEY: 'd'.repeat(32),
    TOSS_SECRET_KEY: 'live_sk_abcdef',
  };

  beforeEach(() => {
    process.env = { ...originalEnv, ...validSecrets, NODE_ENV: 'production' };
    logger = new Logger('test');
    errorSpy = jest.spyOn(logger, 'error').mockImplementation();
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation();
    jest.spyOn(logger, 'log').mockImplementation();
    exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined as never) as never);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('운영에서 모든 시크릿이 유효하면 부팅 통과', () => {
    validateSecrets(logger);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('운영에서 시크릿 누락 시 부팅 차단', () => {
    delete process.env.JWT_SECRET;
    validateSecrets(logger);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('JWT_SECRET 미설정'),
    );
  });

  it.each([
    ['CHANGE_ME_USE_CRYPTO_RANDOM_BYTES_64', 'JWT_SECRET'],
    ['your-api-key-here-please-replace-with-real', 'ENCRYPTION_KEY'],
    ['sk-your-openai-api-key-please-replace-now', 'INTERNAL_API_KEY'],
  ])('운영에서 placeholder 값(%s)이면 부팅 차단', (placeholder, key) => {
    process.env[key] = placeholder.padEnd(64, 'x');
    validateSecrets(logger);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(`${key} 가 placeholder`),
    );
  });

  it('운영에서 JWT_SECRET 가 짧으면(<32자) 부팅 차단', () => {
    process.env.JWT_SECRET = 'short';
    validateSecrets(logger);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('JWT_SECRET 길이 부족'),
    );
  });

  it('운영에서 ENCRYPTION_KEY 가 64자 미만이면 차단', () => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(32);
    validateSecrets(logger);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('ENCRYPTION_KEY 길이 부족'),
    );
  });

  it('운영에서 TOSS_SECRET_KEY 가 test_ 로 시작하면 차단 — 라이브 키 강제', () => {
    process.env.TOSS_SECRET_KEY = 'test_sk_realkey';
    validateSecrets(logger);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("'test_'"),
    );
  });

  it('개발에서는 누락이어도 warn 만 출력하고 부팅 진행', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;
    validateSecrets(logger);
    expect(exitSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('개발에서도 TOSS test_ 키는 허용 (productionOnly 금지 규칙)', () => {
    process.env.NODE_ENV = 'development';
    process.env.TOSS_SECRET_KEY = 'test_sk_dev';
    validateSecrets(logger);
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
