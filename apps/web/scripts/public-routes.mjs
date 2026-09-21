/**
 * 색인에 넣을 고정 경로. 사이트맵 생성과 프리렌더가 같은 목록을 본다.
 *
 * 예전에는 두 스크립트가 각자 배열을 들고 "같아야 한다" 는 주석으로만
 * 묶여 있었다. 주석은 한쪽만 고치는 것을 막지 못한다.
 *
 * 목록은 손으로 관리한다. 라우터에서 자동으로 뽑으면 로그인·결제·리포트
 * 열람처럼 색인되면 안 되는 경로까지 흘러 들어간다.
 *
 * title/description 은 프리렌더가 쓴다. 이게 없으면 index.html 의 홈
 * 제목과 canonical 이 그대로 나가서, 모든 쪽이 "나는 홈의 사본" 이라고
 * 선언한다 — 사이트맵에 실어 놓고 색인하지 말라고 말하는 셈이다.
 */
export const ORIGIN = 'https://www.ongojisin.co.kr'

/**
 * /health/qna 는 여기 없다. /health/community 와 같은 화면을 그대로 다시
 * 띄우므로 색인 대상은 하나뿐이고, 그쪽을 canonical 로 가리킨다.
 */
export const STATIC_ROUTES = [
  {
    path: '/',
    lastmod: '2026-09-21',
    // 홈은 index.html 이 이미 제 머리말을 들고 있다. 덮어쓰지 않는다.
    skipPrerender: true,
  },
  {
    path: '/register',
    lastmod: '2026-09-21',
    title: '회원가입 | 온고지신 AI',
    description:
      '한의사를 위한 임상 의사결정 지원 시스템. 면허 확인 후 무료로 시작합니다.',
  },
  {
    path: '/cases',
    lastmod: '2026-09-21',
    title: '고전 의안 — 청대 이전 치험례 | 온고지신 AI',
    description:
      '臨證指南醫案·吳鞠通醫案 등 공개 문헌에 실린 청대 이전 의안을 주소증과 출처로 찾아봅니다.',
  },
  {
    path: '/formulas',
    lastmod: '2026-09-21',
    title: '처방 사전 — 주치와 출전 | 온고지신 AI',
    description: '한의학 처방의 주치·출전·이명을 한곳에서 찾아봅니다.',
  },
  {
    path: '/health',
    lastmod: '2026-09-21',
    title: '건강 정보 | 온고지신 AI',
    description:
      '사소한 증상에 숨은 신호를 한의학으로 읽어봅니다. 2분 셀프체크, 체질 TMI, 한의사 답변.',
  },
  {
    path: '/health/community',
    lastmod: '2026-09-21',
    title: '건강 커뮤니티 | 온고지신 AI',
    description: '체질 TMI 결과로 대화하고, 건강 경험을 나누는 곳.',
  },
  {
    path: '/health/tmi',
    lastmod: '2026-09-21',
    title: '체질 TMI — 셀럽 사주로 보는 사상체질 | 온고지신 AI',
    description:
      '셀럽의 생년월일로 사주를 분석하고, 오행 밸런스에서 사상체질을 추론해요. 재미로 보는 체질 이야기.',
  },
  {
    path: '/health/tmi/my-type',
    lastmod: '2026-09-21',
    title: '내 체질 알아보기 | 온고지신 AI',
    description: '생년월일을 입력하면 사주와 오행을 분석해 사상체질을 추론해 드립니다.',
  },
  {
    path: '/health/tmi/compare',
    lastmod: '2026-09-21',
    title: '체질 궁합 비교 | 온고지신 AI',
    description: '두 사람의 생년월일로 오행 궁합과 체질 조합을 비교해 봅니다.',
  },
  {
    path: '/health/saju',
    lastmod: '2026-09-21',
    title: '사주 건강 리포트 | 온고지신 AI',
    description:
      '생년월일시에 담긴 오행의 기운을 한의학으로 풉니다. 체질과 건강을 아우르는 심층 리포트.',
  },
  {
    path: '/terms',
    lastmod: '2026-09-08',
    title: '이용약관 | 온고지신 AI',
    description: '온고지신 AI 서비스 이용약관.',
  },
  {
    path: '/privacy',
    lastmod: '2026-09-08',
    title: '개인정보처리방침 | 온고지신 AI',
    description: '온고지신 AI 가 수집하는 개인정보의 항목과 이용·보관 기준.',
  },
  {
    path: '/refund-policy',
    lastmod: '2026-09-08',
    title: '환불 정책 | 온고지신 AI',
    description: '온고지신 AI 구독과 단건 결제의 환불 기준.',
  },
  {
    path: '/subscription-terms',
    lastmod: '2026-09-08',
    title: '정기결제 이용약관 | 온고지신 AI',
    description: '온고지신 AI 정기결제의 청구 주기와 해지 방법.',
  },
]
