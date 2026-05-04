/**
 * 운영 DB 시드 진입점.
 *
 * 사용법:
 *   pnpm seed                  # 전체 시드 (formulas → herbs_master → formula_herbs → interactions → cases)
 *   pnpm seed formulas         # 처방 마스터만
 *   pnpm seed herbs            # 약재 마스터만 (formulas 시드 후 실행)
 *   pnpm seed cases            # 치험례만 (가장 큰 데이터, 7,096건)
 *   pnpm seed interactions     # 한약-양약 상호작용 (큐레이션)
 *
 * 모든 시더는 idempotent — sourceId/name 기준으로 이미 있으면 skip.
 * DATABASE_URL 환경변수가 가리키는 DB에 INSERT한다. 실수 방지를 위해
 * NODE_ENV=production이면 한 번 더 확인 프롬프트를 띄운다.
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { SeederService, SeedTarget } from './seeder.service';

async function bootstrap() {
  const logger = new Logger('Seed');
  const target = (process.argv[2] || 'all') as SeedTarget;

  const validTargets: SeedTarget[] = ['all', 'formulas', 'herbs', 'cases', 'interactions'];
  if (!validTargets.includes(target)) {
    logger.error(`Unknown target: ${target}. Valid: ${validTargets.join(', ')}`);
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production' && process.env.SEED_CONFIRM !== 'yes') {
    logger.error(
      '⚠️  운영 환경입니다. 실행하려면 SEED_CONFIRM=yes 를 환경변수로 설정하세요.\n' +
        '   PowerShell: $env:SEED_CONFIRM="yes"; pnpm seed\n' +
        '   bash:        SEED_CONFIRM=yes pnpm seed',
    );
    process.exit(1);
  }

  logger.log(`Target: ${target}`);
  logger.log(`Database: ${process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@')}`);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const seeder = app.get(SeederService);
    await seeder.run(target);
    logger.log('✅ 시드 작업 완료');
  } catch (err) {
    logger.error('❌ 시드 실패', err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
