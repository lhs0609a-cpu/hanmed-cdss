import { SeedPost } from './types';
import { SERIES_A } from './posts-part1';
import { SERIES_B, SERIES_C } from './posts-part2';
import { SERIES_D } from './posts-part3';

export { SeedPost };

/**
 * 커뮤니티 콜드스타트 시드 콘텐츠.
 *
 * 설계 문서: docs/community-content-program.md
 *
 * 순서가 곧 투입 순서다. 한 번에 다 올리지 않고 --limit 으로 앞에서부터 끊어 올린다.
 * 24편이 한꺼번에 올라오면 "봇이 깔아 놓은 게시판" 으로 읽힌다.
 *
 * 시리즈를 섞어 배치했다 — 삭감사례(A)만 연달아 올라오면 게시판이 한 색으로 보이고,
 * 답글을 부르는 것은 질문(D)이라 앞쪽에 섞여 있어야 한다.
 */
export const SEED_POSTS: SeedPost[] = [
  SERIES_C[0], // 제도 캘린더 (고정)
  SERIES_A[0], // 추나 20회 — 가장 강한 훅
  SERIES_D[0], // 그에 대한 질문
  SERIES_B[0], // 첩약 체크리스트
  SERIES_A[3], // 첩약 7일/10일
  SERIES_D[1], // 동의 형식 질문
  SERIES_C[2], // 5세대 실손
  SERIES_D[5], // 추나 보장 질문
  // ── 여기까지 1차 8편 ──
  SERIES_A[2], // 경상환자 빈도
  SERIES_B[2], // 경상환자 체크리스트
  SERIES_A[1], // 추나+약침
  SERIES_A[8], // 약침 요건
  SERIES_B[1], // 추나 체크리스트
  SERIES_D[2], // 지역 편차 질문
  SERIES_C[1], // 첩약 시범사업 종료
  SERIES_A[4], // 첩약+복합엑스산제
  SERIES_A[5], // 이정변기요법
  SERIES_A[6], // 인과관계
  SERIES_A[7], // 입원
  SERIES_C[3], // 이의제기
  SERIES_A[9], // 총론 — 잘리는 건 기록이다
  SERIES_B[3], // 비급여 설명 체크리스트
  SERIES_D[4], // 처방 공개 질문
  SERIES_D[3], // 비급여 가격 질문
];
