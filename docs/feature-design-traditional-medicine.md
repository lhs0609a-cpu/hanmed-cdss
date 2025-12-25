# 온고지신 AI 기능 확장 설계서

> 한의학 강의 내용을 바탕으로 한 기능 추가 설계

---

## 1. 개요

### 1.1 배경
한의학 강의에서 다룬 핵심 개념들을 온고지신 AI에 통합하여 보다 정확하고 체계적인 임상 지원 시스템을 구축합니다.

### 1.2 핵심 강의 내용 요약
- **병양도표(病養圖表)**: 병증과 양상을 체계적으로 분류
- **학파별 처방체계**: 고방, 후세방, 사상방, 형상방
- **팔강변증(八綱辨證)**: 음양, 표리, 한열, 허실
- **대표 처방 사례**: 녹용대부탕, 귀비탕, 보중익기탕, 사이탕
- **통합의학 접근**: 현대의학과의 융합

---

## 2. 새로운 기능 설계

### 2.1 학파별 처방 분류 시스템

#### 데이터 구조
```typescript
// 학파(School) 타입
export type MedicineSchool = 'classical' | 'later' | 'sasang' | 'hyungsang';

export interface SchoolInfo {
  id: MedicineSchool;
  name: string;           // 고방, 후세방, 사상방, 형상방
  hanja: string;          // 古方, 後世方, 四象方, 形象方
  period: string;         // 시대
  source: string;         // 주요 출전
  philosophy: string;     // 치료 철학
  characteristics: string[]; // 특징
  representativeFormulas: string[]; // 대표 처방
}

// 처방에 학파 정보 추가
export interface FormulaWithSchool extends Formula {
  school: MedicineSchool;
  schoolSpecificNotes?: string;
  alternativesBySchool?: {
    school: MedicineSchool;
    formulaId: string;
    formulaName: string;
    comparison: string;
  }[];
}
```

#### 학파 정보
| 학파 | 시대 | 출전 | 특징 |
|------|------|------|------|
| 고방(古方) | 한(漢)대 | 상한론, 금궤요략 | 6경변증, 간결한 처방, 약미 적음 |
| 후세방(後世方) | 금원(金元)대 이후 | 의학입문, 경악전서 | 장부변증, 보법 중심, 약미 다양 |
| 사상방(四象方) | 조선 후기 | 동의수세보원 | 체질 기반, 4유형 분류 |
| 형상방(形象方) | 현대 | 형상의학 | 외형 관찰, 체형 분석 |

#### UI 컴포넌트
```tsx
// 학파별 필터가 있는 처방 목록
<FormulaList
  schoolFilter={selectedSchool}
  onSchoolChange={setSelectedSchool}
/>

// 학파 비교 뷰
<SchoolComparisonView
  symptom="두통"
  patientProfile={patient}
/>
```

### 2.2 병양도표 기반 진단 모듈

#### 데이터 구조
```typescript
// 병양도표 엔트리
export interface ByeongYangEntry {
  id: string;
  disease: string;           // 병명 (예: 두통, 기침)
  hanja: string;
  category: DiseaseCategory;
  patterns: ByeongYangPattern[];
}

export type DiseaseCategory =
  | 'external'      // 외감병
  | 'internal'      // 내상병
  | 'miscellaneous' // 잡병

export interface ByeongYangPattern {
  patternName: string;       // 변증명 (예: 풍한두통, 간양두통)
  symptoms: PatternSymptom[];
  tongue: string;            // 설진
  pulse: string;             // 맥진
  treatment: {
    principle: string;       // 치법
    formulaIds: string[];    // 추천 처방
  };
  differentialPoints: string[]; // 감별 포인트
}

export interface PatternSymptom {
  name: string;
  isKey: boolean;            // 주요 증상 여부
  specifics?: string;        // 세부 특징
}
```

#### 진단 플로우
```
[증상 입력] → [병증 분류] → [세부 변증] → [처방 추천]
     ↓            ↓            ↓            ↓
  두통, 오한    외감병      풍한표증      계지탕
  두통, 현훈    내상병      간양상항      천마구등음
```

### 2.3 팔강변증 강화

#### 데이터 구조
```typescript
export interface PalGangAnalysis {
  // 음양
  yinYang: {
    result: 'yang' | 'yin' | 'yang_deficiency' | 'true_yin';
    confidence: number;
    indicators: string[];
  };

  // 표리
  interiorExterior: {
    result: 'exterior' | 'interior' | 'half_exterior_half_interior';
    confidence: number;
    indicators: string[];
  };

  // 한열
  coldHeat: {
    result: 'heat' | 'cold' | 'deficiency_heat' | 'deficiency_cold';
    confidence: number;
    indicators: string[];
  };

  // 허실
  deficiencyExcess: {
    result: 'excess' | 'deficiency' | 'mixed';
    confidence: number;
    indicators: string[];
  };

  // 종합 분석
  summary: string;
  patternSuggestions: string[];
  formulaSuggestions: {
    formulaId: string;
    formulaName: string;
    matchScore: number;
    reason: string;
  }[];
}
```

#### UI 인터랙티브 분석기
```tsx
<PalGangAnalyzer
  symptoms={symptoms}
  tongueData={tongueData}
  pulseData={pulseData}
  onAnalysisComplete={(result: PalGangAnalysis) => {
    // 분석 결과 처리
  }}
/>
```

### 2.4 대표 처방 사례 데이터베이스

강의에서 언급된 대표 처방들의 상세 정보:

#### 녹용대부탕 (鹿茸大補湯)
```typescript
const nokYongDaeBuTang: FormulaCase = {
  name: '녹용대부탕',
  hanja: '鹿茸大補湯',
  school: 'later',
  category: '보익제',
  indication: '원기 허손, 허로, 기혈양허',
  keySymptoms: ['피로', '기력저하', '식욕부진', '소화불량'],
  contraindications: ['실열증', '외감표증'],
  herbs: [
    { name: '녹용', amount: '8g', role: '군' },
    { name: '인삼', amount: '6g', role: '신' },
    // ...
  ],
  clinicalNotes: '장기간의 허로 환자에게 적합. 녹용의 보양 작용으로 원기 회복.'
};
```

#### 귀비탕 (歸脾湯)
```typescript
const gwiBiTang: FormulaCase = {
  name: '귀비탕',
  hanja: '歸脾湯',
  school: 'later',
  category: '보익제-보혈',
  indication: '심비양허, 기혈양허, 사려과도',
  keySymptoms: ['불면', '건망', '심계', '식욕부진', '권태'],
  targetPatterns: ['심비양허증'],
  modernApplications: ['불안장애', '만성피로', '빈혈'],
  herbs: [
    { name: '백출', amount: '6g', role: '군' },
    { name: '인삼', amount: '6g', role: '신' },
    { name: '당귀', amount: '4g', role: '좌' },
    // ...
  ]
};
```

---

## 3. 기존 기능 개선

### 3.1 ConsultationPage 개선

**현재**: 단순 AI 상담
**개선**: 학파별 분석 옵션 추가

```tsx
<ConsultationPage>
  <SchoolSelector
    value={preferredSchool}
    onChange={setPreferredSchool}
  />
  <AIConsultation
    schoolPreference={preferredSchool}
    includePalGang={true}
    includeByeongYang={true}
  />
</ConsultationPage>
```

### 3.2 PatternDiagnosisPage 개선

**현재**: 기본 변증 분석
**개선**: 팔강변증 통합, 시각적 분석 결과

```tsx
<PatternDiagnosisPage>
  <PalGangDiagram analysis={palGangResult} />
  <PatternTree patterns={matchedPatterns} />
  <FormulaRecommendations
    patterns={matchedPatterns}
    bySchool={true}
  />
</PatternDiagnosisPage>
```

### 3.3 FormulaDetailPage 개선

**현재**: 처방 상세 정보
**개선**: 학파 정보, 유사 처방 비교

```tsx
<FormulaDetailPage>
  <SchoolBadge school={formula.school} />
  <SimilarFormulasBySchool formula={formula} />
  <ClinicalCasesByFormula formulaId={formula.id} />
</FormulaDetailPage>
```

---

## 4. 새 페이지 추가

### 4.1 SchoolComparisonPage (/school-compare)
동일 증상에 대한 학파별 접근법 비교

```tsx
// 예: 두통 치료
<SchoolComparisonPage>
  <SymptomInput value="두통" />

  <ComparisonGrid>
    <SchoolCard school="classical">
      <h3>고방 접근</h3>
      <p>6경 변증으로 분류</p>
      <FormulaList formulas={['계지탕', '갈근탕']} />
    </SchoolCard>

    <SchoolCard school="later">
      <h3>후세방 접근</h3>
      <p>장부 변증으로 분류</p>
      <FormulaList formulas={['천궁다조산', '반하백출천마탕']} />
    </SchoolCard>

    <SchoolCard school="sasang">
      <h3>사상방 접근</h3>
      <p>체질별 분류</p>
      <FormulaList formulas={['태음조위탕 가미', '소음인보중익기탕']} />
    </SchoolCard>
  </ComparisonGrid>
</SchoolComparisonPage>
```

### 4.2 ByeongYangTablePage (/byeongyang)
병양도표 인터랙티브 탐색

```tsx
<ByeongYangTablePage>
  <DiseaseSelector />
  <PatternTable disease={selectedDisease}>
    <PatternRow pattern="풍한두통">
      <SymptomColumn>두통, 오한, 무한</SymptomColumn>
      <TongueColumn>설담 태백</TongueColumn>
      <PulseColumn>부긴맥</PulseColumn>
      <FormulaColumn>천궁다조산</FormulaColumn>
    </PatternRow>
  </PatternTable>
</ByeongYangTablePage>
```

### 4.3 IntegratedDiagnosisPage (/integrated-diagnosis)
통합의학 접근 진단

```tsx
<IntegratedDiagnosisPage>
  <WesternDiagnosisInput />  {/* ICD-10 코드 */}
  <KoreanMedicineAnalysis />
  <IntegrationSuggestions />
  <EvidenceBasedReferences />
</IntegratedDiagnosisPage>
```

---

## 5. 데이터베이스 스키마 변경

### 5.1 새 테이블

```sql
-- 학파 정보
CREATE TABLE medicine_schools (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  hanja VARCHAR(50),
  period VARCHAR(100),
  philosophy TEXT,
  characteristics JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 병양도표
CREATE TABLE byeongyang_table (
  id UUID PRIMARY KEY,
  disease VARCHAR(100) NOT NULL,
  hanja VARCHAR(100),
  category VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 병양도표 패턴
CREATE TABLE byeongyang_patterns (
  id UUID PRIMARY KEY,
  byeongyang_id UUID REFERENCES byeongyang_table(id),
  pattern_name VARCHAR(100) NOT NULL,
  symptoms JSONB,
  tongue VARCHAR(200),
  pulse VARCHAR(200),
  treatment_principle TEXT,
  formula_ids UUID[],
  differential_points TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- 처방 학파 매핑 (기존 formulas 테이블 확장)
ALTER TABLE formulas
  ADD COLUMN school VARCHAR(20) REFERENCES medicine_schools(id),
  ADD COLUMN school_specific_notes TEXT;
```

---

## 6. API 엔드포인트

```typescript
// 학파별 처방 조회
GET /api/v1/formulas/by-school/:school

// 병양도표 조회
GET /api/v1/byeongyang
GET /api/v1/byeongyang/:disease/patterns

// 팔강변증 분석
POST /api/v1/analysis/palgang
Body: { symptoms: string[], tongue?: TongueData, pulse?: PulseData }

// 학파별 비교 분석
POST /api/v1/analysis/school-comparison
Body: { symptom: string, patientProfile?: PatientProfile }

// 통합 진단
POST /api/v1/diagnosis/integrated
Body: { westernDiagnosis?: string, symptoms: string[], constitution?: string }
```

---

## 7. 구현 우선순위

### Phase 1 (핵심)
1. 학파 분류 시스템 - 기존 처방 데이터에 학파 필드 추가
2. 팔강변증 분석기 UI 개선
3. FormulaDetailPage에 학파 정보 표시

### Phase 2 (확장)
4. 병양도표 데이터베이스 구축
5. ByeongYangTablePage 신규 개발
6. SchoolComparisonPage 신규 개발

### Phase 3 (고도화)
7. AI 상담에 학파별 분석 옵션 통합
8. 통합의학 진단 페이지
9. 대표 처방 사례 데이터베이스 확장

---

## 8. 예상 파일 목록

### 백엔드 (apps/api)
| 파일 | 설명 |
|------|------|
| `entities/medicine-school.entity.ts` | 학파 엔티티 |
| `entities/byeongyang.entity.ts` | 병양도표 엔티티 |
| `modules/byeongyang/byeongyang.module.ts` | 병양도표 모듈 |
| `modules/analysis/palgang.service.ts` | 팔강변증 서비스 |
| `modules/analysis/school-comparison.service.ts` | 학파 비교 서비스 |

### 프론트엔드 (apps/web)
| 파일 | 설명 |
|------|------|
| `types/medicine-school.ts` | 학파 관련 타입 |
| `types/byeongyang.ts` | 병양도표 타입 |
| `components/diagnosis/PalGangAnalyzer.tsx` | 팔강변증 분석기 |
| `components/formula/SchoolBadge.tsx` | 학파 배지 |
| `app/byeongyang/ByeongYangTablePage.tsx` | 병양도표 페이지 |
| `app/school-compare/SchoolComparisonPage.tsx` | 학파 비교 페이지 |

---

## 9. 추가 고려사항

### 9.1 데이터 출처 및 검증
- 상한론, 금궤요략: 고방 처방
- 의학입문, 동의보감: 후세방 처방
- 동의수세보원: 사상방
- 전문가 검토: 임상 적용 검증

### 9.2 사용자 경험
- 초보자를 위한 가이드 모드
- 전문가를 위한 상세 분석 모드
- 학파 선호도 저장 기능

### 9.3 AI 모델 개선
- 학파별 처방 추천 로직 분리
- 팔강변증 자동 분석 정확도 향상
- 병양도표 기반 진단 정확도 향상
