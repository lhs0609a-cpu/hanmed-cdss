import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
(async () => {
  const ds = new DataSource({ ...dataSourceOptions, logging: false } as never);
  await ds.initialize();
  const [r] = await ds.query(`
    SELECT COUNT(*)::int AS total,
           COUNT("summarizedAt")::int AS done,
           COUNT(*) FILTER (WHERE "formulaMismatch")::int AS mismatch,
           COUNT(*) FILTER (WHERE "hasMixedContent")::int AS mixed,
           COUNT(*) FILTER (WHERE "summaryOneLine" IS NOT NULL)::int AS has_summary,
           COUNT(*) FILTER (WHERE jsonb_array_length("courseSteps") > 0)::int AS has_course,
           COUNT(*) FILTER (WHERE "distinctive" IS NOT NULL)::int AS has_distinct,
           COUNT(*) FILTER (WHERE jsonb_array_length("keyFindings") > 0)::int AS has_findings,
           COUNT(*) FILTER (WHERE "modification" IS NOT NULL)::int AS has_mod
      FROM "clinical_cases"`);
  console.log('PROGRESS', JSON.stringify(r));
  const [t] = await ds.query(`
    SELECT MIN("summarizedAt") AS started, MAX("summarizedAt") AS latest
      FROM "clinical_cases" WHERE "summarizedAt" IS NOT NULL`);
  console.log('TIME', JSON.stringify(t));
  const rest = await ds.query(`
    SELECT ROUND(AVG(LENGTH("originalText")))::int AS avg_remaining
      FROM "clinical_cases" WHERE "summarizedAt" IS NULL`);
  console.log('REMAIN', JSON.stringify(rest[0]));
  await ds.destroy();
})();
