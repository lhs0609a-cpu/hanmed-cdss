import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Post } from '../entities/post.entity';
import { Reference } from '../entities/reference.entity';
import { buildContent, buildTitle } from './seed-community-references';

/**
 * 이미 올라간 문헌 소개글의 본문을 다시 만든다.
 *
 * 소개글 2천 편을 올린 뒤에 본문 서식이 바뀌었다. 영문 초록 발췌를 한국어
 * 구조 요약으로 갈아 끼웠는데, 새 글에만 적용되면 게시판에 두 가지 서식이
 * 섞인다. 먼저 올라간 글일수록 목록 아래로 밀려 있어 눈에 덜 띌 뿐이지
 * 사라지지는 않는다.
 *
 * 제목으로 원본 문헌을 되찾는다. Post 에 referenceId 를 두지 않았기
 * 때문인데, 제목이 이미 멱등 키라 그걸로 충분하다.
 *
 * 안전장치:
 *  - featuredInCommunity=true 인 문헌만 본다.
 *  - 본문이 실제로 달라질 때만 쓴다. 같은 내용을 다시 쓰면 updatedAt 만
 *    바뀌어 목록 정렬이 흔들린다.
 *  - --dry-run 으로 몇 편이 바뀌는지 먼저 볼 수 있다.
 *
 * 실행:
 *   npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *     src/database/seeds/refresh-reference-posts.ts --dry-run
 */

const DRY_RUN = process.argv.includes('--dry-run');

async function main(): Promise<void> {
  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();

  try {
    const refs = await ds.getRepository(Reference).find({
      where: { featuredInCommunity: true },
    });
    console.log(`게시판에 올린 문헌 ${refs.length}건을 확인합니다.`);

    const postRepo = ds.getRepository(Post);
    let changed = 0;
    let same = 0;
    let noPost = 0;
    let withDigest = 0;

    for (const r of refs) {
      const title = buildTitle(r);
      const post = await postRepo.findOne({ where: { title } });
      if (!post) {
        noPost += 1;
        continue;
      }

      const content = buildContent(r);
      if (content === post.content) {
        same += 1;
        continue;
      }
      if (r.abstractKo) withDigest += 1;
      if (!DRY_RUN) {
        await postRepo.update({ id: post.id }, { content });
      }
      changed += 1;
    }

    console.log(
      `\n${DRY_RUN ? '[dry-run] ' : ''}본문 갱신 ${changed}건 ` +
        `(그중 한국어 초록 요약 ${withDigest}건) · 그대로 ${same}건 · 글 못 찾음 ${noPost}건`,
    );
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
