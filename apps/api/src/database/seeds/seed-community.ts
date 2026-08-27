import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Post, PostStatus, PostType } from '../entities/post.entity';
import { User } from '../entities/user.entity';
import { SEED_POSTS, SeedPost } from './community-seed';

/**
 * 커뮤니티 콜드스타트 시드.
 *
 * 설계 문서: docs/community-content-program.md
 *
 * 원칙 —
 *  1. **가짜 한의사를 만들지 않는다.** 작성자는 반드시 실재하는 운영팀 계정이어야 하고,
 *     --author-email 로 명시해야 한다. 없으면 만들지 않고 실패한다.
 *  2. **익명으로 쓰지 않는다.** isAnonymous 는 항상 false 다. 운영팀 글이라는 것이
 *     보여야 한다.
 *  3. **조회수·좋아요·댓글 수를 채우지 않는다.** 전부 0 으로 둔다. 없는 인기를
 *     만들면 그 게시판의 숫자를 아무도 못 믿게 된다.
 *  4. **한 번에 다 올리지 않는다.** --limit 으로 앞에서부터 끊어 올린다.
 *
 * 멱등: 제목 기준. 같은 제목의 글이 이미 있으면 건너뛴다.
 *
 * 실행:
 *   npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *     src/database/seeds/seed-community.ts --author-email=team@ongojisin.ai --limit=8
 *   ... --dry-run   (저장하지 않고 무엇이 올라갈지만 출력)
 */

function argValue(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

const DRY_RUN = process.argv.includes('--dry-run');
const AUTHOR_EMAIL = argValue('author-email');
const LIMIT = Number(argValue('limit') ?? '0') || SEED_POSTS.length;

/** 본문 말미에 출처를 붙인다. 출처 없는 주장은 이 게시판에 올리지 않는다. */
function renderContent(post: SeedPost): string {
  if (post.sources.length === 0) return post.content;

  const lines = post.sources.map((s) =>
    s.url ? `- [${s.label}](${s.url})` : `- ${s.label}`,
  );
  return `${post.content}\n\n---\n\n**출처**\n\n${lines.join('\n')}`;
}

async function main(): Promise<void> {
  if (!AUTHOR_EMAIL) {
    console.error(
      '--author-email 이 필요합니다. 운영팀 계정으로만 올립니다.\n' +
        '예: --author-email=team@ongojisin.ai',
    );
    process.exit(1);
  }

  const targets = SEED_POSTS.slice(0, LIMIT);
  console.log(
    `[community] ${targets.length}/${SEED_POSTS.length}편 대상${DRY_RUN ? ' (dry-run)' : ''}`,
  );

  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();
  try {
    const users = ds.getRepository(User);
    const posts = ds.getRepository(Post);

    const author = await users.findOne({ where: { email: AUTHOR_EMAIL } });
    if (!author) {
      // 계정을 여기서 만들지 않는다. 시드 스크립트가 사용자를 창조하기 시작하면
      // '가짜 한의사를 만들지 않는다' 는 원칙이 코드 한 줄로 무너진다.
      throw new Error(
        `작성자 계정을 찾을 수 없습니다: ${AUTHOR_EMAIL}\n` +
          '운영팀 계정을 먼저 가입시킨 뒤 다시 실행해 주세요.',
      );
    }
    console.log(`[community] 작성자: ${author.name} <${author.email}>`);

    let created = 0;
    let skipped = 0;

    for (const seed of targets) {
      const exists = await posts.findOne({
        where: { title: seed.title },
        select: ['id'],
      });
      if (exists) {
        console.log(`  건너뜀(이미 있음): ${seed.title}`);
        skipped++;
        continue;
      }

      if (DRY_RUN) {
        console.log(
          `  [${seed.type}] ${seed.title}` +
            `${seed.isPinned ? ' (고정)' : ''} — 태그 ${seed.tags.join(', ')}, 출처 ${seed.sources.length}건`,
        );
        created++;
        continue;
      }

      await posts.save(
        posts.create({
          title: seed.title,
          content: renderContent(seed),
          type: seed.type as PostType,
          authorId: author.id,
          // 운영팀 글은 익명으로 쓰지 않는다 — 누가 쓴 글인지 보여야 한다.
          isAnonymous: false,
          tags: seed.tags,
          isPinned: seed.isPinned ?? false,
          status: PostStatus.ACTIVE,
          // 조회수·좋아요·댓글 수는 기본값 0 그대로 둔다.
        }),
      );
      console.log(`  올림: ${seed.title}`);
      created++;
    }

    console.log(
      `\n[community] ${DRY_RUN ? '올릴 예정' : '올림'} ${created}편, 건너뜀 ${skipped}편`,
    );
    if (!DRY_RUN && created > 0) {
      console.log(
        '\n다음 할 일 — 한의사가 답글을 남기면 24시간 안에 답해 주세요.\n' +
          '첫 답글이 안 달리면 그분의 두 번째 글은 없습니다.',
      );
    }
  } finally {
    await ds.destroy();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[community] 실패:', e instanceof Error ? e.message : e);
    process.exit(1);
  });
