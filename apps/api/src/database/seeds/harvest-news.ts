import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Post, PostStatus, PostType } from '../entities/post.entity';
import { User } from '../entities/user.entity';

/**
 * 종합 게시판을 한의계 뉴스로 채운다.
 *
 * 게시판이 비어 있었다. 그런데 여기는 문헌을 부을 자리가 아니다 — 임상정보와
 * 전문 포럼이 이미 논문을 맡고 있다. 종합에 필요한 것은 "오늘 우리 판에서
 * 무슨 일이 있었나" 다. 수가가 바뀌고, 협회가 성명을 내고, 식약처가 회수
 * 명령을 내리는 일은 진료실에 바로 닿는데 그것만 모아 보는 곳이 없다.
 *
 * 기사 본문을 옮기지 않는다.
 *
 *   본문 복제는 저작권 침해다. 우리가 저장하는 것은 제목·매체·날짜·링크이고,
 *   매체가 RSS 로 함께 내보내는 리드 문장이 있을 때만 두 문장까지 인용 표시를
 *   달아 옮긴다. 나머지는 원문으로 보낸다. 큐레이션의 값어치는 "무엇을
 *   골랐나" 에 있지 남의 글을 통째로 옮기는 데 있지 않다.
 *
 * 요약을 모델에게 시키지 않는다. 리드 두 문장을 요약해 봐야 얻는 것이 없고,
 * 기사 내용을 모델이 지어내면 그건 우리가 만든 오보가 된다.
 *
 * 어디서 가져오나:
 *
 *   1. 구글 뉴스 RSS — 주제어별 검색 결과. 여러 매체를 한 번에 훑는다.
 *      링크는 구글 경유 주소지만 원문으로 넘어간다.
 *   2. 민족의학신문 RSS — 한의계 전문지. 리드 문장이 함께 온다.
 *
 * 걸러내기: 제목에 한의 관련 낱말이 하나도 없으면 버린다. 넓은 검색어로
 * 긁으면 "약침" 검색에 곤충 기사가 딸려 온다.
 *
 * 실행:
 *   npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *     src/database/seeds/harvest-news.ts --limit=20 --dry-run
 *   ... --limit=500
 *   ... --stats-only
 */

function argValue(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

const LIMIT = Number(argValue('limit') ?? '20') || 20;
const DRY_RUN = process.argv.includes('--dry-run');
const STATS_ONLY = process.argv.includes('--stats-only');

const NL = String.fromCharCode(10);

/** 뉴스 글임을 나타내는 태그. 사람이 올린 글과 구분된다. */
const NEWS_TAG = '뉴스';

/** 구글 뉴스에 물어볼 주제어. 진료실에 닿는 것만 고른다. */
const QUERIES = [
  '한의학',
  '한의원',
  '한의사',
  '한의사협회',
  '한약',
  '한약재',
  '첩약 건강보험',
  '추나요법',
  '약침',
  '한방병원',
  '자동차보험 한방',
  '한의약 정책',
  '보건복지부 한의약',
  '식약처 생약',
  '한의 건강보험 수가',
  '한의약진흥원',
  '한의과대학',
  '침 치료 연구',
  '한의 비급여',
  '한의 의료기기',
];

/** 한의계 전문지 RSS. 리드 문장이 함께 온다. */
const FEEDS = [
  { url: 'https://www.mjmedi.com/rss/allArticle.xml', outlet: '민족의학신문' },
  { url: 'https://www.mjmedi.com/rss/S1N1.xml', outlet: '민족의학신문' },
  { url: 'https://www.mjmedi.com/rss/S1N2.xml', outlet: '민족의학신문' },
  { url: 'https://www.mjmedi.com/rss/S1N3.xml', outlet: '민족의학신문' },
  { url: 'https://www.mjmedi.com/rss/S1N4.xml', outlet: '민족의학신문' },
  { url: 'https://www.mjmedi.com/rss/S1N6.xml', outlet: '민족의학신문' },
];

/**
 * 제목에 하나라도 있어야 한다.
 *
 * 검색어가 넓어서 그냥 담으면 엉뚱한 것이 섞인다. "한방" 은 넣지 않았다 —
 * "한방에 해결" 같은 관용구가 훨씬 많다.
 */
const TOPIC_WORDS = [
  '한의', '한약', '첩약', '침', '뜸', '부항', '추나', '약침', '경혈',
  '한방병원', '한방의료', '보약', '탕약', '한의약', '동의보감', '사상체질',
];

/** 주제 태그 — 제목에서 찾은 것만. 지어내지 않는다. */
const TOPIC_TAGS: Array<[string, string]> = [
  ['첩약', '첩약'],
  ['추나', '추나'],
  ['약침', '약침'],
  ['자동차보험', '자보'],
  ['자보', '자보'],
  ['건강보험', '건강보험'],
  ['수가', '수가'],
  ['비급여', '비급여'],
  ['의료법', '제도'],
  ['복지부', '제도'],
  ['식약처', '안전성'],
  ['회수', '안전성'],
  ['한약재', '한약재'],
  ['연구', '연구'],
  ['논문', '연구'],
  ['교육', '교육'],
  ['한의대', '교육'],
  ['협회', '협회'],
];

interface NewsItem {
  title: string;
  link: string;
  outlet: string;
  publishedAt: Date | null;
  /** 매체가 RSS 로 함께 보낸 리드. 없으면 빈 문자열. */
  lead: string;
}

/** XML 엔티티와 CDATA 를 푼다. 파서를 새로 들이지 않는다 — RSS 는 단순하다. */
function decode(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function pick(block: string, tag: string): string {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(block);
  return m ? decode(m[1]) : '';
}

async function fetchFeed(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OngojisinBot/1.0)' },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.text();
}

function parseItems(xml: string, defaultOutlet: string): NewsItem[] {
  const out: NewsItem[] = [];
  const blocks = xml.split('<item>').slice(1);
  for (const raw of blocks) {
    const block = raw.split('</item>')[0];
    const title = pick(block, 'title');
    const link = pick(block, 'link');
    if (!title || !link) continue;

    // 구글 뉴스는 제목 끝에 " - 매체명" 을 붙이고 <source> 로도 알려 준다.
    const sourceTag = /<source[^>]*>([\s\S]*?)<\/source>/.exec(block);
    const outlet = sourceTag ? decode(sourceTag[1]) : defaultOutlet;
    const cleanTitle = (outlet
      ? title.replace(new RegExp(`\\s*-\\s*${outlet}\\s*$`), '')
      : title
    )
      // 한의신문 제목 끝에 붙어 오는 사이트 꼬리표. 기사 제목이 아니다.
      .replace(/\s*>\s*(뉴스|기사|칼럼|오피니언)\s*$/, '')
      .trim();

    const pub = pick(block, 'pubDate');
    const parsed = pub ? new Date(pub) : null;

    // 구글 뉴스의 description 은 매체 링크 목록이라 인용할 것이 없다.
    const desc = pick(block, 'description');
    const lead = /news\.google\.com/.test(link) ? '' : desc;

    out.push({
      title: cleanTitle,
      link,
      outlet: outlet || defaultOutlet,
      publishedAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed : null,
      lead,
    });
  }
  return out;
}

/**
 * 포털에 복사된 기사는 받지 않는다.
 *
 * 같은 기사가 원 매체와 포털 양쪽에서 잡힌다. 포털 쪽은 매체 이름이
 * 'v.daum.net' 처럼 도메인으로 오고 링크도 포털 안에서 끝난다. 원문을
 * 두고 사본을 걸 이유가 없다.
 */
const MIRROR_OUTLETS = [
  'v.daum.net',
  'n.news.naver.com',
  'news.nate.com',
  '네이트',
  'zum.com',
];

/**
 * 홍보성 기사를 거른다.
 *
 * "체지방 감량률 83% 입증" 같은 것은 뉴스 모양을 한 광고다. 이런 것이
 * 섞이면 큐레이션이라는 말이 값을 잃는다. 완벽하게 거를 수는 없으므로
 * 티가 나는 낱말만 막는다.
 */
const PROMO_WORDS = [
  '출시',
  '이벤트',
  '할인',
  '특가',
  '증정',
  '무료 체험',
  '런칭',
  '리뉴얼',
  '공동구매',
  '분양',
  '가맹',
  '창업 설명회',
];

function isRelevant(item: NewsItem): boolean {
  if (MIRROR_OUTLETS.some((m) => item.outlet.includes(m))) return false;
  if (PROMO_WORDS.some((w) => item.title.includes(w))) return false;
  return TOPIC_WORDS.some((w) => item.title.includes(w));
}

/**
 * 같은 사건을 다룬 기사인가.
 *
 * 하나의 발표를 다섯 매체가 받아쓴다. 제목이 조금씩 달라 글자 비교로는 안
 * 걸리는데, 그대로 두면 게시판 첫 화면이 같은 이야기로 채워진다. 두 글자
 * 이상 낱말이 얼마나 겹치는지로 본다.
 */
function titleTokens(title: string): string[] {
  return title
    .replace(/[^가-힣a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

function looksLikeSameStory(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const set = new Set(b);
  const shared = a.filter((t) => set.has(t)).length;
  return shared / Math.min(a.length, b.length) >= 0.6;
}

function buildTags(item: NewsItem): string[] {
  const tags: string[] = [NEWS_TAG];
  for (const [needle, tag] of TOPIC_TAGS) {
    if (tags.length >= 5) break;
    if (item.title.includes(needle) && !tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

function buildBody(item: NewsItem): string {
  const parts: string[] = [];

  const meta: string[] = ['| 항목 | 내용 |', '|---|---|'];
  meta.push('| 매체 | ' + item.outlet.replace(/\|/g, '/') + ' |');
  if (item.publishedAt) {
    meta.push(
      '| 보도 | ' +
        item.publishedAt.toISOString().slice(0, 10).replace(/-/g, '. ') +
        ' |',
    );
  }
  parts.push(meta.join(NL));

  // 매체가 RSS 로 함께 보낸 리드만, 두 문장까지. 본문을 옮기지 않는다.
  if (item.lead) {
    const sentences = item.lead.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
    const quoted = sentences.length > 300 ? sentences.slice(0, 300) + '…' : sentences;
    if (quoted.length > 30) {
      parts.push('> ' + quoted);
    }
  }

  parts.push('**출처**' + NL + NL + '- [' + item.outlet + ' 원문 보기](' + item.link + ')');

  parts.push(
    '기사 전문은 원문에서 확인해 주세요. 진료에 어떻게 걸리는지 보시는 대로 ' +
      '댓글로 남겨 주시면 다음 정리에 반영하겠습니다.',
  );

  return parts.join(NL + NL);
}

async function collect(): Promise<NewsItem[]> {
  const seen = new Set<string>();
  const items: NewsItem[] = [];

  const tokenized: string[][] = [];
  const add = (list: NewsItem[]) => {
    for (const it of list) {
      // 같은 기사가 여러 검색어에 걸린다. 제목으로 거른다.
      const key = it.title.replace(/\s+/g, '').slice(0, 60);
      if (seen.has(key)) continue;
      if (!isRelevant(it)) continue;
      const t = titleTokens(it.title);
      if (tokenized.some((prev) => looksLikeSameStory(t, prev))) continue;
      seen.add(key);
      tokenized.push(t);
      items.push(it);
    }
  };

  for (const feed of FEEDS) {
    try {
      add(parseItems(await fetchFeed(feed.url), feed.outlet));
    } catch (e) {
      console.log(`  피드 실패 ${feed.outlet}: ${(e as Error).message}`);
    }
  }

  for (const q of QUERIES) {
    const url =
      'https://news.google.com/rss/search?q=' +
      encodeURIComponent(q) +
      '&hl=ko&gl=KR&ceid=KR:ko';
    try {
      add(parseItems(await fetchFeed(url), '구글 뉴스'));
    } catch (e) {
      console.log(`  검색 실패 ${q}: ${(e as Error).message}`);
    }
  }

  // 최근 것부터. 날짜가 없는 것은 뒤로 보낸다.
  items.sort(
    (a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
  );
  return items;
}

async function main(): Promise<void> {
  console.log('뉴스를 모으는 중...');
  const items = await collect();
  console.log(`관련 기사 ${items.length}건`);
  if (STATS_ONLY) {
    for (const it of items.slice(0, 30)) {
      console.log(` · [${it.outlet}] ${it.title}`);
    }
    return;
  }

  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();
  try {
    const postRepo = ds.getRepository(Post);
    const userRepo = ds.getRepository(User);

    const author = await userRepo.findOne({
      where: { role: 'content_manager' as User['role'] },
    });
    if (!author) {
      console.error('운영팀 계정(content_manager)이 없습니다.');
      process.exit(1);
    }

    let created = 0;
    let skipped = 0;

    for (const item of items) {
      if (created >= LIMIT) break;

      const title =
        item.title.length > 200 ? item.title.slice(0, 197) + '…' : item.title;

      if (DRY_RUN) {
        console.log(`\n${'='.repeat(70)}\n${title}\n${'-'.repeat(70)}`);
        console.log(buildBody(item));
        console.log('태그:', buildTags(item).join(', '));
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
          content: buildBody(item),
          type: PostType.GENERAL,
          authorId: author.id,
          isAnonymous: false,
          tags: buildTags(item),
          status: PostStatus.ACTIVE,
        }),
      );
      created += 1;
    }

    console.log(
      `\n${DRY_RUN ? '[dry-run] ' : ''}뉴스 ${created}건 · 이미 있어 건너뜀 ${skipped}건`,
    );
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
