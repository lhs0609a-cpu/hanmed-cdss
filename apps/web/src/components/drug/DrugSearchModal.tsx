/**
 * 의약품 검색 모달 컴포넌트
 * 공공데이터포털 API를 활용한 의약품 검색 기능
 */

import { useState, useCallback } from 'react'
import {
  Search,
  X,
  Loader2,
  Pill,
  Building2,
  Info,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { searchDrugs } from '@/services/public-data-api'
import type { DrugSearchResult } from '@/types'

interface DrugSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (drug: DrugSearchResult) => void
  selectedDrugs?: string[]
}

export default function DrugSearchModal({
  isOpen,
  onClose,
  onSelect,
  selectedDrugs = [],
}: DrugSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<DrugSearchResult[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    setHasSearched(true)

    try {
      const data = await searchDrugs(searchQuery.trim())
      setResults(data.items)
      setTotalCount(data.totalCount)
    } catch (error) {
      console.error('검색 오류:', error)
      setResults([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleSelect = (drug: DrugSearchResult) => {
    onSelect(drug)
    // 선택 후 검색 결과 유지
  }

  const toggleExpand = (itemSeq: string) => {
    setExpandedItem(expandedItem === itemSeq ? null : itemSeq)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[70vh] bg-white rounded-2xl shadow-2xl overflow-hidden mx-4">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl">
                <Pill className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">의약품 검색</h2>
                <p className="text-xs text-gray-500">
                  식약처 공공데이터 기반 의약품 정보
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="의약품명을 입력하세요 (예: 타이레놀, 아스피린)"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                autoFocus
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading || !searchQuery.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              검색
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-500">의약품 정보를 검색 중입니다...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">
                총 <span className="font-semibold text-gray-900">{totalCount}</span>건의 결과
              </p>

              {results.map((drug) => {
                const isExpanded = expandedItem === drug.itemSeq
                const isSelected = selectedDrugs.includes(drug.itemName)

                return (
                  <div
                    key={drug.itemSeq}
                    className={cn(
                      'bg-white border rounded-xl overflow-hidden transition-all',
                      isSelected
                        ? 'border-blue-300 bg-blue-50/50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    {/* Drug Header */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {drug.itemName}
                            </h3>
                            {isSelected && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                선택됨
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Building2 className="h-3.5 w-3.5" />
                            <span>{drug.entpName}</span>
                            {drug.className && (
                              <>
                                <span className="text-gray-300">|</span>
                                <span className="text-blue-600">{drug.className}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSelect(drug)}
                            disabled={isSelected}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors',
                              isSelected
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            )}
                          >
                            <Plus className="h-4 w-4" />
                            추가
                          </button>
                          <button
                            onClick={() => toggleExpand(drug.itemSeq)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 효능효과 미리보기 */}
                      {drug.efficacy && !isExpanded && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {drug.efficacy}
                        </p>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
                        {drug.efficacy && (
                          <div>
                            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                              <Info className="h-4 w-4 text-blue-500" />
                              효능효과
                            </div>
                            <p className="text-sm text-gray-600 bg-white p-3 rounded-lg">
                              {drug.efficacy}
                            </p>
                          </div>
                        )}

                        {drug.usage && (
                          <div>
                            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                              <Pill className="h-4 w-4 text-green-500" />
                              용법용량
                            </div>
                            <p className="text-sm text-gray-600 bg-white p-3 rounded-lg">
                              {drug.usage}
                            </p>
                          </div>
                        )}

                        {drug.interaction && (
                          <div>
                            <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700 mb-1">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                              상호작용
                            </div>
                            <p className="text-sm text-gray-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                              {drug.interaction}
                            </p>
                          </div>
                        )}

                        {drug.warning && (
                          <div>
                            <div className="flex items-center gap-1.5 text-sm font-medium text-red-700 mb-1">
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                              주의사항
                            </div>
                            <p className="text-sm text-gray-600 bg-red-50 p-3 rounded-lg border border-red-100">
                              {drug.warning}
                            </p>
                          </div>
                        )}

                        {drug.sideEffect && (
                          <div>
                            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                              <AlertTriangle className="h-4 w-4 text-gray-500" />
                              부작용
                            </div>
                            <p className="text-sm text-gray-600 bg-white p-3 rounded-lg">
                              {drug.sideEffect}
                            </p>
                          </div>
                        )}

                        <div className="pt-2 flex justify-end">
                          <a
                            href={`https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=${drug.itemSeq}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            의약품안전나라에서 상세정보 보기
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : hasSearched ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                검색 결과가 없습니다
              </h3>
              <p className="text-gray-500 text-center max-w-sm">
                다른 검색어로 시도해 보세요.<br />
                제품명이나 성분명으로 검색할 수 있습니다.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Pill className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                의약품을 검색해 보세요
              </h3>
              <p className="text-gray-500 text-center max-w-sm">
                환자가 복용 중인 양약을 검색하면<br />
                효능, 주의사항, 상호작용 정보를 확인할 수 있습니다.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {['타이레놀', '아스피린', '와파린', '메트포르민'].map((term) => (
                  <button
                    key={term}
                    onClick={() => {
                      setSearchQuery(term)
                      setTimeout(() => handleSearch(), 100)
                    }}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-gray-200 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-3">
          <p className="text-xs text-gray-500 text-center">
            데이터 출처: 식품의약품안전처 공공데이터포털 (의약품개요정보 API)
          </p>
        </div>
      </div>
    </div>
  )
}
