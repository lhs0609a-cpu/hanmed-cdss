// 음성 차트 SOAP 분류기 — 한의학 용어 키워드 기반 규칙 분류기 (LLM 아님).
// VoiceChartPage 에서 분리하여 단위 테스트/퍼즈가 가능하도록 한 순수 함수.

export interface SOAPNote {
  subjective: string
  objective: string
  assessment: string
  plan: string
}

// 한의학 용어 기반 SOAP 분석
export const processTranscriptToSOAP = (transcript: string): SOAPNote => {
  const subjective: string[] = []
  const objective: string[] = []
  const assessment: string[] = []
  const plan: string[] = []

  // 문장 단위로 분리 (마침표, 쉼표, 그리고/하고 등)
  const sentences = transcript.split(/[,\.。\n]|그리고|하고|또한/).map(s => s.trim()).filter(Boolean)

  // Subjective (주관적 호소) 키워드
  const subjectiveKeywords = [
    '아프', '아파', '통증', '쑤시', '저리', '뻐근', '뻣뻣', '결리',
    '호소', '주소증', '주증', '증상', '불편', '힘들', '괴롭', '피곤',
    '어지럽', '두통', '소화불량', '속쓰림', '변비', '설사', '불면',
    '땀이', '식욕', '갈증', '오심', '구토', '기침', '가래', '호흡',
    '언제부터', '며칠', '일주일', '한달', '오래', '악화', '호전',
    '환자가', '환자는', '본인이', '말씀', '얘기', '느끼'
  ]

  // Objective (객관적 소견) 키워드
  const objectiveKeywords = [
    '맥', '맥상', '부맥', '침맥', '현맥', '삭맥', '지맥', '활맥', '삽맥',
    '설', '설태', '설질', '홍설', '담홍설', '백태', '황태', '박태', '후태',
    '복진', '압통', '긴장', '이완', '종괴', '관찰', '소견',
    '혈압', '체온', '맥박', '호흡수', '산소', '체중', '키',
    '안색', '면색', '창백', '홍조', '황달', '부종', '수종',
    '청진', '타진', '촉진', '시진', '확인', '발견', '나타나'
  ]

  // Assessment (평가/변증) 키워드
  const assessmentKeywords = [
    '변증', '진단', '의심', '추정', '소견상', '판단', '사료',
    '기허', '혈허', '음허', '양허', '담음', '어혈', '습열', '풍한',
    '간기울결', '심화', '비기허', '신양허', '폐음허', '위열',
    '태양병', '소양병', '양명병', '태음병', '소음병', '궐음병',
    '표증', '이증', '한증', '열증', '허증', '실증',
    '해당', '일치', '부합', '맞다', '보인다', '생각'
  ]

  // Plan (치료 계획) 키워드
  const planKeywords = [
    '처방', '투약', '탕', '산', '환', '고', '약', '복용',
    '침', '자침', '전침', '유침', '발침', '뜸', '구', '부항',
    '추나', '수기', '도인', '안마', '물리치료',
    '주', '일', '회', '번', '첩', '포', '제',
    '치료', '시술', '적용', '사용', '투여', '권고', '교육',
    '식이', '운동', '생활', '주의', '금기', '예후', '경과'
  ]

  // 각 문장 분류
  sentences.forEach(sentence => {
    const lower = sentence.toLowerCase()
    let classified = false

    // Subjective 체크
    if (subjectiveKeywords.some(kw => lower.includes(kw))) {
      subjective.push(sentence)
      classified = true
    }

    // Objective 체크
    if (objectiveKeywords.some(kw => lower.includes(kw))) {
      objective.push(sentence)
      classified = true
    }

    // Assessment 체크
    if (assessmentKeywords.some(kw => lower.includes(kw))) {
      assessment.push(sentence)
      classified = true
    }

    // Plan 체크
    if (planKeywords.some(kw => lower.includes(kw))) {
      plan.push(sentence)
      classified = true
    }

    // 분류되지 않은 문장은 문맥으로 추정
    if (!classified && sentence.length > 5) {
      // 숫자가 많으면 Objective (수치)
      if (/\d+/.test(sentence) && (lower.includes('cm') || lower.includes('kg') || lower.includes('mmhg'))) {
        objective.push(sentence)
      }
      // "~다고" 로 끝나면 Subjective (환자 진술)
      else if (lower.endsWith('다고') || lower.endsWith('래요') || lower.endsWith('답니다')) {
        subjective.push(sentence)
      }
      // "~하겠습니다" 로 끝나면 Plan
      else if (lower.includes('하겠') || lower.includes('예정') || lower.includes('계획')) {
        plan.push(sentence)
      }
    }
  })

  // 분류 결과가 너무 적으면 fallback
  if (subjective.length === 0 && sentences.length > 0) {
    subjective.push(sentences[0])
  }

  // 중복 제거 및 정리
  const uniqueSubjective = [...new Set(subjective)]
  const uniqueObjective = [...new Set(objective)]
  const uniqueAssessment = [...new Set(assessment)]
  const uniquePlan = [...new Set(plan)]

  return {
    subjective: uniqueSubjective.length > 0
      ? '• ' + uniqueSubjective.join('\n• ')
      : '환자 호소 내용을 정리해주세요.',
    objective: uniqueObjective.length > 0
      ? '• ' + uniqueObjective.join('\n• ')
      : '객관적 소견을 기록해주세요.\n(맥상, 설진, 복진, 활력징후 등)',
    assessment: uniqueAssessment.length > 0
      ? '• ' + uniqueAssessment.join('\n• ')
      : '변증/진단을 입력해주세요.',
    plan: uniquePlan.length > 0
      ? '• ' + uniquePlan.join('\n• ')
      : '치료 계획을 입력해주세요.\n(처방, 침구, 추나, 생활지도 등)',
  }
}
