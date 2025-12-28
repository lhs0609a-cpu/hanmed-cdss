import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { MatchedCase } from '@/types/case-search'
import { ScoreCircle, GradeBadge } from './ConfidenceBadge'
import { ScoreBreakdown } from './ScoreBreakdown'
import { MatchReasonList, MatchReasonBadges } from './MatchReasonList'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface CaseMatchCardProps {
  matchedCase: MatchedCase
  rank?: number
  expanded?: boolean
  onToggleExpand?: () => void
  className?: string
}

export function CaseMatchCard({
  matchedCase,
  rank,
  expanded = false,
  onToggleExpand,
  className,
}: CaseMatchCardProps) {
  const [isExpanded, setIsExpanded] = useState(expanded)

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
    onToggleExpand?.()
  }

  const {
    title,
    formulaName,
    formulaHanja,
    chiefComplaint,
    symptoms,
    diagnosis,
    patientAge,
    patientGender,
    patientConstitution,
    dataSource,
    matchScore,
    matchReasons,
  } = matchedCase

  // Patient info string
  const patientInfoParts = []
  if (patientAge) patientInfoParts.push(`${patientAge}세`)
  if (patientGender) patientInfoParts.push(patientGender === 'M' ? '남성' : '여성')
  if (patientConstitution) patientInfoParts.push(patientConstitution)
  const patientInfoStr = patientInfoParts.join(' ')

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md cursor-pointer',
        isExpanded && 'ring-2 ring-primary/20',
        className
      )}
      onClick={toggleExpand}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          {/* Left: Rank and Title */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {rank && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">
                {rank}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                <span className="font-medium text-primary">{formulaName}</span>
                {formulaHanja && (
                  <span className="text-gray-400">({formulaHanja})</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Score */}
          <div className="flex-shrink-0">
            <ScoreCircle score={matchScore.total} grade={matchScore.grade} size={56} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Patient and Chief Complaint */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-3">
          {patientInfoStr && (
            <span className="inline-flex items-center gap-1">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {patientInfoStr}
            </span>
          )}
          {chiefComplaint && (
            <span className="inline-flex items-center gap-1">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {chiefComplaint}
            </span>
          )}
        </div>

        {/* Match Reasons Preview */}
        {!isExpanded && (
          <MatchReasonBadges reasons={matchReasons} maxItems={4} />
        )}

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-4" onClick={(e) => e.stopPropagation()}>
            {/* Symptoms */}
            {symptoms.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 mb-2">증상</h4>
                <div className="flex flex-wrap gap-1">
                  {symptoms.map((symptom, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                    >
                      {symptom}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Diagnosis */}
            {diagnosis && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 mb-1">변증/진단</h4>
                <p className="text-sm text-gray-700">{diagnosis}</p>
              </div>
            )}

            {/* Score Breakdown */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-2">점수 분석</h4>
              <ScoreBreakdown score={matchScore} showLabels compact />
            </div>

            {/* Match Reasons */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-2">매칭 근거</h4>
              <MatchReasonList reasons={matchReasons} compact />
            </div>

            {/* Data Source */}
            <div className="text-xs text-gray-400 pt-2 border-t">
              출처: {dataSource}
            </div>
          </div>
        )}

        {/* Expand indicator */}
        <div className="flex justify-center mt-2">
          <svg
            className={cn(
              'w-5 h-5 text-gray-400 transition-transform',
              isExpanded && 'rotate-180'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </CardContent>
    </Card>
  )
}

// Compact list item version
interface CaseMatchListItemProps {
  matchedCase: MatchedCase
  rank?: number
  onClick?: () => void
  className?: string
}

export function CaseMatchListItem({
  matchedCase,
  rank,
  onClick,
  className,
}: CaseMatchListItemProps) {
  const { title, formulaName, patientConstitution, matchScore, matchReasons } = matchedCase

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 cursor-pointer transition-colors',
        className
      )}
      onClick={onClick}
    >
      {rank && (
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
          {rank}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate">{title}</div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
          <span className="text-primary">{formulaName}</span>
          {patientConstitution && (
            <>
              <span>|</span>
              <span>{patientConstitution}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <MatchReasonBadges reasons={matchReasons} maxItems={2} />
        <GradeBadge grade={matchScore.grade} />
        <span className="font-bold text-sm w-10 text-right">
          {Math.round(matchScore.total)}%
        </span>
      </div>
    </div>
  )
}

export default CaseMatchCard
