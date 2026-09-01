import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Post, PostStatus, PostType } from '../entities/post.entity';
import { User } from '../entities/user.entity';

/**
 * 처방과 약재를 종합 게시판에 올린다.
 *
 * 게시판이 전문 포럼 2천 편(문헌 소개)에 몰려 있고 종합 게시판은 8편이었다.
 * 문헌은 "읽을거리" 지 "찾을거리" 가 아니다. 진료 중에 여신탕 구성이나
 * 위령선 기원을 확인하려는 사람에게 필요한 것은 논문 소개가 아니다.
 *
 * 원칙은 seed-community-references 와 같다.
 *
 *  1. 작성자는 실재하는 운영팀 계정. --author-email 없으면 실패한다.
 *  2. 조회수·좋아요를 채우지 않는다. 없는 인기를 만들지 않는다.
 *  3. 출처를 반드시 붙인다.
 *  4. **지어내지 않는다.** DB 에 있는 것만 옮긴다. 출전이 없으면 없다고
 *     적고, 효능이 비어 있으면 그 항목을 아예 쓰지 않는다. 한 줄이라도
 *     채우려고 그럴듯한 말을 만들면 그 순간 이 게시판은 못 믿을 곳이 된다.
 *
 * 얇은 것은 올리지 않는다. 처방은 출전이나 병기 해설 중 하나는 있어야 하고,
 * 약재는 효능이 있어야 한다. 동백유·디기탈리스엽처럼 이름과 분류만 있는
 * 항목까지 올리면 목록이 늘어날 뿐 쓸모는 늘지 않는다.
 *
 * 멱등: 제목 기준. 같은 제목이 이미 있으면 건너뛴다.
 *
 * 실행:
 *   npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *     src/database/seeds/seed-community-materia.ts \
 *     --author-email=team@ongojisin.ai --limit=20 --dry-run
 *   ... --only=formulas | --only=herbs
 */

function argValue(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

const DRY_RUN = process.argv.includes('--dry-run');
const AUTHOR_EMAIL = argValue('author-email');
const LIMIT = Number(argValue('limit') ?? '0') || 0;
const ONLY = argValue('only');

/** 마크다운 줄바꿈. 템플릿 문자열에 직접 쓰면 도구를 거치며 깨진 적이 있다. */
const NL = String.fromCharCode(10);

/** 빈 값을 걸러낸다. null·빈문자·'null' 문자열까지. */
function val(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s === 'null' || s === 'undefined' || s === '[object Object]') return null;
  return s;
}

/**
 * 목록 컬럼을 한 줄로 만든다.
 *
 * aliases·meridianTropism 은 text[] 이고 activeCompounds 는 jsonb 배열이다.
 * String() 으로 밀어 넣으면 쉼표로 붙거나 [object Object] 가 된다 — 실제로
 * 그렇게 터졌다.
 */
function listOf(v: unknown): string[] {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr
    .map((x) => (typeof x === 'string' ? x : JSON.stringify(x)))
    .map((x) => x.trim())
    .filter((x) => x.length > 0 && x !== 'null');
}

/**
 * 성미.
 *
 * 두 가지 형태로 섞여 있다. `{text, source}` 는 공정서 원문을 그대로 담고
 * 있고, `{flavor, nature}` 는 쪼개 둔 것이다. 어느 쪽이든 있는 그대로
 * 옮기고, 출처가 실려 있으면 함께 밝힌다.
 */
function propertiesOf(
  v: unknown,
): { text: string; source: string | null } | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const source = val(o.source);
  const direct = val(o.text);
  if (direct) return { text: direct, source };
  const flavor = val(o.flavor);
  const nature = val(o.nature);
  if (!flavor && !nature) return null;
  const bits: string[] = [];
  if (nature) bits.push(`性은 ${nature}`);
  if (flavor) bits.push(`味는 ${flavor}`);
  return { text: bits.join(', '), source };
}

interface FormulaRow {
  id: string;
  name: string;
  hanja: string | null;
  aliases: string[] | null;
  category: string | null;
  source: string | null;
  indication: string | null;
  pathogenesis: string | null;
  contraindications: string | null;
  modifications: string | null;
  insuranceCode: string | null;
  insuranceStatus: string | null;
  herbs: Array<{ name: string; hanja: string | null; amount: string | null }>;
}

interface HerbRow {
  id: string;
  standardName: string;
  hanjaName: string | null;
  aliases: string[] | null;
  category: string | null;
  efficacy: string | null;
  properties: unknown;
  meridianTropism: string[] | null;
  contraindications: string | null;
  scientificName: string | null;
  latinName: string | null;
  englishName: string | null;
  medicinalPart: string | null;
  pharmacopoeia: string | null;
  taxonomy: string | null;
  activeCompounds: unknown;
}

/**
 * 제목.
 *
 * 한자를 괄호로 붙인다. 목록에서 여신탕과 여신산을 가르는 것이 한자다.
 * 뒤에 무엇에 쓰는지 한 조각을 붙이되, 길면 목록에서 잘리므로 짧게.
 */
function formulaTitle(f: FormulaRow): string {
  const head = f.hanja ? `${f.name}(${f.hanja})` : f.name;
  const tail = val(f.indication)?.replace(/^⊕/, '').split(',')[0]?.trim();
  return tail ? `${head} — ${tail}`.slice(0, 200) : head;
}

function herbTitle(h: HerbRow): string {
  const head = h.hanjaName ? `${h.standardName}(${h.hanjaName})` : h.standardName;

  // 효능은 '祛風除濕, 通絡止痛, 鎭痛...' 처럼 온다. 앞 둘만 제목에 쓴다.
  //
  // 원자료가 깨끗하지 않다. 조각자의 효능 칸에는 조협의 효능까지 줄바꿈으로
  // 이어 붙어 있었고, 한자가 '?' 로 깨진 항목도 아홉 개 있었다. 그대로
  // 제목에 넣었더니 게시판에 두 약재가 뒤엉킨 제목이 올라갔다.
  //
  // 여기서 원본을 고치지는 않는다. 시드 스크립트가 원자료를 손보기
  // 시작하면 무엇이 원본인지 알 수 없어진다. 제목으로 쓸 수 없는 값이면
  // 이름만 제목으로 두고, 본문에는 원본 그대로 남겨 사람이 보고 고치게 한다.
  const first = val(h.efficacy)?.split(/[\r\n]/)[0];
  if (!first || first.includes('?')) return head;

  const tail = first
    .replace(/\.$/, '')
    .split(/[,·]/)
    .slice(0, 2)
    .map((x) => x.trim())
    .filter((x) => x.length > 0 && !x.includes('?'))
    .join('·');
  return tail ? `${head} — ${tail}`.slice(0, 200) : head;
}

function formulaContent(f: FormulaRow): string {
  const parts: string[] = [];

  // 서지 표 — 출전과 분류가 문장에 섞이면 눈에 안 들어온다.
  const rows: string[] = ['| 항목 | 내용 |', '|---|---|'];
  if (val(f.category)) rows.push(`| 분류 | ${f.category} |`);
  if (val(f.source)) rows.push(`| 출전 | ${f.source} |`);
  const fAliases = listOf(f.aliases);
  if (fAliases.length > 0) rows.push(`| 이명 | ${fAliases.join(', ')} |`);
  if (val(f.indication)) {
    rows.push(`| 주치 | ${f.indication!.replace(/^⊕/, '')} |`);
  }
  if (val(f.insuranceCode)) rows.push(`| 보험코드 | ${f.insuranceCode} |`);
  parts.push(rows.join(NL));

  if (f.herbs.length > 0) {
    const hr: string[] = ['| 약재 | 용량 |', '|---|---|'];
    for (const h of f.herbs) {
      const nm = h.hanja ? `${h.name}(${h.hanja})` : h.name;
      hr.push(`| ${nm} | ${val(h.amount) ?? '—'} |`);
    }
    parts.push(`**구성 약재**${NL}${NL}${hr.join(NL)}`);
    parts.push(
      '용량은 출전에 적힌 그대로입니다. 三分·三片 같은 옛 도량형은 ' +
        '현대 용량으로 환산하지 않았습니다 — 환산 기준이 문헌마다 달라, ' +
        '옮기는 과정에서 정하면 그게 곧 처방이 됩니다.',
    );
  }

  if (val(f.pathogenesis)) {
    parts.push(`**병기·해설**${NL}${NL}${f.pathogenesis!.trim()}`);
  }
  if (val(f.contraindications)) {
    parts.push(`**금기**${NL}${NL}${f.contraindications!.trim()}`);
  }
  if (val(f.modifications)) {
    parts.push(`**가감**${NL}${NL}${f.modifications!.trim()}`);
  }

  parts.push('---');
  parts.push(
    `**출처**${NL}${NL}` +
      (val(f.source)
        ? `- ${f.source}${NL}`
        : `- 출전이 확인되지 않은 처방입니다.${NL}`) +
      '- 온고지신 처방 데이터베이스',
  );
  parts.push(
    '처방을 정하기 전에 환자의 한열·허실과 복용 중인 약을 함께 보셔야 합니다. ' +
      '이 글은 문헌 내용을 옮긴 것이고 특정 환자에 대한 처방 권고가 아닙니다.',
  );

  return parts.join(NL + NL);
}

function herbContent(h: HerbRow): string {
  const parts: string[] = [];

  const rows: string[] = ['| 항목 | 내용 |', '|---|---|'];
  if (val(h.scientificName)) rows.push(`| 기원 | ${h.scientificName} |`);
  if (val(h.taxonomy)) rows.push(`| 과(科) | ${h.taxonomy} |`);
  if (val(h.medicinalPart)) rows.push(`| 약용부위 | ${h.medicinalPart} |`);
  if (val(h.latinName)) rows.push(`| 라틴명 | ${h.latinName} |`);
  if (val(h.englishName)) rows.push(`| 영문명 | ${h.englishName} |`);
  const aliases = listOf(h.aliases);
  if (aliases.length > 0) rows.push(`| 이명 | ${aliases.join(', ')} |`);
  const meridian = listOf(h.meridianTropism);
  if (meridian.length > 0) rows.push(`| 귀경 | ${meridian.join(', ')} |`);
  if (val(h.pharmacopoeia)) rows.push(`| 공정서 수재 | ${h.pharmacopoeia} |`);
  parts.push(rows.join(NL));

  const props = propertiesOf(h.properties);
  if (props) {
    parts.push(
      `**성미**${NL}${NL}${props.text}` +
        (props.source ? `${NL}${NL}— ${props.source}` : ''),
    );
  }

  if (val(h.efficacy)) {
    parts.push(`**효능**${NL}${NL}${h.efficacy!.trim()}`);
  }
  if (val(h.contraindications)) {
    parts.push(`**금기**${NL}${NL}${h.contraindications!.trim()}`);
  }

  // 'oleanolic_acid (oleanolic acid) · C30H48O3 · PubChem 10494' 형태로
  // 한 줄에 이름·화학식·PubChem 번호가 가운뎃점으로 이어져 온다.
  const compounds = listOf(h.activeCompounds).slice(0, 12);
  if (compounds.length > 0) {
    const cr: string[] = ['| 성분 | 정보 |', '|---|---|'];
    for (const line of compounds) {
      const seg = line.split('·').map((x) => x.trim());
      const name = seg.shift() ?? line;
      cr.push(`| ${name} | ${seg.join(' · ') || '—'} |`);
    }
    parts.push(`**주요 활성성분**${NL}${NL}${cr.join(NL)}`);
    parts.push(
      '성분 정보는 화학 데이터베이스에서 온 것이고 임상 효과를 뜻하지 않습니다. ' +
        '성분이 확인됐다는 것과 그 성분이 사람에게 효과가 있다는 것은 다른 이야기입니다.',
    );
  }

  parts.push('---');
  const src: string[] = [];
  if (props?.source) src.push(`- 성미: ${props.source}`);
  if (val(h.pharmacopoeia)) src.push(`- 공정서 수재: ${h.pharmacopoeia}`);
  src.push('- 온고지신 약재 데이터베이스');
  parts.push(`**출처**${NL}${NL}${src.join(NL)}`);

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

  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();

  try {
    const author = await ds
      .getRepository(User)
      .findOne({ where: { email: AUTHOR_EMAIL } });
    if (!author) {
      // 시드 스크립트가 사용자를 창조하기 시작하면 어디까지가 진짜인지
      // 알 수 없어진다. 만들지 않고 실패한다.
      console.error(`작성자 계정을 찾을 수 없습니다: ${AUTHOR_EMAIL}`);
      process.exit(1);
    }

    const postRepo = ds.getRepository(Post);
    let created = 0;
    let skipped = 0;

    const save = async (title: string, content: string, tags: string[]) => {
      const exists = await postRepo.findOne({ where: { title } });
      if (exists) {
        skipped += 1;
        return;
      }
      if (DRY_RUN) {
        console.log(`${'='.repeat(70)}${NL}${title}${NL}${'-'.repeat(70)}${NL}${content}`);
        created += 1;
        return;
      }
      await postRepo.save(
        postRepo.create({
          title,
          content,
          // 찾아보는 글이라 종합 게시판에 둔다. 전문 포럼은 문헌 소개다.
          type: PostType.GENERAL,
          authorId: author.id,
          isAnonymous: false,
          tags,
          status: PostStatus.ACTIVE,
        }),
      );
      created += 1;
      console.log(`올림: ${title}`);
    };

    if (ONLY !== 'herbs') {
      // 얇은 것은 거른다 — 출전이나 병기 해설 중 하나는 있어야 한다.
      const formulas: FormulaRow[] = await ds.query(
        `SELECT f.id, f.name, f.hanja, f.aliases, f.category, f.source,
                f.indication, f.pathogenesis, f.contraindications,
                f.modifications, f."insuranceCode", f."insuranceStatus",
                COALESCE(
                  json_agg(
                    json_build_object('name', h."standardName",
                                      'hanja', h."hanjaName",
                                      'amount', fh.amount)
                    ORDER BY h."standardName"
                  ) FILTER (WHERE h.id IS NOT NULL), '[]'
                ) AS herbs
           FROM formulas f
           LEFT JOIN formula_herbs fh ON fh."formulaId" = f.id
           LEFT JOIN herbs_master h ON h.id = fh."herbId"
          WHERE (f.source IS NOT NULL AND f.source <> '')
             OR (f.pathogenesis IS NOT NULL AND LENGTH(f.pathogenesis) > 80)
          GROUP BY f.id
          ORDER BY f.name` + (LIMIT > 0 ? ` LIMIT ${LIMIT}` : ''),
      );
      console.log(`처방 ${formulas.length}건`);
      for (const f of formulas) {
        const tags = ['처방'];
        if (val(f.category) && f.category !== '기타' && f.category !== '미분류') {
          tags.push(f.category!);
        }
        if (val(f.insuranceCode)) tags.push('보험처방');
        await save(formulaTitle(f), formulaContent(f), tags);
      }
    }

    if (ONLY !== 'formulas') {
      // 효능이 있어야 글이 된다. 이름과 분류만 있는 항목은 올리지 않는다.
      const herbs: HerbRow[] = await ds.query(
        `SELECT id, "standardName", "hanjaName", aliases, category, efficacy,
                contraindications, "scientificName", "latinName", "englishName",
                "medicinalPart", pharmacopoeia, taxonomy, "activeCompounds",
                properties, "meridianTropism"
           FROM herbs_master
          WHERE efficacy IS NOT NULL AND efficacy <> ''
          ORDER BY "standardName"` + (LIMIT > 0 ? ` LIMIT ${LIMIT}` : ''),
      );
      console.log(`약재 ${herbs.length}건`);
      for (const h of herbs) {
        const tags = ['약재'];
        if (val(h.category) && h.category !== '미분류') tags.push(h.category!);
        await save(herbTitle(h), herbContent(h), tags);
      }
    }

    console.log(
      `${NL}${DRY_RUN ? '[dry-run] ' : ''}올림 ${created}건 · 이미 있어 건너뜀 ${skipped}건`,
    );
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
