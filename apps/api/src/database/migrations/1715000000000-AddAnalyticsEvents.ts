import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnalyticsEvents1715000000000 implements MigrationInterface {
  name = 'AddAnalyticsEvents1715000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "analytics_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" character varying NOT NULL,
        "properties" jsonb NOT NULL DEFAULT '{}',
        "userId" uuid NULL,
        "userTier" character varying NULL,
        "sessionId" character varying NOT NULL,
        "userAgent" text NULL,
        "screenSize" character varying NULL,
        "locale" character varying NULL,
        "occurredAt" timestamptz NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_analytics_events" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_analytics_events_type" ON "analytics_events" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_analytics_events_userId" ON "analytics_events" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_analytics_events_sessionId" ON "analytics_events" ("sessionId")`);
    await queryRunner.query(`CREATE INDEX "IDX_analytics_events_createdAt" ON "analytics_events" ("createdAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_analytics_events_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_analytics_events_sessionId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_analytics_events_userId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_analytics_events_type"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "analytics_events"`);
  }
}
