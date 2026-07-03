import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * uuid-ossp 확장 활성화 — InitialSchema(1703200000000)보다 먼저 실행되어야 한다.
 *
 * 이후 마이그레이션(1703300000000-SubscriptionSystem, 1704000000000-AdminSystem,
 * 1715000000000-AddAnalyticsEvents, 1750000000000-AddonsAndPartners 등)이
 * `uuid_generate_v4()` 를 사용하는데, 이 함수는 uuid-ossp 확장에 속한다.
 * 확장이 없는 fresh DB(재해복구·신규 환경)에서는 해당 마이그레이션이
 * "function uuid_generate_v4() does not exist" 로 실패해 부팅이 막힌다.
 *
 * 타임스탬프를 InitialSchema 보다 앞(1703100000000)으로 두어 항상 먼저 적용되도록 한다.
 * 운영 DB 에는 이미 확장이 있을 것이므로 IF NOT EXISTS 로 무해하게 no-op 된다.
 */
export class EnableUuidExtension1703100000000 implements MigrationInterface {
  name = 'EnableUuidExtension1703100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  }

  public async down(): Promise<void> {
    // 확장 제거는 다른 객체 의존성 때문에 위험하므로 의도적으로 no-op.
  }
}
