// ===========================
// 커뮤니티 레벨 시스템 타입
// ===========================

/**
 * 커뮤니티 레벨 (6단계)
 * - intern: 수습한의사 (기본)
 * - member: 정회원
 * - good_answerer: 우수답변자
 * - expert: 전문가
 * - master: 명의
 * - grandmaster: 대가
 */
export type CommunityLevel =
  | 'intern'
  | 'member'
  | 'good_answerer'
  | 'expert'
  | 'master'
  | 'grandmaster'

/**
 * 레벨 요구사항 인터페이스
 */
export interface LevelRequirement {
  level: CommunityLevel
  name: string
  requiredPoints: number
  requiredAcceptedAnswers: number
  perks: string[]
}

/**
 * 레벨별 스타일 설정
 */
export interface LevelStyle {
  name: string
  color: string
  bgColor: string
  borderColor: string
  gradientFrom: string
  gradientTo: string
  icon: 'Stethoscope' | 'UserCheck' | 'Award' | 'Star' | 'Crown' | 'Trophy'
}

/**
 * 사용자 레벨 정보 (API 응답용)
 */
export interface UserLevelInfo {
  current: LevelRequirement
  next: LevelRequirement | null
  pointsToNext: number | null
  acceptedToNext: number | null
  progressPercent: number
}

/**
 * 레벨 요구사항 정의
 */
export const LEVEL_REQUIREMENTS: LevelRequirement[] = [
  {
    level: 'intern',
    name: '수습한의사',
    requiredPoints: 0,
    requiredAcceptedAnswers: 0,
    perks: ['기본 기능 사용'],
  },
  {
    level: 'member',
    name: '정회원',
    requiredPoints: 100,
    requiredAcceptedAnswers: 3,
    perks: ['익명 질문 가능', '프로필 커스터마이징'],
  },
  {
    level: 'good_answerer',
    name: '우수답변자',
    requiredPoints: 500,
    requiredAcceptedAnswers: 10,
    perks: ['답변 우선 노출', '우수답변자 배지'],
  },
  {
    level: 'expert',
    name: '전문가',
    requiredPoints: 1500,
    requiredAcceptedAnswers: 30,
    perks: ['전문가 배지', '전문 분야 표시'],
  },
  {
    level: 'master',
    name: '명의',
    requiredPoints: 5000,
    requiredAcceptedAnswers: 100,
    perks: ['명의 배지', '멘토링 권한', 'AI 추천 우선권'],
  },
  {
    level: 'grandmaster',
    name: '대가',
    requiredPoints: 15000,
    requiredAcceptedAnswers: 300,
    perks: ['대가 배지', 'AI 학습 데이터 검증권', '커뮤니티 운영 참여'],
  },
]

/**
 * 레벨별 스타일 설정
 */
export const LEVEL_STYLES: Record<CommunityLevel, LevelStyle> = {
  intern: {
    name: '수습한의사',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    gradientFrom: 'from-gray-400',
    gradientTo: 'to-gray-500',
    icon: 'Stethoscope',
  },
  member: {
    name: '정회원',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    gradientFrom: 'from-blue-400',
    gradientTo: 'to-blue-500',
    icon: 'UserCheck',
  },
  good_answerer: {
    name: '우수답변자',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    gradientFrom: 'from-green-400',
    gradientTo: 'to-emerald-500',
    icon: 'Award',
  },
  expert: {
    name: '전문가',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300',
    gradientFrom: 'from-purple-400',
    gradientTo: 'to-pink-500',
    icon: 'Star',
  },
  master: {
    name: '명의',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    gradientFrom: 'from-amber-400',
    gradientTo: 'to-orange-500',
    icon: 'Crown',
  },
  grandmaster: {
    name: '대가',
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
    borderColor: 'border-rose-300',
    gradientFrom: 'from-rose-400',
    gradientTo: 'to-red-500',
    icon: 'Trophy',
  },
}

/**
 * 포인트 획득 값
 */
export const POINT_VALUES = {
  POST: 5,                    // 일반 게시글 작성
  CLINICAL_CASE: 50,          // 치험례 등록
  COMMENT: 2,                 // 댓글 작성
  ACCEPTED_ANSWER: 30,        // 답변 채택됨
  CLINICAL_CASE_ACCEPTED: 100, // 치험례 답변 채택
  LIKE_RECEIVED: 2,           // 추천 받음
}

// ===========================
// 유틸리티 함수
// ===========================

/**
 * 포인트와 채택 수로 레벨 계산
 */
export function calculateLevel(points: number, acceptedAnswers: number): CommunityLevel {
  for (let i = LEVEL_REQUIREMENTS.length - 1; i >= 0; i--) {
    const req = LEVEL_REQUIREMENTS[i]
    if (points >= req.requiredPoints && acceptedAnswers >= req.requiredAcceptedAnswers) {
      return req.level
    }
  }
  return 'intern'
}

/**
 * 현재 레벨 정보 조회
 */
export function getLevelInfo(level: CommunityLevel): LevelRequirement {
  return LEVEL_REQUIREMENTS.find((req) => req.level === level) || LEVEL_REQUIREMENTS[0]
}

/**
 * 다음 레벨 정보 조회
 */
export function getNextLevelInfo(level: CommunityLevel): LevelRequirement | null {
  const currentIndex = LEVEL_REQUIREMENTS.findIndex((req) => req.level === level)
  if (currentIndex < LEVEL_REQUIREMENTS.length - 1) {
    return LEVEL_REQUIREMENTS[currentIndex + 1]
  }
  return null
}

/**
 * 다음 레벨까지 진행률 계산 (0-100)
 */
export function calculateProgress(
  currentPoints: number,
  currentAccepted: number,
  currentLevel: CommunityLevel
): { pointsProgress: number; acceptedProgress: number; overallProgress: number } {
  const current = getLevelInfo(currentLevel)
  const next = getNextLevelInfo(currentLevel)

  if (!next) {
    return { pointsProgress: 100, acceptedProgress: 100, overallProgress: 100 }
  }

  const pointsRange = next.requiredPoints - current.requiredPoints
  const acceptedRange = next.requiredAcceptedAnswers - current.requiredAcceptedAnswers

  const pointsProgress = Math.min(
    100,
    ((currentPoints - current.requiredPoints) / pointsRange) * 100
  )
  const acceptedProgress = Math.min(
    100,
    ((currentAccepted - current.requiredAcceptedAnswers) / acceptedRange) * 100
  )

  // 전체 진행률은 둘 중 낮은 값 (둘 다 충족해야 레벨업)
  const overallProgress = Math.min(pointsProgress, acceptedProgress)

  return { pointsProgress, acceptedProgress, overallProgress }
}
