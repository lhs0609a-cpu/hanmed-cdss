/**
 * 한자/한글 표시 설정
 * 전역으로 한자 표시 여부를 토글할 수 있는 Context
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Languages } from 'lucide-react'

interface HanjaSettings {
  /** 한자 표시 여부 (false = 한글만 표시) */
  showHanja: boolean
  /** 한자 표시 토글 */
  toggleHanja: () => void
  /** 뜻풀이 표시 여부 */
  showMeaning: boolean
  /** 뜻풀이 표시 토글 */
  toggleMeaning: () => void
}

const HanjaSettingsContext = createContext<HanjaSettings | undefined>(undefined)

const STORAGE_KEY = 'hanmed-hanja-settings'

interface HanjaSettingsProviderProps {
  children: ReactNode
}

export function HanjaSettingsProvider({ children }: HanjaSettingsProviderProps) {
  const [showHanja, setShowHanja] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return parsed.showHanja ?? false
      }
    }
    return false // 기본값: 한글만 표시
  })

  const [showMeaning, setShowMeaning] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return parsed.showMeaning ?? true
      }
    }
    return true // 기본값: 뜻풀이 표시
  })

  // 설정 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ showHanja, showMeaning }))
  }, [showHanja, showMeaning])

  const toggleHanja = () => setShowHanja(prev => !prev)
  const toggleMeaning = () => setShowMeaning(prev => !prev)

  return (
    <HanjaSettingsContext.Provider value={{ showHanja, toggleHanja, showMeaning, toggleMeaning }}>
      {children}
    </HanjaSettingsContext.Provider>
  )
}

export function useHanjaSettings(): HanjaSettings {
  const context = useContext(HanjaSettingsContext)
  if (!context) {
    throw new Error('useHanjaSettings must be used within HanjaSettingsProvider')
  }
  return context
}

/**
 * 한자/한글 표시 토글 버튼
 */
interface HanjaToggleProps {
  /** 간단 모드 (아이콘만) */
  compact?: boolean
  className?: string
}

export function HanjaToggle({ compact = false, className }: HanjaToggleProps) {
  const { showHanja, toggleHanja } = useHanjaSettings()

  if (compact) {
    return (
      <button
        onClick={toggleHanja}
        className={`flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors ${
          showHanja
            ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        } ${className}`}
        title={showHanja ? '한글로 표시' : '한자로 표시'}
      >
        <Languages className="w-4 h-4" />
        <span>{showHanja ? '漢' : '한'}</span>
      </button>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center space-x-2">
        <Switch
          id="hanja-toggle"
          checked={showHanja}
          onCheckedChange={toggleHanja}
        />
        <Label htmlFor="hanja-toggle" className="text-sm cursor-pointer">
          {showHanja ? '한자 표시 중' : '한글로 표시 중'}
        </Label>
      </div>
    </div>
  )
}

/**
 * 설정 패널 (설정 페이지용)
 */
export function HanjaSettingsPanel() {
  const { showHanja, toggleHanja, showMeaning, toggleMeaning } = useHanjaSettings()

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="font-medium flex items-center gap-2">
        <Languages className="w-5 h-5" />
        한자 표시 설정
      </h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="show-hanja" className="font-medium">한자 표시</Label>
            <p className="text-sm text-gray-500">
              {showHanja
                ? '약재명과 의학용어를 한자로 표시합니다'
                : '약재명과 의학용어를 한글로 표시합니다'}
            </p>
          </div>
          <Switch
            id="show-hanja"
            checked={showHanja}
            onCheckedChange={toggleHanja}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="show-meaning" className="font-medium">뜻풀이 표시</Label>
            <p className="text-sm text-gray-500">
              마우스를 올리면 쉬운 뜻풀이가 표시됩니다
            </p>
          </div>
          <Switch
            id="show-meaning"
            checked={showMeaning}
            onCheckedChange={toggleMeaning}
          />
        </div>
      </div>

      <div className="pt-3 border-t">
        <p className="text-sm text-gray-600">
          <strong>미리보기:</strong>
        </p>
        <div className="mt-2 p-3 bg-gray-50 rounded">
          {showHanja ? (
            <span>心膽虛㥘(심담허겁) - 香附子(향부자), 半夏(반하)</span>
          ) : (
            <span>심담허겁 - 향부자, 반하</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default HanjaSettingsProvider
