import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { buildLive, LiveSession } from './growth-live.rules';

export const INSIGHT_STATUSES = ['new', 'reviewing', 'applied', 'observing', 'closed', 'deferred'];

// Aggregate at the database; the browser never polls raw event rows.
export const LIVE_SESSIONS_SQL = `
  WITH events AS (
    SELECT "sessionId", properties, type, "createdAt",
      LEAST(COALESCE("occurredAt", "createdAt"), "createdAt") AS at
    FROM analytics_events
    WHERE left(type, 7) = 'growth_' AND "createdAt" >= $1::timestamptz - interval '48 hours'
      AND "createdAt" < $1::timestamptz
  ), sessions AS (
    SELECT "sessionId" AS id,
      (array_agg(properties->>'visitorId' ORDER BY at, "createdAt"))[1] AS visitor,
      COALESCE((array_agg(properties->>'source' ORDER BY at, "createdAt"))[1], 'direct') AS source,
      COALESCE((array_agg(properties->>'device' ORDER BY at, "createdAt"))[1], 'desktop') AS device,
      (array_agg(properties->>'page' ORDER BY at DESC, "createdAt" DESC))[1] AS page,
      min(at) AS "firstAt", max(at) AS "lastAt", max("createdAt") AS "receivedAt",
      min(at) FILTER (WHERE type = 'growth_signup_start') AS "startAt",
      min(at) FILTER (WHERE type = 'growth_signup_submit') AS "submitAt",
      max(at) FILTER (WHERE type = 'growth_signup_success') AS "successAt",
      max(at) FILTER (WHERE type = 'growth_signup_error') AS "errorAt",
      min(at) FILTER (WHERE type = 'growth_demo_completed') AS "demoAt",
      max(at) FILTER (WHERE type = 'growth_feature_used') AS "featureAt",
      bool_or(COALESCE(properties->>'source', '') = 'deployment_check'
        OR COALESCE(properties->>'medium', '') = 'qa') AS qa
    FROM events GROUP BY "sessionId"
  ) SELECT * FROM sessions WHERE NOT qa
    AND "firstAt" >= $1::timestamptz - interval '24 hours'
    AND "lastAt" >= $1::timestamptz - interval '150 minutes'
`;

@Injectable()
export class GrowthLiveService {
  constructor(private readonly db: DataSource) {}

  @Cron('0 * * * * *')
  async aggregate() {
    await this.db.transaction(async manager => {
      const [lock] = await manager.query('SELECT pg_try_advisory_xact_lock(1789400000) AS locked');
      if (!lock.locked) return;
      const now = Date.now();
      const [old] = await manager.query('SELECT "asOf" FROM growth_live_snapshot WHERE id = 1');
      if (old && now - +new Date(old.asOf) < 55000) return;
      await manager.query(`SET LOCAL statement_timeout = '45s'`);
      const rows = await manager.query(LIVE_SESSIONS_SQL, [new Date(Math.floor(now / 60000) * 60000)]);
      const sessions: LiveSession[] = rows.map((row: any) => Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value]),
      ));
      const payload = buildLive(sessions, now);
      for (const rule of payload.rules) {
        // Require adjacent successful minute aggregates, not merely two historical matches.
        const consecutive = old && now - +new Date(old.asOf) < 125000;
        await manager.query(`INSERT INTO growth_insights (id, evidence, streak, active)
          VALUES ($1, $2::jsonb, $3, false)
          ON CONFLICT (id) DO UPDATE SET evidence = EXCLUDED.evidence,
            streak = CASE WHEN $3 = 0 THEN 0 WHEN $4 THEN growth_insights.streak + 1 ELSE 1 END,
            active = CASE WHEN $3 = 0 THEN false ELSE $4 AND growth_insights.streak >= 1 END,
            "updatedAt" = now()`, [rule.id, JSON.stringify(rule), rule.triggered ? 1 : 0, !!consecutive]);
      }
      await manager.query(`INSERT INTO growth_live_snapshot (id, payload, "asOf") VALUES (1, $1::jsonb, $2)
        ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, "asOf" = EXCLUDED."asOf"`,
        [JSON.stringify(payload), new Date(now)]);
    });
  }

  async live() {
    const [snapshot] = await this.db.query('SELECT payload, "asOf" FROM growth_live_snapshot WHERE id = 1');
    if (!snapshot) return { dataStatus: 'pending', asOf: null, lastReceivedAt: null };
    return { ...snapshot.payload,
      dataStatus: Date.now() - +new Date(snapshot.asOf) > 125000 ? 'stale' : 'ready' };
  }

  async insights(status = '') {
    if (status && !INSIGHT_STATUSES.includes(status)) throw new BadRequestException('Invalid status');
    return this.db.query(`SELECT id, evidence, status, active, "createdAt", "updatedAt", version
      FROM growth_insights WHERE ($1 = '' OR status = $1) ORDER BY active DESC, id`, [status]);
  }

  async update(id: string, body: unknown, actor: string) {
    const input = body as { status?: string; version?: number } | null;
    if (!input || !INSIGHT_STATUSES.includes(input.status || '') || !Number.isSafeInteger(input.version) || input.version! < 1)
      throw new BadRequestException('Invalid status or version');
    return this.db.transaction(async manager => {
      const [row] = await manager.query('SELECT status, version FROM growth_insights WHERE id = $1 FOR UPDATE', [id]);
      if (!row) throw new NotFoundException('Insight not found');
      if (row.version !== input.version) throw new ConflictException('다른 관리자가 변경했습니다. 새로고침 후 다시 시도하세요.');
      if (row.status === input.status) return { status: row.status, version: row.version };
      await manager.query(`INSERT INTO growth_insight_audit ("insightId", "actorId", "fromStatus", "toStatus")
        VALUES ($1, $2, $3, $4)`, [id, actor, row.status, input.status]);
      const [updated] = await manager.query(`UPDATE growth_insights SET status = $2, version = version + 1
        WHERE id = $1 RETURNING status, version`, [id, input.status]);
      return updated;
    });
  }

  async audit(id: string) {
    return this.db.query(`SELECT "fromStatus", "toStatus", "createdAt" FROM growth_insight_audit
      WHERE "insightId" = $1 ORDER BY id DESC LIMIT 50`, [id]);
  }
}
