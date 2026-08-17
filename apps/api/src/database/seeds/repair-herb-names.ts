import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Herb } from '../entities/herb.entity';
import { FormulaHerb } from '../entities/formula-herb.entity';

/**
 * 약재명에 섞여 들어간 용량 표기 정리.
 *
 * all-formulas.json 의 composition[].herb 는 "木香五分", "白茯神各一錢", "薑五片" 처럼
 * 약재명과 용량이 한 문자열에 붙어 있다. 초기 시드가 이를 그대로 herbs_master 에 넣어
 * 약재 마스터가 오염됐다("木香" 과 "木香五分" 이 별개 약재로 존재).
 *
 * 이 스크립트는:
 *   1) 용량 접미사를 떼어 정식 약재명을 구한다.
 *   2) 정식 약재가 없으면 만들고,
 *   3) 오염된 약재를 참조하던 formula_herbs 를 정식 약재로 옮기면서
 *      떼어낸 용량을 amount 가 비어 있을 때만 채운다.
 *   4) 참조가 사라진 오염 약재 행을 삭제한다.
 *
 * 멱등: 이미 정리된 상태에서 다시 돌리면 대상이 없어 아무 일도 하지 않는다.
 */

// 한자 수사 + 단위. "各" 은 선택. 문자열 끝에 붙은 것만 제거한다.
const DOSAGE_SUFFIX =
  /(各)?[一二三四五六七八九十百千半兩\d]+(錢|分|兩|片|枚|斤|升|合|匙|貼|g|G)$/u;

function splitNameAndAmount(raw: string): { name: string; amount: string } {
  const trimmed = (raw || '').replace(/\s+/g, '').trim();
  const m = trimmed.match(DOSAGE_SUFFIX);
  if (!m) return { name: trimmed, amount: '' };
  const name = trimmed.slice(0, trimmed.length - m[0].length);
  // 약재명이 통째로 사라지면(=용량만 있는 문자열) 건드리지 않는다.
  if (!name) return { name: trimmed, amount: '' };
  return { name, amount: m[0].replace(/^各/, '') };
}

async function repair(): Promise<void> {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();
  console.log('[repair] DB 연결됨');

  try {
    const herbRepo = dataSource.getRepository(Herb);
    const linkRepo = dataSource.getRepository(FormulaHerb);

    const all = await herbRepo.find();
    console.log(`[repair] 약재 마스터 ${all.length}건 검사`);

    let moved = 0;
    let removed = 0;
    let created = 0;

    for (const herb of all) {
      const { name, amount } = splitNameAndAmount(herb.standardName);
      if (name === herb.standardName) continue; // 정상

      // 정식 약재 확보
      let canonical = await herbRepo.findOne({ where: { standardName: name } });
      if (!canonical) {
        canonical = await herbRepo.save(
          herbRepo.create({
            standardName: name,
            hanjaName: name,
            category: herb.category || '미분류',
          }),
        );
        created++;
      }

      // 참조 이전
      const links = await linkRepo.find({ where: { herbId: herb.id } });
      for (const link of links) {
        const dup = await linkRepo.findOne({
          where: { formulaId: link.formulaId, herbId: canonical.id },
        });
        if (dup) {
          // 이미 정식 약재로 연결돼 있으면 오염 링크는 버린다.
          await linkRepo.delete({ id: link.id });
          continue;
        }
        link.herbId = canonical.id;
        if (!link.amount && amount) link.amount = amount;
        await linkRepo.save(link);
        moved++;
      }

      // 레거시 스네이크 컬럼(herb_id)도 같이 옮긴다.
      // 엔티티가 더 이상 매핑하지 않지만 FK 제약은 살아 있어서, 여기를 놔두면
      // 아래 삭제가 "still referenced from table formula_herbs" 로 막힌다.
      await dataSource.query(
        `UPDATE "formula_herbs" SET herb_id = $1 WHERE herb_id = $2`,
        [canonical.id, herb.id],
      );
      await dataSource.query(
        `UPDATE "herb_compounds" SET herb_id = $1 WHERE herb_id = $2`,
        [canonical.id, herb.id],
      ).catch(() => undefined);
      await dataSource.query(
        `UPDATE "drug_herb_interactions" SET herb_id = $1 WHERE herb_id = $2`,
        [canonical.id, herb.id],
      ).catch(() => undefined);

      await herbRepo.delete({ id: herb.id });
      removed++;
      console.log(`  ${herb.standardName} → ${name}${amount ? ` (용량 ${amount})` : ''}`);
    }

    const remaining = await herbRepo.count();
    console.log(
      `[repair] 링크 이전 ${moved}건 · 정식 약재 생성 ${created}건 · 오염 약재 삭제 ${removed}건 · 남은 약재 ${remaining}건`,
    );
  } finally {
    await dataSource.destroy();
  }
}

repair()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[repair] 실패:', e);
    process.exit(1);
  });
