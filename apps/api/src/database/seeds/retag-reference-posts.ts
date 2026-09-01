import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Post } from '../entities/post.entity';
import { Reference } from '../entities/reference.entity';
import { buildTags } from './reference-tags';

/**
 * 이미 올라간 문헌 소개글에 태그를 소급 적용한다.
 *
 * seed-community-references 가 태그를 안 달던 시절에 2천 편이 올라갔다.
 * 그 글들은 태그가 null 이라 게시판에서 걸러낼 방법이 없다.
 *
 * 연결 고리는 제목이다. 소개글의 제목은 문헌의 titleKo 를 그대로 쓰므로
 * (buildTitle 참고) 제목으로 원본 문헌을 되찾을 수 있다. Post 에
 * referenceId 를 두지 않았기 때문인데, 지금 컬럼을 추가하면 마이그레이션이
 * 붙고 되돌리기 어려워진다. 제목 매칭으로 충분한 일이다.
 *
 * 안전장치:
 *  - featuredInCommunity=true 인 문헌만 본다. 게시판에 안 올린 문헌의
 *    제목이 우연히 겹쳐 엉뚱한 글을 건드리는 일을 막는다.
 *  - 이미 태그가 있는 글은 건너뛴다. 사람이 손으로 단 태그를 덮어쓰면
 *    복구할 방법이 없다.
 *  - --dry-run 으로 무엇이 바뀔지 먼저 볼 수 있다.
 *
 * 실행:
 *   npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *     src/database/seeds/retag-reference-posts.ts --dry-run
 */

const DRY_RUN = process.argv.includes('--dry-run');

async function main(): Promise<void> {
  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();

  try {
    const refs = await ds.getRepository(Reference).find({
      where: { featuredInCommunity: true },
    });
    console.log(`게시판에 올린 문헌 ${refs.length}건을 확인합니다.`);

    const postRepo = ds.getRepository(Post);
    let updated = 0;
    let hadTags = 0;
    let noPost = 0;
    const tagCount = new Map<string, number>();

    for (const r of refs) {
      const title = r.titleKo;
      if (!title) continue;

      const post = await postRepo.findOne({ where: { title } });
      if (!post) {
        noPost += 1;
        continue;
      }
      // 사람이 단 태그는 건드리지 않는다.
      if (post.tags && post.tags.length > 0) {
        hadTags += 1;
        continue;
      }

      const tags = buildTags(r);
      for (const t of tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);

      if (!DRY_RUN) {
        await postRepo.update({ id: post.id }, { tags });
      }
      updated += 1;
    }

    console.log(
      `\n${DRY_RUN ? '[dry-run] ' : ''}태그 적용 ${updated}건 · ` +
        `이미 태그 있어 건너뜀 ${hadTags}건 · 글을 못 찾음 ${noPost}건`,
    );

    const ranked = [...tagCount.entries()].sort((a, b) => b[1] - a[1]);
    console.log('\n붙은 태그 분포:');
    for (const [tag, n] of ranked) {
      console.log(`  ${tag.padEnd(12)} ${n}`);
    }
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
