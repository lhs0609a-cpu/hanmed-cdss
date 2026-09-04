// 인증 플로우 통합 퍼즈 — 실제 AuthService/UsersService 를 인메모리 Postgres(pg-mem)로 실행.
// ⚠️ 안전: 운영 DB 로 가는 경로 자체를 제거한다 (DATABASE_URL 삭제 + AppModule 미부팅).
delete process.env.DATABASE_URL;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_min_32_chars_aaaaaaaaaa';
process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret_min_32_chars_bbbbbbb';
process.env.ENCRYPTION_KEY = '00000000000000000000000000000000000000000000000000000000000000ab';

import { randomUUID } from 'crypto';
import { DataType, newDb } from 'pg-mem';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { User } from '../../database/entities/user.entity';
import { PasswordHistory } from '../../database/entities/password-history.entity';
import { PasswordResetToken } from '../../database/entities/password-reset-token.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { TotpService } from './services/totp.service';

async function makeDataSource(): Promise<DataSource> {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  // impure: true → 행마다 재평가 (없으면 pg-mem 이 immutable 로 보고 같은 UUID 재사용 → PK 충돌)
  db.public.registerFunction({ name: 'uuid_generate_v4', returns: DataType.uuid, implementation: randomUUID, impure: true });
  db.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: randomUUID, impure: true });
  db.public.registerFunction({ name: 'version', returns: DataType.text, implementation: () => 'pg-mem' });
  db.public.registerFunction({ name: 'current_database', returns: DataType.text, implementation: () => 'test' });
  const ds: DataSource = db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities: [User, PasswordResetToken],
    synchronize: true,
  });
  await ds.initialize(); // synchronize:true 이므로 init 시 스키마 생성됨 (중복 synchronize 금지 — pg-mem introspection 한계)
  return ds;
}

describe('Auth 통합 퍼즈 (pg-mem, 실제 코드)', () => {
  let ds: DataSource;
  let auth: AuthService;

  beforeAll(async () => {
    ds = await makeDataSource();
    const usersService = new UsersService(ds.getRepository(User) as any);
    const jwt = new JwtService({ secret: process.env.JWT_SECRET });
    const emailStub = { sendPasswordResetEmail: async () => {}, sendWelcomeEmail: async () => {} } as any;
    const cacheStub = { isAvailable: () => false, get: async () => null, set: async () => true, delete: async () => true } as any;
    const encStub = { encrypt: () => '', decrypt: () => '' } as any;
    auth = new AuthService(
      usersService,
      jwt,
      emailStub,
      cacheStub,
      encStub,
      new TotpService(),
      ds.getRepository(PasswordResetToken) as any,
      ds.getRepository(PasswordHistory) as any,
      ds.getRepository(User) as any,
    );
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it('demoLogin 은 멱등 — 100회 호출해도 항상 같은 데모 계정 + 유효 토큰', async () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const res = await auth.demoLogin();
      expect(res.user.email).toBe('demo@ongojisin.ai');
      expect(res.accessToken).toBeTruthy();
      expect(res.refreshToken).toBeTruthy();
      ids.add(res.user.id);
    }
    // 데모 계정은 find-or-create 라 단 하나만 존재해야 함
    expect(ids.size).toBe(1);
    const count = await ds.getRepository(User).count({ where: { email: 'demo@ongojisin.ai' } });
    expect(count).toBe(1);
  });

  it('register 100회(임의 이메일) — 가입 성공 + 토큰, 중복 이메일은 차단', async () => {
    let ok = 0;
    const used: string[] = [];
    for (let i = 0; i < 100; i++) {
      const email = `u${i}_${Math.random().toString(36).slice(2, 8)}@test.local`;
      const res = await auth.register({
        email,
        password: 'pw_' + Math.random().toString(36).slice(2, 10),
        name: '테스트' + i,
        role: 'student' as any, // 학생 → 면허번호 불요
        consentTerms: true,
        consentPrivacy: true,
        consentMarketing: false,
      } as any);
      expect(res.user.email).toBe(email);
      expect(res.accessToken).toBeTruthy();
      used.push(email);
      ok++;
    }
    expect(ok).toBe(100);

    // 중복 이메일 → ConflictException
    await expect(
      auth.register({
        email: used[0],
        password: 'another',
        name: 'dup',
        role: 'student' as any,
        consentTerms: true,
        consentPrivacy: true,
      } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('login — 올바른 비밀번호는 토큰 발급, 틀리면 거부 (각 50회)', async () => {
    for (let i = 0; i < 50; i++) {
      const email = `login${i}_${Math.random().toString(36).slice(2, 6)}@test.local`;
      const password = 'correct_' + Math.random().toString(36).slice(2, 10);
      await auth.register({
        email, password, name: 'L' + i, role: 'student' as any,
        consentTerms: true, consentPrivacy: true,
      } as any);

      const good = await auth.login({ email, password } as any);
      expect('accessToken' in good && good.accessToken).toBeTruthy();

      await expect(auth.login({ email, password: password + 'X' } as any)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    }
  });
});
