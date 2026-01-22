// 마이그레이션 실행 스크립트 (의존성 문제 우회용)
const { execSync } = require('child_process');
const path = require('path');

// TypeScript 컴파일 후 실행
console.log('Running migration...');

try {
  // 환경 변수 로드
  require('dotenv').config({ path: '.env.local' });
  require('dotenv').config({ path: '.env' });

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL이 설정되지 않았습니다.');
    console.log('');
    console.log('.env 파일에 다음을 추가하세요:');
    console.log('DATABASE_URL=postgresql://user:password@localhost:5432/hanmed_cdss');
    process.exit(1);
  }

  console.log('Database URL:', dbUrl.replace(/:[^:@]+@/, ':***@'));

  // TypeORM DataSource 직접 실행
  const { DataSource } = require('typeorm');

  const dataSource = new DataSource({
    type: 'postgres',
    url: dbUrl,
    entities: [],
    migrations: [path.join(__dirname, 'src/database/migrations/*.ts')],
    migrationsTableName: 'typeorm_migrations',
    logging: true,
  });

  dataSource.initialize()
    .then(async () => {
      console.log('Database connected');
      await dataSource.runMigrations();
      console.log('Migrations completed!');
      await dataSource.destroy();
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });

} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
