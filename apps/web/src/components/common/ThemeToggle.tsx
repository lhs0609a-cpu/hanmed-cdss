import { useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={() => setIsOpen(!isOpen)}
      >
        {resolvedTheme === 'dark' ? (
          <Moon className="h-5 w-5" />
        ) : (
          <Sun className="h-5 w-5" />
        )}
        <span className="sr-only">테마 변경</span>
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            <button
              onClick={() => { setTheme('light'); setIsOpen(false) }}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-md ${
                theme === 'light' ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
            >
              <Sun className="h-4 w-4" />
              라이트
            </button>
            <button
              onClick={() => { setTheme('dark'); setIsOpen(false) }}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                theme === 'dark' ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
            >
              <Moon className="h-4 w-4" />
              다크
            </button>
            <button
              onClick={() => { setTheme('system'); setIsOpen(false) }}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-md ${
                theme === 'system' ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
            >
              <Monitor className="h-4 w-4" />
              시스템
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * 간단한 토글 버튼 (라이트/다크만)
 */
export function ThemeToggleSimple() {
  const { resolvedTheme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9"
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
      <span className="sr-only">테마 변경</span>
    </Button>
  )
}
