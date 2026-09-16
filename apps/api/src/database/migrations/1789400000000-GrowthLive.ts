import { MigrationInterface, QueryRunner } from 'typeorm';

export class GrowthLive1789400000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE growth_live_snapshot (
      id integer PRIMARY KEY CHECK (id = 1), payload jsonb NOT NULL,
      "asOf" timestamptz NOT NULL
    )`);
    await q.query(`CREATE TABLE growth_insights (
      id varchar(100) PRIMARY KEY, evidence jsonb NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'new'
        CHECK (status IN ('new','reviewing','applied','observing','closed','deferred')),
      streak integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT false,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(), version integer NOT NULL DEFAULT 1
    )`);
    await q.query(`CREATE TABLE growth_insight_audit (
      id bigserial PRIMARY KEY, "insightId" varchar(100) NOT NULL REFERENCES growth_insights(id),
      "actorId" uuid NOT NULL, "fromStatus" varchar(20) NOT NULL,
      "toStatus" varchar(20) NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX growth_events_received_idx ON analytics_events ("createdAt") WHERE left(type, 7) = 'growth_'`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP INDEX growth_events_received_idx');
    await q.query('DROP TABLE growth_insight_audit');
    await q.query('DROP TABLE growth_insights');
    await q.query('DROP TABLE growth_live_snapshot');
  }
}
