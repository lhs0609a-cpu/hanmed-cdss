// Isolated PostgreSQL (WASM), no connection to the application database.
// npm install --prefix tmp/growth-test-deps --no-audit --no-fund @electric-sql/pglite
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PGlite } = require('../tmp/growth-test-deps/node_modules/@electric-sql/pglite');
const ts = require('../node_modules/typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true, emitDecoratorMetadata: true },
}).outputText, filename);
const { GrowthLive1789400000000 } = require('../apps/api/src/database/migrations/1789400000000-GrowthLive.ts');
const { GrowthLiveService } = require('../apps/api/src/modules/analytics/growth-live.service.ts');

async function main() {
  const pg = new PGlite();
  const checks = [];
  const out = path.resolve('output/realtime-growth-implementation');
  const wrap = db => ({ query: async (sql, params = []) => (await db.query(sql, params)).rows });
  const db = { ...wrap(pg), transaction: fn => pg.transaction(tx => fn(wrap(tx))) };
  const service = new GrowthLiveService(db);
  const migration = new GrowthLive1789400000000();
  const realNow = Date.now;
  const now = Math.floor(realNow() / 60000) * 60000;
  try {
    await pg.exec(`CREATE TABLE analytics_events (
      id uuid PRIMARY KEY, type text NOT NULL, properties jsonb NOT NULL,
      "sessionId" text NOT NULL, "createdAt" timestamptz NOT NULL, "occurredAt" timestamptz
    )`);
    await migration.up(db);
    checks.push('migration up');
    const visitor = randomUUID();
    const add = async (sid, type, minutes, extra = {}, eventId = randomUUID(), receivedMinutes = minutes) => {
      await pg.query(`INSERT INTO analytics_events VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`, [eventId, `growth_${type}`,
        JSON.stringify({ visitorId: visitor, source: 'direct', device: 'mobile', page: '/', ...extra }), sid,
        new Date(now - receivedMinutes * 60000).toISOString(), new Date(now - minutes * 60000).toISOString()]);
    };
    for (let i = 0; i < 20; i++) {
      await add(`current-${i}`, 'signup_submit', 10);
      if (i < 10) await add(`current-${i}`, 'signup_error', 9);
      if (i < 3) await add(`current-${i}`, 'signup_success', 8);
      await add(`previous-${i}`, 'signup_submit', 25);
      if (i < 2) await add(`previous-${i}`, 'signup_error', 24);
    }
    const duplicate = randomUUID();
    await add('recent-a', 'page_view', 2, {}, duplicate);
    await add('recent-a', 'page_view', 2, {}, duplicate);
    await add('recent-b', 'page_view', 1);
    await add('qa', 'page_view', 1, { source: 'deployment_check', visitorId: randomUUID() });
    await add('mixed-qa', 'page_view', 2, { visitorId: randomUUID() });
    await add('mixed-qa', 'click', 1, { medium: 'qa', visitorId: randomUUID() });
    await add('late', 'page_view', 70, {}, randomUUID(), 1);
    await add('closed-form', 'signup_start', 45);
    await add('old-context', 'page_view', 25 * 60);
    await add('old-context', 'page_view', 1, { visitorId: randomUUID() });
    Date.now = () => now;
    await service.aggregate();
    let live = await service.live();
    assert.equal(live.recentVisitors, 1);
    assert.equal(live.sampleSize, 43); // forty request sessions, two recent, one ended form
    assert.equal(live.feed.length, 2);
    assert.ok(!JSON.stringify(live).includes(visitor));
    checks.push('unique browser / QA whole-session exclusion / duplicate UUID / late event occurrence / old session boundary / no visitor IDs in snapshot');
    let insight = (await service.insights()).find(r => r.id === 'signup_error:mobile');
    assert.equal(insight.active, false);
    assert.equal(insight.evidence.numerator, 10);
    assert.equal(insight.evidence.recovered, 3);
    await service.aggregate();
    assert.equal((await service.insights()).find(r => r.id === insight.id).active, false);
    Date.now = () => now + 60000;
    await service.aggregate();
    insight = (await service.insights()).find(r => r.id === insight.id);
    assert.equal(insight.active, true);
    checks.push('two consecutive aggregates / same-minute deduplication / recovery separate from errors');
    const actor = randomUUID();
    await service.update(insight.id, { status: 'reviewing', version: 1 }, actor);
    await assert.rejects(() => service.update(insight.id, { status: 'closed', version: 1 }, actor), /다른 관리자/);
    assert.equal((await service.audit(insight.id)).length, 1);
    await assert.rejects(() => service.update(insight.id, { status: 'closed', version: 2 }, 'invalid-uuid'));
    assert.equal((await service.insights()).find(r => r.id === insight.id).status, 'reviewing');
    checks.push('persisted workflow / concurrent edit rejected / audit and status atomic rollback');
    Date.now = () => now + 240000;
    assert.equal((await service.live()).dataStatus, 'stale');
    assert.equal((await service.live()).recentVisitors, 1);
    await service.aggregate();
    assert.equal((await service.insights()).find(r => r.id === insight.id).active, false);
    checks.push('stale data preserved / aggregate gap resets confirmation');
    // More than the old report limit: aggregate sessions in SQL without truncation.
    await pg.query(`INSERT INTO analytics_events
      SELECT md5('load-' || n)::uuid, 'growth_click',
        jsonb_build_object('visitorId', $1::text, 'device', 'mobile', 'page', '/'),
        'recent-a', $2::timestamptz, $2::timestamptz FROM generate_series(1, 50001) AS n`,
      [visitor, new Date(now - 60000).toISOString()]);
    Date.now = () => now + 300000;
    const started = realNow();
    await service.aggregate();
    const loadMs = realNow() - started;
    assert.equal((await service.live()).sampleSize, 43);
    checks.push('50,001 additional events without report truncation');
    await migration.down(db);
    await migration.up(db);
    assert.equal((await service.live()).dataStatus, 'pending');
    checks.push('migration rollback / reapply');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'database-checks.json'), JSON.stringify({ checkedAt: new Date().toISOString(), checks, loadMs, database: 'isolated PGlite PostgreSQL; synthetic events only' }, null, 2));
    console.log(JSON.stringify({ checks, loadMs }));
  } finally { Date.now = realNow; await pg.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
