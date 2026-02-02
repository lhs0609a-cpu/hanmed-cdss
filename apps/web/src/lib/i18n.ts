/**
 * i18n 설정 (Stub)
 *
 * i18n 라이브러리가 설치되어 있지 않으므로
 * 기본적인 한국어만 지원하는 스텁 구현입니다.
 *
 * 실제 다국어 지원이 필요한 경우:
 * pnpm add i18next react-i18next i18next-browser-languagedetector
 */

// 한국어 기본 번역
const koTranslations: Record<string, string> = {
  'app.name': '온고지신 AI',
  'nav.dashboard': '대시보드',
  'nav.consultation': '진료',
  'nav.patients': '환자 관리',
  'nav.settings': '설정',
}

/**
 * 번역 함수 (스텁)
 */
export function t(key: string, defaultValue?: string): string {
  return koTranslations[key] || defaultValue || key
}

/**
 * 현재 언어 가져오기
 */
export function getCurrentLanguage(): string {
  return 'ko'
}

/**
 * 언어 변경 (스텁)
 */
export function changeLanguage(_lang: string): void {
  // 현재는 한국어만 지원
  console.log('다국어 지원은 추후 업데이트 예정입니다.')
}

/**
 * 지원 언어 목록
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code']

// 기본 export
export default {
  t,
  getCurrentLanguage,
  changeLanguage,
  SUPPORTED_LANGUAGES,
}
