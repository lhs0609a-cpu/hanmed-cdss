import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============ 타입 정의 ============

interface TreatmentMethod {
  name: string;
  hanja?: string;
  description: string;
  rationale: string;
}

interface PathogenesisMechanism {
  name: string;
  hanja?: string;
  description: string;
  modernInterpretation?: string;
}

interface ClassicalSource {
  name: string;
  chapter?: string;
  quote?: string;
  interpretation?: string;
}

interface FormulaStructure {
  sovereign: Array<{ herb: string; role: string }>;
  minister: Array<{ herb: string; role: string }>;
  assistant: Array<{ herb: string; role: string }>;
  courier: Array<{ herb: string; role: string }>;
  synergy: string;
}

interface MolecularTarget {
  name: string;
  type: string;
  activeCompound: string;
  herb: string;
  action: string;
  effect: string;
}

interface SignalingPathway {
  name: string;
  compounds: string[];
  mechanism: string;
  clinicalRelevance: string;
}

interface PharmacologicalAction {
  type: string;
  nameKo: string;
  description: string;
  relatedHerbs: string[];
  evidenceLevel?: string;
}

interface ActiveCompound {
  name: string;
  herb: string;
  effects: string[];
}

interface ClinicalStudy {
  title: string;
  authors?: string[];
  year: number;
  journal?: string;
  pmid?: string;
  studyType: string;
  sampleSize?: number;
  mainFindings: string;
  conclusion: string;
}

interface CaseStatistics {
  totalSimilarCases: number;
  casesWithThisFormula: number;
  successRate: number;
  outcomeDistribution: {
    cured: number;
    markedly_improved: number;
    improved: number;
    no_change: number;
    worsened: number;
  };
  averageTreatmentDuration: string;
  statisticalConfidence: number;
  matchCriteria: string[];
}

interface Precaution {
  type: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface ScientificRationaleProps {
  formulaName: string;
  formulaNameHanja?: string;

  summary: {
    oneLiner: string;
    patientFriendlyExplanation: string;
    keyPoints: string[];
  };

  traditionalEvidence?: {
    treatmentMethods: TreatmentMethod[];
    pathogenesis: PathogenesisMechanism[];
    classicalSources: ClassicalSource[];
    formulaStructure?: FormulaStructure;
  };

  modernEvidence?: {
    molecularTargets: MolecularTarget[];
    signalingPathways: SignalingPathway[];
    pharmacologicalActions: PharmacologicalAction[];
    activeCompounds: ActiveCompound[];
  };

  statisticalEvidence?: {
    clinicalStudies: ClinicalStudy[];
    caseStatistics?: CaseStatistics;
    overallEvidenceLevel: string;
    evidenceLevelExplanation: string;
  };

  expectedOutcomes?: Array<{
    outcome: string;
    timeline: string;
    probability?: string;
  }>;

  precautions?: Precaution[];

  confidenceLevel?: number;
}

type TabType = 'summary' | 'traditional' | 'modern' | 'statistics';

// 근거 수준 색상
const getEvidenceLevelColor = (level: string): string => {
  switch (level) {
    case 'A': return '#10B981';
    case 'B': return '#3B82F6';
    case 'C': return '#F59E0B';
    case 'D': return '#EF4444';
    default: return '#6B7280';
  }
};

// 연구 유형 한글
const getStudyTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    rct: '무작위 대조 시험',
    meta_analysis: '메타분석',
    systematic_review: '체계적 문헌고찰',
    cohort: '코호트 연구',
    case_control: '환자-대조군 연구',
    case_series: '증례 시리즈',
    in_vitro: '시험관 연구',
    animal: '동물 실험',
  };
  return labels[type] || type;
};

// 약리 작용 유형 한글
const getActionTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    anti_inflammatory: '항염 작용',
    antioxidant: '항산화 작용',
    immunomodulatory: '면역조절 작용',
    analgesic: '진통 작용',
    antibacterial: '항균 작용',
    antiviral: '항바이러스 작용',
    hepatoprotective: '간보호 작용',
    cardioprotective: '심장보호 작용',
    neuroprotective: '신경보호 작용',
    gastroprotective: '위장보호 작용',
    metabolic: '대사조절 작용',
    hormonal: '호르몬조절 작용',
    circulatory: '혈액순환 개선',
  };
  return labels[type] || type;
};

export default function ScientificRationale({
  formulaName,
  formulaNameHanja,
  summary,
  traditionalEvidence,
  modernEvidence,
  statisticalEvidence,
  expectedOutcomes = [],
  precautions = [],
  confidenceLevel = 0.5,
}: ScientificRationaleProps) {
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'summary', label: '요약', icon: 'document-text' },
    { key: 'traditional', label: '전통의학', icon: 'book' },
    { key: 'modern', label: '현대약리', icon: 'flask' },
    { key: 'statistics', label: '연구근거', icon: 'stats-chart' },
  ];

  // PubMed 링크 열기
  const openPubMed = (pmid: string) => {
    Linking.openURL(`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`);
  };

  const renderSummaryTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* 처방 정보 */}
      <View style={styles.card}>
        <View style={styles.formulaHeader}>
          <Text style={styles.formulaName}>{formulaName}</Text>
          {formulaNameHanja && (
            <Text style={styles.formulaHanja}>{formulaNameHanja}</Text>
          )}
        </View>
        <Text style={styles.oneLiner}>{summary.oneLiner}</Text>
      </View>

      {/* 환자용 설명 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.patientBadge}>
            <Ionicons name="person" size={14} color="#FFFFFF" />
            <Text style={styles.patientBadgeText}>환자용 설명</Text>
          </View>
        </View>
        <Text style={styles.patientExplanation}>
          {summary.patientFriendlyExplanation}
        </Text>
      </View>

      {/* 핵심 포인트 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="key" size={20} color="#10B981" />
          <Text style={styles.cardTitle}>핵심 포인트</Text>
        </View>
        {summary.keyPoints.map((point, idx) => (
          <View key={idx} style={styles.keyPointItem}>
            <View style={styles.keyPointNumber}>
              <Text style={styles.keyPointNumberText}>{idx + 1}</Text>
            </View>
            <Text style={styles.keyPointText}>{point}</Text>
          </View>
        ))}
      </View>

      {/* 기대 효과 */}
      {expectedOutcomes.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="trending-up" size={20} color="#10B981" />
            <Text style={styles.cardTitle}>기대 효과</Text>
          </View>
          {expectedOutcomes.map((outcome, idx) => (
            <View key={idx} style={styles.outcomeItem}>
              <View style={styles.outcomeInfo}>
                <Text style={styles.outcomeText}>{outcome.outcome}</Text>
                <View style={styles.outcomeMeta}>
                  <Ionicons name="time-outline" size={14} color="#6B7280" />
                  <Text style={styles.outcomeTimeline}>{outcome.timeline}</Text>
                  {outcome.probability && (
                    <>
                      <Text style={styles.outcomeSeparator}>|</Text>
                      <Text style={styles.outcomeProbability}>
                        가능성: {outcome.probability}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 근거 수준 */}
      {statisticalEvidence && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            <Text style={styles.cardTitle}>근거 수준</Text>
          </View>
          <View style={styles.evidenceLevelBox}>
            <View
              style={[
                styles.evidenceLevelBadge,
                { backgroundColor: getEvidenceLevelColor(statisticalEvidence.overallEvidenceLevel) },
              ]}
            >
              <Text style={styles.evidenceLevelText}>
                {statisticalEvidence.overallEvidenceLevel}
              </Text>
            </View>
            <View style={styles.evidenceLevelInfo}>
              <Text style={styles.evidenceLevelLabel}>
                {statisticalEvidence.overallEvidenceLevel === 'A' && '강한 근거'}
                {statisticalEvidence.overallEvidenceLevel === 'B' && '중등도 근거'}
                {statisticalEvidence.overallEvidenceLevel === 'C' && '약한 근거'}
                {statisticalEvidence.overallEvidenceLevel === 'D' && '매우 약한 근거'}
              </Text>
              <Text style={styles.evidenceLevelDesc}>
                {statisticalEvidence.evidenceLevelExplanation}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 주의사항 */}
      {precautions.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="warning" size={20} color="#F59E0B" />
            <Text style={styles.cardTitle}>주의사항</Text>
          </View>
          {precautions.map((precaution, idx) => {
            const severityConfig = {
              critical: { bg: '#FEE2E2', text: '#991B1B', icon: 'alert-circle' },
              warning: { bg: '#FEF3C7', text: '#92400E', icon: 'warning' },
              info: { bg: '#DBEAFE', text: '#1E40AF', icon: 'information-circle' },
            };
            const config = severityConfig[precaution.severity];

            return (
              <View
                key={idx}
                style={[styles.precautionItem, { backgroundColor: config.bg }]}
              >
                <Ionicons name={config.icon as any} size={18} color={config.text} />
                <Text style={[styles.precautionText, { color: config.text }]}>
                  {precaution.description}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );

  const renderTraditionalTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* 치법 */}
      {traditionalEvidence?.treatmentMethods && traditionalEvidence.treatmentMethods.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="medical" size={20} color="#8B5CF6" />
            <Text style={styles.cardTitle}>치법 (治法)</Text>
          </View>
          <Text style={styles.sectionDesc}>
            이 처방에 적용된 한의학 치료 원리입니다.
          </Text>
          {traditionalEvidence.treatmentMethods.map((method, idx) => (
            <View key={idx} style={styles.methodCard}>
              <View style={styles.methodHeader}>
                <Text style={styles.methodName}>{method.name}</Text>
                {method.hanja && (
                  <Text style={styles.methodHanja}>{method.hanja}</Text>
                )}
              </View>
              <Text style={styles.methodDesc}>{method.description}</Text>
              <View style={styles.methodRationale}>
                <Ionicons name="bulb" size={14} color="#F59E0B" />
                <Text style={styles.methodRationaleText}>{method.rationale}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 병기 */}
      {traditionalEvidence?.pathogenesis && traditionalEvidence.pathogenesis.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="git-branch" size={20} color="#8B5CF6" />
            <Text style={styles.cardTitle}>병기 (病機)</Text>
          </View>
          <Text style={styles.sectionDesc}>
            질병이 발생하고 진행되는 기전입니다.
          </Text>
          {traditionalEvidence.pathogenesis.map((path, idx) => (
            <View key={idx} style={styles.pathCard}>
              <View style={styles.pathHeader}>
                <Text style={styles.pathName}>{path.name}</Text>
                {path.hanja && <Text style={styles.pathHanja}>{path.hanja}</Text>}
              </View>
              <Text style={styles.pathDesc}>{path.description}</Text>
              {path.modernInterpretation && (
                <View style={styles.modernInterpretBox}>
                  <View style={styles.modernInterpretHeader}>
                    <Ionicons name="flask" size={12} color="#3B82F6" />
                    <Text style={styles.modernInterpretLabel}>현대의학적 해석</Text>
                  </View>
                  <Text style={styles.modernInterpretText}>
                    {path.modernInterpretation}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* 군신좌사 */}
      {traditionalEvidence?.formulaStructure && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="git-network" size={20} color="#8B5CF6" />
            <Text style={styles.cardTitle}>처방 구조 (君臣佐使)</Text>
          </View>
          <Text style={styles.sectionDesc}>
            약재들의 역할과 배합 원리입니다.
          </Text>

          {traditionalEvidence.formulaStructure.sovereign.length > 0 && (
            <View style={styles.structureSection}>
              <View style={[styles.structureBadge, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.structureBadgeText}>군약 (君)</Text>
              </View>
              {traditionalEvidence.formulaStructure.sovereign.map((item, idx) => (
                <View key={idx} style={styles.structureItem}>
                  <Text style={styles.structureHerb}>{item.herb}</Text>
                  <Text style={styles.structureRole}>{item.role}</Text>
                </View>
              ))}
            </View>
          )}

          {traditionalEvidence.formulaStructure.minister.length > 0 && (
            <View style={styles.structureSection}>
              <View style={[styles.structureBadge, { backgroundColor: '#F59E0B' }]}>
                <Text style={styles.structureBadgeText}>신약 (臣)</Text>
              </View>
              {traditionalEvidence.formulaStructure.minister.map((item, idx) => (
                <View key={idx} style={styles.structureItem}>
                  <Text style={styles.structureHerb}>{item.herb}</Text>
                  <Text style={styles.structureRole}>{item.role}</Text>
                </View>
              ))}
            </View>
          )}

          {traditionalEvidence.formulaStructure.assistant.length > 0 && (
            <View style={styles.structureSection}>
              <View style={[styles.structureBadge, { backgroundColor: '#10B981' }]}>
                <Text style={styles.structureBadgeText}>좌약 (佐)</Text>
              </View>
              {traditionalEvidence.formulaStructure.assistant.map((item, idx) => (
                <View key={idx} style={styles.structureItem}>
                  <Text style={styles.structureHerb}>{item.herb}</Text>
                  <Text style={styles.structureRole}>{item.role}</Text>
                </View>
              ))}
            </View>
          )}

          {traditionalEvidence.formulaStructure.courier.length > 0 && (
            <View style={styles.structureSection}>
              <View style={[styles.structureBadge, { backgroundColor: '#6366F1' }]}>
                <Text style={styles.structureBadgeText}>사약 (使)</Text>
              </View>
              {traditionalEvidence.formulaStructure.courier.map((item, idx) => (
                <View key={idx} style={styles.structureItem}>
                  <Text style={styles.structureHerb}>{item.herb}</Text>
                  <Text style={styles.structureRole}>{item.role}</Text>
                </View>
              ))}
            </View>
          )}

          {traditionalEvidence.formulaStructure.synergy && (
            <View style={styles.synergyBox}>
              <Ionicons name="sparkles" size={16} color="#8B5CF6" />
              <Text style={styles.synergyText}>
                {traditionalEvidence.formulaStructure.synergy}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 출전 */}
      {traditionalEvidence?.classicalSources && traditionalEvidence.classicalSources.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="library" size={20} color="#8B5CF6" />
            <Text style={styles.cardTitle}>고전 출전</Text>
          </View>
          {traditionalEvidence.classicalSources.map((source, idx) => (
            <View key={idx} style={styles.sourceCard}>
              <View style={styles.sourceHeader}>
                <Text style={styles.sourceName}>{source.name}</Text>
                {source.chapter && (
                  <Text style={styles.sourceChapter}>{source.chapter}</Text>
                )}
              </View>
              {source.quote && (
                <View style={styles.quoteBox}>
                  <Text style={styles.quoteText}>"{source.quote}"</Text>
                </View>
              )}
              {source.interpretation && (
                <Text style={styles.sourceInterpretation}>
                  {source.interpretation}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderModernTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* 분자 타겟 */}
      {modernEvidence?.molecularTargets && modernEvidence.molecularTargets.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cellular" size={20} color="#3B82F6" />
            <Text style={styles.cardTitle}>분자 타겟</Text>
          </View>
          <Text style={styles.sectionDesc}>
            약재 성분이 작용하는 분자 수준의 타겟입니다.
          </Text>
          {modernEvidence.molecularTargets.map((target, idx) => (
            <View key={idx} style={styles.targetCard}>
              <View style={styles.targetHeader}>
                <Text style={styles.targetName}>{target.name}</Text>
                <View
                  style={[
                    styles.actionBadge,
                    {
                      backgroundColor:
                        target.action === 'activation'
                          ? '#D1FAE5'
                          : target.action === 'inhibition'
                          ? '#FEE2E2'
                          : '#FEF3C7',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.actionText,
                      {
                        color:
                          target.action === 'activation'
                            ? '#065F46'
                            : target.action === 'inhibition'
                            ? '#991B1B'
                            : '#92400E',
                      },
                    ]}
                  >
                    {target.action === 'activation' ? '활성화' : target.action === 'inhibition' ? '억제' : '조절'}
                  </Text>
                </View>
              </View>
              <View style={styles.targetMeta}>
                <Text style={styles.targetMetaLabel}>활성 성분:</Text>
                <Text style={styles.targetMetaValue}>{target.activeCompound}</Text>
                <Text style={styles.targetMetaLabel}>약재:</Text>
                <Text style={styles.targetMetaValue}>{target.herb}</Text>
              </View>
              <Text style={styles.targetEffect}>{target.effect}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 약리 작용 */}
      {modernEvidence?.pharmacologicalActions && modernEvidence.pharmacologicalActions.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="flask" size={20} color="#3B82F6" />
            <Text style={styles.cardTitle}>약리 작용</Text>
          </View>
          {modernEvidence.pharmacologicalActions.map((action, idx) => (
            <View key={idx} style={styles.actionCard}>
              <View style={styles.actionHeader}>
                <Text style={styles.actionName}>
                  {action.nameKo || getActionTypeLabel(action.type)}
                </Text>
                {action.evidenceLevel && (
                  <View
                    style={[
                      styles.evidenceBadge,
                      { backgroundColor: getEvidenceLevelColor(action.evidenceLevel) },
                    ]}
                  >
                    <Text style={styles.evidenceBadgeText}>{action.evidenceLevel}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.actionDesc}>{action.description}</Text>
              {action.relatedHerbs.length > 0 && (
                <View style={styles.relatedHerbs}>
                  {action.relatedHerbs.map((herb, hIdx) => (
                    <View key={hIdx} style={styles.herbChip}>
                      <Text style={styles.herbChipText}>{herb}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* 주요 활성 성분 */}
      {modernEvidence?.activeCompounds && modernEvidence.activeCompounds.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bonfire" size={20} color="#3B82F6" />
            <Text style={styles.cardTitle}>주요 활성 성분</Text>
          </View>
          {modernEvidence.activeCompounds.map((compound, idx) => (
            <View key={idx} style={styles.compoundCard}>
              <View style={styles.compoundHeader}>
                <Text style={styles.compoundName}>{compound.name}</Text>
                <Text style={styles.compoundHerb}>{compound.herb}</Text>
              </View>
              <View style={styles.compoundEffects}>
                {compound.effects.map((effect, eIdx) => (
                  <View key={eIdx} style={styles.effectChip}>
                    <Text style={styles.effectChipText}>{effect}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 신호전달경로 */}
      {modernEvidence?.signalingPathways && modernEvidence.signalingPathways.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="git-merge" size={20} color="#3B82F6" />
            <Text style={styles.cardTitle}>신호전달경로</Text>
          </View>
          {modernEvidence.signalingPathways.map((pathway, idx) => (
            <View key={idx} style={styles.pathwayCard}>
              <Text style={styles.pathwayName}>{pathway.name}</Text>
              <Text style={styles.pathwayMechanism}>{pathway.mechanism}</Text>
              <View style={styles.clinicalRelevanceBox}>
                <Ionicons name="medical" size={14} color="#10B981" />
                <Text style={styles.clinicalRelevanceText}>
                  {pathway.clinicalRelevance}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderStatisticsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* 치험례 통계 */}
      {statisticalEvidence?.caseStatistics && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="pie-chart" size={20} color="#10B981" />
            <Text style={styles.cardTitle}>치험례 통계</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {statisticalEvidence.caseStatistics.totalSimilarCases}
              </Text>
              <Text style={styles.statLabel}>유사 환자 수</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>
                {statisticalEvidence.caseStatistics.successRate}%
              </Text>
              <Text style={styles.statLabel}>치료 성공률</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {statisticalEvidence.caseStatistics.averageTreatmentDuration}
              </Text>
              <Text style={styles.statLabel}>평균 치료 기간</Text>
            </View>
          </View>

          {/* 결과 분포 */}
          <View style={styles.outcomeDistribution}>
            <Text style={styles.outcomeDistTitle}>치료 결과 분포</Text>
            {[
              { label: '완치', value: statisticalEvidence.caseStatistics.outcomeDistribution.cured, color: '#10B981' },
              { label: '현저 호전', value: statisticalEvidence.caseStatistics.outcomeDistribution.markedly_improved, color: '#22C55E' },
              { label: '호전', value: statisticalEvidence.caseStatistics.outcomeDistribution.improved, color: '#84CC16' },
              { label: '무변화', value: statisticalEvidence.caseStatistics.outcomeDistribution.no_change, color: '#F59E0B' },
              { label: '악화', value: statisticalEvidence.caseStatistics.outcomeDistribution.worsened, color: '#EF4444' },
            ].map((item, idx) => {
              const total = Object.values(statisticalEvidence.caseStatistics!.outcomeDistribution).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? (item.value / total) * 100 : 0;

              return (
                <View key={idx} style={styles.outcomeBar}>
                  <View style={styles.outcomeBarLabel}>
                    <Text style={styles.outcomeBarLabelText}>{item.label}</Text>
                    <Text style={styles.outcomeBarValue}>{item.value}건</Text>
                  </View>
                  <View style={styles.outcomeBarTrack}>
                    <View
                      style={[
                        styles.outcomeBarFill,
                        { width: `${percentage}%`, backgroundColor: item.color },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          {/* 매칭 기준 */}
          <View style={styles.matchCriteriaBox}>
            <Text style={styles.matchCriteriaTitle}>통계 매칭 기준</Text>
            {statisticalEvidence.caseStatistics.matchCriteria.map((criteria, idx) => (
              <View key={idx} style={styles.matchCriteriaItem}>
                <Ionicons name="checkmark" size={14} color="#10B981" />
                <Text style={styles.matchCriteriaText}>{criteria}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 임상 연구 */}
      {statisticalEvidence?.clinicalStudies && statisticalEvidence.clinicalStudies.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text" size={20} color="#10B981" />
            <Text style={styles.cardTitle}>
              임상 연구 ({statisticalEvidence.clinicalStudies.length}건)
            </Text>
          </View>

          {statisticalEvidence.clinicalStudies.map((study, idx) => (
            <View key={idx} style={styles.studyCard}>
              <View style={styles.studyHeader}>
                <View style={styles.studyTypeBadge}>
                  <Text style={styles.studyTypeText}>
                    {getStudyTypeLabel(study.studyType)}
                  </Text>
                </View>
                <Text style={styles.studyYear}>{study.year}년</Text>
              </View>

              <Text style={styles.studyTitle}>{study.title}</Text>

              {study.journal && (
                <Text style={styles.studyJournal}>{study.journal}</Text>
              )}

              <Text style={styles.studyFindings}>{study.mainFindings}</Text>

              <View style={styles.studyConclusion}>
                <Text style={styles.studyConclusionLabel}>결론</Text>
                <Text style={styles.studyConclusionText}>{study.conclusion}</Text>
              </View>

              {study.sampleSize && (
                <Text style={styles.studySampleSize}>
                  대상자: {study.sampleSize}명
                </Text>
              )}

              {study.pmid && (
                <TouchableOpacity
                  style={styles.pubmedButton}
                  onPress={() => openPubMed(study.pmid!)}
                >
                  <Ionicons name="open-outline" size={14} color="#3B82F6" />
                  <Text style={styles.pubmedButtonText}>
                    PubMed에서 보기 (PMID: {study.pmid})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* 근거 수준 설명 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="information-circle" size={20} color="#6B7280" />
          <Text style={styles.cardTitle}>근거 수준 이해하기</Text>
        </View>

        <Text style={styles.evidenceGuideText}>
          근거 수준이 낮더라도 오랜 임상 경험에 기반한 전통의학의 가치를 부정하지 않습니다.
          이는 현대 과학적 검증의 정도를 나타내는 지표입니다.
        </Text>

        <View style={styles.evidenceGuideGrid}>
          {[
            { level: 'A', label: '강한 근거', desc: 'RCT/메타분석' },
            { level: 'B', label: '중등도', desc: 'RCT/코호트' },
            { level: 'C', label: '약한', desc: '관찰 연구' },
            { level: 'D', label: '매우 약한', desc: '전임상/이론' },
          ].map((item, idx) => (
            <View key={idx} style={styles.evidenceGuideItem}>
              <View
                style={[
                  styles.evidenceGuideLevel,
                  { backgroundColor: getEvidenceLevelColor(item.level) },
                ]}
              >
                <Text style={styles.evidenceGuideLevelText}>{item.level}</Text>
              </View>
              <Text style={styles.evidenceGuideLabel}>{item.label}</Text>
              <Text style={styles.evidenceGuideDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* 탭 네비게이션 */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.key ? '#10B981' : '#9CA3AF'}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.key && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 탭 컨텐츠 */}
      {activeTab === 'summary' && renderSummaryTab()}
      {activeTab === 'traditional' && renderTraditionalTab()}
      {activeTab === 'modern' && renderModernTab()}
      {activeTab === 'statistics' && renderStatisticsTab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#10B981',
  },
  tabLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#10B981',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  formulaHeader: {
    marginBottom: 12,
  },
  formulaName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  formulaHanja: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  oneLiner: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  patientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  patientBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  patientExplanation: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
  },
  keyPointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  keyPointNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPointNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  keyPointText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  outcomeItem: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  outcomeInfo: {
    gap: 6,
  },
  outcomeText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  outcomeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  outcomeTimeline: {
    fontSize: 13,
    color: '#6B7280',
  },
  outcomeSeparator: {
    color: '#D1D5DB',
  },
  outcomeProbability: {
    fontSize: 13,
    color: '#10B981',
  },
  evidenceLevelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
  },
  evidenceLevelBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenceLevelText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  evidenceLevelInfo: {
    flex: 1,
  },
  evidenceLevelLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  evidenceLevelDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  precautionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  precautionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  methodCard: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  methodHanja: {
    fontSize: 13,
    color: '#8B5CF6',
  },
  methodDesc: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 10,
  },
  methodRationale: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
  },
  methodRationaleText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  pathCard: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  pathHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pathName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  pathHanja: {
    fontSize: 13,
    color: '#8B5CF6',
  },
  pathDesc: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  modernInterpretBox: {
    marginTop: 10,
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 8,
  },
  modernInterpretHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  modernInterpretLabel: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '500',
  },
  modernInterpretText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  structureSection: {
    marginBottom: 14,
  },
  structureBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  structureBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  structureItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 6,
  },
  structureHerb: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  structureRole: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
    textAlign: 'right',
  },
  synergyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F3E8FF',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  synergyText: {
    flex: 1,
    fontSize: 14,
    color: '#6B21A8',
    lineHeight: 20,
  },
  sourceCard: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  sourceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  sourceChapter: {
    fontSize: 13,
    color: '#6B7280',
  },
  quoteBox: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
    paddingLeft: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  quoteText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  sourceInterpretation: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  targetCard: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  targetName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  actionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  targetMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  targetMetaLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  targetMetaValue: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '500',
    marginRight: 12,
  },
  targetEffect: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actionCard: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  evidenceBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenceBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionDesc: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 10,
  },
  relatedHerbs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  herbChip: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  herbChipText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '500',
  },
  compoundCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 12,
  },
  compoundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  compoundName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  compoundHerb: {
    fontSize: 13,
    color: '#10B981',
  },
  compoundEffects: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  effectChip: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  effectChipText: {
    fontSize: 11,
    color: '#4338CA',
  },
  pathwayCard: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  pathwayName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  pathwayMechanism: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 10,
  },
  clinicalRelevanceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#D1FAE5',
    padding: 10,
    borderRadius: 8,
  },
  clinicalRelevanceText: {
    flex: 1,
    fontSize: 13,
    color: '#065F46',
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  outcomeDistribution: {
    marginBottom: 16,
  },
  outcomeDistTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  outcomeBar: {
    marginBottom: 10,
  },
  outcomeBarLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  outcomeBarLabelText: {
    fontSize: 13,
    color: '#374151',
  },
  outcomeBarValue: {
    fontSize: 12,
    color: '#6B7280',
  },
  outcomeBarTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  outcomeBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  matchCriteriaBox: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
  },
  matchCriteriaTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  matchCriteriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  matchCriteriaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  studyCard: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  studyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  studyTypeBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  studyTypeText: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  studyYear: {
    fontSize: 13,
    color: '#6B7280',
  },
  studyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
    marginBottom: 6,
  },
  studyJournal: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  studyFindings: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  studyConclusion: {
    backgroundColor: '#D1FAE5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  studyConclusionLabel: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
    marginBottom: 4,
  },
  studyConclusionText: {
    fontSize: 13,
    color: '#065F46',
    lineHeight: 18,
  },
  studySampleSize: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  pubmedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  pubmedButtonText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
  evidenceGuideText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 16,
  },
  evidenceGuideGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  evidenceGuideItem: {
    alignItems: 'center',
    flex: 1,
  },
  evidenceGuideLevel: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  evidenceGuideLevelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  evidenceGuideLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  evidenceGuideDesc: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
});
