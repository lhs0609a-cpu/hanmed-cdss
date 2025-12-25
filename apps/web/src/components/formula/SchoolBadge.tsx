import { MedicineSchool, SCHOOL_INFO } from '@/types'
import { cn } from '@/lib/utils'

interface SchoolBadgeProps {
  school: MedicineSchool
  size?: 'sm' | 'md' | 'lg'
  showHanja?: boolean
  className?: string
}

const schoolColors: Record<MedicineSchool, string> = {
  classical: 'bg-amber-100 text-amber-800 border-amber-300',
  later: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  sasang: 'bg-violet-100 text-violet-800 border-violet-300',
  hyungsang: 'bg-sky-100 text-sky-800 border-sky-300',
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
}

export function SchoolBadge({
  school,
  size = 'md',
  showHanja = false,
  className,
}: SchoolBadgeProps) {
  const info = SCHOOL_INFO[school]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        schoolColors[school],
        sizeClasses[size],
        className
      )}
    >
      {info.name}
      {showHanja && (
        <span className="ml-1 opacity-70">({info.hanja})</span>
      )}
    </span>
  )
}

interface SchoolBadgeGroupProps {
  schools: MedicineSchool[]
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function SchoolBadgeGroup({
  schools,
  size = 'sm',
  className,
}: SchoolBadgeGroupProps) {
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {schools.map((school) => (
        <SchoolBadge key={school} school={school} size={size} />
      ))}
    </div>
  )
}

// 학파 설명 카드
interface SchoolInfoCardProps {
  school: MedicineSchool
  className?: string
}

export function SchoolInfoCard({ school, className }: SchoolInfoCardProps) {
  const info = SCHOOL_INFO[school]

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        schoolColors[school].replace('text-', 'border-').split(' ')[2],
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <SchoolBadge school={school} size="lg" showHanja />
        <span className="text-sm text-gray-500">{info.period}</span>
      </div>

      <p className="text-sm text-gray-700 mb-3">{info.philosophy}</p>

      <div className="mb-3">
        <h4 className="text-xs font-semibold text-gray-500 mb-1">주요 출전</h4>
        <p className="text-sm">{info.source}</p>
      </div>

      <div className="mb-3">
        <h4 className="text-xs font-semibold text-gray-500 mb-1">특징</h4>
        <ul className="text-sm space-y-1">
          {info.characteristics.slice(0, 3).map((char, idx) => (
            <li key={idx} className="flex items-start gap-1">
              <span className="text-gray-400">•</span>
              <span>{char}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-500 mb-1">대표 처방</h4>
        <div className="flex flex-wrap gap-1">
          {info.representativeFormulas.slice(0, 5).map((formula, idx) => (
            <span
              key={idx}
              className="text-xs bg-white/50 px-2 py-0.5 rounded border"
            >
              {formula}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SchoolBadge
