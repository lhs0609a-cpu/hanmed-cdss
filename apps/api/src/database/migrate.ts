import { DataSource } from 'typeorm';

/**
 * 배포 전용 마이그레이션 러너 — Fly.io `[deploy] release_command` 에서 실행.
 *
 * 새 버전이 트래픽을 받기 전에(구버전이 계속 서비스 중일 때) 마이그레이션을 먼저 적용한다.
 * 실패하면 release 단계에서 배포가 중단되어 나쁜 마이그레이션이 서비스에 반영되지 않는다.
 * (부팅 시 migrationsRun:true 는 안전망으로 유지 — 이미 적용된 마이그레이션은 no-op)
 *
 * dist 로 컴파일되어 `node dist/database/migrate.js` 로 실행된다.
 * 운영 이미지에는 ts-node 가 없으므로 반드시 컴파일된 경로를 사용한다.
 */
async function run(): Promise<void> {
  const url = process.env.DATABASE_URL || '';

  const dataSource = new DataSource({
    type: 'postgres',
    url,
    // Supabase 풀러는 TLS 를 요구하지만 인증서 체인이 표준 검증을 통과하지 못한다.
    // app.module 의 TypeORM 설정과 동일한 규칙을 쓰지 않으면 release 단계에서만
    // 접속이 실패해 배포가 통째로 막힌다.
    ssl: url.includes('pooler.supabase.com') ? { rejectUnauthorized: false } : undefined,
    // 마이그레이션 실행에는 엔티티 메타데이터가 필요 없다.
    entities: [],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    migrationsTransactionMode: 'each',
  });

  await dataSource.initialize();
  try {
    const applied = await dataSource.runMigrations({ transaction: 'each' });
    if (applied.length === 0) {
      console.log('[migrate] 적용할 신규 마이그레이션 없음.');
    } else {
      console.log(`[migrate] ${applied.length}개 마이그레이션 적용됨:`);
      for (const m of applied) console.log(`  - ${m.name}`);
    }
  } finally {
    await dataSource.destroy();
  }
}

run().catch((error) => {
  console.error('[migrate] 마이그레이션 실패:', error);
  process.exit(1);
});
