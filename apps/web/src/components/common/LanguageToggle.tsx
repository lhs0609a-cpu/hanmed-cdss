import { useState } from 'react'
import { Globe } from 'lucide-react'
import { SUPPORTED_LANGUAGES, SupportedLanguage, changeLanguage, getCurrentLanguage } from '@/lib/i18n'
import { Button } from '@/components/ui/button'

export function LanguageToggle() {
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(getCurrentLanguage() as SupportedLanguage)
  const [isOpen, setIsOpen] = useState(false)

  const handleChangeLanguage = (langCode: SupportedLanguage) => {
    changeLanguage(langCode)
    setCurrentLang(langCode)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Globe className="h-5 w-5" />
        <span className="sr-only">언어 변경</span>
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleChangeLanguage(lang.code)}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-md last:rounded-b-md ${
                  currentLang === lang.code ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
              >
                <span>{lang.flag}</span>
                {lang.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * 간단한 토글 버튼 (한국어/영어만)
 */
export function LanguageToggleSimple() {
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(getCurrentLanguage() as SupportedLanguage)

  const toggleLanguage = () => {
    const newLang = currentLang === 'ko' ? 'en' : 'ko'
    changeLanguage(newLang)
    setCurrentLang(newLang)
  }

  const currentLanguage = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code === currentLang
  )

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="h-9 px-3 gap-1.5"
    >
      <Globe className="h-4 w-4" />
      <span className="text-sm">{currentLanguage?.flag}</span>
    </Button>
  )
}
