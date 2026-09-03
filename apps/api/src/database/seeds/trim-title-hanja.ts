import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Post } from '../entities/post.entity';
import { Reference } from '../entities/reference.entity';
import { buildTitle } from './seed-community-references';

/**
 * 제목에서 필요 없는 한자 병기를 걷어낸다.
 *
 * hangulize-reference-titles 가 한자 제목에 한글 독음을 입히면서, 원어를
 * 알아야 하는 말만 괄호로 병기하기로 해 놓고 실제로는 흔한 낱말까지 달았다.
 * 그 스크립트 주석이 미리 경고한 그대로다 — "전부 병기하면 괄호가 제목을
 * 덮어 읽기가 더 나빠진다".
 *
 *   전  Amp-FLP을 이용(利用)한 사상체질(四象體質)의 유전적(遺傳的) 분석(分析) 연구(硏究)
 *   후  Amp-FLP을 이용한 사상체질(四象體質)의 유전적 분석 연구
 *
 * 무엇을 남기는가. 처방명·서명·인명·체질명은 원어가 정보다. 사상체질을
 * 四象體質 로 아는 사람이 있고, 《일관당의학(一貫堂醫學)》은 병기가 없으면
 * 어느 책인지 찾을 수 없다. 반면 고찰·연구·분석·효과 는 한자를 봐도 새로
 * 알게 되는 것이 없다.
 *
 * 그래서 지울 말을 목록으로 못박는다. 반대로 "남길 말"을 정하는 방식은
 * 목록에 없는 새 낱말이 들어오면 지워 버리므로 안전하지 않다.
 *
 * 독음 자체는 건드리지 않는다. 이 스크립트는 괄호만 뗀다.
 *
 * 실행:
 *   npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *     src/database/seeds/trim-title-hanja.ts --dry-run
 *   ... (플래그 없이)  실제로 반영
 */

const DRY_RUN = process.argv.includes('--dry-run');

/** 한자를 병기할 이유가 없는 낱말. 한글만 보고 바로 읽힌다. */
const COMMON = new Set([
  '고찰', '연구', '분석', '효과', '현황', '전망', '비교', '평가', '활용',
  '응용', '개발', '유형', '관련성', '상관관계', '이용', '유전적', '과정',
  '형성', '발전', '특징', '기원', '임상', '치료', '증례', '문헌', '대한',
  '중심', '객관화', '도입', '검토', '방법', '관', '한', '및',
]);

export function trimTitleHanja(title: string): string {
  return title
    // "대(對)한" — 낱말이 괄호 앞에서 끊겨 '대' 만 잡히므로 위 규칙에 안 걸린다.
    // '대' 를 목록에 넣으면 대(大)·대(帶) 까지 지워지니 이 꼴만 콕 집는다.
    .replace(/대\(對\)한/g, '대한')
    .replace(/([가-힣]+)\(([一-鿿]+)\)/g, (whole, ko: string) =>
      COMMON.has(ko) ? ko : whole,
    )
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function main() {
  const ds = await new DataSource(dataSourceOptions).initialize();
  try {
    const refRepo = ds.getRepository(Reference);
    const postRepo = ds.getRepository(Post);

    // 게시판에 올린 것만 손댄다. 화면에 보이지 않는 3만여 건까지 건드릴
    // 이유가 없고, 되돌릴 일이 생겼을 때 범위가 좁아야 한다.
    const refs = await refRepo
      .createQueryBuilder('r')
      .where('r."featuredInCommunity" = true')
      .andWhere(`r."titleKo" ~ '\\([一-鿿]+\\)'`)
      .getMany();

    let changed = 0;
    let posts = 0;

    for (const r of refs) {
      const before = (r.titleKo || '').trim();
      const after = trimTitleHanja(before);
      if (!after || after === before) continue;

      changed += 1;
      if (DRY_RUN) {
        console.log(`  전 ${before}\n  후 ${after}\n`);
        continue;
      }

      // 게시글을 먼저 찾는다. titleKo 를 먼저 바꾸면 옛 제목으로 만든
      // 게시글을 다시는 찾을 수 없다. hangulize 쪽과 같은 순서다.
      const oldTitle = buildTitle(r);
      const post = await postRepo.findOne({ where: { title: oldTitle } });

      await refRepo.update({ id: r.id }, { titleKo: after });
      if (post) {
        await postRepo.update(
          { id: post.id },
          { title: buildTitle({ ...r, titleKo: after } as Reference) },
        );
        posts += 1;
      }
    }

    console.log(
      `\n${DRY_RUN ? '[dry-run] ' : ''}대상 ${refs.length}건 · 제목 ${changed}건 · 게시글 ${posts}건`,
    );
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
