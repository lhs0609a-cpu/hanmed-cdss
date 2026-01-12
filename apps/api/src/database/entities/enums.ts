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
}

// 역할 계층 (높은 역할이 낮은 역할의 권한 포함)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 100,
  [UserRole.ADMIN]: 80,
  [UserRole.CONTENT_MANAGER]: 60,
  [UserRole.SUPPORT]: 40,
  [UserRole.USER]: 0,
};
