/**
 * DUR 체크 결과 표시 컴포넌트
 */

import {
  AlertOctagon,
  AlertTriangle,
  Baby,
  Users,
  Clock,
  Scale,
  Layers,
  CheckCircle,
  Info,
  Scissors,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DurCheckResult as DurCheckResultType } from '@/types'

interface DurCheckResultProps {
  result: DurCheckResultType
  className?: string
}

export default function DurCheckResult({ result, className }: DurCheckResultProps) {
  if (!result.hasDurInfo && result.totalCount === 0) {
    return (
      <div className={cn('bg-emerald-50 rounded-xl border border-emerald-200 p-6', className)}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-900">DUR 정보 없음</h3>
            <p className="text-sm text-emerald-700">
              입력된 의약품에 대한 DUR 주의 정보가 없습니다.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* 요약 헤더 */}
      <div
        className={cn(
          'rounded-xl border-2 p-4',
          result.contraindications.length > 0
            ? 'bg-red-50 border-red-200'
            : result.pregnancyWarnings.length > 0 || result.elderlyWarnings.length > 0
            ? 'bg-amber-50 border-amber-200'
            : 'bg-blue-50 border-blue-200'
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-2 rounded-lg',
              result.contraindications.length > 0
                ? 'bg-red-100'
                : result.pregnancyWarnings.length > 0 || result.elderlyWarnings.length > 0
                ? 'bg-amber-100'
                : 'bg-blue-100'
            )}
          >
            {result.contraindications.length > 0 ? (
              <AlertOctagon className="h-6 w-6 text-red-600" />
            ) : (
              <Info className="h-6 w-6 text-blue-600" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              DUR 정보 {result.totalCount}건 발견
            </h3>
            <p className="text-sm text-gray-600">
              식품의약품안전처 의약품안전사용서비스(DUR) 기반
            </p>
          </div>
        </div>
      </div>

      {/* 병용금기 */}
      {result.contraindications.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-red-600 text-white px-4 py-3 flex items-center gap-2">
            <AlertOctagon className="h-5 w-5" />
            <span className="font-semibold">
              병용금기 ({result.contraindications.length}건)
            </span>
          </div>
          <div className="p-4 space-y-3">
            {result.contraindications.map((item, idx) => (
              <div
                key={idx}
                className="p-4 bg-red-50 rounded-lg border border-red-100"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-red-200 text-red-800 text-xs font-medium rounded">
                    {item.itemName}
                  </span>
                  <span className="text-gray-400">+</span>
                  <span className="px-2 py-0.5 bg-red-200 text-red-800 text-xs font-medium rounded">
                    {item.mixtureName}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{item.reason}</p>
                <p className="text-xs text-red-600 mt-2 font-medium">
                  {item.typeName}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 임부금기 */}
      {result.pregnancyWarnings.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-pink-600 text-white px-4 py-3 flex items-center gap-2">
            <Baby className="h-5 w-5" />
            <span className="font-semibold">
              임부금기 ({result.pregnancyWarnings.length}건)
            </span>
          </div>
          <div className="p-4 space-y-2">
            {result.pregnancyWarnings.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-pink-50 rounded-lg border border-pink-100"
              >
                <p className="font-medium text-gray-900">{item.ITEM_NAME}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {item.CLASS_NAME} | {item.TYPE_NAME}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 노인주의 */}
      {result.elderlyWarnings.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-amber-600 text-white px-4 py-3 flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span className="font-semibold">
              노인주의 ({result.elderlyWarnings.length}건)
            </span>
          </div>
          <div className="p-4 space-y-2">
            {result.elderlyWarnings.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-amber-50 rounded-lg border border-amber-100"
              >
                <p className="font-medium text-gray-900">{item.ITEM_NAME}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {item.CLASS_NAME} | {item.TYPE_NAME}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 특정연령금기 */}
      {result.ageRestrictions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-orange-600 text-white px-4 py-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">
              특정연령금기 ({result.ageRestrictions.length}건)
            </span>
          </div>
          <div className="p-4 space-y-2">
            {result.ageRestrictions.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-orange-50 rounded-lg border border-orange-100"
              >
                <p className="font-medium text-gray-900">{item.ITEM_NAME}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {item.CLASS_NAME} | {item.TYPE_NAME}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 투여기간주의 */}
      {result.durationWarnings.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <span className="font-semibold">
              투여기간주의 ({result.durationWarnings.length}건)
            </span>
          </div>
          <div className="p-4 space-y-2">
            {result.durationWarnings.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-blue-50 rounded-lg border border-blue-100"
              >
                <p className="font-medium text-gray-900">{item.ITEM_NAME}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {item.CLASS_NAME} | {item.TYPE_NAME}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 용량주의 */}
      {result.dosageWarnings.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-purple-600 text-white px-4 py-3 flex items-center gap-2">
            <Scale className="h-5 w-5" />
            <span className="font-semibold">
              용량주의 ({result.dosageWarnings.length}건)
            </span>
          </div>
          <div className="p-4 space-y-2">
            {result.dosageWarnings.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-purple-50 rounded-lg border border-purple-100"
              >
                <p className="font-medium text-gray-900">{item.ITEM_NAME}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {item.CLASS_NAME} | {item.TYPE_NAME}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 효능군중복 */}
      {result.duplicateEfficacy.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-teal-600 text-white px-4 py-3 flex items-center gap-2">
            <Layers className="h-5 w-5" />
            <span className="font-semibold">
              효능군중복 ({result.duplicateEfficacy.length}건)
            </span>
          </div>
          <div className="p-4 space-y-2">
            {result.duplicateEfficacy.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-teal-50 rounded-lg border border-teal-100"
              >
                <p className="font-medium text-gray-900">{item.ITEM_NAME}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {item.CLASS_NAME} | {item.TYPE_NAME}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 서방정분할주의 */}
      {result.extendedReleaseWarnings.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-rose-600 text-white px-4 py-3 flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            <span className="font-semibold">
              서방정분할주의 ({result.extendedReleaseWarnings.length}건)
            </span>
          </div>
          <div className="p-4 space-y-2">
            {result.extendedReleaseWarnings.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-rose-50 rounded-lg border border-rose-100"
              >
                <p className="font-medium text-gray-900">{item.ITEM_NAME}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {item.CLASS_NAME} | {item.TYPE_NAME}
                </p>
                <p className="text-xs text-rose-600 mt-1">
                  서방정은 분할하면 서방효과가 없어질 수 있습니다.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 데이터 출처 */}
      <div className="text-xs text-gray-500 text-center py-2">
        데이터 출처: 식품의약품안전처 의약품안전사용서비스(DUR)
      </div>
    </div>
  )
}
