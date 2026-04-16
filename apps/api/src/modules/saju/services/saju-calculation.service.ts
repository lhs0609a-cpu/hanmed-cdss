import { Injectable } from '@nestjs/common';

/**
 * 사주(四柱) 팔자 계산 엔진 - 서버사이드
 * apps/web/src/lib/saju.ts 에서 핵심 로직 포팅
 */

// ─── 기본 데이터 ─────────────────────────────────────

const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
const STEM_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const;
const BRANCH_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

type Element = '목' | '화' | '토' | '금' | '수';
const ELEMENTS: Element[] = ['목', '화', '토', '금', '수'];

const STEM_TO_ELEMENT: Element[] = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];
const BRANCH_TO_ELEMENT: Element[] = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수'];

const ZODIAC_ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'] as const;
const ZODIAC_EMOJI = ['🐭', '🐮', '🐯', '🐰', '🐲', '🐍', '🐴', '🐑', '🐵', '🐔', '🐶', '🐷'] as const;

const SOLAR_TERM_STARTS: [number, number][] = [
  [2, 4], [3, 6], [4, 5], [5, 6], [6, 6], [7, 7],
  [8, 8], [9, 8], [10, 8], [11, 7], [12, 7], [1, 5],
];

const MONTH_STEM_OFFSET = [2, 4, 6, 8, 0];
const HOUR_STEM_OFFSET = [0, 2, 4, 6, 8];

export interface Pillar {
  stem: number;
  branch: number;
}

export interface SajuResult {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar | null;
  zodiac: string;
  zodiacEmoji: string;
}

export interface ElementBalance {
  목: number;
  화: number;
  토: number;
  금: number;
  수: number;
}

export type ConstitutionType = 'taeyang' | 'taeeum' | 'soyang' | 'soeum';

export interface HealthProfile {
  constitution: ConstitutionType;
  dominantElement: Element;
  weakElement: Element;
  strongOrgan: string;
  weakOrgan: string;
  yearFortune: string;
  luckyElement: Element;
}

// ─── 충/형/파/해 관계 데이터 ──────────────────────

const CHUNG_PAIRS: [number, number][] = [
  [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11],
];

const HYUNG_PAIRS: [number, number][] = [
  [2, 5], [5, 8], [8, 2], [1, 10], [10, 7], [7, 1],
  [0, 3], [3, 0], [4, 4], [6, 6], [9, 9], [11, 11],
];

const PA_PAIRS: [number, number][] = [
  [0, 9], [1, 4], [2, 11], [3, 6], [5, 8], [7, 10],
];

const HAE_PAIRS: [number, number][] = [
  [0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10],
];

const OVERCOMING_MAP: Record<Element, Element> = {
  목: '토', 토: '수', 수: '화', 화: '금', 금: '목',
};

const ORGAN_MAP: Record<Element, string> = {
  목: '간(肝)', 화: '심장(心)', 토: '비장(脾)', 금: '폐(肺)', 수: '신장(腎)',
};

const CONSTITUTION_KO: Record<ConstitutionType, string> = {
  taeyang: '태양인',
  taeeum: '태음인',
  soyang: '소양인',
  soeum: '소음인',
};

const ELEMENT_EMOJI: Record<Element, string> = {
  목: '🌳', 화: '🔥', 토: '⛰️', 금: '⚔️', 수: '💧',
};

export interface FortuneConflict {
  type: '충' | '형' | '파' | '해';
  pillarLabel: string;
  description: string;
}

export interface HealthRisk {
  organ: string;
  reason: string;
  advice: string;
}

export interface FortuneRisk {
  score: number;
  level: 'safe' | 'caution' | 'warning' | 'danger';
  conflicts: FortuneConflict[];
  healthRisks: HealthRisk[];
  overallAdvice: string;
}

function checkPairs(
  pairs: [number, number][],
  yearBranch: number,
  targetBranch: number,
): boolean {
  return pairs.some(
    ([a, b]) =>
      (a === yearBranch && b === targetBranch) ||
      (a === targetBranch && b === yearBranch),
  );
}

@Injectable()
export class SajuCalculationService {
  private getJDN(year: number, month: number, day: number): number {
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    return day + Math.floor((153 * m + 2) / 5) + 365 * y +
      Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  }

  private getAdjustedYear(year: number, month: number, day: number): number {
    if (month < 2 || (month === 2 && day < 4)) return year - 1;
    return year;
  }

  private getSolarMonth(month: number, day: number): number {
    for (let i = 0; i < 12; i++) {
      const [sm, sd] = SOLAR_TERM_STARTS[i];
      const nextIdx = (i + 1) % 12;
      const [nm, nd] = SOLAR_TERM_STARTS[nextIdx];
      if (sm <= nm) {
        if ((month > sm || (month === sm && day >= sd)) &&
            (month < nm || (month === nm && day < nd))) {
          return i;
        }
      } else {
        if ((month > sm || (month === sm && day >= sd)) ||
            (month < nm || (month === nm && day < nd))) {
          return i;
        }
      }
    }
    return 0;
  }

  private getYearPillar(year: number, month: number, day: number): Pillar {
    const adj = this.getAdjustedYear(year, month, day);
    return {
      stem: ((adj % 10) + 6) % 10,
      branch: ((adj % 12) + 8) % 12,
    };
  }

  private getMonthPillar(year: number, month: number, day: number): Pillar {
    const yearPillar = this.getYearPillar(year, month, day);
    const solarMonth = this.getSolarMonth(month, day);
    const branch = (solarMonth + 2) % 12;
    const yearStemGroup = yearPillar.stem % 5;
    const startStem = MONTH_STEM_OFFSET[yearStemGroup];
    const stem = (startStem + solarMonth) % 10;
    return { stem, branch };
  }

  private getDayPillar(year: number, month: number, day: number): Pillar {
    const jdn = this.getJDN(year, month, day);
    const idx = ((jdn + 9) % 60 + 60) % 60;
    return { stem: idx % 10, branch: idx % 12 };
  }

  private getHourPillar(dayStem: number, hour: number): Pillar {
    const branchIdx = Math.floor(((hour + 1) % 24) / 2);
    const dayStemGroup = dayStem % 5;
    const startStem = HOUR_STEM_OFFSET[dayStemGroup];
    const stem = (startStem + branchIdx) % 10;
    return { stem, branch: branchIdx };
  }

  /** 사주 팔자 계산 */
  calculateSaju(birthDate: string, birthHour?: number): SajuResult {
    const [year, month, day] = birthDate.split('-').map(Number);
    const yearPillar = this.getYearPillar(year, month, day);
    const monthPillar = this.getMonthPillar(year, month, day);
    const dayPillar = this.getDayPillar(year, month, day);
    const hourPillar = birthHour != null ? this.getHourPillar(dayPillar.stem, birthHour) : null;
    const zodiacIdx = yearPillar.branch;
    return {
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      hour: hourPillar,
      zodiac: ZODIAC_ANIMALS[zodiacIdx],
      zodiacEmoji: ZODIAC_EMOJI[zodiacIdx],
    };
  }

  /** 오행 밸런스 계산 */
  getElementBalance(saju: SajuResult): ElementBalance {
    const balance: ElementBalance = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
    const addPillar = (p: Pillar, weight: number) => {
      balance[STEM_TO_ELEMENT[p.stem]] += weight;
      balance[BRANCH_TO_ELEMENT[p.branch]] += weight;
    };
    addPillar(saju.year, 1.0);
    addPillar(saju.month, 1.2);
    addPillar(saju.day, 1.5);
    if (saju.hour) addPillar(saju.hour, 1.0);

    const total = Object.values(balance).reduce((a, b) => a + b, 0);
    if (total > 0) {
      for (const key of ELEMENTS) {
        balance[key] = Math.round((balance[key] / total) * 100);
      }
    }
    const sum = Object.values(balance).reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      const maxKey = ELEMENTS.reduce((a, b) => balance[a] >= balance[b] ? a : b);
      balance[maxKey] += 100 - sum;
    }
    return balance;
  }

  /** 오행 밸런스 → 사상체질 추론 */
  deriveConstitution(balance: ElementBalance): ConstitutionType {
    const scores = {
      taeyang: balance.화 * 1.5 + balance.목 * 1.0 - balance.수 * 0.5,
      soyang: balance.화 * 1.0 + balance.토 * 1.2 - balance.금 * 0.3 + balance.목 * 0.5,
      taeeum: balance.토 * 1.5 + balance.금 * 1.0 - balance.목 * 0.3 + balance.수 * 0.3,
      soeum: balance.수 * 1.5 + balance.금 * 1.0 - balance.화 * 0.5,
    };
    return (Object.entries(scores) as [ConstitutionType, number][])
      .sort(([, a], [, b]) => b - a)[0][0];
  }

  /** 건강 프로필 생성 */
  getHealthProfile(balance: ElementBalance): HealthProfile {
    const constitution = this.deriveConstitution(balance);
    const sorted = ELEMENTS.slice().sort((a, b) => balance[b] - balance[a]);
    const dominant = sorted[0];
    const weak = sorted[sorted.length - 1];

    const organMap: Record<Element, [string, string]> = {
      목: ['간(肝)', '담(膽)'],
      화: ['심장(心)', '소장(小腸)'],
      토: ['비장(脾)', '위(胃)'],
      금: ['폐(肺)', '대장(大腸)'],
      수: ['신장(腎)', '방광(膀胱)'],
    };

    const luckyElement = weak;
    const thisYear = 2026;
    const thisYearStem = ((thisYear % 10) + 6) % 10;
    const thisYearBranch = ((thisYear % 12) + 8) % 12;
    const yearElement = STEM_TO_ELEMENT[thisYearStem];
    const yearBranchElement = BRANCH_TO_ELEMENT[thisYearBranch];

    let yearFortune: string;
    if (yearElement === luckyElement || yearBranchElement === luckyElement) {
      yearFortune = '올해는 부족한 기운이 채워지는 행운의 해! 적극적으로 도전하세요.';
    } else if (yearElement === dominant) {
      yearFortune = '올해는 본래 강한 기운이 더 강해져요. 과욕은 금물, 균형이 중요합니다.';
    } else {
      yearFortune = '올해는 안정적인 흐름이에요. 꾸준한 건강관리가 빛을 발합니다.';
    }

    return {
      constitution,
      dominantElement: dominant,
      weakElement: weak,
      strongOrgan: organMap[dominant][0],
      weakOrgan: organMap[weak][0],
      yearFortune,
      luckyElement,
    };
  }

  /** 2026년 위험도 분석 (병오년: 丙午) */
  analyzeYearRisk(saju: SajuResult, balance: ElementBalance, health: HealthProfile): FortuneRisk {
    const YEAR_STEM = 2;   // 병(丙)
    const YEAR_BRANCH = 6; // 오(午)
    const yearElement = STEM_TO_ELEMENT[YEAR_STEM];
    const yearBranchElement = BRANCH_TO_ELEMENT[YEAR_BRANCH];

    let score = 0;
    const conflicts: FortuneConflict[] = [];
    const healthRisks: HealthRisk[] = [];

    const pillarList: { label: string; pillar: Pillar }[] = [
      { label: '년주', pillar: saju.year },
      { label: '월주', pillar: saju.month },
      { label: '일주', pillar: saju.day },
    ];
    if (saju.hour) pillarList.push({ label: '시주', pillar: saju.hour });

    for (const { label, pillar } of pillarList) {
      const b = pillar.branch;
      const isDayPillar = label === '일주';

      if (checkPairs(CHUNG_PAIRS, YEAR_BRANCH, b)) {
        score += isDayPillar ? 40 : 30;
        conflicts.push({
          type: '충', pillarLabel: label,
          description: `${BRANCHES[YEAR_BRANCH]}(${BRANCH_HANJA[YEAR_BRANCH]})↔${BRANCHES[b]}(${BRANCH_HANJA[b]}) 충`,
        });
      }
      if (checkPairs(HYUNG_PAIRS, YEAR_BRANCH, b)) {
        score += 20;
        conflicts.push({
          type: '형', pillarLabel: label,
          description: `${BRANCHES[YEAR_BRANCH]}(${BRANCH_HANJA[YEAR_BRANCH]})↔${BRANCHES[b]}(${BRANCH_HANJA[b]}) 형`,
        });
      }
      if (checkPairs(PA_PAIRS, YEAR_BRANCH, b)) {
        score += 15;
        conflicts.push({
          type: '파', pillarLabel: label,
          description: `${BRANCHES[YEAR_BRANCH]}(${BRANCH_HANJA[YEAR_BRANCH]})↔${BRANCHES[b]}(${BRANCH_HANJA[b]}) 파`,
        });
      }
      if (checkPairs(HAE_PAIRS, YEAR_BRANCH, b)) {
        score += 10;
        conflicts.push({
          type: '해', pillarLabel: label,
          description: `${BRANCHES[YEAR_BRANCH]}(${BRANCH_HANJA[YEAR_BRANCH]})↔${BRANCHES[b]}(${BRANCH_HANJA[b]}) 해`,
        });
      }
    }

    const weakEl = health.weakElement;
    if (OVERCOMING_MAP[yearElement] === weakEl) {
      score += 15;
      healthRisks.push({
        organ: ORGAN_MAP[weakEl],
        reason: `${yearElement} 기운이 약한 ${weakEl}을 극함`,
        advice: `${ORGAN_MAP[weakEl]} 정기 검진 추천`,
      });
    }
    if (OVERCOMING_MAP[yearBranchElement] === weakEl && yearBranchElement !== yearElement) {
      score += 15;
      healthRisks.push({
        organ: ORGAN_MAP[weakEl],
        reason: `${yearBranchElement} 기운이 약한 ${weakEl}을 극함`,
        advice: `${ORGAN_MAP[weakEl]} 관리에 신경쓰세요`,
      });
    }

    const dominantEl = health.dominantElement;
    if (yearElement === dominantEl || yearBranchElement === dominantEl) {
      score += 10;
      healthRisks.push({
        organ: ORGAN_MAP[dominantEl],
        reason: `${dominantEl} 과다로 과로/번아웃 위험`,
        advice: `충분한 휴식, ${ORGAN_MAP[dominantEl]} 검진 추천`,
      });
    }

    score = Math.min(100, Math.max(0, score));

    let level: FortuneRisk['level'];
    if (score <= 25) level = 'safe';
    else if (score <= 45) level = 'caution';
    else if (score <= 65) level = 'warning';
    else level = 'danger';

    let overallAdvice: string;
    if (level === 'safe') overallAdvice = '올해는 건강운이 안정적이에요.';
    else if (level === 'caution') overallAdvice = '올해는 건강에 소소한 변동이 있을 수 있어요.';
    else if (level === 'warning') overallAdvice = '올해는 건강과 안전에 각별히 유의하세요.';
    else overallAdvice = '올해는 건강에 특별한 주의가 필요합니다.';

    return { score, level, conflicts, healthRisks, overallAdvice };
  }

  /** 전체 분석 */
  analyzeProfile(birthDate: string, birthHour?: number) {
    const saju = this.calculateSaju(birthDate, birthHour);
    const balance = this.getElementBalance(saju);
    const health = this.getHealthProfile(balance);
    const risk = this.analyzeYearRisk(saju, balance, health);
    return { saju, balance, health, risk };
  }

  /** 포맷: 한글 */
  formatPillar(p: Pillar): string {
    return `${STEMS[p.stem]}${BRANCHES[p.branch]}`;
  }

  /** 포맷: 한자 */
  formatPillarHanja(p: Pillar): string {
    return `${STEM_HANJA[p.stem]}${BRANCH_HANJA[p.branch]}`;
  }

  /** 오행 이름 */
  getElementName(p: Pillar): [Element, Element] {
    return [STEM_TO_ELEMENT[p.stem], BRANCH_TO_ELEMENT[p.branch]];
  }

  /** 사주 정보를 AI 프롬프트용 텍스트로 변환 */
  formatForPrompt(birthDate: string, birthHour?: number, name?: string, gender?: string): string {
    const { saju, balance, health, risk } = this.analyzeProfile(birthDate, birthHour);
    const pillars = [
      { label: '년주(年柱)', pillar: saju.year },
      { label: '월주(月柱)', pillar: saju.month },
      { label: '일주(日柱)', pillar: saju.day },
      ...(saju.hour ? [{ label: '시주(時柱)', pillar: saju.hour }] : []),
    ];

    const pillarText = pillars
      .map(({ label, pillar }) => `${label}: ${this.formatPillarHanja(pillar)} (${this.formatPillar(pillar)})`)
      .join('\n');

    const balanceText = ELEMENTS
      .map(el => `${el}: ${balance[el]}%`)
      .join(', ');

    const riskText = [
      `[2026년 위험도 분석]`,
      `위험도 점수: ${risk.score}/100 (${risk.level})`,
      ...risk.conflicts.map(c => `- ${c.pillarLabel} ${c.type}: ${c.description}`),
      ...risk.healthRisks.map(r => `- ${r.organ}: ${r.reason}`),
      `종합: ${risk.overallAdvice}`,
    ].join('\n');

    return [
      `[분석 대상]`,
      `이름: ${name || '미상'}`,
      `생년월일: ${birthDate}${birthHour != null ? ` ${birthHour}시` : ''}`,
      gender ? `성별: ${gender}` : '',
      `띠: ${saju.zodiac}${saju.zodiacEmoji}`,
      '',
      `[사주 팔자]`,
      pillarText,
      '',
      `[오행 밸런스]`,
      balanceText,
      '',
      `[체질 분석]`,
      `사상체질: ${CONSTITUTION_KO[health.constitution]}`,
      `강한 오행: ${health.dominantElement} → ${health.strongOrgan} 발달`,
      `약한 오행: ${health.weakElement} → ${health.weakOrgan} 관리 필요`,
      `용신(보충 오행): ${health.luckyElement}`,
      '',
      riskText,
    ].filter(Boolean).join('\n');
  }
}
