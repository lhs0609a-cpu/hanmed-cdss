import {
  Reference,
  ReferenceCategory,
  ReferenceEvidenceType,
} from '../entities/reference.entity';

/**
 * 문헌 소개글에 붙일 태그를 만든다.
 *
 * 왜 필요했나: 문헌 소개글 2천 편을 태그 없이 올렸더니 게시판이 훑을 수
 * 없게 됐다. 제목만 2천 줄 있는 목록에서 "요통 자료 좀 보자" 를 할 방법이
 * 없다. 훑을 수 없는 게시판은 아무도 안 연다 — 자료를 채운 것이 오히려
 * 게시판을 못 쓰게 만든 셈이다.
 *
 * 태그는 지어내지 않는다. 이미 가진 것만 쓴다.
 *
 *  1. category — 수집기가 분류해 둔 값. 2천 편 중 'other' 가 5편뿐이다.
 *  2. evidenceType — 근거 수준. 이미 목록 정렬 기준으로 쓰는 값이다.
 *  3. keywords 중 아래 표에 있는 것만. MeSH 용어다.
 *
 * keywords 를 통째로 쓰지 않는 이유는 두 가지다. 하나는 영문이라 한글
 * 게시판에 영문 태그가 박힌다는 것. 다른 하나는 잡음이다 — 가장 흔한
 * 키워드가 Humans(1,892), Female(518), Adult(352) 라 태그로서 아무것도
 * 구분해 주지 않는다.
 *
 * 그래서 화이트리스트만 옮긴다. 애매한 것은 넣지 않았다. 예를 들어
 * 'Medicine, Chinese Traditional' 은 중의학이지 한의학이 아니고,
 * 'Phytotherapy' 는 생약요법이라 한약과 같은 말이 아니다. 의료 용어에서
 * 비슷한 것을 같은 것으로 적으면 그건 분류가 아니라 오분류다.
 */

/** 카테고리 → 태그. 사람이 이미 쓰는 말로 짧게. */
const CATEGORY_TAG: Record<ReferenceCategory, string | null> = {
  [ReferenceCategory.ACUPUNCTURE]: '침구',
  [ReferenceCategory.HERBAL]: '한약',
  [ReferenceCategory.DIAGNOSIS]: '변증',
  [ReferenceCategory.REHAB]: '추나',
  [ReferenceCategory.SAFETY]: '안전성',
  [ReferenceCategory.ADMIN]: '행정',
  // 'other' 는 태그를 안 단다. 아무것도 안 알려주는 태그는 없느니만 못하다.
  [ReferenceCategory.OTHER]: null,
};

/** 근거 수준 → 태그. 목록에서 무게를 가리는 값이라 붙여 둔다. */
const EVIDENCE_TAG: Partial<Record<ReferenceEvidenceType, string>> = {
  [ReferenceEvidenceType.SYSTEMATIC_REVIEW]: '체계적고찰',
  [ReferenceEvidenceType.RCT]: 'RCT',
  [ReferenceEvidenceType.GUIDELINE]: '진료지침',
};

/**
 * MeSH 용어 → 한글 태그.
 *
 * 소문자로 맞춰 찾는다. PubMed 가 같은 개념을 대소문자 다르게 주는 일이
 * 잦다(Acupuncture / acupuncture, Stroke / stroke).
 */
const KEYWORD_TAG: Record<string, string> = {
  // 시술·치료 수단
  'acupuncture therapy': '침',
  acupuncture: '침',
  'acupuncture points': '침',
  electroacupuncture: '전침',
  moxibustion: '뜸',
  acupressure: '지압',
  massage: '마사지',
  'cupping therapy': '부항',
  'drugs, chinese herbal': '한약',
  'musculoskeletal manipulations': '도수치료',
  'manipulation, spinal': '도수치료',
  'manual therapy': '도수치료',
  'exercise therapy': '운동치료',

  // 질환·증상
  'low back pain': '요통',
  'neck pain': '경항통',
  'shoulder pain': '견통',
  'chronic pain': '만성통증',
  'osteoarthritis, knee': '무릎관절염',
  fibromyalgia: '섬유근통',
  'carpal tunnel syndrome': '손목터널증후군',
  stroke: '뇌졸중',
  'stroke rehabilitation': '뇌졸중',
  'parkinson disease': '파킨슨병',
  dementia: '치매',
  depression: '우울',
  anxiety: '불안',
  'sleep initiation and maintenance disorders': '불면',
  headache: '두통',
  'migraine disorders': '편두통',
  tinnitus: '이명',
  constipation: '변비',
  'irritable bowel syndrome': '과민성장증후군',
  dysmenorrhea: '월경통',
  menopause: '갱년기',
  obesity: '비만',
  hypertension: '고혈압',
  'diabetes mellitus, type 2': '제2형당뇨',
  'rhinitis, allergic': '알레르기비염',
  'dry eye syndromes': '안구건조',
  fatigue: '피로',
  neoplasms: '종양',
};

/** 태그 개수 상한. 너무 많으면 목록에서 제목을 밀어낸다. */
const MAX_TAGS = 5;

/**
 * 사람이 쓴 글과 구분되는 표식.
 *
 * 게시판에 문헌 소개글이 사람 글보다 백 배 많다. 이 태그가 있어야
 * "문헌 빼고 보기" 가 된다.
 */
export const REFERENCE_TAG = '문헌';

export function buildTags(r: Reference): string[] {
  const tags: string[] = [REFERENCE_TAG];

  const cat = CATEGORY_TAG[r.category];
  if (cat) tags.push(cat);

  const ev = EVIDENCE_TAG[r.evidenceType];
  if (ev) tags.push(ev);

  for (const kw of r.keywords ?? []) {
    if (tags.length >= MAX_TAGS) break;
    const hit = KEYWORD_TAG[kw.trim().toLowerCase()];
    // 중복은 건너뛴다. 카테고리가 '한약' 인데 키워드도 '한약' 인 일이 흔하다.
    if (hit && !tags.includes(hit)) tags.push(hit);
  }

  return tags;
}
