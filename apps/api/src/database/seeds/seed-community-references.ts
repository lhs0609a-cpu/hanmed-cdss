import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Post, PostStatus, PostType } from '../entities/post.entity';
import { User } from '../entities/user.entity';
import {
  Reference,
  ReferenceEvidenceType,
} from '../entities/reference.entity';
import { buildTags } from './reference-tags';

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
    // 한국어로 번역된 것만 올린다. 영문 제목이 게시판을 덮으면 훑기가 안 되고,
    // 훑을 수 없는 게시판은 아무도 안 연다.
    .andWhere('r."titleKo" IS NOT NULL')
    .andWhere('r."summaryKo" IS NOT NULL')
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

/**
 * 제목은 한국어 제목만 쓴다.
 *
 * 앞에 "[문헌] 2024 체계적 고찰 —" 같은 머리말을 달았더니 목록에서 제목이
 * 다 잘려서 정작 무슨 내용인지 안 보였다. 근거 수준과 연도는 본문 표에
 * 있으므로 제목은 내용만 담는다.
 */
function buildTitle(r: Reference): string {
  const base = (r.titleKo || r.title).trim();
  return base.length > 200 ? `${base.slice(0, 197)}…` : base;
}

/**
 * 본문.
 *
 * 한국어 요약을 앞에 놓고, 서지정보는 표로 정리한다. 진료 중에 훑는 글이라
 * 저널·연도·근거수준이 문장에 섞여 있으면 눈에 안 들어온다.
 *
 * 초록 원문은 발췌만 인용한다. 초록의 저작권은 대개 출판사에 있고, 출처와
 * 링크를 밝힌 짧은 인용은 몰라도 전문 복제는 다른 이야기다.
 *
 * 요약이 기계가 만든 것이라는 사실을 숨기지 않는다. 한의사가 이걸 근거로
 * 삼기 전에 원문을 확인해야 한다는 것을 알아야 한다.
 */
function buildContent(r: Reference): string {
  const NL = String.fromCharCode(10);
  const parts: string[] = [];

  // 한국어 요약이 먼저. 이걸 보려고 들어온 것이다.
  parts.push(r.summaryKo ?? '');

  // 서지정보 표 — 저널·연도·근거수준이 문장에 섞여 있으면 눈에 안 들어온다.
  const rows: string[] = ['| 항목 | 내용 |', '|---|---|'];
  rows.push('| 근거 수준 | ' + EVIDENCE_LABEL[r.evidenceType] + ' |');
  if (r.journal) rows.push('| 학술지 | ' + r.journal + ' |');
  if (r.publishedYear) rows.push('| 발행 | ' + r.publishedYear + '년 |');
  if (r.authors.length > 0) {
    const who =
      r.authors.length > 3
        ? r.authors.slice(0, 3).join(', ') + ' 외 ' + (r.authors.length - 3) + '명'
        : r.authors.join(', ');
    rows.push('| 저자 | ' + who + ' |');
  }
  parts.push(rows.join(NL));

  // 원제 — 검색이나 인용에 쓰려면 필요하다.
  parts.push('**원제**' + NL + NL + r.title);

  // 저자의 말은 저자의 말로 표시한다. 우리가 요약해서 옮기면 그 요약의
  // 책임이 우리에게 오고, 요약 과정에서 조건과 한계가 떨어져 나간다.
  const excerpt = r.abstract
    ? r.abstract.length > EXCERPT_CHARS
      ? r.abstract.slice(0, EXCERPT_CHARS).trim() + '…'
      : r.abstract.trim()
    : null;
  if (excerpt) {
    const quoted = excerpt
      .split(/\r?\n+/)
      .map((line) => '> ' + line.trim())
      .filter((line) => line !== '>')
      .join(NL + '>' + NL);
    parts.push('**초록 일부 (원문)**' + NL + NL + quoted);
  }

  // 기계가 만든 요약이라는 사실을 숨기지 않는다. 한의사가 이걸 근거로 삼기
  // 전에 원문을 확인해야 한다는 것을 알아야 한다.
  parts.push(
    '---' +
      NL +
      NL +
      '위 한국어 요약은 기계 번역으로 만든 것입니다. 용량과 시술 프로토콜은 ' +
      '요약에 넣지 않았으니, 처방을 정하기 전에 원문을 확인해 주세요.',
  );

  const sources: string[] = ['- [원문 보기](' + r.url + ')'];
  if (r.doi) sources.push('- DOI: ' + r.doi);
  parts.push('**출처**' + NL + NL + sources.join(NL));

  // 답을 다 주고 끝내지 않는다. 답글이 달릴 자리를 남긴다.
  parts.push('임상에서 이 결과와 다르게 경험하신 분 계신가요?');

  return parts.join(NL + NL);
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
          // 태그가 없으면 목록이 제목 2천 줄이 되고 아무도 못 훑는다.
          tags: buildTags(r),
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
