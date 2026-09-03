import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Post, PostStatus, PostType } from '../entities/post.entity';
import { User } from '../entities/user.entity';
import {
  Reference,
  ReferenceEvidenceType,
  ReferenceSource,
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

/**
 * 출처를 지정해서 올린다. --source=kci 처럼.
 *
 * 정렬이 근거수준 우선이라 PubMed 체계적 고찰이 앞을 다 채운다. KCI 는
 * 한국어 제목으로 연구유형이 잘 안 잡혀 대부분 unknown 이고, 그래서 뒤로
 * 밀려 700건을 올려도 10건밖에 안 들어갔다. 출처를 골라 돌릴 수 있어야
 * 한쪽만 채우는 일이 가능하다.
 */
const SOURCE = argValue('source');

/** 초록 원문을 그대로 인용할 때의 상한. 전문 복제를 피하면서 논지는 남을 길이. */
const ABSTRACT_QUOTE_CHARS = 1200;

/**
 * 수집기가 남긴 부스러기를 씻는다.
 *
 * KCI 원자료가 초록을 `<abstract lang="english">...` 째로 주는 일이 있다.
 * 화면에 태그가 그대로 찍히면 그 글은 읽기 전에 신뢰를 잃는다.
 */
export function cleanAbstract(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    // 전각 콜론은 한글 문장 안에서 자간이 벌어져 읽기를 방해한다.
    .replace(/：/g, ': ')
    .replace(/[ 	]+/g, ' ')
    .trim();
}

/**
 * 이 글이 한국어로 읽히는가.
 *
 * KCI 초록은 "국문" 이라고 와도 절반이 영문이다. 한글이 한 글자라도 있으면
 * 국문으로 보던 예전 조건 때문에 영어 초록 110건이 게시판에 그대로 올라가
 * 있었다. 비율로 본다.
 */
export function isKorean(text: string, threshold = 0.2): boolean {
  const stripped = text.replace(/[^가-힣]/g, '');
  return stripped.length / Math.max(text.length, 1) >= threshold;
}


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
  const qb = ds
    .getRepository(Reference)
    .createQueryBuilder('r')
    .where('r."featuredInCommunity" = false')
    // 한국어로 번역된 것만 올린다. 영문 제목이 게시판을 덮으면 훑기가 안 되고,
    // 훑을 수 없는 게시판은 아무도 안 연다.
    .andWhere('r."titleKo" IS NOT NULL')
    .andWhere('r."abstract" IS NOT NULL')
    // 한국어로 읽히는 것만 올린다.
    //
    // 예전 조건은 KCI 에 대해 "초록에 한글이 한 글자라도 있으면 국문" 이었다.
    // 그래서 본문이 영어인 초록 110편이 게시판에 영어 그대로 올라가 있었다.
    // 한글 게시판에 영어가 박히면 그건 콘텐츠가 아니라 자리 채우기다.
    //
    // 이제 둘 중 하나를 요구한다. 우리가 만든 한국어 구조 요약(abstractKo)이
    // 있거나, 초록 자체가 한국어로 읽히거나. 비율로 재는 이유는 국문 초록에도
    // 학명과 통계 기호가 섞여 들어와 "한글이 있다/없다" 로는 갈리지 않기
    // 때문이다.
    //
    // 근거 수준은 PubMed 에만 건다. 1만 4천 편을 다 올릴 수 없으니 체계적
    // 고찰·RCT·진료지침부터 고른다. KCI 는 한국어 제목이라 연구유형이 잘
    // 안 잡혀 대부분 unknown 인데, 그것은 분류를 못 한 것이지 가치가 없다는
    // 뜻이 아니다. 한의학 학술지에 실린 글이라 학술지 단위로 이미 걸러져 있다.
    .andWhere(
      `(
         r."abstractKo" IS NOT NULL
         OR (length(r."abstract") - length(regexp_replace(r."abstract", '[가-힣]', '', 'g')))::float
              / greatest(length(r."abstract"), 1) >= 0.2
       )`,
    )
    .andWhere(
      `(r."source" = :kci OR r."evidenceType" IN (:...types))`,
      {
        kci: ReferenceSource.KCI,
        types: [
          ReferenceEvidenceType.SYSTEMATIC_REVIEW,
          ReferenceEvidenceType.RCT,
          ReferenceEvidenceType.GUIDELINE,
        ],
      },
    )
    .orderBy(
      `CASE r."evidenceType"
         WHEN '${ReferenceEvidenceType.SYSTEMATIC_REVIEW}' THEN 1
         WHEN '${ReferenceEvidenceType.RCT}' THEN 2
         ELSE 3 END`,
      'ASC',
    )
    .addOrderBy('r."publishedAt"', 'DESC', 'NULLS LAST')
    .take(limit);
  if (SOURCE) qb.andWhere('r."source" = :src', { src: SOURCE });
  return qb.getMany();
}

/**
 * 제목은 한국어 제목만 쓴다.
 *
 * 앞에 "[문헌] 2024 체계적 고찰 —" 같은 머리말을 달았더니 목록에서 제목이
 * 다 잘려서 정작 무슨 내용인지 안 보였다. 근거 수준과 연도는 본문 표에
 * 있으므로 제목은 내용만 담는다.
 */
export function buildTitle(r: Reference): string {
  const base = (r.titleKo || r.title).trim();
  return base.length > 200 ? `${base.slice(0, 197)}…` : base;
}

/**
 * 본문.
 *
 * 진료 중에 훑는 글이다. 위에서부터 "무슨 연구인가 → 무엇을 알아냈나 →
 * 어디 실린 것인가 → 원문" 순으로 내려가야 중간에 닫아도 손해가 없다.
 *
 *   한 줄 요약   무엇에 관한 글인지. 목록 카드의 미리보기도 이 문장을 쓴다.
 *   ## 요약      배경·방법·결과·한계. 항목 이름을 굵게 앞세워 눈으로 짚이게 한다.
 *   ## 서지정보  학술지·발행·저자·근거 수준·원제. 문장에 섞으면 안 읽힌다.
 *   ## 초록 원문 저자의 말. 한국어로 읽히는 것만 싣는다.
 *   출처·고지
 *
 * 영문을 본문에 남기지 않는다.
 *
 * 예전에는 한국어 요약이 없으면 영문 초록을 발췌해 붙였다. 한글 게시판
 * 본문 한가운데가 영어가 되어 아무도 읽지 않았고, 읽히지 않는 인용은
 * 근거가 아니라 자리 채우기다. 이제 한국어 요약이 없으면 그 자리를 비우고
 * 원문 링크로 보낸다 — 소개할 문헌은 pickQuery 가 한국어가 준비된 것만
 * 고르므로 이 자리는 비지 않는다.
 *
 * 원제는 표 안으로 넣었다. 본문 한가운데 영문 제목이 문단으로 서 있으면
 * 한국어 요약과 초록 사이를 끊는다. 인용할 때 필요한 값이라 지우지는 않는다.
 *
 * 초록을 통째로 번역해 싣지는 않는다. 초록의 저작권은 대개 출판사에 있고,
 * 무엇보다 초록에는 용량과 시술 프로토콜이 들어 있어 옮기다 한 글자만
 * 틀리면 그걸 보고 처방하는 사람이 생긴다. 요약에는 용량을 넣지 않는다.
 *
 * 요약이 기계가 만든 것이라는 사실을 숨기지 않는다. 한의사가 이걸 근거로
 * 삼기 전에 원문을 확인해야 한다는 것을 알아야 한다.
 */
export function buildContent(r: Reference): string {
  const NL = String.fromCharCode(10);
  const parts: string[] = [];

  const isKci = r.source === ReferenceSource.KCI;
  const abstract = r.abstract ? cleanAbstract(r.abstract) : '';
  // 저자의 말을 그대로 싣는 것은 한국어로 읽힐 때만 뜻이 있다.
  const quotable = abstract.length > 0 && isKorean(abstract);

  // 한 줄 요약이 먼저. 목록 카드에 나가는 문장이기도 하다.
  if (r.summaryKo) parts.push(r.summaryKo.trim());

  // 구조 요약 — 배경·방법·결과·한계.
  //
  // 한 줄씩 굵은 이름을 앞세운다. 줄글 네 문단으로 두면 결과만 보려는
  // 사람이 눈으로 짚을 자리가 없다.
  if (r.abstractKo) {
    const body = r.abstractKo
      .trim()
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const m = /^(배경|방법|결과|한계)\s*[:：]\s*(.*)$/.exec(line);
        return m ? '**' + m[1] + '** ' + m[2] : line;
      })
      .join(NL + NL);
    parts.push('## 요약' + NL + NL + body);
  }

  // 서지정보 표 — 저널·연도·근거수준이 문장에 섞여 있으면 눈에 안 들어온다.
  const rows: string[] = ['| 항목 | 내용 |', '|---|---|'];
  if (r.journal) {
    rows.push(
      '| 학술지 | ' +
        r.journal +
        (r.publishedYear ? ' · ' + r.publishedYear + '년' : '') +
        ' |',
    );
  } else if (r.publishedYear) {
    rows.push('| 발행 | ' + r.publishedYear + '년 |');
  }
  if (r.authors.length > 0) {
    const who =
      r.authors.length > 3
        ? r.authors.slice(0, 3).join(', ') + ' 외 ' + (r.authors.length - 3) + '명'
        : r.authors.join(', ');
    rows.push('| 저자 | ' + who + ' |');
  }
  // 근거 수준은 분류가 됐을 때만 적는다.
  //
  // KCI 는 한국어 제목이라 연구유형이 잘 안 잡혀 대부분 unknown 인데,
  // 그 618편이 전부 첫 줄에 '근거 수준 · 분류 미상' 을 달고 있었다.
  // 아무것도 알려주지 않는 칸이 표의 맨 위를 차지한 셈이다.
  if (r.evidenceType !== ReferenceEvidenceType.UNKNOWN) {
    rows.push('| 근거 수준 | ' + EVIDENCE_LABEL[r.evidenceType] + ' |');
  }
  // 원제 — 제목과 다를 때만. 표 안에서 줄이 바뀌지 않게 파이프는 지운다.
  const original = r.title.trim().replace(/\|/g, '/');
  if (original && original !== buildTitle(r)) {
    rows.push('| 원제 | ' + original + ' |');
  }
  parts.push('## 서지정보' + NL + NL + rows.join(NL));

  // 초록 원문 — 한국어로 읽히는 것만.
  if (quotable) {
    // 국문 초록은 "목적: … 방법: … 결과: …" 를 한 문단에 이어 붙여 온다.
    // 1,900자짜리 벽이라 눈이 어디를 짚어야 할지 알 수 없다. 원문 글자는
    // 하나도 건드리지 않고 항목 앞에서만 줄을 바꾼다.
    const marked = abstract.replace(
      /\s*(목적|배경|서론|방법|재료 및 방법|대상 및 방법|결과|결론|고찰)\s*[:：]\s*/g,
      String.fromCharCode(10) + '$1: ',
    );
    const text =
      marked.length > ABSTRACT_QUOTE_CHARS
        ? marked.slice(0, ABSTRACT_QUOTE_CHARS).trim() + '…'
        : marked.trim();
    const quoted = text
      .split(/\r?\n+/)
      .map((line) => '> ' + line.trim())
      .filter((line) => line !== '>')
      .join(NL + '>' + NL);
    parts.push('## 초록 원문' + NL + NL + quoted);
  }

  parts.push(
    '---' +
      NL +
      NL +
      (r.abstractKo
        ? '위 요약은 원문 초록을 기계가 다시 쓴 것입니다. 용량과 시술 ' +
          '프로토콜은 요약에 넣지 않았으니, 처방을 정하기 전에 원문을 확인해 주세요.'
        : '용량과 시술 프로토콜은 발췌 과정에서 빠질 수 있으니, 처방을 ' +
          '정하기 전에 원문을 확인해 주세요.'),
  );

  const sources: string[] = ['- [원문 보기](' + r.url + ')'];
  if (r.doi) sources.push('- DOI: ' + r.doi);
  if (isKci) {
    // 약관 의무다. KCI Open API 이용 준수 사항의 '출처 표기' 조항이
    // 데이터를 활용한 서비스 결과물에 KCI 데이터 활용 사실을 이용자가
    // 식별할 수 있도록 명시하라고 정한다.
    sources.push('- KCI(한국학술지인용색인) 데이터 활용');
  }
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

// 직접 실행할 때만 돈다.
//
// buildTitle/buildContent 를 다른 스크립트에서 가져다 쓰는데, 여기서 그냥
// main() 을 부르면 import 하는 순간 시드가 돌아 버린다. 본문 서식만 고치려던
// 스크립트가 글을 새로 올리는 일이 생긴다.
if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
