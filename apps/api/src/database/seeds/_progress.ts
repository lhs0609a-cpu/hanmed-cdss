import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
(async () => {
  const ds = new DataSource({ ...dataSourceOptions, logging: false } as never);
  await ds.initialize();
  const [r] = await ds.query(`
    SELECT COUNT(*)::int AS total,
           COUNT("summarizedAt")::int AS done,
           COUNT(*) FILTER (WHERE "formulaMismatch")::int AS mismatch,
           COUNT(*) FILTER (WHERE "hasMixedContent")::int AS mixed
      FROM "clinical_cases"`);
  console.log('PROGRESS', JSON.stringify(r));
  await ds.destroy();
})();
