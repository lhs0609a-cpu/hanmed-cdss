import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search, Activity, Pill, Brain, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SearchCategory {
  id: string
  label: string
  icon: React.ElementType
  placeholder: string
  description?: string
}

export const DEFAULT_SEARCH_CATEGORIES: SearchCategory[] = [
  {
    id: 'all',
    label: '전체',
    icon: Search,
    placeholder: '증상, 처방명, 변증으로 검색...',
    description: '모든 필드에서 검색'
  },
  {
    id: 'symptoms',
    label: '증상',
    icon: Activity,
    placeholder: '두통, 어지러움, 소화불량...',
    description: '주요 증상으로 검색'
  },
  {
    id: 'formula',
    label: '처방명',
    icon: Pill,
    placeholder: '쌍화탕, 보중익기탕, 육미지황탕...',
    description: '처방 이름으로 검색'
  },
  {
    id: 'diagnosis',
    label: '변증',
    icon: Brain,
    placeholder: '간기울결, 담음, 어혈...',
    description: '한의학적 변증으로 검색'
  },
  {
    id: 'constitution',
    label: '체질',
    icon: User,
    placeholder: '소음인, 소양인, 태음인...',
    description: '체질별 검색'
  },
]

interface SearchCategoryFilterProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  categories?: SearchCategory[]
  className?: string
  variant?: 'dropdown' | 'pills' | 'tabs'
}

export function SearchCategoryFilter({
  selectedCategory,
  onCategoryChange,
  categories = DEFAULT_SEARCH_CATEGORIES,
  className,
  variant = 'dropdown',
}: SearchCategoryFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedItem = categories.find((c) => c.id === selectedCategory) || categories[0]
  const Icon = selectedItem.icon

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Dropdown variant
  if (variant === 'dropdown') {
    return (
      <div ref={dropdownRef} className={cn('relative', className)}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl',
            'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500',
            'transition-all min-w-[120px]'
          )}
        >
          <Icon className="h-4 w-4 text-amber-500" />
          <span className="font-medium text-gray-700">{selectedItem.label}</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-gray-400 transition-transform ml-auto',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="py-2">
              {categories.map((category) => {
                const CategoryIcon = category.icon
                const isSelected = category.id === selectedCategory

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      onCategoryChange(category.id)
                      setIsOpen(false)
                    }}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-amber-50 transition-colors',
                      isSelected && 'bg-amber-50'
                    )}
                  >
                    <CategoryIcon
                      className={cn(
                        'h-5 w-5 mt-0.5 flex-shrink-0',
                        isSelected ? 'text-amber-500' : 'text-gray-400'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'font-medium',
                            isSelected ? 'text-amber-700' : 'text-gray-700'
                          )}
                        >
                          {category.label}
                        </span>
                        {isSelected && <Check className="h-4 w-4 text-amber-500" />}
                      </div>
                      {category.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{category.description}</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Pills variant
  if (variant === 'pills') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {categories.map((category) => {
          const CategoryIcon = category.icon
          const isSelected = category.id === selectedCategory

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onCategoryChange(category.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                isSelected
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <CategoryIcon className="h-4 w-4" />
              {category.label}
            </button>
          )
        })}
      </div>
    )
  }

  // Tabs variant
  return (
    <div className={cn('flex border-b border-gray-200', className)}>
      {categories.map((category) => {
        const CategoryIcon = category.icon
        const isSelected = category.id === selectedCategory

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              isSelected
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <CategoryIcon className="h-4 w-4" />
            {category.label}
          </button>
        )
      })}
    </div>
  )
}

// Compact inline filter for search bar
interface InlineSearchFilterProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  categories?: SearchCategory[]
  className?: string
}

export function InlineSearchFilter({
  selectedCategory,
  onCategoryChange,
  categories = DEFAULT_SEARCH_CATEGORIES,
  className,
}: InlineSearchFilterProps) {
  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto scrollbar-hide', className)}>
      {categories.map((category) => {
        const isSelected = category.id === selectedCategory

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all',
              isSelected
                ? 'bg-amber-100 text-amber-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            )}
          >
            {category.label}
          </button>
        )
      })}
    </div>
  )
}

export default SearchCategoryFilter
