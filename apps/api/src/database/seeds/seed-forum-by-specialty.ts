import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Post, PostStatus, PostType } from '../entities/post.entity';
import { Reference, ReferenceSource } from '../entities/reference.entity';
import { User } from '../entities/user.entity';
import { buildTitle, buildContent } from './seed-community-references';
import { classifySpecialty, SPECIALTIES } from './forum-specialty';

/**
 * 전문 포럼을 분과별로 채운다.
 *
 * 포럼이 비어 있었다. 재료는 KCI 국문 논문 12,829편이 있는데, 그대로
 * 올리면 임상정보 게시판과 똑같은 물건이 된다. 그래서 분과로 갈라
 * 올린다 — "부인과 자료만 보자" 가 되는 순간 포럼이 임상정보와 다른
 * 쓸모를 갖는다.
 *
 * 임상정보 태그를 달지 않는다. 그 태그는 예약 태그라 유형 목록에서
 * 빠진다(findAllPosts 의 RESERVED_BOARD_TAGS). 달면 포럼에 올려 놓고
 * 포럼에서 안 보이는 글이 된다.
 *
 * 분과를 고르게 채운다. 그냥 최신순으로 1,000편을 뜨면 한방내과가 절반을
 * 가져가고 소아과는 한 편도 안 들어간다. 분과를 돌아가며 한 편씩 집는다.
 *
 * 본문과 제목은 임상정보 쪽과 같은 것을 쓴다. 같은 논문을 게시판만 달리해
 * 두 벌로 쓰는 것이 아니다 — 여기 올리는 것은 임상정보에 올린 적 없는
 * 논문뿐이고, 올린 뒤에는 featuredInCommunity 로 표시해 두 번 올라가지
 * 않게 한다.
 *
 * 실행:
 *   npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *     src/database/seeds/seed-forum-by-specialty.ts --limit=50 --dry-run
 *   ... --limit=1200        (실제로 올린다)
 *   ... --stats-only        (분과별 후보 수만 본다)
 */

function argValue(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

const LIMIT = Number(argValue('limit') ?? '50') || 50;
const DRY_RUN = process.argv.includes('--dry-run');
const STATS_ONLY = process.argv.includes('--stats-only');

/** 포럼 글임을 나타내는 태그. 화면 배지가 아니라 훑기 위한 것이다. */
const FORUM_TAG = '전문포럼';

async function main() {
  const ds = await new DataSource(dataSourceOptions).initialize();
  try {
    const refRepo = ds.getRepository(Reference);
    const postRepo = ds.getRepository(Post);
    const userRepo = ds.getRepository(User);

    const author = await userRepo.findOne({
      where: { role: 'content_manager' as User['role'] },
    });
    if (!author) throw new Error('운영팀 계정이 없습니다.');

    // 한국어 요약과 한글 제목이 모두 있는 것만. 둘 중 하나라도 없으면
    // 게시판에서 읽히지 않는 글이 된다.
    const refs = await refRepo
      .createQueryBuilder('r')
      .where('r.source = :src', { src: ReferenceSource.KCI })
      .andWhere('r."featuredInCommunity" = false')
      .andWhere(`r."abstractKo" IS NOT NULL AND length(r."abstractKo") > 50`)
      .andWhere(`r."titleKo" IS NOT NULL AND r."titleKo" ~ '[가-힣]'`)
      .orderBy('r."publishedYear"', 'DESC', 'NULLS LAST')
      .getMany();

    // 분과별로 줄을 세운다.
    const lanes = new Map<string, Reference[]>();
    for (const s of SPECIALTIES) lanes.set(s.tag, []);
    for (const r of refs) {
      const s = classifySpecialty(r);
      if (s) lanes.get(s)!.push(r);
    }

    if (STATS_ONLY) {
      console.log(`후보 ${refs.length}건 중 분과가 잡힌 것:`);
      for (const [tag, list] of lanes) {
        if (list.length) console.log(`  ${tag.padEnd(10)} ${String(list.length).padStart(5)}건`);
      }
      return;
    }

    // 분과를 돌아가며 한 편씩. 한 분과가 목록을 독차지하지 않게.
    const picked: Array<{ ref: Reference; specialty: string }> = [];
    const cursors = new Map<string, number>();
    for (const tag of lanes.keys()) cursors.set(tag, 0);

    while (picked.length < LIMIT) {
      let movedAny = false;
      for (const [tag, list] of lanes) {
        if (picked.length >= LIMIT) break;
        const i = cursors.get(tag)!;
        if (i >= list.length) continue;
        picked.push({ ref: list[i], specialty: tag });
        cursors.set(tag, i + 1);
        movedAny = true;
      }
      if (!movedAny) break; // 모든 분과가 바닥났다
    }

    let created = 0;
    let skipped = 0;
    const bySpecialty = new Map<string, number>();

    for (const { ref, specialty } of picked) {
      const title = buildTitle(ref);
      const existing = await postRepo.findOne({ where: { title } });
      if (existing) {
        skipped += 1;
        if (!DRY_RUN) {
          await refRepo.update({ id: ref.id }, { featuredInCommunity: true });
        }
        continue;
      }

      const tags = [FORUM_TAG, specialty];

      if (DRY_RUN) {
        console.log(`  [${specialty}] ${title}`);
        created += 1;
        bySpecialty.set(specialty, (bySpecialty.get(specialty) ?? 0) + 1);
        continue;
      }

      await postRepo.save(
        postRepo.create({
          title,
          content: buildContent(ref),
          type: PostType.FORUM,
          authorId: author.id,
          isAnonymous: false,
          tags,
          status: PostStatus.ACTIVE,
        }),
      );
      await refRepo.update({ id: ref.id }, { featuredInCommunity: true });
      created += 1;
      bySpecialty.set(specialty, (bySpecialty.get(specialty) ?? 0) + 1);
    }

    console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}올림 ${created}건 · 이미 있어 건너뜀 ${skipped}건`);
    for (const [tag, n] of [...bySpecialty.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${tag.padEnd(10)} ${String(n).padStart(4)}건`);
    }
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
