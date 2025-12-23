import { useState } from 'react'
import {
  Plus,
  X,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Shield,
  Pill,
  Leaf,
  AlertOctagon,
  Info,
  FileText,
} from 'lucide-react'
import api from '@/services/api'
import { logError } from '@/lib/errors'
import type { InteractionResult } from '@/types'

// 포괄적인 양약-한약 상호작용 데이터베이스
interface InteractionData {
  drug: string
  drugAliases: string[]
  herb: string
  herbAliases: string[]
  severity: 'critical' | 'warning' | 'info'
  mechanism: string
  recommendation: string
  evidence: string
  category: string
}

const interactionDatabase: InteractionData[] = [
  // ===== 항응고제/항혈전제 (Anticoagulants/Antiplatelets) =====
  {
    drug: '와파린',
    drugAliases: ['warfarin', '쿠마딘', 'coumadin'],
    herb: '당귀',
    herbAliases: ['angelica', '당귀신', '중국당귀'],
    severity: 'critical',
    mechanism: 'CYP2C9/CYP3A4 억제로 와파린 대사 감소, 쿠마린 유사 성분 함유로 항응고 효과 상승',
    recommendation: '병용 금기. 출혈 위험 현저히 증가. 반드시 다른 약재로 대체하세요.',
    evidence: '임상 사례 보고 및 약동학 연구',
    category: '항응고제',
  },
  {
    drug: '와파린',
    drugAliases: ['warfarin', '쿠마딘', 'coumadin'],
    herb: '단삼',
    herbAliases: ['salvia', '丹參', 'danshen'],
    severity: 'critical',
    mechanism: '단삼은 혈소판 응집 억제 및 섬유소용해 촉진 작용으로 와파린 효과 강화',
    recommendation: '병용 금기. INR 모니터링 필수. 심각한 출혈 위험.',
    evidence: '다수의 임상 사례 보고',
    category: '항응고제',
  },
  {
    drug: '와파린',
    drugAliases: ['warfarin', '쿠마딘', 'coumadin'],
    herb: '천궁',
    herbAliases: ['ligusticum', '川芎', 'chuanxiong'],
    severity: 'critical',
    mechanism: '혈소판 응집 억제 작용으로 출혈 위험 증가',
    recommendation: '병용 금기. 출혈 경향 모니터링 필수.',
    evidence: '약리학적 연구',
    category: '항응고제',
  },
  {
    drug: '와파린',
    drugAliases: ['warfarin', '쿠마딘', 'coumadin'],
    herb: '도인',
    herbAliases: ['복숭아씨', 'peach kernel', '桃仁'],
    severity: 'critical',
    mechanism: '활혈거어 작용으로 항응고 효과 상승, 출혈 위험 증가',
    recommendation: '병용 금기. 대체 약재 고려.',
    evidence: '전통 약리학 및 현대 연구',
    category: '항응고제',
  },
  {
    drug: '와파린',
    drugAliases: ['warfarin', '쿠마딘', 'coumadin'],
    herb: '홍화',
    herbAliases: ['safflower', '紅花', 'carthamus'],
    severity: 'critical',
    mechanism: '활혈거어 작용으로 항응고 효과 상승',
    recommendation: '병용 금기. 출혈 위험 현저히 증가.',
    evidence: '약리학적 연구',
    category: '항응고제',
  },
  {
    drug: '와파린',
    drugAliases: ['warfarin', '쿠마딘', 'coumadin'],
    herb: '인삼',
    herbAliases: ['ginseng', '人參', 'panax'],
    severity: 'warning',
    mechanism: '인삼이 와파린의 항응고 효과를 감소시킬 수 있음 (CYP 유도)',
    recommendation: 'INR 모니터링 필요. 와파린 용량 조절 필요할 수 있음.',
    evidence: '임상 연구',
    category: '항응고제',
  },
  {
    drug: '와파린',
    drugAliases: ['warfarin', '쿠마딘', 'coumadin'],
    herb: '은행잎',
    herbAliases: ['ginkgo', '銀杏葉', 'ginkgo biloba'],
    severity: 'critical',
    mechanism: '혈소판 활성화 인자(PAF) 억제로 출혈 위험 현저히 증가',
    recommendation: '병용 금기. 자발적 출혈 사례 보고됨.',
    evidence: '다수의 임상 사례 보고',
    category: '항응고제',
  },
  {
    drug: '와파린',
    drugAliases: ['warfarin', '쿠마딘', 'coumadin'],
    herb: '생강',
    herbAliases: ['ginger', '生薑', '건강'],
    severity: 'warning',
    mechanism: '항혈소판 작용으로 출혈 위험 증가 가능',
    recommendation: '고용량 사용 시 주의. 출혈 경향 모니터링.',
    evidence: '약리학적 연구',
    category: '항응고제',
  },
  {
    drug: '아스피린',
    drugAliases: ['aspirin', '아세틸살리실산', '바이엘아스피린'],
    herb: '은행잎',
    herbAliases: ['ginkgo', '銀杏葉', 'ginkgo biloba'],
    severity: 'warning',
    mechanism: '혈소판 응집 억제 효과 상승으로 출혈 위험 증가',
    recommendation: '출혈 경향 모니터링 필요. 수술 전 중단 고려.',
    evidence: '임상 연구',
    category: '항혈전제',
  },
  {
    drug: '아스피린',
    drugAliases: ['aspirin', '아세틸살리실산'],
    herb: '당귀',
    herbAliases: ['angelica', '當歸'],
    severity: 'warning',
    mechanism: '항혈소판 작용 상승으로 출혈 위험 증가',
    recommendation: '출혈 경향 모니터링 필요.',
    evidence: '약리학적 연구',
    category: '항혈전제',
  },
  {
    drug: '클로피도그렐',
    drugAliases: ['clopidogrel', '플라빅스', 'plavix'],
    herb: '은행잎',
    herbAliases: ['ginkgo', '銀杏葉'],
    severity: 'warning',
    mechanism: '이중 항혈소판 효과로 출혈 위험 증가',
    recommendation: '출혈 경향 모니터링 필수.',
    evidence: '약리학적 연구',
    category: '항혈전제',
  },
  {
    drug: '클로피도그렐',
    drugAliases: ['clopidogrel', '플라빅스'],
    herb: '단삼',
    herbAliases: ['salvia', '丹參'],
    severity: 'critical',
    mechanism: '항혈소판 효과 상승으로 심각한 출혈 위험',
    recommendation: '병용 금기. 대체 약재 사용 권장.',
    evidence: '약동학 연구',
    category: '항혈전제',
  },
  // ===== 강심제 (Cardiac Glycosides) =====
  {
    drug: '디곡신',
    drugAliases: ['digoxin', '라녹신', 'lanoxin'],
    herb: '감초',
    herbAliases: ['licorice', '甘草', 'glycyrrhiza'],
    severity: 'critical',
    mechanism: '감초의 저칼륨혈증 유발 작용으로 디곡신 독성 위험 현저히 증가',
    recommendation: '병용 금기. 부정맥, 구역질, 시력 장애 등 독성 증상 주의.',
    evidence: '다수의 임상 사례 보고',
    category: '강심제',
  },
  {
    drug: '디곡신',
    drugAliases: ['digoxin', '라녹신'],
    herb: '마황',
    herbAliases: ['ephedra', '麻黃', 'ma huang'],
    severity: 'critical',
    mechanism: '에페드린이 심장 부담 증가, 부정맥 위험 상승',
    recommendation: '병용 금기. 심각한 부정맥 위험.',
    evidence: '약리학적 연구 및 사례 보고',
    category: '강심제',
  },
  {
    drug: '디곡신',
    drugAliases: ['digoxin', '라녹신'],
    herb: '인삼',
    herbAliases: ['ginseng', '人參'],
    severity: 'warning',
    mechanism: '인삼이 디곡신 혈중 농도를 증가시킬 수 있음',
    recommendation: '디곡신 혈중 농도 모니터링 필요.',
    evidence: '임상 연구',
    category: '강심제',
  },
  {
    drug: '디곡신',
    drugAliases: ['digoxin', '라녹신'],
    herb: '산사',
    herbAliases: ['hawthorn', '山楂', 'crataegus'],
    severity: 'warning',
    mechanism: '강심 작용 상승으로 심장 기능에 영향',
    recommendation: '심기능 모니터링 권장.',
    evidence: '약리학적 연구',
    category: '강심제',
  },
  // ===== 항고혈압제 (Antihypertensives) =====
  {
    drug: '암로디핀',
    drugAliases: ['amlodipine', '노바스크', 'norvasc'],
    herb: '감초',
    herbAliases: ['licorice', '甘草'],
    severity: 'warning',
    mechanism: '감초의 알도스테론 유사 작용으로 나트륨/수분 저류, 혈압 상승',
    recommendation: '장기 사용 시 혈압 모니터링 필요. 감초 용량 제한 권장.',
    evidence: '임상 연구',
    category: '항고혈압제',
  },
  {
    drug: '암로디핀',
    drugAliases: ['amlodipine', '노바스크'],
    herb: '마황',
    herbAliases: ['ephedra', '麻黃'],
    severity: 'critical',
    mechanism: '마황의 교감신경 흥분 작용으로 혈압 상승, 항고혈압제 효과 상쇄',
    recommendation: '병용 금기. 혈압 조절 실패 위험.',
    evidence: '약리학적 연구',
    category: '항고혈압제',
  },
  {
    drug: '로사르탄',
    drugAliases: ['losartan', '코자', 'cozaar'],
    herb: '감초',
    herbAliases: ['licorice', '甘草'],
    severity: 'warning',
    mechanism: '저칼륨혈증 및 혈압 상승 가능',
    recommendation: '전해질 및 혈압 모니터링 필요.',
    evidence: '임상 연구',
    category: '항고혈압제',
  },
  {
    drug: '로사르탄',
    drugAliases: ['losartan', '코자'],
    herb: '마황',
    herbAliases: ['ephedra', '麻黃'],
    severity: 'critical',
    mechanism: '혈압 상승 작용으로 항고혈압 효과 상쇄',
    recommendation: '병용 금기.',
    evidence: '약리학적 연구',
    category: '항고혈압제',
  },
  {
    drug: '아테놀롤',
    drugAliases: ['atenolol', '테놀민', 'tenormin'],
    herb: '마황',
    herbAliases: ['ephedra', '麻黃'],
    severity: 'critical',
    mechanism: '마황의 교감신경 작용이 베타차단제 효과 상쇄, 고혈압 위기 가능',
    recommendation: '병용 금기. 급격한 혈압 상승 위험.',
    evidence: '약리학적 연구',
    category: '항고혈압제',
  },
  {
    drug: '프로프라놀롤',
    drugAliases: ['propranolol', '인데랄', 'inderal'],
    herb: '마황',
    herbAliases: ['ephedra', '麻黃'],
    severity: 'critical',
    mechanism: '교감신경 작용 길항, 혈압 상승 위험',
    recommendation: '병용 금기.',
    evidence: '약리학적 연구',
    category: '항고혈압제',
  },
  // ===== 당뇨병 치료제 (Antidiabetics) =====
  {
    drug: '메트포르민',
    drugAliases: ['metformin', '글루코파지', 'glucophage'],
    herb: '인삼',
    herbAliases: ['ginseng', '人參', 'panax'],
    severity: 'warning',
    mechanism: '인삼의 혈당 강하 작용으로 저혈당 위험 증가',
    recommendation: '혈당 모니터링 강화 필요. 용량 조절 고려.',
    evidence: '임상 연구',
    category: '당뇨병 치료제',
  },
  {
    drug: '메트포르민',
    drugAliases: ['metformin', '글루코파지'],
    herb: '황기',
    herbAliases: ['astragalus', '黃芪'],
    severity: 'info',
    mechanism: '혈당 조절에 영향을 줄 수 있음',
    recommendation: '혈당 모니터링 권장.',
    evidence: '약리학적 연구',
    category: '당뇨병 치료제',
  },
  {
    drug: '글리메피리드',
    drugAliases: ['glimepiride', '아마릴', 'amaryl'],
    herb: '인삼',
    herbAliases: ['ginseng', '人參'],
    severity: 'warning',
    mechanism: '저혈당 효과 상승으로 저혈당 위험 증가',
    recommendation: '혈당 모니터링 강화. 저혈당 증상 주의.',
    evidence: '임상 연구',
    category: '당뇨병 치료제',
  },
  {
    drug: '글리메피리드',
    drugAliases: ['glimepiride', '아마릴'],
    herb: '여주',
    herbAliases: ['bitter melon', '苦瓜', 'momordica'],
    severity: 'warning',
    mechanism: '혈당 강하 작용 상승',
    recommendation: '저혈당 모니터링 필요.',
    evidence: '약리학적 연구',
    category: '당뇨병 치료제',
  },
  {
    drug: '인슐린',
    drugAliases: ['insulin', '휴물린', '노보래피드'],
    herb: '인삼',
    herbAliases: ['ginseng', '人參'],
    severity: 'warning',
    mechanism: '저혈당 효과 상승',
    recommendation: '혈당 모니터링 강화 필수.',
    evidence: '임상 연구',
    category: '당뇨병 치료제',
  },
  // ===== 면역억제제 (Immunosuppressants) =====
  {
    drug: '사이클로스포린',
    drugAliases: ['cyclosporine', '산디문', 'sandimmune', 'neoral'],
    herb: '황기',
    herbAliases: ['astragalus', '黃芪'],
    severity: 'warning',
    mechanism: '면역 자극 작용으로 면역억제 효과 감소 가능',
    recommendation: '면역억제제 효과 모니터링 필요. 이식 환자 주의.',
    evidence: '약리학적 연구',
    category: '면역억제제',
  },
  {
    drug: '사이클로스포린',
    drugAliases: ['cyclosporine', '산디문'],
    herb: '영지',
    herbAliases: ['reishi', '靈芝', 'ganoderma'],
    severity: 'warning',
    mechanism: '면역 조절 작용으로 상호작용 가능',
    recommendation: '면역억제제 효과 모니터링.',
    evidence: '약리학적 연구',
    category: '면역억제제',
  },
  {
    drug: '타크로리무스',
    drugAliases: ['tacrolimus', '프로그라프', 'prograf'],
    herb: '황기',
    herbAliases: ['astragalus', '黃芪'],
    severity: 'warning',
    mechanism: '면역 자극 작용으로 면역억제 효과 상쇄 가능',
    recommendation: '이식 환자에서 병용 주의. 거부반응 위험.',
    evidence: '약리학적 연구',
    category: '면역억제제',
  },
  {
    drug: '타크로리무스',
    drugAliases: ['tacrolimus', '프로그라프'],
    herb: '자몽',
    herbAliases: ['grapefruit', '자몽주스'],
    severity: 'critical',
    mechanism: 'CYP3A4 억제로 타크로리무스 혈중 농도 현저히 상승',
    recommendation: '병용 금기. 독성 위험.',
    evidence: '임상 연구',
    category: '면역억제제',
  },
  // ===== 항우울제/정신과 약물 =====
  {
    drug: 'MAOI',
    drugAliases: ['모노아민산화효소억제제', '페넬진', 'phenelzine', 'nardil'],
    herb: '마황',
    herbAliases: ['ephedra', '麻黃'],
    severity: 'critical',
    mechanism: '고혈압 위기 유발 가능. 에페드린이 노르에피네프린 분해 억제와 상호작용',
    recommendation: '절대 병용 금기. 생명 위협적인 고혈압 위기 가능.',
    evidence: '다수의 사례 보고',
    category: '항우울제',
  },
  {
    drug: 'MAOI',
    drugAliases: ['모노아민산화효소억제제', '페넬진'],
    herb: '인삼',
    herbAliases: ['ginseng', '人參'],
    severity: 'warning',
    mechanism: '중추신경계 자극 효과 상승 가능',
    recommendation: '병용 시 주의. 두통, 불면, 조증 증상 모니터링.',
    evidence: '사례 보고',
    category: '항우울제',
  },
  {
    drug: '플루옥세틴',
    drugAliases: ['fluoxetine', '프로작', 'prozac'],
    herb: '관동화',
    herbAliases: ['st. john\'s wort', '세인트존스워트', 'hypericum'],
    severity: 'critical',
    mechanism: '세로토닌 증후군 위험. 세로토닌 재흡수 억제 효과 중복',
    recommendation: '병용 금기. 세로토닌 증후군은 생명을 위협할 수 있음.',
    evidence: '다수의 임상 사례',
    category: '항우울제',
  },
  {
    drug: '서트랄린',
    drugAliases: ['sertraline', '졸로푸트', 'zoloft'],
    herb: '관동화',
    herbAliases: ['st. john\'s wort', '세인트존스워트'],
    severity: 'critical',
    mechanism: '세로토닌 증후군 위험',
    recommendation: '병용 금기.',
    evidence: '임상 연구',
    category: '항우울제',
  },
  {
    drug: '파록세틴',
    drugAliases: ['paroxetine', '팍실', 'paxil'],
    herb: '관동화',
    herbAliases: ['st. john\'s wort', '세인트존스워트'],
    severity: 'critical',
    mechanism: '세로토닌 증후군 위험',
    recommendation: '병용 금기.',
    evidence: '임상 연구',
    category: '항우울제',
  },
  // ===== 진정제/수면제 =====
  {
    drug: '알프라졸람',
    drugAliases: ['alprazolam', '자낙스', 'xanax'],
    herb: '산조인',
    herbAliases: ['sour jujube seed', '酸棗仁', 'ziziphus'],
    severity: 'warning',
    mechanism: '진정 효과 상승으로 과도한 졸음, 호흡 억제 위험',
    recommendation: '용량 조절 필요. 과진정 증상 모니터링.',
    evidence: '약리학적 연구',
    category: '진정제',
  },
  {
    drug: '알프라졸람',
    drugAliases: ['alprazolam', '자낙스'],
    herb: '원지',
    herbAliases: ['polygala', '遠志'],
    severity: 'info',
    mechanism: 'CNS 억제 효과 가능',
    recommendation: '졸음 증상 주의.',
    evidence: '약리학적 연구',
    category: '진정제',
  },
  {
    drug: '디아제팜',
    drugAliases: ['diazepam', '바리움', 'valium'],
    herb: '산조인',
    herbAliases: ['sour jujube seed', '酸棗仁'],
    severity: 'warning',
    mechanism: '진정 효과 상승',
    recommendation: '과진정 주의. 운전 등 위험 활동 자제.',
    evidence: '약리학적 연구',
    category: '진정제',
  },
  {
    drug: '졸피뎀',
    drugAliases: ['zolpidem', '스틸녹스', 'stilnox', 'ambien'],
    herb: '산조인',
    herbAliases: ['sour jujube seed', '酸棗仁'],
    severity: 'warning',
    mechanism: '진정 효과 상승으로 과진정 위험',
    recommendation: '용량 조절 고려. 낙상 위험 주의.',
    evidence: '약리학적 연구',
    category: '수면제',
  },
  // ===== 갑상선 약물 =====
  {
    drug: '레보티록신',
    drugAliases: ['levothyroxine', '씬지로이드', 'synthroid'],
    herb: '해조류',
    herbAliases: ['seaweed', '해조', '다시마', '미역'],
    severity: 'warning',
    mechanism: '요오드 과다 섭취로 갑상선 기능에 영향',
    recommendation: '갑상선 기능 검사 정기적 시행. 요오드 섭취 조절.',
    evidence: '임상 연구',
    category: '갑상선약',
  },
  {
    drug: '레보티록신',
    drugAliases: ['levothyroxine', '씬지로이드'],
    herb: '감초',
    herbAliases: ['licorice', '甘草'],
    severity: 'info',
    mechanism: '갑상선 호르몬 대사에 영향 가능',
    recommendation: '갑상선 기능 모니터링.',
    evidence: '약리학적 연구',
    category: '갑상선약',
  },
  // ===== 이뇨제 =====
  {
    drug: '푸로세미드',
    drugAliases: ['furosemide', '라식스', 'lasix'],
    herb: '감초',
    herbAliases: ['licorice', '甘草'],
    severity: 'warning',
    mechanism: '감초의 저칼륨혈증 유발이 이뇨제 부작용 악화',
    recommendation: '전해질 모니터링 필수. 칼륨 보충 고려.',
    evidence: '임상 연구',
    category: '이뇨제',
  },
  {
    drug: '하이드로클로로티아지드',
    drugAliases: ['hydrochlorothiazide', 'HCTZ', '다이크로짓'],
    herb: '감초',
    herbAliases: ['licorice', '甘草'],
    severity: 'warning',
    mechanism: '저칼륨혈증 위험 상승',
    recommendation: '전해질 모니터링 필요.',
    evidence: '약리학적 연구',
    category: '이뇨제',
  },
  // ===== 경구피임제 =====
  {
    drug: '경구피임제',
    drugAliases: ['oral contraceptives', '피임약', '에티닐에스트라디올'],
    herb: '관동화',
    herbAliases: ['st. john\'s wort', '세인트존스워트'],
    severity: 'critical',
    mechanism: 'CYP3A4 유도로 피임약 대사 증가, 피임 효과 감소',
    recommendation: '병용 금기. 피임 실패 위험. 대체 피임법 사용 필요.',
    evidence: '다수의 임상 연구',
    category: '피임제',
  },
  // ===== 항경련제 =====
  {
    drug: '페니토인',
    drugAliases: ['phenytoin', '딜란틴', 'dilantin'],
    herb: '관동화',
    herbAliases: ['st. john\'s wort', '세인트존스워트'],
    severity: 'critical',
    mechanism: 'CYP 유도로 페니토인 혈중 농도 감소, 발작 조절 실패 위험',
    recommendation: '병용 금기. 발작 위험 증가.',
    evidence: '임상 연구',
    category: '항경련제',
  },
  {
    drug: '카바마제핀',
    drugAliases: ['carbamazepine', '테그레톨', 'tegretol'],
    herb: '관동화',
    herbAliases: ['st. john\'s wort', '세인트존스워트'],
    severity: 'warning',
    mechanism: 'CYP 유도 효과 상승으로 약물 농도에 영향',
    recommendation: '혈중 농도 모니터링 필요.',
    evidence: '약리학적 연구',
    category: '항경련제',
  },
  // ===== 스타틴 (고지혈증 치료제) =====
  {
    drug: '아토르바스타틴',
    drugAliases: ['atorvastatin', '리피토', 'lipitor'],
    herb: '홍국',
    herbAliases: ['red yeast rice', '紅麴', 'monascus'],
    severity: 'warning',
    mechanism: '홍국에 모나콜린K(로바스타틴 유사) 함유, 스타틴 효과 중복으로 횡문근융해증 위험',
    recommendation: '병용 주의. 근육통, CPK 상승 모니터링 필요.',
    evidence: '임상 연구',
    category: '고지혈증 치료제',
  },
  {
    drug: '심바스타틴',
    drugAliases: ['simvastatin', '조코', 'zocor'],
    herb: '홍국',
    herbAliases: ['red yeast rice', '紅麴'],
    severity: 'warning',
    mechanism: '스타틴 효과 중복, 횡문근융해증 위험',
    recommendation: '병용 주의. 근육 부작용 모니터링.',
    evidence: '약리학적 연구',
    category: '고지혈증 치료제',
  },
  // ===== HIV 치료제 =====
  {
    drug: '인디나비르',
    drugAliases: ['indinavir', '크릭시반', 'crixivan'],
    herb: '관동화',
    herbAliases: ['st. john\'s wort', '세인트존스워트'],
    severity: 'critical',
    mechanism: 'CYP3A4/P-gp 유도로 항바이러스제 혈중 농도 현저히 감소',
    recommendation: '절대 병용 금기. 치료 실패 및 내성 발생 위험.',
    evidence: '임상 연구',
    category: 'HIV 치료제',
  },
  // ===== 항암제 =====
  {
    drug: '이마티닙',
    drugAliases: ['imatinib', '글리벡', 'gleevec'],
    herb: '관동화',
    herbAliases: ['st. john\'s wort', '세인트존스워트'],
    severity: 'critical',
    mechanism: 'CYP3A4 유도로 항암제 효과 감소',
    recommendation: '병용 금기. 암 치료 실패 위험.',
    evidence: '약동학 연구',
    category: '항암제',
  },
  {
    drug: '도세탁셀',
    drugAliases: ['docetaxel', '탁소텔', 'taxotere'],
    herb: '관동화',
    herbAliases: ['st. john\'s wort', '세인트존스워트'],
    severity: 'critical',
    mechanism: 'CYP3A4 유도로 항암제 혈중 농도 감소',
    recommendation: '병용 금기.',
    evidence: '약동학 연구',
    category: '항암제',
  },
  // ===== 진통제/소염제 =====
  {
    drug: '이부프로펜',
    drugAliases: ['ibuprofen', '부루펜', '애드빌', 'advil'],
    herb: '은행잎',
    herbAliases: ['ginkgo', '銀杏葉'],
    severity: 'warning',
    mechanism: '위장관 출혈 위험 증가',
    recommendation: '위장 증상 모니터링. 장기 사용 주의.',
    evidence: '약리학적 연구',
    category: '진통제',
  },
  {
    drug: '나프록센',
    drugAliases: ['naproxen', '낙센', 'aleve'],
    herb: '은행잎',
    herbAliases: ['ginkgo', '銀杏葉'],
    severity: 'warning',
    mechanism: '출혈 위험 증가',
    recommendation: '출혈 경향 주의.',
    evidence: '약리학적 연구',
    category: '진통제',
  },
  // ===== 항생제 =====
  {
    drug: '테트라사이클린',
    drugAliases: ['tetracycline', '테라마이신'],
    herb: '철분함유약재',
    herbAliases: ['iron', '철분', '자철석', '대자석'],
    severity: 'warning',
    mechanism: '철분과 킬레이트 형성으로 항생제 흡수 감소',
    recommendation: '2시간 이상 간격 두고 복용.',
    evidence: '약동학 연구',
    category: '항생제',
  },
  {
    drug: '퀴놀론계',
    drugAliases: ['ciprofloxacin', '시프로', '레보플록사신'],
    herb: '철분함유약재',
    herbAliases: ['iron', '철분', '금속 함유 약재'],
    severity: 'warning',
    mechanism: '킬레이트 형성으로 흡수 감소',
    recommendation: '2시간 이상 간격 두고 복용.',
    evidence: '약동학 연구',
    category: '항생제',
  },
  // ===== 제산제/위장약 =====
  {
    drug: '오메프라졸',
    drugAliases: ['omeprazole', '로섹', 'losec', 'prilosec'],
    herb: '관동화',
    herbAliases: ['st. john\'s wort', '세인트존스워트'],
    severity: 'warning',
    mechanism: 'CYP2C19 유도로 오메프라졸 대사 증가, 효과 감소',
    recommendation: '위산 역류 증상 모니터링.',
    evidence: '약동학 연구',
    category: '제산제',
  },
  // ===== 기타 중요 상호작용 =====
  {
    drug: '리튬',
    drugAliases: ['lithium', '리튬카보네이트'],
    herb: '감초',
    herbAliases: ['licorice', '甘草'],
    severity: 'warning',
    mechanism: '나트륨/수분 저류로 리튬 농도 변화 가능',
    recommendation: '리튬 혈중 농도 모니터링 필요.',
    evidence: '약리학적 연구',
    category: '정신과 약물',
  },
  {
    drug: '테오필린',
    drugAliases: ['theophylline', '테오필린', '유니필'],
    herb: '마황',
    herbAliases: ['ephedra', '麻黃'],
    severity: 'warning',
    mechanism: '교감신경 자극 효과 상승, 심계항진, 불면 위험',
    recommendation: '심박수, 혈압 모니터링.',
    evidence: '약리학적 연구',
    category: '기관지확장제',
  },
  {
    drug: '메토트렉세이트',
    drugAliases: ['methotrexate', 'MTX', '류마트렉스'],
    herb: 'NSAID성 약재',
    herbAliases: ['버드나무껍질', '백양피', 'willow bark'],
    severity: 'warning',
    mechanism: '메토트렉세이트 배설 감소로 독성 위험 증가',
    recommendation: '혈액검사 모니터링 강화.',
    evidence: '약동학 연구',
    category: '면역억제제',
  },
]

// 상호작용 검색 함수
function findInteractions(herbs: string[], drugs: string[]) {
  const results: {
    critical: Array<{ drug_name: string; herb_name: string; mechanism: string; recommendation: string }>
    warning: Array<{ drug_name: string; herb_name: string; mechanism: string; recommendation: string }>
    info: Array<{ drug_name: string; herb_name: string; mechanism: string; recommendation: string }>
  } = { critical: [], warning: [], info: [] }

  for (const drug of drugs) {
    const drugLower = drug.toLowerCase()
    for (const herb of herbs) {
      const herbLower = herb.toLowerCase()

      for (const interaction of interactionDatabase) {
        const drugMatch = interaction.drug.toLowerCase() === drugLower ||
          interaction.drugAliases.some(alias => alias.toLowerCase() === drugLower) ||
          interaction.drug.toLowerCase().includes(drugLower) ||
          interaction.drugAliases.some(alias => alias.toLowerCase().includes(drugLower))

        const herbMatch = interaction.herb.toLowerCase() === herbLower ||
          interaction.herbAliases.some(alias => alias.toLowerCase() === herbLower) ||
          interaction.herb.toLowerCase().includes(herbLower) ||
          herbLower.includes(interaction.herb.toLowerCase()) ||
          interaction.herbAliases.some(alias => alias.toLowerCase().includes(herbLower) || herbLower.includes(alias.toLowerCase()))

        if (drugMatch && herbMatch) {
          const item = {
            drug_name: drug,
            herb_name: herb,
            mechanism: interaction.mechanism,
            recommendation: interaction.recommendation,
          }

          if (interaction.severity === 'critical') {
            if (!results.critical.some(r => r.drug_name === drug && r.herb_name === herb)) {
              results.critical.push(item)
            }
          } else if (interaction.severity === 'warning') {
            if (!results.warning.some(r => r.drug_name === drug && r.herb_name === herb)) {
              results.warning.push(item)
            }
          } else {
            if (!results.info.some(r => r.drug_name === drug && r.herb_name === herb)) {
              results.info.push(item)
            }
          }
        }
      }
    }
  }

  return results
}

export default function InteractionsPage() {
  const [herbs, setHerbs] = useState<string[]>([])
  const [medications, setMedications] = useState<string[]>([])
  const [newHerb, setNewHerb] = useState('')
  const [newMedication, setNewMedication] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<InteractionResult | null>(null)
  const [error, setError] = useState('')

  const addHerb = () => {
    if (newHerb.trim() && !herbs.includes(newHerb.trim())) {
      setHerbs([...herbs, newHerb.trim()])
      setNewHerb('')
    }
  }

  const addMedication = () => {
    if (newMedication.trim() && !medications.includes(newMedication.trim())) {
      setMedications([...medications, newMedication.trim()])
      setNewMedication('')
    }
  }

  const handleCheck = async () => {
    if (herbs.length === 0) {
      setError('약재를 최소 1개 이상 입력해주세요.')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const response = await api.post('/interactions/check', {
        herbs,
        drugs: medications,
      })
      setResult(response.data)
    } catch (err: unknown) {
      logError(err, 'InteractionsPage')
      // 포괄적인 상호작용 데이터베이스를 사용한 검색
      const foundInteractions = findInteractions(herbs, medications)
      const totalCount = foundInteractions.critical.length + foundInteractions.warning.length + foundInteractions.info.length

      // 종합 권고사항 생성
      const recommendations: string[] = []
      if (foundInteractions.critical.length > 0) {
        recommendations.push('병용 금기 상호작용이 발견되었습니다. 처방 변경을 강력히 권장합니다.')
        recommendations.push('해당 약재를 다른 약재로 대체하거나 양약 처방 조정을 고려하세요.')
      }
      if (foundInteractions.warning.length > 0) {
        recommendations.push('주의가 필요한 상호작용이 있습니다. 용량 조절 및 모니터링을 권장합니다.')
      }
      if (totalCount > 0) {
        recommendations.push('환자에게 복용 중인 모든 양약 목록을 재확인하세요.')
        recommendations.push('상호작용이 있는 약재는 대체 약재를 고려하세요.')
        recommendations.push('정기적인 모니터링(혈액검사, 증상 관찰)을 권장합니다.')
      } else {
        recommendations.push('현재 입력된 약물 조합에서 알려진 상호작용이 발견되지 않았습니다.')
        recommendations.push('그러나 모든 상호작용이 데이터베이스에 포함되어 있지 않을 수 있으므로 임상적 판단이 필요합니다.')
      }

      // 전반적 안전성 평가
      let overallSafety: string
      if (foundInteractions.critical.length > 0) {
        overallSafety = `위험 - 병용금기 ${foundInteractions.critical.length}건 발견`
      } else if (foundInteractions.warning.length > 0) {
        overallSafety = `주의 필요 - 경고 ${foundInteractions.warning.length}건 발견`
      } else if (medications.length === 0) {
        overallSafety = '안전 - 양약 입력 없음'
      } else {
        overallSafety = '안전 - 알려진 상호작용 없음'
      }

      setResult({
        has_interactions: totalCount > 0,
        total_count: totalCount,
        by_severity: foundInteractions,
        overall_safety: overallSafety,
        recommendations,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getSafetyColor = () => {
    if (!result) return ''
    if (result.by_severity.critical.length > 0) return 'from-red-500 to-rose-500'
    if (result.by_severity.warning.length > 0) return 'from-amber-500 to-orange-500'
    return 'from-emerald-500 to-green-500'
  }

  const getSafetyBg = () => {
    if (!result) return ''
    if (result.by_severity.critical.length > 0) return 'bg-red-50 border-red-200'
    if (result.by_severity.warning.length > 0) return 'bg-amber-50 border-amber-200'
    return 'bg-emerald-50 border-emerald-200'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="h-7 w-7 text-amber-500" />
          양약-한약 상호작용 검사
        </h1>
        <p className="mt-1 text-gray-500">
          처방 약재와 환자의 복용 양약 간 상호작용을 빠르게 확인하세요
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          {/* 한약재 입력 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl shadow-lg shadow-teal-500/20">
                <Leaf className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">처방 약재</h2>
                <p className="text-xs text-gray-500">검사할 한약재를 입력하세요</p>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newHerb}
                onChange={(e) => setNewHerb(e.target.value)}
                placeholder="약재명 입력 (예: 당귀, 인삼)"
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all"
                onKeyDown={(e) => e.key === 'Enter' && addHerb()}
              />
              <button
                onClick={addHerb}
                className="px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[60px] p-3 bg-gray-50 rounded-xl">
              {herbs.map((herb, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-teal-700 border border-teal-200 rounded-full text-sm font-medium shadow-sm"
                >
                  <Leaf className="h-3.5 w-3.5" />
                  {herb}
                  <button
                    onClick={() => setHerbs(herbs.filter((_, i) => i !== index))}
                    className="hover:bg-teal-100 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {herbs.length === 0 && (
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  약재를 추가해주세요
                </p>
              )}
            </div>
          </div>

          {/* 양약 입력 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/20">
                <Pill className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">복용 중인 양약</h2>
                <p className="text-xs text-gray-500">환자가 복용 중인 양약을 입력하세요</p>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newMedication}
                onChange={(e) => setNewMedication(e.target.value)}
                placeholder="양약명 입력 (예: 와파린, 아스피린)"
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
                onKeyDown={(e) => e.key === 'Enter' && addMedication()}
              />
              <button
                onClick={addMedication}
                className="px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[60px] p-3 bg-gray-50 rounded-xl">
              {medications.map((med, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-amber-700 border border-amber-200 rounded-full text-sm font-medium shadow-sm"
                >
                  <Pill className="h-3.5 w-3.5" />
                  {med}
                  <button
                    onClick={() => setMedications(medications.filter((_, i) => i !== index))}
                    className="hover:bg-amber-100 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {medications.length === 0 && (
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  복용 중인 양약이 없으면 비워두세요
                </p>
              )}
            </div>
          </div>

          {/* Check Button */}
          <button
            onClick={handleCheck}
            disabled={isLoading || herbs.length === 0}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                검사 중...
              </>
            ) : (
              <>
                <Shield className="h-5 w-5" />
                상호작용 검사하기
              </>
            )}
          </button>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl border border-red-200">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Overall Safety */}
              <div className={`rounded-2xl border-2 p-6 ${getSafetyBg()}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 bg-gradient-to-br ${getSafetyColor()} rounded-2xl shadow-lg`}>
                    {result.by_severity.critical.length > 0 ? (
                      <AlertOctagon className="h-8 w-8 text-white" />
                    ) : result.by_severity.warning.length > 0 ? (
                      <AlertTriangle className="h-8 w-8 text-white" />
                    ) : (
                      <CheckCircle className="h-8 w-8 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{result.overall_safety}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      총 {result.total_count}건의 상호작용 발견
                    </p>
                  </div>
                </div>
              </div>

              {/* Critical Interactions */}
              {result.by_severity.critical.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-red-500 to-rose-500 text-white px-5 py-3 font-semibold flex items-center gap-2">
                    <AlertOctagon className="h-5 w-5" />
                    병용 금기 ({result.by_severity.critical.length}건)
                  </div>
                  <div className="p-4 space-y-3">
                    {result.by_severity.critical.map((item, i) => (
                      <div key={i} className="p-4 bg-red-50 rounded-xl border border-red-100">
                        <div className="flex items-center gap-2 font-bold text-red-800 mb-2">
                          <span className="px-2 py-0.5 bg-red-200 text-red-800 text-xs rounded-md">
                            {item.drug_name}
                          </span>
                          <span className="text-gray-400">+</span>
                          <span className="px-2 py-0.5 bg-red-200 text-red-800 text-xs rounded-md">
                            {item.herb_name}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{item.mechanism}</p>
                        <p className="text-sm font-semibold text-red-700 flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          {item.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning Interactions */}
              {result.by_severity.warning.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-3 font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    주의 필요 ({result.by_severity.warning.length}건)
                  </div>
                  <div className="p-4 space-y-3">
                    {result.by_severity.warning.map((item, i) => (
                      <div key={i} className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <div className="flex items-center gap-2 font-bold text-amber-800 mb-2">
                          <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs rounded-md">
                            {item.drug_name}
                          </span>
                          <span className="text-gray-400">+</span>
                          <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs rounded-md">
                            {item.herb_name}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{item.mechanism}</p>
                        <p className="text-sm font-semibold text-amber-700 flex items-center gap-1">
                          <Info className="h-4 w-4" />
                          {item.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-400" />
                    종합 권고사항
                  </h3>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* No interactions */}
              {result.total_count === 0 && (
                <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-emerald-900 mb-2">
                    상호작용이 발견되지 않았습니다
                  </h3>
                  <p className="text-sm text-emerald-700">
                    입력하신 약재와 양약 간 알려진 상호작용이 없습니다.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-3xl flex items-center justify-center">
                  <Shield className="h-10 w-10 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  상호작용 검사를 시작하세요
                </h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  처방할 한약재와 환자가 복용 중인 양약을<br />
                  입력하면 상호작용 여부를 확인합니다
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
