/**
 * i18n 설정
 *
 * 필요한 패키지 설치:
 * pnpm add i18next react-i18next i18next-browser-languagedetector
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// 번역 파일 import
import koCommon from '@/locales/ko/common.json'
import enCommon from '@/locales/en/common.json'

const resources = {
  ko: {
    common: koCommon,
  },
  en: {
    common: enCommon,
  },
}

i18n
  .use(LanguageDetector) // 브라우저 언어 감지
  .use(initReactI18next) // React 바인딩
  .init({
    resources,
    defaultNS: 'common',
    fallbackLng: 'ko', // 기본 언어
    supportedLngs: ['ko', 'en'],

    interpolation: {
      escapeValue: false, // React는 기본적으로 XSS 방지
    },

    detection: {
      // 언어 감지 순서
      order: ['localStorage', 'navigator', 'htmlTag'],
      // localStorage 키 이름
      lookupLocalStorage: 'hanmed-language',
      // 감지된 언어 캐싱
      caches: ['localStorage'],
    },
  })

export default i18n

/**
 * 지원 언어 목록
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code']
