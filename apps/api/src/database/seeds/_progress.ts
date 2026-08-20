import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
(async () => {
  const ds = new DataSource({ ...dataSourceOptions, logging: false } as never);
  await ds.initialize();
  const [r] = await ds.query(`
    SELECT COUNT(*)::int AS total, COUNT("summarizedAt")::int AS done,
           COUNT(*) FILTER (WHERE "formulaMismatch")::int AS mismatch
      FROM "clinical_cases"`);
  console.log('PROGRESS', JSON.stringify(r));
  const [one] = await ds.query(
    `SELECT "summaryOneLine","verifiedFormulaName","formulaMismatch","summarizedAt"
       FROM "clinical_cases" WHERE "id"=$1`,
    ['4a41779b-76d1-464c-b1bb-03d00e06be64'],
  );
  console.log('CASE', JSON.stringify(one));
  await ds.destroy();
})();
