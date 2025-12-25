import { MedicineSchool, SCHOOL_INFO } from '@/types'
import { cn } from '@/lib/utils'
import { Book, Scroll, Users, Eye } from 'lucide-react'

interface SchoolFilterProps {
  selected: MedicineSchool | 'all'
  onChange: (school: MedicineSchool | 'all') => void
  className?: string
  showCount?: Record<MedicineSchool | 'all', number>
}

const schoolIcons: Record<MedicineSchool, React.ReactNode> = {
  classical: <Scroll className="w-4 h-4" />,
  later: <Book className="w-4 h-4" />,
  sasang: <Users className="w-4 h-4" />,
  hyungsang: <Eye className="w-4 h-4" />,
}

const schoolColors: Record<MedicineSchool | 'all', string> = {
  all: 'data-[selected=true]:bg-gray-900 data-[selected=true]:text-white',
  classical: 'data-[selected=true]:bg-amber-600 data-[selected=true]:text-white',
  later: 'data-[selected=true]:bg-emerald-600 data-[selected=true]:text-white',
  sasang: 'data-[selected=true]:bg-violet-600 data-[selected=true]:text-white',
  hyungsang: 'data-[selected=true]:bg-sky-600 data-[selected=true]:text-white',
}

const schools: (MedicineSchool | 'all')[] = ['all', 'classical', 'later', 'sasang', 'hyungsang']

export function SchoolFilter({
  selected,
  onChange,
  className,
  showCount,
}: SchoolFilterProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {schools.map((school) => (
        <button
          key={school}
          data-selected={selected === school}
          onClick={() => onChange(school)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
            'border border-gray-300 bg-white text-gray-700',
            'hover:bg-gray-50 transition-colors',
            schoolColors[school]
          )}
        >
          {school !== 'all' && schoolIcons[school]}
          <span>
            {school === 'all' ? '전체' : SCHOOL_INFO[school].name}
          </span>
          {showCount && showCount[school] !== undefined && (
            <span className="ml-1 text-xs opacity-70">
              ({showCount[school]})
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// 탭 스타일 필터
interface SchoolTabsProps {
  selected: MedicineSchool | 'all'
  onChange: (school: MedicineSchool | 'all') => void
  className?: string
}

export function SchoolTabs({ selected, onChange, className }: SchoolTabsProps) {
  return (
    <div className={cn('border-b border-gray-200', className)}>
      <nav className="flex -mb-px gap-4">
        {schools.map((school) => (
          <button
            key={school}
            onClick={() => onChange(school)}
            className={cn(
              'py-3 px-1 text-sm font-medium border-b-2 transition-colors',
              selected === school
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <span className="flex items-center gap-1.5">
              {school !== 'all' && schoolIcons[school]}
              {school === 'all' ? '전체' : SCHOOL_INFO[school].name}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}

// 드롭다운 스타일 필터
interface SchoolSelectProps {
  value: MedicineSchool | 'all'
  onChange: (school: MedicineSchool | 'all') => void
  className?: string
}

export function SchoolSelect({ value, onChange, className }: SchoolSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as MedicineSchool | 'all')}
      className={cn(
        'block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
        'focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500',
        className
      )}
    >
      <option value="all">전체 학파</option>
      {Object.entries(SCHOOL_INFO).map(([key, info]) => (
        <option key={key} value={key}>
          {info.name} ({info.hanja})
        </option>
      ))}
    </select>
  )
}

export default SchoolFilter
