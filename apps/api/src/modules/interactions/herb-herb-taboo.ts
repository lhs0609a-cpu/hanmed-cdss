/**
 * 한약재끼리의 배합 금기 — 십팔반(十八反)·십구외(十九畏)와 임신금기.
 *
 * 왜 상수인가 — 이 목록은 고전(儒門事親·本草綱目 계통)에 고정돼 있다.
 * 모델에게 물어 채울 값이 아니다. 안전 판정에 쓰이는 데이터라 출전이 분명해야
 * 하고, 실행할 때마다 달라지면 안 된다.
 *
 * 왜 필요한가 — 양약↔한약 상호작용은 interactions.service.ts 에 근거등급까지
 * 붙은 표가 있는데, 한약재끼리의 배합 금기는 어디에도 없었다. herbs_master 의
 * contraindications 도 247종 전부 비어 있다. 감초와 감수를 같이 쓰는 처방을
 * 짜도 아무 경고가 나오지 않았다.
 *
 * 판정 방식 — 약재명은 표기가 흔들린다(甘草/감초, 法半夏/반하). 그래서 정규화
 * 후 별칭까지 포함해 맞춘다. 넓게 잡아 오탐이 나는 편이 놓치는 것보다 낫다.
 *
 * 한계 — 십팔반·십구외는 문헌마다 해석이 갈리고, 임상에서 의도적으로 함께
 * 쓰는 경우도 있다(감초+원화 등). 그래서 '금지' 가 아니라 '확인' 으로 띄운다.
 * 최종 판단은 한의사 몫이다.
 */

export type TabooKind = 'ban' | 'oe' | 'pregnancy';

export interface HerbTaboo {
  kind: TabooKind;
  /** 임신 관련만 구분한다. 배합 금기는 등급을 나누지 않는다. */
  severity?: 'forbidden' | 'caution';
  /** 짝을 이루는 두 약재. pregnancy 는 second 가 없다. */
  first: string;
  second?: string;
  /** 화면에 보여줄 설명 */
  note: string;
  source: string;
}

/** 표기 흔들림을 흡수한다. 법제 접두사와 한자/한글을 같은 것으로 본다. */
const ALIASES: Record<string, string[]> = {
  감초: ['甘草', '자감초', '炙甘草', '구감초'],
  감수: ['甘遂'],
  대극: ['大戟', '경대극', '홍대극'],
  원화: ['芫花'],
  해조: ['海藻'],
  여로: ['藜蘆'],
  인삼: ['人蔘', '人参', '홍삼', '백삼'],
  단삼: ['丹蔘', '丹参'],
  현삼: ['玄蔘', '玄参'],
  사삼: ['沙蔘', '沙参'],
  고삼: ['苦蔘', '苦参'],
  세신: ['細辛'],
  작약: ['芍藥', '백작약', '적작약', '白芍藥', '赤芍藥'],
  오두: ['烏頭', '천오', '川烏', '초오', '草烏'],
  부자: ['附子', '포부자', '炮附子'],
  패모: ['貝母', '천패모', '절패모'],
  과루: ['瓜蔞', '과루인', '괄루근', '천화분', '天花粉'],
  반하: ['半夏', '법반하', '法半夏', '강반하', '제반하'],
  백렴: ['白蘞'],
  백급: ['白及', '白芨'],
  유황: ['硫黃', '석유황'],
  박초: ['朴硝', '망초', '芒硝'],
  수은: ['水銀'],
  비상: ['砒霜', '신석', '砒石'],
  낭독: ['狼毒'],
  밀타승: ['密陀僧'],
  파두: ['巴豆'],
  견우자: ['牽牛子', '흑축', '백축'],
  정향: ['丁香'],
  울금: ['鬱金', '강황', '薑黃'],
  아초: ['牙硝'],
  삼릉: ['三稜'],
  천웅: ['天雄'],
  서각: ['犀角'],
  인삼노: ['蔘蘆'],
  오령지: ['五靈脂'],
  육계: ['肉桂', '계피', '桂皮'],
  적석지: ['赤石脂'],
  사향: ['麝香'],
  홍화: ['紅花'],
  도인: ['桃仁'],
  대황: ['大黃'],
  망초: ['芒硝'],
  지실: ['枳實'],
  아출: ['莪朮', '봉출'],
  수질: ['水蛭', '거머리'],
  맹충: ['蝱蟲', '虻蟲'],
  건칠: ['乾漆'],
  구맥: ['瞿麥'],
  통초: ['通草'],
  의이인: ['薏苡仁', '율무'],
  마황: ['麻黃'],
};

/** 십팔반 — 함께 쓰면 독성이 커진다고 본 짝. */
const SIPPALBAN: Array<[string, string]> = [
  ['감초', '감수'],
  ['감초', '대극'],
  ['감초', '원화'],
  ['감초', '해조'],
  ['여로', '인삼'],
  ['여로', '단삼'],
  ['여로', '현삼'],
  ['여로', '사삼'],
  ['여로', '고삼'],
  ['여로', '세신'],
  ['여로', '작약'],
  ['오두', '패모'],
  ['오두', '과루'],
  ['오두', '반하'],
  ['오두', '백렴'],
  ['오두', '백급'],
];

/** 십구외 — 약효가 서로를 꺼린다고 본 짝. */
const SIPGUOE: Array<[string, string]> = [
  ['유황', '박초'],
  ['수은', '비상'],
  ['낭독', '밀타승'],
  ['파두', '견우자'],
  ['정향', '울금'],
  ['천웅', '서각'],
  ['아초', '삼릉'],
  ['인삼', '오령지'],
  ['육계', '적석지'],
];

/**
 * 임신금기 — 두 단계로 나눈다.
 *
 * 전통 목록을 한 덩어리로 쓰면 반하·의이인·마황처럼 흔한 약재까지 '금기' 로
 * 떠서 경고가 남발된다. 남발된 경고는 읽히지 않고, 그러면 정작 파두·수은
 * 같은 진짜 금기도 같이 묻힌다. 그래서 절대금기와 신용(愼用)을 분리한다.
 */

/** 준하축수·맹독·강한 파혈 — 임신 중 쓰지 않는다. */
const PREGNANCY_FORBIDDEN: string[] = [
  '파두',
  '견우자',
  '대극',
  '감수',
  '원화',
  '상륙',
  '반묘',
  '수은',
  '비상',
  '수질',
  '맹충',
  '사향',
  '건칠',
  '오두',
  '천오',
  '초오',
];

/** 신용(愼用) — 쓸 수 있으나 용량·기간을 살펴야 하는 약재. */
const PREGNANCY_CAUTION: string[] = [
  '삼릉',
  '아출',
  '홍화',
  '도인',
  '대황',
  '망초',
  '지실',
  '부자',
  '반하',
  '구맥',
  '통초',
  '의이인',
  '마황',
];

/**
 * 부분포함으로 맞추면 걸리는 다른 약재들.
 *
 * 향부자(香附子)는 부자(附子)가 아니고, 백두옹은 오두가 아니다. 이름이
 * 겹친다고 독성 경고를 띄우면 흔한 처방마다 거짓 경고가 뜨고, 그러면
 * 진짜 경고까지 무시된다.
 */
const CONFUSABLE: Record<string, RegExp> = {
  부자: /향부자|香附子|향부/,
  오두: /백두옹|白頭翁/,
  대황: /대황봉밀|숙대황/,
  통초: /목통|木通/,
  마황: /마황근|麻黃根/,
};

function normalize(name: string): string {
  return name.normalize('NFC').replace(/\s+/g, '').trim();
}

/** 입력된 약재명이 기준 약재(canonical)에 해당하는지. 별칭과 부분포함까지 본다. */
function matches(input: string, canonical: string): boolean {
  const n = normalize(input);
  if (!n) return false;
  // 정확히 같은 이름이면 혼동 목록을 볼 것도 없다.
  const candidates = [canonical, ...(ALIASES[canonical] ?? [])];
  if (candidates.some((c) => n === c)) return true;
  if (CONFUSABLE[canonical]?.test(n)) return false;
  return candidates.some((c) => n.includes(c));
}

/**
 * 약재 목록에서 배합 금기를 찾는다.
 * @param herbNames 처방에 들어간 약재명들
 * @param pregnant 임신 여부. 모르면 false — 모른다고 경고를 지어내지 않는다.
 */
export function findHerbTaboos(
  herbNames: string[],
  pregnant = false,
): HerbTaboo[] {
  const names = herbNames.map(normalize).filter(Boolean);
  const found: HerbTaboo[] = [];

  const pairCheck = (
    pairs: Array<[string, string]>,
    kind: TabooKind,
    label: string,
    source: string,
  ) => {
    for (const [a, b] of pairs) {
      const hitA = names.find((n) => matches(n, a));
      const hitB = names.find((n) => matches(n, b));
      if (hitA && hitB && hitA !== hitB) {
        found.push({
          kind,
          first: hitA,
          second: hitB,
          note: `${label} — ${a}와 ${b}는 함께 쓰지 않는 짝으로 전해진다. 의도한 배합인지 확인이 필요하다.`,
          source,
        });
      }
    }
  };

  pairCheck(SIPPALBAN, 'ban', '십팔반(十八反)', '儒門事親 계통 본초 배합 금기');
  pairCheck(SIPGUOE, 'oe', '십구외(十九畏)', '本草綱目 계통 본초 배합 금기');

  if (pregnant) {
    for (const herb of PREGNANCY_FORBIDDEN) {
      const hit = names.find((n) => matches(n, herb));
      if (hit) {
        found.push({
          kind: 'pregnancy',
          severity: 'forbidden',
          first: hit,
          note: `임신금기 — ${herb}는 임신 중 쓰지 않는 약재로 전해진다. 대체 처방을 검토해야 한다.`,
          source: '전통 임신금기(絶對禁忌)',
        });
      }
    }
    for (const herb of PREGNANCY_CAUTION) {
      const hit = names.find((n) => matches(n, herb));
      if (hit) {
        found.push({
          kind: 'pregnancy',
          severity: 'caution',
          first: hit,
          note: `임신 신용(愼用) — ${herb}는 임신 중 용량과 기간을 살펴 쓰는 약재다.`,
          source: '전통 임신 신용 약물',
        });
      }
    }
  }

  return found;
}

export const TABOO_TABLE_SIZE = {
  sippalban: SIPPALBAN.length,
  sipguoe: SIPGUOE.length,
  pregnancyForbidden: PREGNANCY_FORBIDDEN.length,
  pregnancyCaution: PREGNANCY_CAUTION.length,
};
