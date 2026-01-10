import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface PatientInfo {
  age?: number;
  gender?: string;
  constitution?: string;
}

export interface Symptom {
  name: string;
  severity?: number;
}

export interface CaseSearchRequest {
  patientInfo: PatientInfo;
  chiefComplaint: string;
  symptoms: Symptom[];
  diagnosis?: string;
  formula?: string;
  options?: {
    topK?: number;
    minConfidence?: number;
  };
}

export interface MatchScore {
  total: number;
  grade: string;
  gradeLabel: string;
  keywordMatch: number;
  metadataMatch: number;
}

export interface MatchedCase {
  caseId: string;
  title: string;
  formulaName: string;
  formulaHanja: string;
  chiefComplaint: string;
  symptoms: string[];
  diagnosis: string;
  patientAge?: number;
  patientGender?: string;
  patientConstitution?: string;
  treatmentFormula: string;
  dataSource: string;
  matchScore: MatchScore;
  matchReasons: Array<{ type: string; description: string; contribution: number }>;
}

export interface CaseSearchResponse {
  results: MatchedCase[];
  totalFound: number;
  searchMetadata: {
    processingTimeMs: number;
    queryText: string;
  };
}

// 등급 기준
const GRADE_THRESHOLDS: Record<string, [number, number, string]> = {
  S: [90, 100, '최고 일치'],
  A: [75, 89, '높은 일치'],
  B: [60, 74, '중간 일치'],
  C: [40, 59, '낮은 일치'],
  D: [0, 39, '참고용'],
};

@Injectable()
export class CaseSearchService {
  private cases: any[] = [];
  private dataLoaded = false;

  constructor() {
    this.loadCaseData();
  }

  private loadCaseData() {
    try {
      // AI Engine의 데이터 파일 경로 시도
      const possiblePaths = [
        path.join(process.cwd(), '..', 'ai-engine', 'data', 'all_cases_combined.json'),
        path.join(process.cwd(), '..', 'ai-engine', 'data', 'extracted_cases.json'),
        path.join(process.cwd(), 'data', 'cases.json'),
      ];

      for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
          const data = fs.readFileSync(filePath, 'utf-8');
          this.cases = JSON.parse(data);
          this.dataLoaded = true;
          console.log(`[CaseSearchService] Loaded ${this.cases.length} cases from ${filePath}`);
          return;
        }
      }

      console.log('[CaseSearchService] No case data file found, using empty dataset');
    } catch (error) {
      console.error('[CaseSearchService] Error loading case data:', error);
    }
  }

  async search(request: CaseSearchRequest): Promise<CaseSearchResponse> {
    const startTime = Date.now();
    const topK = request.options?.topK || 10;
    const minConfidence = request.options?.minConfidence || 0;

    // 검색 텍스트 구성
    const queryText = [
      request.chiefComplaint,
      ...request.symptoms.map(s => s.name),
      request.diagnosis,
    ]
      .filter(Boolean)
      .join(' ');

    // 각 케이스에 대해 점수 계산
    const scoredCases = this.cases.map(caseData => {
      const score = this.calculateMatchScore(request, caseData);
      return { caseData, score };
    });

    // 점수순 정렬 및 필터링
    const filteredCases = scoredCases
      .filter(item => item.score.total >= minConfidence)
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, topK);

    const results: MatchedCase[] = filteredCases.map(item => ({
      caseId: item.caseData.id || `case-${Math.random().toString(36).substr(2, 9)}`,
      title: item.caseData.title || item.caseData.chief_complaint,
      formulaName: item.caseData.formula_name || '',
      formulaHanja: item.caseData.formula_hanja || '',
      chiefComplaint: item.caseData.chief_complaint || '',
      symptoms: item.caseData.symptoms || [],
      diagnosis: item.caseData.diagnosis || '',
      patientAge: item.caseData.patient_age,
      patientGender: item.caseData.patient_gender,
      patientConstitution: item.caseData.patient_constitution,
      treatmentFormula: item.caseData.treatment_formula || item.caseData.formula_name || '',
      dataSource: item.caseData.data_source || 'unknown',
      matchScore: item.score,
      matchReasons: this.getMatchReasons(request, item.caseData, item.score),
    }));

    return {
      results,
      totalFound: results.length,
      searchMetadata: {
        processingTimeMs: Date.now() - startTime,
        queryText,
      },
    };
  }

  private calculateMatchScore(request: CaseSearchRequest, caseData: any): MatchScore {
    let keywordScore = 0;
    let metadataScore = 0;

    // 키워드 매칭 (주소증 + 증상)
    const queryTerms = [
      request.chiefComplaint.toLowerCase(),
      ...request.symptoms.map(s => s.name.toLowerCase()),
    ];

    const caseTerms = [
      (caseData.chief_complaint || '').toLowerCase(),
      ...(caseData.symptoms || []).map((s: string) => s.toLowerCase()),
      (caseData.diagnosis || '').toLowerCase(),
    ];

    let matchCount = 0;
    for (const queryTerm of queryTerms) {
      for (const caseTerm of caseTerms) {
        if (caseTerm.includes(queryTerm) || queryTerm.includes(caseTerm)) {
          matchCount++;
          break;
        }
      }
    }

    keywordScore = queryTerms.length > 0 ? (matchCount / queryTerms.length) * 60 : 0;

    // 메타데이터 매칭 (체질, 성별, 나이)
    let metadataMatches = 0;
    let metadataTotal = 0;

    if (request.patientInfo.constitution) {
      metadataTotal++;
      if (caseData.patient_constitution === request.patientInfo.constitution) {
        metadataMatches++;
      }
    }

    if (request.patientInfo.gender) {
      metadataTotal++;
      if (caseData.patient_gender === request.patientInfo.gender) {
        metadataMatches++;
      }
    }

    if (request.patientInfo.age) {
      metadataTotal++;
      const ageDiff = Math.abs((caseData.patient_age || 0) - request.patientInfo.age);
      if (ageDiff <= 10) {
        metadataMatches += ageDiff <= 5 ? 1 : 0.5;
      }
    }

    metadataScore = metadataTotal > 0 ? (metadataMatches / metadataTotal) * 40 : 20;

    const total = Math.min(100, keywordScore + metadataScore);
    const { grade, gradeLabel } = this.getGrade(total);

    return {
      total: Math.round(total * 10) / 10,
      grade,
      gradeLabel,
      keywordMatch: Math.round(keywordScore * 10) / 10,
      metadataMatch: Math.round(metadataScore * 10) / 10,
    };
  }

  private getGrade(score: number): { grade: string; gradeLabel: string } {
    for (const [grade, [min, max, label]] of Object.entries(GRADE_THRESHOLDS)) {
      if (score >= min && score <= max) {
        return { grade, gradeLabel: label };
      }
    }
    return { grade: 'D', gradeLabel: '참고용' };
  }

  private getMatchReasons(
    request: CaseSearchRequest,
    caseData: any,
    score: MatchScore,
  ): Array<{ type: string; description: string; contribution: number }> {
    const reasons: Array<{ type: string; description: string; contribution: number }> = [];

    // 주소증 매칭
    if (
      caseData.chief_complaint &&
      request.chiefComplaint.toLowerCase().includes(caseData.chief_complaint.toLowerCase().substring(0, 5))
    ) {
      reasons.push({
        type: 'chief_complaint',
        description: `주소증 '${caseData.chief_complaint}' 일치`,
        contribution: 30,
      });
    }

    // 증상 매칭
    const matchedSymptoms = request.symptoms.filter(s =>
      (caseData.symptoms || []).some((cs: string) =>
        cs.toLowerCase().includes(s.name.toLowerCase()) ||
        s.name.toLowerCase().includes(cs.toLowerCase())
      ),
    );

    if (matchedSymptoms.length > 0) {
      reasons.push({
        type: 'symptoms',
        description: `${matchedSymptoms.length}개 증상 일치`,
        contribution: matchedSymptoms.length * 10,
      });
    }

    // 체질 매칭
    if (
      request.patientInfo.constitution &&
      caseData.patient_constitution === request.patientInfo.constitution
    ) {
      reasons.push({
        type: 'constitution',
        description: `체질 '${request.patientInfo.constitution}' 일치`,
        contribution: 15,
      });
    }

    return reasons;
  }

  async getStatistics(): Promise<{
    totalCases: number;
    indexed: boolean;
    byConstitution: Record<string, number>;
    topFormulas: Array<{ formula: string; count: number }>;
  }> {
    const byConstitution: Record<string, number> = {};
    const formulaCounts: Record<string, number> = {};

    for (const caseData of this.cases) {
      const constitution = caseData.patient_constitution || 'unknown';
      byConstitution[constitution] = (byConstitution[constitution] || 0) + 1;

      const formula = caseData.formula_name || 'unknown';
      formulaCounts[formula] = (formulaCounts[formula] || 0) + 1;
    }

    const topFormulas = Object.entries(formulaCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([formula, count]) => ({ formula, count }));

    return {
      totalCases: this.cases.length,
      indexed: this.dataLoaded,
      byConstitution,
      topFormulas,
    };
  }

  async listCases(options: {
    page?: number;
    limit?: number;
    search?: string;
    constitution?: string;
  }): Promise<{
    cases: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = options.page || 1;
    const limit = options.limit || 20;

    let filtered = [...this.cases];

    // 검색어 필터
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filtered = filtered.filter(c =>
        (c.chief_complaint || '').toLowerCase().includes(searchLower) ||
        (c.formula_name || '').toLowerCase().includes(searchLower) ||
        (c.diagnosis || '').toLowerCase().includes(searchLower) ||
        (c.symptoms || []).some((s: string) => s.toLowerCase().includes(searchLower)),
      );
    }

    // 체질 필터
    if (options.constitution) {
      filtered = filtered.filter(c => c.patient_constitution === options.constitution);
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const startIdx = (page - 1) * limit;
    const paginated = filtered.slice(startIdx, startIdx + limit);

    return {
      cases: paginated.map(c => ({
        id: c.id,
        title: c.title || c.chief_complaint,
        chiefComplaint: c.chief_complaint,
        symptoms: c.symptoms,
        formulaName: c.formula_name,
        formulaHanja: c.formula_hanja,
        constitution: c.patient_constitution,
        diagnosis: c.diagnosis,
        patientAge: c.patient_age,
        patientGender: c.patient_gender,
        dataSource: c.data_source,
      })),
      total,
      page,
      limit,
      totalPages,
    };
  }
}
