import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hanmed_cdss';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: databaseUrl,
  // Supabase 풀러는 TLS 를 요구하되 인증서 체인이 표준 검증을 통과하지 못한다.
  // 이 설정이 없으면 CLI(migration:show / seed)가 조용히 매달린다 — app.module 과 같은 규칙.
  ssl: databaseUrl.includes('pooler.supabase.com') ? { rejectUnauthorized: false } : undefined,
  entities: ['src/database/entities/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/*{.ts,.js}'],
  migrationsTransactionMode: 'each',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
