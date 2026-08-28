import { ClinicalCase } from '../../database/entities/clinical-case.entity';

/**
 * 치험례 본문 보호 — 무엇을 열고 무엇을 잠그는지의 단일 출처(SSOT).
 *
 * 배경: 목록 API 가 originalText 를 그대로 실어 보내고 있었다. 계정 하나로
 * 페이지네이션을 돌리면 6,000건 전문을 통째로 긁어갈 수 있었다는 뜻이다.
 * 화면에서 우클릭을 막는 것은 이 구멍 앞에서 아무 의미가 없다.
 *
 * 방어 원칙
 *   1. 목록·검색·근거 응답에는 "미끼(teaser)" 필드만 담는다. 본문은 절대 안 담는다.
 *   2. 본문은 GET /cases/:id/full 단건으로만, 인증·속도제한·로깅을 거쳐 나간다.
 *   3. 나가는 본문에는 열람자 식별자를 심는다(제로폭 워터마크). 복붙으로 유출되면
 *      누가 흘렸는지 역추적한다.
 *
 * 못 막는 것: 화면을 보고 타이핑하거나 카메라로 찍는 것. 웹에서는 스크린샷도 못 막는다.
 * 그래서 "차단"이 아니라 "대량 유출 차단 + 개별 유출자 특정"이 목표다.
 */

/** 잠금 대상 — 이 필드들이 곧 상품이다. 목록 응답에 절대 넣지 않는다. */
export const LOCKED_CASE_FIELDS = [
  'originalText', // 원문 전문
  'patternReasoning', // 변증 추론
  'modification', // 가감 이유
  'courseSteps', // 경과 전 과정
  'clinicalNotes', // 임상 노트
] as const;

/**
 * distinctive(감별 포인트)는 잠금 대상이지만 목록에서 한 줄 미리보기로 쓴다.
 * 전문을 주지 않고 이 길이까지만 잘라서 흘린다 — "더 있다"를 보여주는 게 목적.
 *
 * 60자였는데 40자로 줄였다. 한글 60자면 감별 포인트 한 문장이 통째로 들어가서,
 * 실제 데이터의 상당수가 미끼가 아니라 전문 그대로 나가고 있었다. 40자면
 * 판단의 실마리는 보이되 결론은 안 보인다 — 미끼가 하라는 일이 그것이다.
 */
export const DISTINCTIVE_TEASER_CHARS = 40;

/** 미끼로 항상 공개하는 필드 목록 (문서화용 — 실제 매핑은 toTeaserCase 가 한다) */
export const TEASER_CASE_FIELDS = [
  'id',
  'sourceId',
  'summaryOneLine',
  'chiefComplaint',
  'patternDiagnosis',
  'treatmentOutcome',
  'patientGender',
  'patientAgeRange',
  'patientConstitution',
  'keyFindings',
  'verifiedFormulaName',
  'recorderName',
  'recordedYear',
] as const;

export interface TeaserCase {
  id: string;
  sourceId: string;
  title: string;
  chiefComplaint: string;
  symptoms: string[];
  formulaName: string;
  formulaHanja: string;
  constitution: string;
  diagnosis: string;
  patientAge: number | null;
  patientGender: string | null;
  outcome: string | null;
  summaryOneLine: string | null;
  keyFindings: string[];
  /** 감별 포인트 앞부분만 — 전문은 잠긴다 */
  distinctivePreview: string | null;
  verifiedFormulaName: string | null;
  formulaMismatch: boolean;
  hasMixedContent: boolean;
  dataSource: string;
  /** 이 사용자가 본문을 볼 수 있는가 — 프론트가 자물쇠 UI 를 그리는 근거 */
  locked: boolean;
}

export interface CaseWatermark {
  /** 화면에 반복 표시할 문구 — 스크린샷·촬영에 그대로 박힌다 */
  label: string;
  /** 발급 시각 (ISO) */
  issuedAt: string;
  /** 열람 로그 id — 유출본 신고 시 이 값으로 열람자를 특정한다 */
  traceId: string;
}

export interface FullCase extends TeaserCase {
  originalText: string;
  patternReasoning: string | null;
  modification: string | null;
  courseSteps: Array<{ step: string; change: string }>;
  distinctive: string | null;
  clinicalNotes: string;
  watermark: CaseWatermark;
}

function symptomNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s: any) => (typeof s === 'string' ? s : s?.name))
    .filter((s: unknown): s is string => typeof s === 'string' && s.length > 0);
}

/**
 * 목록·검색·근거 응답용 변환. 잠금 필드는 아예 객체에 담기지 않는다.
 *
 * 필드를 빼먹는 실수를 막으려고 화이트리스트 방식으로 짰다 — 엔티티에 새 컬럼이
 * 생겨도 여기에 명시하지 않는 한 밖으로 나가지 않는다.
 */
export function toTeaserCase(c: Partial<ClinicalCase> & { id: string }): TeaserCase {
  const firstFormula =
    Array.isArray(c.herbalFormulas) && c.herbalFormulas.length > 0 ? c.herbalFormulas[0] : null;

  const distinctive = c.distinctive || null;

  return {
    id: c.id,
    sourceId: c.sourceId || '',
    // 정리된 요약이 있으면 제목으로 쓴다. 원문 주소증은 "은 풍치와…" 처럼
    // 문장 중간에서 잘려 시작하는 경우가 많다.
    title: c.summaryOneLine || c.chiefComplaint?.slice(0, 80) || '(주소증 미기재)',
    chiefComplaint: c.chiefComplaint || '',
    symptoms: symptomNames(c.symptoms),
    formulaName: (firstFormula as any)?.formulaName || '',
    formulaHanja: (firstFormula as any)?.formulaHanja || '',
    constitution: c.patientConstitution || '',
    diagnosis: c.patternDiagnosis || '',
    patientAge: c.patientAgeRange ? parseInt(String(c.patientAgeRange), 10) || null : null,
    patientGender: c.patientGender || null,
    outcome: c.treatmentOutcome || null,
    summaryOneLine: c.summaryOneLine || null,
    keyFindings: c.keyFindings || [],
    distinctivePreview: distinctive
      ? distinctive.length > DISTINCTIVE_TEASER_CHARS
        ? `${distinctive.slice(0, DISTINCTIVE_TEASER_CHARS)}…`
        : distinctive
      : null,
    verifiedFormulaName: c.verifiedFormulaName || null,
    formulaMismatch: c.formulaMismatch === true,
    hasMixedContent: c.hasMixedContent === true,
    dataSource: c.recorderName || '온고지신 DB',
    locked: true,
  };
}

// ─────────────────────────────────────────────────────────────
// 제로폭 워터마크 — 복붙으로 새어나간 텍스트의 유출자를 특정한다.
//
// 의료 텍스트라 문장을 동의어로 바꾸는 방식(자연어 워터마킹)은 절대 쓰지 않는다.
// 처방·용량이 한 글자만 달라져도 임상 사고로 이어진다. 눈에 안 보이고 의미도
// 바꾸지 않는 제로폭 문자만 쓴다.
//
// 인코딩: traceId 앞 8자리(hex) → 비트열 → ZW0/ZW1, 문단 경계마다 반복 삽입.
// 반복해서 넣는 이유는 일부만 복사해 가도 복원되게 하기 위해서다.
// ─────────────────────────────────────────────────────────────

const ZW0 = '​'; // ZERO WIDTH SPACE       → 0
const ZW1 = '‌'; // ZERO WIDTH NON-JOINER  → 1
const ZW_MARK = '‍'; // ZERO WIDTH JOINER   → 구분자

/** 워터마크 페이로드 길이 (hex 8자 = 32비트) */
const WATERMARK_HEX_LEN = 8;

function encodeBits(hex: string): string {
  let bits = '';
  for (const ch of hex) {
    bits += parseInt(ch, 16).toString(2).padStart(4, '0');
  }
  return ZW_MARK + [...bits].map((b) => (b === '1' ? ZW1 : ZW0)).join('') + ZW_MARK;
}

/**
 * 본문에 제로폭 워터마크를 심는다.
 *
 * 문단(빈 줄) 경계마다 삽입한다. 문단이 없으면 앞뒤로만 붙인다.
 * 원문 글자는 하나도 건드리지 않는다 — 사이에 폭 0 문자를 끼워 넣을 뿐이다.
 */
export function embedZeroWidthWatermark(text: string, traceId: string): string {
  if (!text) return text;
  const hex = traceId.replace(/-/g, '').slice(0, WATERMARK_HEX_LEN).padEnd(WATERMARK_HEX_LEN, '0');
  const mark = encodeBits(hex);

  const paragraphs = text.split(/\n\s*\n/);
  if (paragraphs.length === 1) return mark + text + mark;
  return mark + paragraphs.join(`\n\n${mark}`) + mark;
}

/**
 * 유출본에서 워터마크를 복원한다. 관리자 도구에서 "이 텍스트 누가 흘렸나" 조회용.
 *
 * @returns traceId 앞 8자리 hex, 못 찾으면 null
 */
export function extractZeroWidthWatermark(text: string): string | null {
  if (!text) return null;
  const re = new RegExp(`${ZW_MARK}([${ZW0}${ZW1}]+)${ZW_MARK}`);
  const m = re.exec(text);
  if (!m) return null;

  const bits = [...m[1]].map((c) => (c === ZW1 ? '1' : '0')).join('');
  if (bits.length !== WATERMARK_HEX_LEN * 4) return null;

  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

/** 화면에 반복 표시할 가시 워터마크 문구를 만든다 — 스크린샷·촬영 대비 */
export function buildWatermarkLabel(user: {
  name?: string | null;
  licenseNumber?: string | null;
  email?: string | null;
}): string {
  const who = user.name || user.email || '알 수 없음';
  const license = user.licenseNumber ? ` · 면허 ${user.licenseNumber}` : '';
  return `${who}${license} · 온고지신`;
}

/**
 * 본문까지 포함한 응답. 반드시 열람 로그를 남긴 뒤에 호출한다 —
 * traceId 가 로그 id 여야 유출본 역추적이 성립한다.
 */
export function toFullCase(
  c: ClinicalCase,
  watermark: CaseWatermark,
): FullCase {
  return {
    ...toTeaserCase(c),
    locked: false,
    originalText: embedZeroWidthWatermark(c.originalText || '', watermark.traceId),
    patternReasoning: c.patternReasoning
      ? embedZeroWidthWatermark(c.patternReasoning, watermark.traceId)
      : null,
    modification: c.modification || null,
    courseSteps: Array.isArray(c.courseSteps) ? c.courseSteps : [],
    distinctive: c.distinctive || null,
    clinicalNotes: c.clinicalNotes || '',
    watermark,
  };
}
