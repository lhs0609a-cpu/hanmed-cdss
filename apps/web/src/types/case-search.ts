// ===========================
// 치험례 검색 관련 타입 정의
// ===========================

import type { ConstitutionType } from './index'

/**
 * 매칭 등급
 */
export type MatchGrade = 'S' | 'A' | 'B' | 'C' | 'D'

/**
 * 매칭 등급 정보
 */
export interface MatchGradeInfo {
  grade: MatchGrade
  minScore: number
  maxScore: number
  label: string
  colors: {
    bg: string
    text: string
    border: string
  }
}

/**
 * 등급별 색상 정보
 */
export const MATCH_GRADE_COLORS: Record<MatchGrade, { bg: string; text: string; border: string }> = {
  S: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  A: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  B: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  C: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  D: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
}

/**
 * 등급별 라벨
 */
export const MATCH_GRADE_LABELS: Record<MatchGrade, string> = {
  S: '매우 높은 유사도',
  A: '높은 유사도',
  B: '보통 유사도',
  C: '낮은 유사도',
  D: '약한 연관성',
}

/**
 * 매칭 점수
 */
export interface MatchScore {
  total: number           // 종합 점수 (0-100)
  grade: MatchGrade       // 등급 (S/A/B/C/D)
  gradeLabel: string      // 등급 설명
  vectorSimilarity: number  // 벡터 유사도 점수
  keywordMatch: number    // 키워드 매칭 점수
  metadataMatch: number   // 메타데이터 매칭 점수
}

/**
 * 매칭 근거 유형
 */
export type MatchReasonType =
  | 'chief_complaint'
  | 'symptom'
  | 'constitution'
  | 'age'
  | 'gender'
  | 'diagnosis'
  | 'formula'

/**
 * 매칭 근거
 */
export interface MatchReason {
  type: MatchReasonType   // 근거 유형
  description: string     // 근거 설명
  contribution: number    // 점수 기여도
}

/**
 * 매칭된 치험례
 */
export interface MatchedCase {
  caseId: string
  title: string
  formulaName: string
  formulaHanja: string
  chiefComplaint: string
  symptoms: string[]
  diagnosis: string
  patientAge: number | null
  patientGender: string | null
  patientConstitution: string | null
  treatmentFormula: string
  dataSource: string
  matchScore: MatchScore
  matchReasons: MatchReason[]
}

/**
 * 환자 정보 요청
 */
export interface PatientInfoRequest {
  age?: number
  gender?: 'M' | 'F'
  constitution?: ConstitutionType
}

/**
 * 증상 요청
 */
export interface SymptomRequest {
  name: string
  severity?: number  // 1-10
}

/**
 * 검색 옵션
 */
export interface SearchOptions {
  topK?: number           // 반환할 결과 수 (기본: 10)
  minConfidence?: number  // 최소 신뢰도 점수 (기본: 0)
  dataSourceFilter?: string[]  // 데이터 소스 필터
}

/**
 * 치험례 검색 요청
 */
export interface CaseSearchRequest {
  patientInfo?: PatientInfoRequest
  chiefComplaint: string
  symptoms?: SymptomRequest[]
  diagnosis?: string
  formula?: string        // 특정 처방으로 필터링
  options?: SearchOptions
}

/**
 * 검색 메타데이터
 */
export interface SearchMetadata {
  processingTimeMs: number
  queryText: string
  vectorSearchUsed: boolean
}

/**
 * 치험례 검색 응답
 */
export interface CaseSearchResponse {
  results: MatchedCase[]
  totalFound: number
  searchMetadata: SearchMetadata
}

/**
 * 치험례 통계 응답
 */
export interface CaseStatsResponse {
  totalCases: number
  indexed: boolean
  withConstitution?: number
  withAge?: number
  withGender?: number
  topFormulas?: Array<{
    formula: string
    count: number
  }>
  message?: string
}

// ===========================
// API 응답 변환 유틸리티
// ===========================

/**
 * API 응답을 프론트엔드 타입으로 변환
 */
export function transformCaseSearchResponse(apiResponse: any): CaseSearchResponse {
  return {
    results: apiResponse.results.map((r: any) => ({
      caseId: r.case_id,
      title: r.title,
      formulaName: r.formula_name,
      formulaHanja: r.formula_hanja,
      chiefComplaint: r.chief_complaint,
      symptoms: r.symptoms,
      diagnosis: r.diagnosis,
      patientAge: r.patient_age,
      patientGender: r.patient_gender,
      patientConstitution: r.patient_constitution,
      treatmentFormula: r.treatment_formula,
      dataSource: r.data_source,
      matchScore: {
        total: r.match_score.total,
        grade: r.match_score.grade as MatchGrade,
        gradeLabel: r.match_score.grade_label,
        vectorSimilarity: r.match_score.vector_similarity,
        keywordMatch: r.match_score.keyword_match,
        metadataMatch: r.match_score.metadata_match,
      },
      matchReasons: r.match_reasons.map((mr: any) => ({
        type: mr.type as MatchReasonType,
        description: mr.description,
        contribution: mr.contribution,
      })),
    })),
    totalFound: apiResponse.total_found,
    searchMetadata: {
      processingTimeMs: apiResponse.search_metadata.processing_time_ms,
      queryText: apiResponse.search_metadata.query_text,
      vectorSearchUsed: apiResponse.search_metadata.vector_search_used,
    },
  }
}

/**
 * 검색 요청을 API 형식으로 변환
 */
export function transformCaseSearchRequest(request: CaseSearchRequest): any {
  return {
    patient_info: request.patientInfo ? {
      age: request.patientInfo.age,
      gender: request.patientInfo.gender,
      constitution: request.patientInfo.constitution,
    } : {},
    chief_complaint: request.chiefComplaint,
    symptoms: (request.symptoms || []).map(s => ({
      name: s.name,
      severity: s.severity,
    })),
    diagnosis: request.diagnosis,
    formula: request.formula,
    options: {
      top_k: request.options?.topK || 10,
      min_confidence: request.options?.minConfidence || 0,
      data_source_filter: request.options?.dataSourceFilter,
    },
  }
}
