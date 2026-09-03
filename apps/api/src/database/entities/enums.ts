// Shared enums to avoid circular dependencies

export enum PostType {
  CASE_DISCUSSION = 'case_discussion', // 케이스 토론
  QNA = 'qna', // Q&A
  GENERAL = 'general', // 종합 게시판
  FORUM = 'forum', // 전문 포럼
}

// 사용자 역할 (관리자 시스템)
export enum UserRole {
  SUPER_ADMIN = 'super_admin', // 최고 관리자 - 모든 권한 + 관리자 임명/해제
  ADMIN = 'admin', // 일반 관리자 - 사용자/구독/콘텐츠 관리
  SUPPORT = 'support', // 고객지원 - 조회 권한만
  CONTENT_MANAGER = 'content_manager', // 콘텐츠 관리자 - 치험례/처방 관리
  USER = 'user', // 일반 사용자 (의사)
}

// 사용자 계정 상태
export enum UserStatus {
  ACTIVE = 'active', // 정상
  SUSPENDED = 'suspended', // 일시 정지
  BANNED = 'banned', // 영구 차단
  PENDING_VERIFICATION = 'pending_verification', // 인증 대기
  PENDING_DELETION = 'pending_deletion', // 탈퇴 신청 (30일 grace period 내)
}

// 직역 구분 — 처방·차트 권한 분리에 사용한다.
// PRACTITIONER 만 처방 추천 결과 저장·약재 조제·청구 점검 기능을 사용 가능.
// 나머지는 학습/제한 모드.
//
// 한약사와 한약업자를 넣는다. 약재를 다루는 직역인데 가입 자체가 막혀
// 있었다 — 약재 검색·상호작용·본초 문헌은 이들이 매일 쓰는 것이다.
//
// 다만 진료가 아니다. 한약사는 한약 조제·판매를, 한약업자는 허가받은
// 범위의 혼합 판매를 한다. 둘 다 진단과 처방은 의료행위라 할 수 없으므로
// PRACTITIONER 로 두지 않는다. 이 enum 을 보고 갈리는 기능(처방 저장,
// 진료 차트, 보험청구)이 저절로 닫힌다.
export enum PractitionerType {
  PRACTITIONER = 'practitioner',
  PUBLIC_HEALTH_DOCTOR = 'public_health_doctor',
  STUDENT = 'student',
  /** 한약사 — 한약학과 졸업·국가시험. 한약 조제·판매. */
  HERBAL_PHARMACIST = 'herbal_pharmacist',
  /** 한약업자(한약상) — 시·도지사 허가. 허가 범위의 혼합 판매. */
  HERB_DEALER = 'herb_dealer',
}

// 면허 검증 상태
export enum LicenseVerificationStatus {
  UNSUBMITTED = 'unsubmitted', // 면허번호 미입력
  PENDING = 'pending',         // 검수 대기
  VERIFIED = 'verified',       // 검수 완료
  REJECTED = 'rejected',       // 반려
}

// 역할 계층 (높은 역할이 낮은 역할의 권한 포함)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 100,
  [UserRole.ADMIN]: 80,
  [UserRole.CONTENT_MANAGER]: 60,
  [UserRole.SUPPORT]: 40,
  [UserRole.USER]: 0,
};
