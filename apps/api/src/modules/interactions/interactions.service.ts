import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, ILike } from 'typeorm';
import { DrugHerbInteraction, Severity, InteractionType, EvidenceLevel } from '../../database/entities/drug-herb-interaction.entity';
import { Herb } from '../../database/entities/herb.entity';
import { CacheService } from '../cache/cache.service';

const CACHE_PREFIX = 'interactions';
const CACHE_TTL = 3600; // 1 hour - interactions data changes rarely

/**
 * 약물-한약 상호작용 데이터베이스 (근거 기반)
 * 참고: Natural Medicines, DrugBank, 대한약사회 상호작용 DB
 */
const KNOWN_INTERACTIONS: Array<{
  drugPattern: RegExp;
  herbPattern: RegExp;
  drugClass: string;
  herbName: string;
  severity: Severity;
  type: InteractionType;
  mechanism: string;
  recommendation: string;
  evidence: EvidenceLevel;
  references?: string[];
}> = [
  // 와파린 상호작용 (혈액응고 관련)
  {
    drugPattern: /와파린|warfarin|쿠마딘|coumadin/i,
    herbPattern: /당귀|인삼|은행|단삼|천궁|홍화|도인|강황|생강/i,
    drugClass: '항응고제',
    herbName: '활혈화어약',
    severity: Severity.CRITICAL,
    type: InteractionType.INCREASE,
    mechanism: '혈소판 응집 억제 및 항응고 효과 증강으로 출혈 위험 증가. 특히 당귀는 coumarin 유도체를 함유하여 와파린 효과를 현저히 증가시킴.',
    recommendation: '병용 금기. 불가피한 경우 INR 모니터링 강화 (2-3일 간격), 출혈 징후 관찰 필수.',
    evidence: EvidenceLevel.A,
    references: ['PMID: 15089812', 'PMID: 18496894'],
  },
  {
    drugPattern: /와파린|warfarin|쿠마딘/i,
    herbPattern: /감초|대조|인삼/i,
    drugClass: '항응고제',
    herbName: '보익약',
    severity: Severity.WARNING,
    type: InteractionType.DECREASE,
    mechanism: '감초의 glycyrrhizin이 와파린 대사를 유도하여 항응고 효과 감소 가능.',
    recommendation: '병용 시 INR 모니터링 필요. 용량 조절 고려.',
    evidence: EvidenceLevel.B,
  },
  // 항혈소판제 상호작용
  {
    drugPattern: /아스피린|aspirin|클로피도그렐|clopidogrel|플라빅스|plavix/i,
    herbPattern: /은행|당귀|단삼|천궁|홍화|도인/i,
    drugClass: '항혈소판제',
    herbName: '활혈화어약',
    severity: Severity.WARNING,
    type: InteractionType.INCREASE,
    mechanism: '출혈 위험 증가. 은행엽 추출물의 ginkgolide B가 PAF 길항 작용.',
    recommendation: '수술 2주 전 중단 권고. 출혈 징후 모니터링.',
    evidence: EvidenceLevel.B,
    references: ['PMID: 16354539'],
  },
  // 당뇨약 상호작용
  {
    drugPattern: /메트포르민|metformin|글리메피리드|glimepiride|인슐린|insulin|당뇨/i,
    herbPattern: /인삼|황기|창출|지황|산약|오미자/i,
    drugClass: '혈당강하제',
    herbName: '보기약/보음약',
    severity: Severity.WARNING,
    type: InteractionType.INCREASE,
    mechanism: '인삼의 ginsenoside가 인슐린 분비 촉진 및 인슐린 감수성 증가. 저혈당 위험.',
    recommendation: '혈당 모니터링 강화. 저혈당 증상 교육.',
    evidence: EvidenceLevel.B,
    references: ['PMID: 12614540'],
  },
  // 고혈압약 상호작용
  {
    drugPattern: /암로디핀|amlodipine|니페디핀|nifedipine|칼슘차단제/i,
    herbPattern: /감초/i,
    drugClass: 'CCB (칼슘채널차단제)',
    herbName: '감초',
    severity: Severity.WARNING,
    type: InteractionType.DECREASE,
    mechanism: '감초의 mineralocorticoid 작용으로 나트륨/수분 저류, 혈압 상승.',
    recommendation: '장기 복용 시 혈압 모니터링. 고용량 감초 주의.',
    evidence: EvidenceLevel.B,
  },
  {
    drugPattern: /리시노프릴|lisinopril|에날라프릴|enalapril|ACE억제제/i,
    herbPattern: /감초|마황/i,
    drugClass: 'ACE 억제제',
    herbName: '감초/마황',
    severity: Severity.WARNING,
    type: InteractionType.DECREASE,
    mechanism: '감초: 가성알도스테론증 유발로 혈압 상승. 마황: 교감신경 자극으로 혈압 상승.',
    recommendation: '혈압 모니터링. 마황 병용 시 특히 주의.',
    evidence: EvidenceLevel.B,
  },
  // 이뇨제 상호작용
  {
    drugPattern: /푸로세미드|furosemide|라식스|lasix|히드로클로로티아지드|HCTZ/i,
    herbPattern: /감초/i,
    drugClass: '이뇨제',
    herbName: '감초',
    severity: Severity.WARNING,
    type: InteractionType.DANGEROUS,
    mechanism: '감초와 이뇨제 모두 칼륨 배설 증가 → 저칼륨혈증 위험.',
    recommendation: '전해질 모니터링 필수. 감초 고용량 사용 자제.',
    evidence: EvidenceLevel.A,
  },
  // 면역억제제 상호작용
  {
    drugPattern: /사이클로스포린|cyclosporine|타크로리무스|tacrolimus|면역억제/i,
    herbPattern: /인삼|황기|영지|동충하초/i,
    drugClass: '면역억제제',
    herbName: '보기/면역조절약',
    severity: Severity.WARNING,
    type: InteractionType.DECREASE,
    mechanism: '면역증강 작용으로 면역억제 효과 감소 가능.',
    recommendation: '이식환자 병용 자제 권고. 불가피시 면역 기능 모니터링.',
    evidence: EvidenceLevel.C,
  },
  // 항우울제/신경계약물 상호작용
  {
    drugPattern: /SSRI|세르트랄린|sertraline|플루옥세틴|fluoxetine|파록세틴|paroxetine|항우울/i,
    herbPattern: /인삼|마황/i,
    drugClass: 'SSRI 항우울제',
    herbName: '인삼/마황',
    severity: Severity.WARNING,
    type: InteractionType.DANGEROUS,
    mechanism: '세로토닌 증후군 위험. 인삼: MAO 억제 활성, 마황: 교감신경 자극.',
    recommendation: '병용 자제. 불가피시 세로토닌 증후군 증상 모니터링.',
    evidence: EvidenceLevel.B,
  },
  {
    drugPattern: /MAO억제제|MAOI|페닐진|phenelzine|tranylcypromine/i,
    herbPattern: /마황|인삼|감초/i,
    drugClass: 'MAO 억제제',
    herbName: '마황/인삼',
    severity: Severity.CRITICAL,
    type: InteractionType.DANGEROUS,
    mechanism: '마황의 에페드린이 MAO 억제 시 교감신경 위기(고혈압 위기) 유발 가능.',
    recommendation: '병용 금기. 마황 함유 처방 절대 회피.',
    evidence: EvidenceLevel.A,
  },
  // 진정제/수면제 상호작용
  {
    drugPattern: /졸피뎀|zolpidem|벤조디아제핀|benzodiazepine|로라제팜|lorazepam|알프라졸람/i,
    herbPattern: /산조인|원지|석창포|용안육|백자인/i,
    drugClass: '진정수면제',
    herbName: '안신약',
    severity: Severity.INFO,
    type: InteractionType.INCREASE,
    mechanism: '중추신경 억제 효과 상승 가능. 과도한 진정, 졸음.',
    recommendation: '운전/기계 조작 주의. 용량 조절 고려.',
    evidence: EvidenceLevel.C,
  },
  // 항암제 상호작용
  {
    drugPattern: /시클로포스파미드|cyclophosphamide|독소루비신|doxorubicin|항암/i,
    herbPattern: /인삼|황기|영지/i,
    drugClass: '항암제',
    herbName: '보기약',
    severity: Severity.INFO,
    type: InteractionType.INCREASE,
    mechanism: '면역 기능 증강 및 항암제 부작용 경감 가능성. 일부 연구에서 긍정적 상호작용.',
    recommendation: '종양전문의와 상담 후 결정. 항암 효과 방해 가능성도 있음.',
    evidence: EvidenceLevel.C,
  },
  // 갑상선약 상호작용
  {
    drugPattern: /레보티록신|levothyroxine|씬지로이드|synthroid|갑상선/i,
    herbPattern: /해조|곤포|다시마/i,
    drugClass: '갑상선호르몬제',
    herbName: '해조류약재',
    severity: Severity.WARNING,
    type: InteractionType.DECREASE,
    mechanism: '요오드 함유 약재가 갑상선 기능에 영향. 갑상선호르몬 대사 변화.',
    recommendation: 'TSH 모니터링. 복용 간격 4시간 이상 유지.',
    evidence: EvidenceLevel.B,
  },
  // 스타틴 상호작용
  {
    drugPattern: /아토르바스타틴|atorvastatin|심바스타틴|simvastatin|로수바스타틴|스타틴/i,
    herbPattern: /홍국|산사/i,
    drugClass: '스타틴 (고지혈증약)',
    herbName: '홍국/산사',
    severity: Severity.WARNING,
    type: InteractionType.INCREASE,
    mechanism: '홍국의 모나콜린K는 로바스타틴과 동일 성분. 근육병증(횡문근융해) 위험 증가.',
    recommendation: '병용 자제. CK 수치 모니터링. 근육통 발생 시 즉시 중단.',
    evidence: EvidenceLevel.A,
    references: ['PMID: 18420753'],
  },
  // 디곡신 상호작용
  {
    drugPattern: /디곡신|digoxin|디기탈리스/i,
    herbPattern: /감초|인삼|마황/i,
    drugClass: '강심배당체',
    herbName: '감초/인삼/마황',
    severity: Severity.CRITICAL,
    type: InteractionType.DANGEROUS,
    mechanism: '감초: 저칼륨혈증 유발로 디곡신 독성 증가. 마황: 부정맥 위험 증가.',
    recommendation: '병용 금기. 불가피시 디곡신 농도 및 전해질 모니터링 필수.',
    evidence: EvidenceLevel.A,
  },
];

/**
 * 약물 성분명 매핑 (제품명 → 성분명)
 */
const DRUG_NAME_MAPPING: Record<string, string[]> = {
  '쿠마딘': ['와파린', 'warfarin'],
  '플라빅스': ['클로피도그렐', 'clopidogrel'],
  '글루코파지': ['메트포르민', 'metformin'],
  '노바스크': ['암로디핀', 'amlodipine'],
  '자누비아': ['시타글립틴', 'sitagliptin'],
  '리피토': ['아토르바스타틴', 'atorvastatin'],
  '크레스토': ['로수바스타틴', 'rosuvastatin'],
  '라식스': ['푸로세미드', 'furosemide'],
  '졸피드': ['졸피뎀', 'zolpidem'],
  '씬지로이드': ['레보티록신', 'levothyroxine'],
};

@Injectable()
export class InteractionsService {
  private readonly logger = new Logger(InteractionsService.name);

  constructor(
    @InjectRepository(DrugHerbInteraction)
    private interactionsRepository: Repository<DrugHerbInteraction>,
    @InjectRepository(Herb)
    private herbsRepository: Repository<Herb>,
    private cacheService: CacheService,
  ) {}

  /**
   * 약물-한약 상호작용 종합 검증
   *
   * 1. 내장 상호작용 DB (KNOWN_INTERACTIONS) 검색
   * 2. 데이터베이스 검색 (사용자 정의 데이터)
   * 3. 결과 통합 및 중복 제거
   */
  async checkInteractions(herbNames: string[], drugNames: string[]) {
    this.logger.log(`상호작용 검사: 약재 ${herbNames.length}개, 양약 ${drugNames.length}개`);

    // 캐시 키 생성 (정렬된 입력 기반)
    const sortedHerbs = [...herbNames].sort().join(',');
    const sortedDrugs = [...drugNames].sort().join(',');
    const cacheKey = `check:${sortedHerbs}:${sortedDrugs}`;

    // 캐시 확인
    const cached = await this.cacheService.get(cacheKey, { prefix: CACHE_PREFIX });
    if (cached) {
      this.logger.log('상호작용 결과 캐시 히트');
      return cached;
    }

    // 1. 약물명 정규화 (제품명 → 성분명 변환)
    const normalizedDrugNames = this.normalizeDrugNames(drugNames);

    // 2. 내장 DB 검색 (근거 기반 상호작용)
    const knownResults = this.checkKnownInteractions(herbNames, normalizedDrugNames);

    // 3. 데이터베이스 검색 (약재명으로 약재 ID 조회)
    const herbs = await this.findHerbsByNames(herbNames);
    const herbIds = herbs.map((h) => h.id);

    const dbInteractions = herbIds.length > 0 ? await this.interactionsRepository.find({
      where: {
        herbId: In(herbIds),
        drugName: In(normalizedDrugNames),
      },
      relations: ['herb'],
    }) : [];

    // 4. 결과 통합
    const allInteractions = this.mergeInteractions(knownResults, dbInteractions, herbs);

    // 5. 심각도별 분류
    const critical = allInteractions.filter((i) => i.severity === Severity.CRITICAL);
    const warning = allInteractions.filter((i) => i.severity === Severity.WARNING);
    const info = allInteractions.filter((i) => i.severity === Severity.INFO);

    // 6. 안전성 평가
    const safetyAssessment = this.assessSafety(critical, warning, info);

    // 7. CRITICAL 항목은 blocked 플래그로 마킹하여 호출 측이 처방 진행을 차단할 수 있게 한다.
    //    한의사 명시적 동의(override) 없이는 처방 저장 금지가 정책.
    const criticalFormatted = critical.map((c) => ({
      ...this.formatInteraction(c),
      blocked: true,
    }));
    const requiresOverride = critical.length > 0;

    const result = {
      hasInteractions: allInteractions.length > 0,
      totalCount: allInteractions.length,
      checkedAt: new Date().toISOString(),
      inputs: {
        herbs: herbNames,
        drugs: drugNames,
        normalizedDrugs: normalizedDrugNames,
      },
      bySeverity: {
        critical: criticalFormatted,
        warning: warning.map(this.formatInteraction),
        info: info.map(this.formatInteraction),
      },
      // 한의사가 명시적으로 동의해야만 처방 진행 가능 — UI 차단/감사로그 필수.
      requiresOverride,
      overrideRequiredReason: requiresOverride
        ? `CRITICAL 상호작용 ${critical.length}건 — 한의사 동의(override) 없이는 처방 저장 금지.`
        : null,
      ...safetyAssessment,
      disclaimer:
        '⚠️ 이 정보는 참고용이며, 최종 판단은 반드시 전문 의료인이 해야 합니다. 모든 상호작용이 포함되어 있지 않을 수 있습니다.',
    };

    // 결과 캐싱 (10분)
    await this.cacheService.set(cacheKey, result, { prefix: CACHE_PREFIX, ttl: 600 });

    return result;
  }

  /**
   * 약물명 정규화 (제품명 → 성분명)
   */
  private normalizeDrugNames(drugNames: string[]): string[] {
    const normalized = new Set<string>();

    for (const name of drugNames) {
      normalized.add(name);

      // 제품명 → 성분명 매핑
      const lowerName = name.toLowerCase();
      for (const [brandName, genericNames] of Object.entries(DRUG_NAME_MAPPING)) {
        if (lowerName.includes(brandName.toLowerCase())) {
          genericNames.forEach(g => normalized.add(g));
        }
      }
    }

    return Array.from(normalized);
  }

  /**
   * 약재명으로 약재 검색 (이명 포함)
   */
  private async findHerbsByNames(herbNames: string[]): Promise<Herb[]> {
    if (herbNames.length === 0) return [];

    // 정확한 이름 매칭
    const exactMatches = await this.herbsRepository.find({
      where: { standardName: In(herbNames) },
    });

    // 이명(aliases) 검색 - 찾지 못한 약재만
    const foundNames = new Set(exactMatches.map(h => h.standardName));
    const notFoundNames = herbNames.filter(n => !foundNames.has(n));

    if (notFoundNames.length > 0) {
      // PostgreSQL array contains 검색
      const aliasMatches = await this.herbsRepository
        .createQueryBuilder('herb')
        .where('herb.aliases && ARRAY[:...names]::text[]', { names: notFoundNames })
        .getMany();

      return [...exactMatches, ...aliasMatches];
    }

    return exactMatches;
  }

  /**
   * 내장 상호작용 DB 검색
   */
  private checkKnownInteractions(herbNames: string[], drugNames: string[]): any[] {
    const results: any[] = [];
    const herbText = herbNames.join(' ');
    const drugText = drugNames.join(' ');

    for (const interaction of KNOWN_INTERACTIONS) {
      const herbMatch = interaction.herbPattern.test(herbText);
      const drugMatch = interaction.drugPattern.test(drugText);

      if (herbMatch && drugMatch) {
        // 실제 매칭된 약재/약물 찾기
        const matchedHerbs = herbNames.filter(h => interaction.herbPattern.test(h));
        const matchedDrugs = drugNames.filter(d => interaction.drugPattern.test(d));

        results.push({
          source: 'known_database',
          severity: interaction.severity,
          interactionType: interaction.type,
          drug: matchedDrugs.join(', ') || interaction.drugClass,
          drugClass: interaction.drugClass,
          herb: matchedHerbs.join(', ') || interaction.herbName,
          herbCategory: interaction.herbName,
          mechanism: interaction.mechanism,
          recommendation: interaction.recommendation,
          evidenceLevel: interaction.evidence,
          references: interaction.references || [],
        });
      }
    }

    return results;
  }

  /**
   * 상호작용 결과 통합 (중복 제거)
   */
  private mergeInteractions(knownResults: any[], dbResults: DrugHerbInteraction[], herbs: Herb[]): any[] {
    const merged: any[] = [...knownResults];
    const existingKeys = new Set(
      knownResults.map(r => `${r.drug}-${r.herb}`.toLowerCase())
    );

    // DB 결과 추가 (중복 아닌 것만)
    for (const dbInt of dbResults) {
      const herb = herbs.find(h => h.id === dbInt.herbId);
      const key = `${dbInt.drugName}-${herb?.standardName || ''}`.toLowerCase();

      if (!existingKeys.has(key)) {
        merged.push({
          source: 'database',
          severity: dbInt.severity,
          interactionType: dbInt.interactionType,
          drug: dbInt.drugName,
          drugClass: dbInt.drugAtcCode || '',
          herb: herb?.standardName || '',
          mechanism: dbInt.mechanism,
          recommendation: dbInt.recommendation,
          evidenceLevel: dbInt.evidenceLevel,
          references: dbInt.referencePmid || [],
        });
        existingKeys.add(key);
      }
    }

    return merged;
  }

  /**
   * 안전성 종합 평가
   */
  private assessSafety(critical: any[], warning: any[], info: any[]) {
    let overallSafety: string;
    let safetyLevel: 'safe' | 'caution' | 'warning' | 'danger';
    let safetyScore: number;
    let actionRequired: string[];

    if (critical.length > 0) {
      overallSafety = '🔴 위험 - 병용 금기 상호작용 발견';
      safetyLevel = 'danger';
      safetyScore = 0;
      actionRequired = [
        '해당 약재와 양약의 병용을 피하십시오.',
        '불가피한 경우 전문의와 상담 후 면밀한 모니터링 하에 사용하십시오.',
        '환자에게 위험성을 충분히 설명하고 동의를 받으십시오.',
      ];
    } else if (warning.length > 0) {
      overallSafety = '🟡 주의 - 모니터링 필요';
      safetyLevel = 'warning';
      safetyScore = 50;
      actionRequired = [
        '병용 시 관련 지표를 주기적으로 모니터링하십시오.',
        '이상 증상 발생 시 즉시 복용을 중단하도록 안내하십시오.',
        '필요시 용량 조절을 고려하십시오.',
      ];
    } else if (info.length > 0) {
      overallSafety = '🟢 참고 - 경미한 상호작용 가능성';
      safetyLevel = 'caution';
      safetyScore = 80;
      actionRequired = [
        '일반적으로 안전하나, 이상 반응에 주의하십시오.',
      ];
    } else {
      overallSafety = '✅ 안전 - 알려진 상호작용 없음';
      safetyLevel = 'safe';
      safetyScore = 100;
      actionRequired = [];
    }

    return {
      overallSafety,
      safetyLevel,
      safetyScore,
      actionRequired,
    };
  }

  /**
   * 상호작용 포맷팅
   *
   * evidenceLevel, clinicalManagement(=recommendation 별칭) 은 베타 출시 정책상 항상 포함되어야 한다.
   * 누락 시 'D'(매우 낮은 근거) / 빈 문자열로 fill — 한의사가 임상 판단을 내릴 수 있는 최소 정보 보장.
   */
  private formatInteraction = (interaction: any) => ({
    drug: interaction.drug,
    drugClass: interaction.drugClass || '',
    herb: interaction.herb,
    herbCategory: interaction.herbCategory || '',
    severity: interaction.severity,
    type: interaction.interactionType,
    mechanism: interaction.mechanism || '',
    recommendation: interaction.recommendation || '',
    clinicalManagement: interaction.recommendation || '',
    evidenceLevel: interaction.evidenceLevel || EvidenceLevel.D,
    references: interaction.references || [],
    source: interaction.source || 'database',
  });

  async findByDrug(drugName: string) {
    const cacheKey = `drug:${drugName.toLowerCase()}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.interactionsRepository.find({
          where: { drugName },
          relations: ['herb'],
        });
      },
      { prefix: CACHE_PREFIX, ttl: CACHE_TTL },
    );
  }

  async findByHerb(herbId: string) {
    const cacheKey = `herb:${herbId}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.interactionsRepository.find({
          where: { herbId },
        });
      },
      { prefix: CACHE_PREFIX, ttl: CACHE_TTL },
    );
  }
}
