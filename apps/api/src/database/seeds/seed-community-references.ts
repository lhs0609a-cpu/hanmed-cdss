import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Post, PostStatus, PostType } from '../entities/post.entity';
import { User } from '../entities/user.entity';
import {
  Reference,
  ReferenceEvidenceType,
} from '../entities/reference.entity';

/**
 * 자료실 문헌을 커뮤니티에 소개한다.
 *
 * 자료실에 1만 건이 있어도 게시판은 여전히 비어 있다. 그렇다고 1만 건을 통째로
 * 게시판에 부으면 그건 커뮤니티가 아니라 포럼 껍데기를 쓴 데이터베이스다 —
 * 사람 글 스무 개 옆에 봇 글 1만 개가 있으면 아무도 거기서 대화하지 않는다.
 *
 * 그래서 자료실이 본체이고, 게시판에는 값어치 있는 것만 골라 소개한다.
 * seed-community.ts 의 원칙을 그대로 따른다:
 *
 *  1. 작성자는 실재하는 운영팀 계정. --author-email 없으면 실패한다.
 *  2. 익명으로 쓰지 않는다.
 *  3. 조회수·좋아요·댓글 수를 채우지 않는다.
 *  4. 한 번에 다 올리지 않는다. --limit 으로 끊는다.
 *  5. 출처는 본문 말미에 반드시 붙인다.
 *
 * 여기에 하나 더:
 *  6. **해설을 지어내지 않는다.** 논문이 말하지 않은 임상적 의의를 우리가 써넣으면
 *     그 순간 이 글은 근거가 아니라 광고가 된다. 서지정보와 저자의 초록 일부만
 *     인용하고, 판단은 읽는 사람에게 맡긴다.
 *
 * 초록을 통째로 옮기지 않고 발췌만 하는 이유는 저작권이다. 초록의 저작권은
 * 대개 출판사에 있다. 출처와 원문 링크를 밝힌 짧은 인용은 저작권법 제28조의
 * 정당한 범위로 볼 여지가 있지만, 전문 복제는 그렇지 않다.
 *
 * 멱등: 제목 기준 + Reference.featuredInCommunity 플래그. 같은 문헌을 두 번
 * 소개하지 않는다.
 *
 * 실행:
 *   npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *     src/database/seeds/seed-community-references.ts \
 *     --author-email=team@ongojisin.ai --limit=5
 *   ... --dry-run
 */

function argValue(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

const DRY_RUN = process.argv.includes('--dry-run');
const AUTHOR_EMAIL = argValue('author-email');
const LIMIT = Number(argValue('limit') ?? '5') || 5;

/** 인용 발췌 상한. 전문 복제를 피하면서 무엇에 관한 글인지는 전해질 길이. */
const EXCERPT_CHARS = 300;

const EVIDENCE_LABEL: Record<ReferenceEvidenceType, string> = {
  [ReferenceEvidenceType.SYSTEMATIC_REVIEW]: '체계적 고찰·메타분석',
  [ReferenceEvidenceType.RCT]: '무작위 대조 시험',
  [ReferenceEvidenceType.GUIDELINE]: '진료지침',
  [ReferenceEvidenceType.OBSERVATIONAL]: '관찰 연구',
  [ReferenceEvidenceType.CASE_REPORT]: '증례 보고',
  [ReferenceEvidenceType.REVIEW]: '종설',
  [ReferenceEvidenceType.UNKNOWN]: '분류 미상',
};

/**
 * 소개할 문헌 고르기.
 *
 * 근거 수준이 높은 것부터, 최근 것부터. 증례보고나 미분류는 게시판에 올리지
 * 않는다 — 자료실에서 검색되면 충분하고, 게시판에 올린다는 것은 "이건 읽어볼
 * 만하다" 는 말이라 아무거나 올리면 그 말이 값을 잃는다.
 */
function pickQuery(ds: DataSource, limit: number) {
  return ds
    .getRepository(Reference)
    .createQueryBuilder('r')
    .where('r."featuredInCommunity" = false')
    .andWhere('r."abstract" IS NOT NULL')
    .andWhere('r."evidenceType" IN (:...types)', {
      types: [
        ReferenceEvidenceType.SYSTEMATIC_REVIEW,
        ReferenceEvidenceType.RCT,
        ReferenceEvidenceType.GUIDELINE,
      ],
    })
    .orderBy(
      `CASE r."evidenceType"
         WHEN '${ReferenceEvidenceType.SYSTEMATIC_REVIEW}' THEN 1
         WHEN '${ReferenceEvidenceType.RCT}' THEN 2
         ELSE 3 END`,
      'ASC',
    )
    .addOrderBy('r."publishedAt"', 'DESC', 'NULLS LAST')
    .take(limit)
    .getMany();
}

/** 제목은 사람이 읽는 문장으로. 원제를 그대로 쓰면 영문 제목이 게시판을 덮는다. */
function buildTitle(r: Reference): string {
  const year = r.publishedYear ? `${r.publishedYear} ` : '';
  const kind = EVIDENCE_LABEL[r.evidenceType];
  const base = r.titleKo || r.title;
  const title = `[문헌] ${year}${kind} — ${base}`;
  return title.length > 200 ? `${title.slice(0, 197)}…` : title;
}

function buildContent(r: Reference): string {
  const meta: string[] = [];
  if (r.journal) meta.push(r.journal);
  if (r.publishedYear) meta.push(String(r.publishedYear));
  meta.push(EVIDENCE_LABEL[r.evidenceType]);

  const authors =
    r.authors.length > 0
      ? `${r.authors.slice(0, 3).join(', ')}${r.authors.length > 3 ? ` 외 ${r.authors.length - 3}명` : ''}`
      : null;

  const excerpt = r.abstract
    ? r.abstract.length > EXCERPT_CHARS
      ? `${r.abstract.slice(0, EXCERPT_CHARS).trim()}…`
      : r.abstract.trim()
    : null;

  const parts: string[] = [];
  parts.push(`**${r.title}**`);
  parts.push(meta.join(' · '));
  if (authors) parts.push(authors);

  if (excerpt) {
    // 저자의 말을 저자의 말로 표시한다. 우리가 요약해서 옮기면 그 요약의
    // 책임이 우리에게 오고, 요약 과정에서 조건과 한계가 떨어져 나간다.
    parts.push(`\n> ${excerpt.replace(/\n+/g, '\n> ')}\n`);
    parts.push('_위는 저자 초록의 일부입니다. 전체 내용과 한계는 원문에서 확인해 주세요._');
  }

  // 답을 다 주고 끝내지 않는다. 답글이 달릴 자리를 남기는 것이 요점이다.
  parts.push('\n임상에서 이 결과와 다르게 경험하신 분 계신가요?');

  const sources: string[] = [`- [원문 보기](${r.url})`];
  if (r.doi) sources.push(`- DOI: ${r.doi}`);
  parts.push(`\n---\n\n**출처**\n\n${sources.join('\n')}`);

  return parts.join('\n');
}

async function main(): Promise<void> {
  if (!AUTHOR_EMAIL) {
    console.error(
      '--author-email 이 필요합니다. 운영팀 계정으로만 올립니다.\n' +
        '예: --author-email=team@ongojisin.ai',
    );
    process.exit(1);
  }

  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();

  try {
    const author = await ds
      .getRepository(User)
      .findOne({ where: { email: AUTHOR_EMAIL } });
    if (!author) {
      // 시드 스크립트가 사용자를 창조하기 시작하면 어디까지가 진짜인지
      // 알 수 없어진다. 만들지 않고 실패한다.
      console.error(
        `작성자 계정을 찾을 수 없습니다: ${AUTHOR_EMAIL}\n` +
          '계정을 먼저 만든 뒤 다시 실행해 주세요. 이 스크립트는 사용자를 만들지 않습니다.',
      );
      process.exit(1);
    }

    const picks = await pickQuery(ds, LIMIT);
    if (picks.length === 0) {
      console.log('소개할 문헌이 없습니다. 자료실 수집을 먼저 돌려 주세요.');
      return;
    }

    const postRepo = ds.getRepository(Post);
    const refRepo = ds.getRepository(Reference);
    let created = 0;
    let skipped = 0;

    for (const r of picks) {
      const title = buildTitle(r);
      const exists = await postRepo.findOne({ where: { title } });
      if (exists) {
        skipped += 1;
        // 이미 올라간 글이면 플래그만 맞춰 둔다. 다음 실행에서 또 후보로
        // 올라오지 않게 하는 것이 목적이다.
        if (!DRY_RUN) {
          await refRepo.update({ id: r.id }, { featuredInCommunity: true });
        }
        continue;
      }

      const content = buildContent(r);
      if (DRY_RUN) {
        console.log(`\n${'='.repeat(70)}\n${title}\n${'-'.repeat(70)}\n${content}`);
        created += 1;
        continue;
      }

      await postRepo.save(
        postRepo.create({
          title,
          content,
          // 케이스 토론이 아니라 문헌 소개다. 전문 포럼에 둔다.
          type: PostType.FORUM,
          authorId: author.id,
          // 운영팀 글이라는 것이 보여야 한다.
          isAnonymous: false,
          status: PostStatus.ACTIVE,
        }),
      );
      await refRepo.update({ id: r.id }, { featuredInCommunity: true });
      created += 1;
      console.log(`올림: ${title}`);
    }

    console.log(
      `\n${DRY_RUN ? '[dry-run] ' : ''}소개 ${created}건 · 이미 있어 건너뜀 ${skipped}건`,
    );
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
