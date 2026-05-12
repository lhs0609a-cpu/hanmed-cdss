/**
 * 한자 ↔ 한글 매핑 사전 (자주 쓰는 처방·본초 100여 항목).
 *
 * - 환자/검색에서 한자만 알고 한글 표기를 모를 때, 그리고 그 반대.
 * - 대규모 사전은 별도 PR 에서 사전 파일을 통째로 import 하는 식으로 확장한다.
 * - 매칭은 양방향: 검색어가 한자면 한글로, 한글이면 한자로 변환을 시도한다.
 */

/** 한글 → 한자 (정자) 매핑. 한자에는 동자 이체 등 다중 표기가 있을 수 있어 1대1 만. */
const HANGUL_TO_HANJA: Record<string, string> = {
  // === 처방 (방제) ===
  이중탕: '理中湯',
  육군자탕: '六君子湯',
  보중익기탕: '補中益氣湯',
  사군자탕: '四君子湯',
  사물탕: '四物湯',
  팔물탕: '八物湯',
  십전대보탕: '十全大補湯',
  소청룡탕: '小靑龍湯',
  대청룡탕: '大靑龍湯',
  갈근탕: '葛根湯',
  계지탕: '桂枝湯',
  마황탕: '麻黃湯',
  쌍화탕: '雙和湯',
  육미지황탕: '六味地黃湯',
  육미지황환: '六味地黃丸',
  팔미지황환: '八味地黃丸',
  지백지황환: '知柏地黃丸',
  소시호탕: '小柴胡湯',
  대시호탕: '大柴胡湯',
  시호계지탕: '柴胡桂枝湯',
  반하사심탕: '半夏瀉心湯',
  생강사심탕: '生薑瀉心湯',
  황련해독탕: '黃連解毒湯',
  맥문동탕: '麥門冬湯',
  자감초탕: '炙甘草湯',
  당귀작약산: '當歸芍藥散',
  당귀보혈탕: '當歸補血湯',
  사역탕: '四逆湯',
  진무탕: '眞武湯',
  오령산: '五苓散',
  반하후박탕: '半夏厚朴湯',
  향사육군자탕: '香砂六君子湯',
  곽향정기산: '藿香正氣散',
  평위산: '平胃散',
  이진탕: '二陳湯',
  온경탕: '溫經湯',
  도핵승기탕: '桃核承氣湯',
  대황목단피탕: '大黃牡丹皮湯',
  대건중탕: '大建中湯',
  소건중탕: '小建中湯',
  황기건중탕: '黃耆建中湯',
  방기황기탕: '防己黃耆湯',
  소경활혈탕: '疎經活血湯',
  계지복령환: '桂枝茯苓丸',
  가미소요산: '加味逍遙散',
  소요산: '逍遙散',
  안중산: '安中散',
  보허탕: '補虛湯',
  형개연교탕: '荊芥連翹湯',
  십미패독산: '十味敗毒散',
  치자백피탕: '梔子柏皮湯',
  은교산: '銀翹散',
  상국음: '桑菊飮',

  // === 본초 (약재) ===
  인삼: '人蔘',
  당귀: '當歸',
  황기: '黃耆',
  감초: '甘草',
  생강: '生薑',
  대추: '大棗',
  계지: '桂枝',
  계피: '桂皮',
  마황: '麻黃',
  갈근: '葛根',
  작약: '芍藥',
  백작약: '白芍藥',
  적작약: '赤芍藥',
  지황: '地黃',
  생지황: '生地黃',
  숙지황: '熟地黃',
  창출: '蒼朮',
  백출: '白朮',
  복령: '茯苓',
  반하: '半夏',
  진피: '陳皮',
  청피: '靑皮',
  후박: '厚朴',
  목향: '木香',
  사인: '砂仁',
  황련: '黃連',
  황금: '黃芩',
  황백: '黃柏',
  치자: '梔子',
  시호: '柴胡',
  승마: '升麻',
  방풍: '防風',
  형개: '荊芥',
  강활: '羌活',
  독활: '獨活',
  천궁: '川芎',
  도인: '桃仁',
  홍화: '紅花',
  단삼: '丹參',
  목단피: '牡丹皮',
  지각: '枳殼',
  지실: '枳實',
  대황: '大黃',
  망초: '芒硝',
  맥문동: '麥門冬',
  천문동: '天門冬',
  오미자: '五味子',
  산수유: '山茱萸',
  산약: '山藥',
  육계: '肉桂',
  부자: '附子',
  건강: '乾薑',
  세신: '細辛',
  오수유: '吳茱萸',
  익모초: '益母草',
  포공영: '蒲公英',
  연교: '連翹',
  금은화: '金銀花',
  박하: '薄荷',
  국화: '菊花',
  상엽: '桑葉',
  결명자: '決明子',
  구기자: '枸杞子',
  토사자: '兔絲子',
  보골지: '補骨脂',
  두충: '杜仲',
  속단: '續斷',
  골쇄보: '骨碎補',
  녹용: '鹿茸',
  사향: '麝香',
  우황: '牛黃',
}

/** 한자 → 한글 (역인덱스, 빌드 시 1회 생성). */
const HANJA_TO_HANGUL: Record<string, string> = Object.fromEntries(
  Object.entries(HANGUL_TO_HANJA).map(([k, v]) => [v, k]),
)

/** 한자 문자가 한 글자라도 포함되어 있으면 true (CJK Unified Ideographs U+4E00–U+9FFF). */
export function containsHanja(s: string): boolean {
  return /[\u4E00-\u9FFF\u3400-\u4DBF]/.test(s)
}

/** 한글 문자가 한 글자라도 포함되어 있으면 true (Hangul Syllables U+AC00–U+D7A3). */
export function containsHangul(s: string): boolean {
  return /[\uAC00-\uD7A3]/.test(s)
}

/** 한글 → 한자 (단어 단위 정확 매칭). 매핑 없으면 원문 반환. */
export function hangulToHanja(word: string): string {
  return HANGUL_TO_HANJA[word.trim()] ?? word
}

/** 한자 → 한글 (단어 단위 정확 매칭). 매핑 없으면 원문 반환. */
export function hanjaToHangul(word: string): string {
  return HANJA_TO_HANGUL[word.trim()] ?? word
}

/**
 * 검색어 한 개를 받아 매칭 가능한 모든 표기 변형을 반환한다.
 * - 한자 입력 → [원문, 한글변환]
 * - 한글 입력 → [원문, 한자변환]
 * - 혼합/매핑 없음 → [원문]
 *
 * 부분 문자열도 매칭되도록 사전을 한 번씩 스캔해서 단어가 등장하면 치환한 후보를 추가한다.
 */
export function expandSearchTerm(term: string): string[] {
  const trimmed = term.trim()
  if (!trimmed) return []
  const variants = new Set<string>([trimmed])

  // 정확 매칭
  if (HANGUL_TO_HANJA[trimmed]) variants.add(HANGUL_TO_HANJA[trimmed])
  if (HANJA_TO_HANGUL[trimmed]) variants.add(HANJA_TO_HANGUL[trimmed])

  // 부분 매칭 — 사전 키가 검색어 안에 등장하면 치환한 변형도 추가
  // (예: "이중탕 가미" → "理中湯 가미")
  for (const [han, ja] of Object.entries(HANGUL_TO_HANJA)) {
    if (trimmed.includes(han)) variants.add(trimmed.split(han).join(ja))
  }
  for (const [ja, han] of Object.entries(HANJA_TO_HANGUL)) {
    if (trimmed.includes(ja)) variants.add(trimmed.split(ja).join(han))
  }

  return Array.from(variants)
}

/**
 * 텍스트가 검색어와 매칭되는지 — 한자/한글 양방향 변형까지 모두 시도.
 * 대소문자 무시, 공백 trim.
 */
export function matchesWithHanja(haystack: string, needle: string): boolean {
  const h = haystack.toLowerCase()
  for (const v of expandSearchTerm(needle)) {
    if (h.includes(v.toLowerCase())) return true
  }
  return false
}
