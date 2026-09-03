import { DataSource, In, IsNull, Not } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Post, PostStatus, PostType } from '../entities/post.entity';
import { User } from '../entities/user.entity';
import { ClinicalCase } from '../entities/clinical-case.entity';

/**
 * 케이스 토론 게시판을 치험례로 연다.
 *
 * 게시판이 비어 있었다. 재료는 이미 있다 — 치험례 6,454건이 요약·핵심소견·
 * 경과까지 정리된 채 자료로 들어와 있고, 그중 상당수가 "이 환자에게 왜 이
 * 처방을 썼는가" 를 놓고 이야기할 만한 것이다.
 *
 * 모델을 쓰지 않는다. 지어낼 것이 없기 때문이다. 요약·핵심소견·경과·특징은
 * 이미 사람이 확인한 필드이고, 여기서는 그것을 표와 목록으로 옮겨 담을 뿐이다.
 * 없는 값은 줄을 통째로 빼고, 억지로 채우지 않는다.
 *
 * 올리지 않는 것:
 *   - 기록자 이름. 누가 기록했는지는 게시판에 나갈 정보가 아니다.
 *   - 초진 기록 원문. 환자가 한 말이 그대로 들어 있어 옮길 이유가 없다.
 *     대신 정리된 요약과 핵심소견을 쓴다.
 *   - 논문·실험이 섞여 들어온 행(hasMixedContent). 동물실험을 케이스라고
 *     올리면 그 게시판은 한 번에 값을 잃는다.
 *
 * 원본 치험례를 글에 연결한다(linkedCaseId). 목록 카드에 "케이스: 주소증
 * (처방)" 이 붙고, 눌러 들어가면 진짜 기록으로 갈 수 있다.
 *
 * 실행:
 *   npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *     src/database/seeds/seed-case-discussions.ts --limit=5 --dry-run
 *   ... --limit=500
 *   ... --stats-only
 */

function argValue(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

const LIMIT = Number(argValue('limit') ?? '5') || 5;
const DRY_RUN = process.argv.includes('--dry-run');
const STATS_ONLY = process.argv.includes('--stats-only');

/** 케이스 글임을 나타내는 태그. 사람이 올린 토론과 구분된다. */
const CASE_TAG = '치험례';

const NL = String.fromCharCode(10);

const GENDER_LABEL: Record<string, string> = {
  male: '남성',
  female: '여성',
};

const OUTCOME_LABEL: Record<string, string> = {
  cured: '완치',
  improved: '호전',
  unchanged: '변화 없음',
  worsened: '악화',
  unknown: '기록 없음',
};

const DIRECTION_MARK: Record<string, string> = {
  improved: '호전',
  worsened: '악화',
  none: '변화 없음',
};

/**
 * 논문이 섞여 들어온 행을 걸러낸다.
 *
 * hasMixedContent 로 579건이 표시돼 있는데 그것만으로는 모자란다. 주소증
 * 자리에 "천왕보심단의 항우울효과 및 monoamine 대사에 미치는 영향" 이
 * 들어앉은 행이 있다 — 환자가 아니라 실험이다. 제목에 쓰는 값이라 이런 것이
 * 하나만 올라가도 게시판이 무슨 게시판인지 알 수 없게 된다.
 */
const PAPER_MARKERS = [
  '에 미치는 영향',
  '에 관한 실험',
  '실험적 연구',
  '항산화',
  '세포주',
  'monoamine',
  'in vitro',
  'rat',
  'mice',
  '흰쥐',
  '백서',
  '생쥐',
];

function looksLikePaper(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return PAPER_MARKERS.some((m) => t.includes(m.toLowerCase()));
}

/**
 * 제목.
 *
 * 한 줄 요약이 이미 "36세 남성이 만성피로로 내원, 공진단 복용 후 피로감
 * 감소" 처럼 쓰여 있다. 목록에서 이 한 줄이면 열지 말지를 정할 수 있다.
 * 앞에 [치험례] 같은 머리말을 달지 않는다 — 태그가 이미 그 일을 하고,
 * 머리말은 목록에서 제목을 잘라먹는다.
 */
export function buildCaseTitle(c: ClinicalCase): string {
  const base = (c.summaryOneLine || c.chiefComplaint || '').trim().split(NL)[0];
  const trimmed = scrubNames(base.replace(/\s+/g, ' ').trim());
  return trimmed.length > 200 ? `${trimmed.slice(0, 197)}…` : trimmed;
}

/**
 * 가려 놓은 이름의 흔적을 지운다.
 *
 * 요약에 "50세 남성 김○○이 비행기 탑승 시" 처럼 마스킹된 이름이 남아 있다.
 * 이미 가려져 있어 누구인지 알 수는 없지만, 게시판에 이름 자리가 보이는
 * 것과 아예 없는 것은 다르다. 사람을 가리키는 말은 "환자" 로 충분하다.
 */
function scrubNames(text: string): string {
  return text
    .replace(/[가-힣][○●O０o]{1,3}(?=[\s가-힣])/g, '환자')
    .replace(/[가-힣]{1}\s?씨(?=[\s,.])/g, '환자')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function buildCaseBody(c: ClinicalCase): string {
  const parts: string[] = [];

  // 한 줄 요약은 제목으로 이미 썼다. 본문 첫 줄에 같은 문장을 또 두면
  // 화면에서 같은 말이 두 번 겹쳐 보인다.

  // 환자·처방 — 표로 둔다. 문장에 섞으면 눈에 안 들어온다.
  const rows: string[] = ['| 항목 | 내용 |', '|---|---|'];
  const who = [
    c.patientAgeRange || null,
    c.patientGender ? GENDER_LABEL[c.patientGender] ?? null : null,
  ]
    .filter(Boolean)
    .join(' ');
  if (who) rows.push('| 환자 | ' + who + ' |');
  if (c.patientConstitution) rows.push('| 체질 | ' + c.patientConstitution + ' |');
  if (c.patternDiagnosis) rows.push('| 변증 | ' + c.patternDiagnosis + ' |');
  if (c.verifiedFormulaName) rows.push('| 처방 | ' + c.verifiedFormulaName + ' |');
  if (c.singleHerb) rows.push('| 단미 | ' + c.singleHerb + ' |');
  if (c.treatmentOutcome) {
    rows.push('| 경과 | ' + (OUTCOME_LABEL[c.treatmentOutcome] ?? c.treatmentOutcome) + ' |');
  }
  if (c.recordedYear) rows.push('| 기록 | ' + c.recordedYear + '년 |');
  if (rows.length > 2) parts.push('## 한눈에' + NL + NL + rows.join(NL));

  if (c.keyFindings?.length) {
    parts.push(
      '## 핵심 소견' +
        NL +
        NL +
        c.keyFindings.map((f) => '- ' + scrubNames(String(f))).join(NL),
    );
  }

  if (c.patternReasoning) {
    parts.push('## 왜 이 처방인가' + NL + NL + scrubNames(c.patternReasoning.trim()));
  }

  if (c.courseSteps?.length) {
    const steps = ['| 시점 | 변화 | 방향 |', '|---|---|---|'];
    for (const s of c.courseSteps) {
      steps.push(
        '| ' +
          String(s.step ?? '').replace(/\|/g, '/') +
          ' | ' +
          String(s.change ?? '').replace(/\|/g, '/') +
          ' | ' +
          (DIRECTION_MARK[String(s.direction)] ?? '-') +
          ' |',
      );
    }
    parts.push('## 경과' + NL + NL + steps.join(NL));
  }

  if (c.modification) {
    parts.push('## 가감' + NL + NL + scrubNames(c.modification.trim()));
  }

  if (c.distinctive) {
    parts.push('## 이 사례에서 눈에 띄는 것' + NL + NL + scrubNames(c.distinctive.trim()));
  }

  parts.push(
    '---' +
      NL +
      NL +
      '온고지신 치험례 자료에서 옮긴 기록입니다. 기록자와 초진 원문은 싣지 ' +
      '않았고, 용량과 복용법은 원 기록을 확인해 주세요.',
  );

  // 답을 다 주고 끝내지 않는다. 토론 게시판이다.
  parts.push(
    '같은 환자가 오면 이 처방을 쓰시겠습니까? 다른 변증이 보이거나 다르게 ' +
      '가감하실 분은 댓글로 남겨 주세요.',
  );

  return parts.join(NL + NL);
}

function buildCaseTags(c: ClinicalCase): string[] {
  const tags: string[] = [CASE_TAG];
  if (c.patientConstitution) tags.push(String(c.patientConstitution));
  if (c.verifiedFormulaName) tags.push(c.verifiedFormulaName);
  return tags.filter((t, i) => t && tags.indexOf(t) === i).slice(0, 5);
}

async function main(): Promise<void> {
  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();

  try {
    const caseRepo = ds.getRepository(ClinicalCase);
    const postRepo = ds.getRepository(Post);
    const userRepo = ds.getRepository(User);

    // 후보 조건. 하나라도 없으면 글이 반쪽이 된다.
    const base = () =>
      caseRepo
        .createQueryBuilder('c')
        .where('c."summaryOneLine" IS NOT NULL')
        .andWhere('c."verifiedFormulaName" IS NOT NULL')
        .andWhere('c."treatmentOutcome" IS NOT NULL')
        .andWhere('c."hasMixedContent" = false')
        .andWhere(`jsonb_array_length(to_jsonb(c."courseSteps")) > 0`);

    const total = await base().getCount();
    const already = await postRepo.count({
      where: { type: PostType.CASE_DISCUSSION },
    });
    console.log(
      `케이스 후보 ${total.toLocaleString()}건 · 지금 케이스 토론 ${already.toLocaleString()}편`,
    );
    if (STATS_ONLY) return;

    const author = await userRepo.findOne({
      where: { role: 'content_manager' as User['role'] },
    });
    if (!author) {
      console.error('운영팀 계정(content_manager)이 없습니다.');
      process.exit(1);
    }

    // 이미 올린 케이스는 건너뛴다. linkedCaseId 가 멱등 키다 — 제목보다
    // 확실하다(요약 문장이 겹치는 케이스가 있다).
    const posted = await postRepo
      .createQueryBuilder('p')
      .select('p."linkedCaseId"', 'id')
      .where('p."linkedCaseId" IS NOT NULL')
      .getRawMany<{ id: string }>();
    const postedIds = new Set(posted.map((p) => p.id));

    // 최근 기록부터. 오래된 기록일수록 서식이 거칠다.
    const rows = await base()
      .orderBy('c."recordedYear"', 'DESC', 'NULLS LAST')
      .addOrderBy('c."createdAt"', 'DESC')
      .take(LIMIT * 3)
      .getMany();

    let created = 0;
    let skipped = 0;

    for (const c of rows) {
      if (created >= LIMIT) break;
      if (postedIds.has(c.id)) {
        skipped += 1;
        continue;
      }
      // 논문이 섞여 들어온 행은 제목만 봐도 티가 난다.
      if (looksLikePaper(c.chiefComplaint) || looksLikePaper(c.summaryOneLine)) {
        skipped += 1;
        continue;
      }

      const title = buildCaseTitle(c);
      if (!title || title.length < 8) {
        skipped += 1;
        continue;
      }

      const content = buildCaseBody(c);

      if (DRY_RUN) {
        console.log(`\n${'='.repeat(70)}\n${title}\n${'-'.repeat(70)}`);
        console.log(content);
        console.log('태그:', buildCaseTags(c).join(', '));
        created += 1;
        continue;
      }

      const exists = await postRepo.findOne({ where: { title } });
      if (exists) {
        skipped += 1;
        continue;
      }

      await postRepo.save(
        postRepo.create({
          title,
          content,
          type: PostType.CASE_DISCUSSION,
          authorId: author.id,
          linkedCaseId: c.id,
          isAnonymous: false,
          tags: buildCaseTags(c),
          status: PostStatus.ACTIVE,
        }),
      );
      created += 1;
    }

    console.log(
      `\n${DRY_RUN ? '[dry-run] ' : ''}케이스 토론 ${created}건 · 건너뜀 ${skipped}건`,
    );
  } finally {
    await ds.destroy();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
