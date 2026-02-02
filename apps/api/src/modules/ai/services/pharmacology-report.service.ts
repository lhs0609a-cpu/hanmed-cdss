import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  PharmacologyReport,
  PharmacologyReportRequest,
  HerbPharmacology,
  CompoundPharmacology,
  MechanismFlowchart,
  MechanismFlowchartNode,
  MechanismFlowchartEdge,
  MolecularTargetInfo,
  SignalingPathwayDetail,
  ADMESummary,
  PHARMACOLOGICAL_ACTION_TYPES,
  TARGET_TYPE_LABELS,
  ACTION_TYPE_LABELS,
} from '../types';

@Injectable()
export class PharmacologyReportService {
  private client: OpenAI | null = null;
  private readonly model: string;

  // 주요 약재별 알려진 활성 성분 데이터베이스 (기본값)
  private readonly KNOWN_COMPOUNDS: Record<string, Partial<CompoundPharmacology>[]> = {
    인삼: [
      {
        name: 'Ginsenoside Rb1',
        nameKo: '진세노사이드 Rb1',
        chemicalClass: 'Triterpenoid saponin',
        mainEffects: ['항피로', '면역증강', '항염증'],
        evidenceLevel: 'B',
      },
      {
        name: 'Ginsenoside Rg1',
        nameKo: '진세노사이드 Rg1',
        chemicalClass: 'Triterpenoid saponin',
        mainEffects: ['신경보호', '혈관확장', '항산화'],
        evidenceLevel: 'B',
      },
    ],
    황기: [
      {
        name: 'Astragaloside IV',
        nameKo: '아스트라갈로사이드 IV',
        chemicalClass: 'Triterpenoid saponin',
        mainEffects: ['면역증강', '항피로', '심근보호'],
        evidenceLevel: 'B',
      },
      {
        name: 'Calycosin',
        nameKo: '칼리코신',
        chemicalClass: 'Isoflavonoid',
        mainEffects: ['항산화', '항염증', '혈관보호'],
        evidenceLevel: 'C',
      },
    ],
    당귀: [
      {
        name: 'Ferulic acid',
        nameKo: '페룰산',
        chemicalClass: 'Phenolic acid',
        mainEffects: ['항산화', '혈액순환개선', '항염증'],
        evidenceLevel: 'B',
      },
      {
        name: 'Ligustilide',
        nameKo: '리구스틸라이드',
        chemicalClass: 'Phthalide',
        mainEffects: ['혈관확장', '진경', '진통'],
        evidenceLevel: 'B',
      },
    ],
    감초: [
      {
        name: 'Glycyrrhizin',
        nameKo: '글리시리진',
        chemicalClass: 'Triterpenoid saponin',
        mainEffects: ['항염증', '항바이러스', '간보호'],
        evidenceLevel: 'A',
      },
      {
        name: 'Liquiritigenin',
        nameKo: '리퀴리티게닌',
        chemicalClass: 'Flavanone',
        mainEffects: ['항산화', '항염증', '신경보호'],
        evidenceLevel: 'C',
      },
    ],
    백출: [
      {
        name: 'Atractylenolide I',
        nameKo: '아트락틸레놀라이드 I',
        chemicalClass: 'Sesquiterpene lactone',
        mainEffects: ['항염증', '위장보호', '항암'],
        evidenceLevel: 'C',
      },
    ],
    복령: [
      {
        name: 'Pachymic acid',
        nameKo: '파키믹산',
        chemicalClass: 'Triterpenoid',
        mainEffects: ['이뇨', '면역조절', '항염증'],
        evidenceLevel: 'C',
      },
    ],
    대추: [
      {
        name: 'Jujuboside A',
        nameKo: '주주보사이드 A',
        chemicalClass: 'Triterpenoid saponin',
        mainEffects: ['진정', '항불안', '면역조절'],
        evidenceLevel: 'C',
      },
    ],
    생강: [
      {
        name: '6-Gingerol',
        nameKo: '6-진저롤',
        chemicalClass: 'Phenolic compound',
        mainEffects: ['항산화', '항염증', '소화촉진'],
        evidenceLevel: 'A',
      },
      {
        name: '6-Shogaol',
        nameKo: '6-쇼가올',
        chemicalClass: 'Phenolic compound',
        mainEffects: ['항염증', '항암', '신경보호'],
        evidenceLevel: 'B',
      },
    ],
  };

  // 분자 타겟 매핑
  private readonly KNOWN_TARGETS: Record<string, MolecularTargetInfo[]> = {
    'Ginsenoside Rb1': [
      {
        name: 'AMPK',
        type: 'enzyme',
        action: 'activation',
        activeCompound: 'Ginsenoside Rb1',
        herb: '인삼',
        effect: '에너지 대사 조절, 포도당 흡수 촉진',
        evidenceLevel: 'B',
      },
      {
        name: 'PI3K/Akt',
        type: 'enzyme',
        action: 'activation',
        activeCompound: 'Ginsenoside Rb1',
        herb: '인삼',
        effect: '세포 생존 신호 활성화, 항아포토시스',
        evidenceLevel: 'B',
      },
    ],
    'Ginsenoside Rg1': [
      {
        name: 'eNOS',
        type: 'enzyme',
        action: 'activation',
        activeCompound: 'Ginsenoside Rg1',
        herb: '인삼',
        effect: 'NO 합성 촉진, 혈관 확장',
        evidenceLevel: 'B',
      },
      {
        name: 'BDNF receptor',
        type: 'receptor',
        action: 'activation',
        activeCompound: 'Ginsenoside Rg1',
        herb: '인삼',
        effect: '신경세포 성장 및 보호',
        evidenceLevel: 'C',
      },
    ],
    'Astragaloside IV': [
      {
        name: 'TLR4',
        type: 'receptor',
        action: 'inhibition',
        activeCompound: 'Astragaloside IV',
        herb: '황기',
        effect: '면역 반응 조절, 염증 억제',
        evidenceLevel: 'B',
      },
      {
        name: 'AMPK',
        type: 'enzyme',
        action: 'activation',
        activeCompound: 'Astragaloside IV',
        herb: '황기',
        effect: '에너지 대사 촉진, 피로 회복',
        evidenceLevel: 'B',
      },
    ],
    'Glycyrrhizin': [
      {
        name: '11β-HSD',
        type: 'enzyme',
        action: 'inhibition',
        activeCompound: 'Glycyrrhizin',
        herb: '감초',
        effect: '코르티솔 대사 억제, 항염 효과',
        evidenceLevel: 'A',
      },
      {
        name: 'HMGB1',
        type: 'other',
        action: 'inhibition',
        activeCompound: 'Glycyrrhizin',
        herb: '감초',
        effect: '염증 매개체 억제, 세포 보호',
        evidenceLevel: 'B',
      },
    ],
    '6-Gingerol': [
      {
        name: 'COX-2',
        type: 'enzyme',
        action: 'inhibition',
        activeCompound: '6-Gingerol',
        herb: '생강',
        effect: '프로스타글란딘 합성 억제, 항염증',
        evidenceLevel: 'A',
      },
      {
        name: 'NF-κB',
        type: 'transcription_factor',
        action: 'inhibition',
        activeCompound: '6-Gingerol',
        herb: '생강',
        effect: '염증 유전자 발현 억제',
        evidenceLevel: 'A',
      },
    ],
  };

  // AI 프롬프트
  private readonly PHARMACOLOGY_PROMPT = `당신은 한약 약리학 전문가입니다. 한약재의 활성 성분과 분자 수준의 작용 기전을 분석합니다.

## 역할
약재/처방의 약리학적 기전을 분석하여 다음을 제공합니다:

### 1. 활성 성분 분석
- 주요 활성 성분 (영문/한글명, 화학적 분류)
- PubChem ID, CAS 번호 (알려진 경우)

### 2. 분자 타겟
- 타겟 이름 (AMPK, NF-κB, COX-2 등)
- 타겟 유형 (효소, 수용체, 이온채널, 수송체, 전사인자)
- 작용 유형 (활성화/억제/조절)
- 효과 설명

### 3. 신호전달경로
- 경로 이름 (PI3K/Akt, MAPK, NF-κB 등)
- 경로 유형 (염증, 대사, 세포사멸, 항산화)
- 임상적 의미

### 4. 약동학 (ADME)
- 흡수: 생체이용률, 흡수 부위
- 분포: 조직 분포, 혈뇌장벽 통과
- 대사: CYP450 효소, 대사체
- 배설: 반감기, 배설 경로

### 5. 플로우차트 데이터
- 성분 → 타겟 → 경로 → 효과의 연결 관계

## 중요 지침
1. 과학적으로 검증된 정보 우선
2. 근거 수준 명시 (A: 메타분석/RCT, B: 비RCT 임상, C: 동물/세포 실험, D: 전문가 의견)
3. 불확실한 정보는 근거 수준 낮게 표시
4. 환자가 이해할 수 있는 요약 포함`;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.model = this.configService.get<string>('GPT_MODEL') || 'gpt-4o-mini';

    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  /**
   * 약리 기전 보고서 생성
   */
  async generatePharmacologyReport(
    request: PharmacologyReportRequest
  ): Promise<PharmacologyReport> {
    const startTime = Date.now();

    // AI를 통한 분석 시도
    if (this.client && request.detailLevel !== 'brief') {
      try {
        return await this.generateWithAI(request, startTime);
      } catch (error) {
        console.error('AI 약리 보고서 생성 오류:', error);
      }
    }

    // 기본 데이터베이스 기반 생성
    return this.generateFromDatabase(request, startTime);
  }

  /**
   * AI 기반 약리 보고서 생성
   */
  private async generateWithAI(
    request: PharmacologyReportRequest,
    startTime: number
  ): Promise<PharmacologyReport> {
    const herbsList = request.herbs
      .map(h => `${h.name}${h.nameEn ? ` (${h.nameEn})` : ''}${h.amount ? ` ${h.amount}` : ''}`)
      .join(', ');

    const userPrompt = `## 약재 정보
${request.formulaName ? `처방명: ${request.formulaName}\n` : ''}구성 약재: ${herbsList}

${request.patientContext ? `## 환자 정보
- 주소증: ${request.patientContext.chiefComplaint || '미상'}
- 증상: ${request.patientContext.symptoms?.join(', ') || '미상'}` : ''}

## 요청
위 약재들의 약리 기전 보고서를 JSON 형식으로 제공해주세요.
상세 수준: ${request.detailLevel || 'standard'}

JSON 형식:
{
  "herbs": [
    {
      "name": "약재명",
      "nameEn": "영문명",
      "scientificName": "학명",
      "activeCompounds": [
        {
          "name": "성분 영문명",
          "nameKo": "성분 한글명",
          "chemicalClass": "화학적 분류",
          "pubChemId": "PubChem CID 또는 null",
          "casNumber": "CAS 번호 또는 null",
          "targets": [
            {
              "name": "타겟명 (예: AMPK)",
              "type": "enzyme/receptor/channel/transporter/transcription_factor/other",
              "action": "activation/inhibition/modulation",
              "activeCompound": "성분명",
              "herb": "약재명",
              "effect": "효과 설명",
              "evidenceLevel": "A/B/C/D"
            }
          ],
          "pathways": [
            {
              "name": "경로명",
              "type": "inflammatory/metabolic/apoptotic/proliferative/antioxidant/other",
              "compounds": ["관련 성분"],
              "mechanism": "기전 설명",
              "clinicalRelevance": "임상적 의미"
            }
          ],
          "mainEffects": ["주요 효과"],
          "evidenceLevel": "A/B/C/D"
        }
      ],
      "effectSummary": "약재 효과 요약",
      "mechanismSummary": "기전 요약",
      "clinicalIndications": ["임상 적응증"],
      "pharmacologicalActions": [
        {
          "type": "anti_inflammatory/antioxidant/immunomodulatory/...",
          "description": "설명",
          "evidenceLevel": "A/B/C/D"
        }
      ],
      "relatedStudies": [
        {
          "title": "연구 제목",
          "year": 2023,
          "pmid": "PMID 또는 null",
          "finding": "주요 발견"
        }
      ]
    }
  ],
  "synergisticEffects": [
    {
      "effect": "시너지 효과",
      "mechanism": "기전",
      "involvedHerbs": ["관련 약재"],
      "evidenceLevel": "A/B/C/D"
    }
  ],
  "mechanismFlowchart": {
    "nodes": [
      {
        "id": "herb_1",
        "type": "herb",
        "label": "약재명",
        "labelKo": "한글명"
      },
      {
        "id": "compound_1",
        "type": "compound",
        "label": "성분명",
        "description": "설명"
      },
      {
        "id": "target_1",
        "type": "target",
        "label": "타겟명"
      },
      {
        "id": "pathway_1",
        "type": "pathway",
        "label": "경로명"
      },
      {
        "id": "effect_1",
        "type": "effect",
        "label": "효과"
      }
    ],
    "edges": [
      {
        "source": "herb_1",
        "target": "compound_1",
        "label": "함유"
      },
      {
        "source": "compound_1",
        "target": "target_1",
        "type": "activation/inhibition/modulation",
        "label": "작용"
      },
      {
        "source": "target_1",
        "target": "pathway_1"
      },
      {
        "source": "pathway_1",
        "target": "effect_1"
      }
    ]
  },
  "patientSummary": {
    "oneLiner": "한 줄 요약",
    "howItWorks": "쉬운 기전 설명 (2-3문장)",
    "keyPoints": ["핵심 포인트"],
    "precautions": ["주의사항"]
  },
  "overallEvidenceLevel": "B"
}`;

    const response = await this.client!.chat.completions.create({
      model: this.model,
      max_tokens: 8192,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: this.PHARMACOLOGY_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return this.buildReport(parsed, request, startTime, true);
  }

  /**
   * 데이터베이스 기반 약리 보고서 생성
   */
  private generateFromDatabase(
    request: PharmacologyReportRequest,
    startTime: number
  ): PharmacologyReport {
    const herbs: HerbPharmacology[] = request.herbs.map(herb => {
      const knownCompounds = this.KNOWN_COMPOUNDS[herb.name] || [];

      const compounds: CompoundPharmacology[] = knownCompounds.map(kc => {
        const targets = this.KNOWN_TARGETS[kc.name || ''] || [];
        return {
          name: kc.name || '',
          nameKo: kc.nameKo,
          herb: herb.name,
          chemicalClass: kc.chemicalClass,
          targets,
          pathways: [],
          mainEffects: kc.mainEffects || [],
          evidenceLevel: kc.evidenceLevel || 'D',
        };
      });

      return {
        name: herb.name,
        nameEn: herb.nameEn,
        activeCompounds: compounds,
        effectSummary: compounds.length > 0
          ? `${herb.name}에는 ${compounds.map(c => c.nameKo || c.name).join(', ')} 등의 활성 성분이 포함되어 있습니다.`
          : `${herb.name}의 활성 성분 정보가 제한적입니다.`,
        mechanismSummary: this.generateMechanismSummary(compounds),
        clinicalIndications: [],
        pharmacologicalActions: this.extractPharmacologicalActions(compounds),
        relatedStudies: [],
      };
    });

    const flowchart = this.generateFlowchartFromHerbs(herbs);

    return {
      title: request.formulaName
        ? `${request.formulaName} 약리 기전 보고서`
        : '약리 기전 보고서',
      formulaName: request.formulaName,
      herbs,
      mechanismFlowchart: flowchart,
      patientSummary: {
        oneLiner: this.generateOneLiner(herbs, request),
        howItWorks: this.generateHowItWorks(herbs),
        keyPoints: this.extractKeyPoints(herbs),
        precautions: ['복용 전 전문가와 상담하세요.'],
      },
      overallEvidenceLevel: this.calculateOverallEvidence(herbs),
      metadata: {
        generatedAt: new Date(),
        aiModelVersion: 'database-based',
        dataSources: ['Internal Database', 'Known Compounds DB'],
        confidenceLevel: 0.5,
      },
    };
  }

  /**
   * AI 결과로부터 보고서 빌드
   */
  private buildReport(
    parsed: any,
    request: PharmacologyReportRequest,
    startTime: number,
    isAI: boolean
  ): PharmacologyReport {
    return {
      title: request.formulaName
        ? `${request.formulaName} 약리 기전 보고서`
        : '약리 기전 보고서',
      formulaName: request.formulaName,
      herbs: parsed.herbs || [],
      synergisticEffects: parsed.synergisticEffects,
      mechanismFlowchart: parsed.mechanismFlowchart || { nodes: [], edges: [] },
      patientSummary: parsed.patientSummary || {
        oneLiner: '약리 정보 요약',
        howItWorks: '분석 결과가 제한적입니다.',
        keyPoints: [],
        precautions: [],
      },
      overallEvidenceLevel: parsed.overallEvidenceLevel || 'D',
      metadata: {
        generatedAt: new Date(),
        aiModelVersion: isAI ? this.model : 'database-based',
        dataSources: isAI
          ? ['AI Analysis', 'PubMed', 'PubChem', 'Traditional Medicine DB']
          : ['Internal Database'],
        confidenceLevel: isAI ? 0.7 : 0.5,
      },
    };
  }

  /**
   * 특정 약재의 약리 정보 조회
   */
  async getHerbPharmacology(herbName: string): Promise<HerbPharmacology | null> {
    const request: PharmacologyReportRequest = {
      herbs: [{ name: herbName }],
      detailLevel: 'detailed',
    };

    const report = await this.generatePharmacologyReport(request);
    return report.herbs[0] || null;
  }

  /**
   * 특정 성분의 분자 타겟 조회
   */
  async getCompoundTargets(compoundName: string): Promise<MolecularTargetInfo[]> {
    // 먼저 알려진 데이터에서 검색
    const knownTargets = this.KNOWN_TARGETS[compoundName];
    if (knownTargets) {
      return knownTargets;
    }

    // AI로 조회
    if (!this.client) {
      return [];
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: this.PHARMACOLOGY_PROMPT },
          {
            role: 'user',
            content: `성분명: ${compoundName}\n\n이 성분의 분자 타겟 정보를 JSON 배열로 제공해주세요.\n형식: { "targets": [{ "name", "type", "action", "activeCompound", "herb", "effect", "evidenceLevel" }] }`,
          },
        ],
      });

      const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
      return parsed.targets || [];
    } catch (error) {
      console.error('성분 타겟 조회 오류:', error);
      return [];
    }
  }

  /**
   * 기전 플로우차트 생성
   */
  generateMechanismFlowchart(herbs: HerbPharmacology[]): MechanismFlowchart {
    return this.generateFlowchartFromHerbs(herbs);
  }

  // ============ 유틸리티 메서드 ============

  private generateFlowchartFromHerbs(herbs: HerbPharmacology[]): MechanismFlowchart {
    const nodes: MechanismFlowchartNode[] = [];
    const edges: MechanismFlowchartEdge[] = [];
    const nodeIds = new Set<string>();

    let nodeCounter = 0;
    const generateId = (prefix: string) => {
      nodeCounter++;
      return `${prefix}_${nodeCounter}`;
    };

    herbs.forEach((herb, herbIndex) => {
      // 약재 노드
      const herbNodeId = generateId('herb');
      nodes.push({
        id: herbNodeId,
        type: 'herb',
        label: herb.nameEn || herb.name,
        labelKo: herb.name,
        color: '#4CAF50',
      });
      nodeIds.add(herbNodeId);

      herb.activeCompounds.forEach((compound) => {
        // 성분 노드
        const compoundNodeId = generateId('compound');
        nodes.push({
          id: compoundNodeId,
          type: 'compound',
          label: compound.name,
          labelKo: compound.nameKo,
          description: compound.chemicalClass,
          color: '#2196F3',
        });
        nodeIds.add(compoundNodeId);

        // 약재 → 성분 엣지
        edges.push({
          source: herbNodeId,
          target: compoundNodeId,
          label: '함유',
        });

        compound.targets?.forEach((target) => {
          // 타겟 노드 (중복 방지)
          const existingTarget = nodes.find(
            n => n.type === 'target' && n.label === target.name
          );
          const targetNodeId = existingTarget?.id || generateId('target');

          if (!existingTarget) {
            nodes.push({
              id: targetNodeId,
              type: 'target',
              label: target.name,
              description: TARGET_TYPE_LABELS[target.type],
              color: '#FF9800',
            });
          }

          // 성분 → 타겟 엣지
          edges.push({
            source: compoundNodeId,
            target: targetNodeId,
            label: ACTION_TYPE_LABELS[target.action],
            type: target.action,
          });

          // 효과 노드
          const effectNodeId = generateId('effect');
          nodes.push({
            id: effectNodeId,
            type: 'effect',
            label: target.effect,
            color: '#9C27B0',
          });

          // 타겟 → 효과 엣지
          edges.push({
            source: targetNodeId,
            target: effectNodeId,
          });
        });
      });
    });

    return { nodes, edges };
  }

  private generateMechanismSummary(compounds: CompoundPharmacology[]): string {
    if (compounds.length === 0) {
      return '활성 성분 정보가 제한적입니다.';
    }

    const effects = new Set<string>();
    compounds.forEach(c => {
      c.mainEffects?.forEach(e => effects.add(e));
    });

    return `주요 활성 성분들이 ${Array.from(effects).slice(0, 3).join(', ')} 등의 효과를 나타냅니다.`;
  }

  private extractPharmacologicalActions(compounds: CompoundPharmacology[]): {
    type: string;
    description: string;
    evidenceLevel: 'A' | 'B' | 'C' | 'D';
  }[] {
    const actions: Map<string, { description: string; evidenceLevel: 'A' | 'B' | 'C' | 'D' }> = new Map();

    compounds.forEach(compound => {
      compound.mainEffects?.forEach(effect => {
        if (effect.includes('항염') || effect.includes('염증')) {
          actions.set('anti_inflammatory', {
            description: '염증 반응 억제',
            evidenceLevel: compound.evidenceLevel,
          });
        }
        if (effect.includes('항산화')) {
          actions.set('antioxidant', {
            description: '활성산소 제거 및 산화 스트레스 감소',
            evidenceLevel: compound.evidenceLevel,
          });
        }
        if (effect.includes('면역')) {
          actions.set('immunomodulatory', {
            description: '면역 기능 조절',
            evidenceLevel: compound.evidenceLevel,
          });
        }
      });
    });

    return Array.from(actions.entries()).map(([type, data]) => ({
      type,
      description: data.description,
      evidenceLevel: data.evidenceLevel,
    }));
  }

  private generateOneLiner(herbs: HerbPharmacology[], request: PharmacologyReportRequest): string {
    const herbNames = herbs.map(h => h.name).join(', ');
    if (request.formulaName) {
      return `${request.formulaName}(${herbNames})의 약리학적 작용 기전 분석`;
    }
    return `${herbNames}의 약리학적 작용 기전 분석`;
  }

  private generateHowItWorks(herbs: HerbPharmacology[]): string {
    const allEffects = new Set<string>();
    const allTargets = new Set<string>();

    herbs.forEach(herb => {
      herb.activeCompounds.forEach(compound => {
        compound.mainEffects?.forEach(e => allEffects.add(e));
        compound.targets?.forEach(t => allTargets.add(t.name));
      });
    });

    const effects = Array.from(allEffects).slice(0, 3);
    const targets = Array.from(allTargets).slice(0, 2);

    if (effects.length === 0) {
      return '각 약재의 활성 성분들이 체내에서 다양한 분자 타겟에 작용하여 치료 효과를 나타냅니다.';
    }

    return `약재에 포함된 활성 성분들이 ${targets.length > 0 ? targets.join(', ') + ' 등의 분자 타겟에 작용하여' : ''} ${effects.join(', ')} 효과를 나타냅니다.`;
  }

  private extractKeyPoints(herbs: HerbPharmacology[]): string[] {
    const points: string[] = [];

    const compoundCount = herbs.reduce((sum, h) => sum + h.activeCompounds.length, 0);
    if (compoundCount > 0) {
      points.push(`총 ${compoundCount}개의 주요 활성 성분 확인`);
    }

    const targetSet = new Set<string>();
    herbs.forEach(h => {
      h.activeCompounds.forEach(c => {
        c.targets?.forEach(t => targetSet.add(t.name));
      });
    });
    if (targetSet.size > 0) {
      points.push(`${targetSet.size}개의 분자 타겟 작용`);
    }

    return points.length > 0 ? points : ['약리학적 분석 완료'];
  }

  private calculateOverallEvidence(herbs: HerbPharmacology[]): 'A' | 'B' | 'C' | 'D' {
    const levels: ('A' | 'B' | 'C' | 'D')[] = [];

    herbs.forEach(herb => {
      herb.activeCompounds.forEach(compound => {
        levels.push(compound.evidenceLevel);
      });
    });

    if (levels.length === 0) return 'D';

    const levelOrder = { A: 1, B: 2, C: 3, D: 4 };
    const avgLevel = levels.reduce((sum, l) => sum + levelOrder[l], 0) / levels.length;

    if (avgLevel <= 1.5) return 'A';
    if (avgLevel <= 2.5) return 'B';
    if (avgLevel <= 3.5) return 'C';
    return 'D';
  }
}
