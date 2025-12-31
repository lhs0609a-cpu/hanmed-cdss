import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G, Line, Text as SvgText, Rect, Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 약재 상세 정보 인터페이스
export interface HerbInfo {
  name: string;
  amount: string;
  purpose: string; // 군(君), 신(臣), 좌(佐), 사(使)
  efficacy: string;
  properties?: {
    nature: string; // 성질 (한/량/평/온/열)
    flavor: string; // 맛 (산/고/감/신/함)
    meridians: string[]; // 귀경
  };
  scientificInfo?: {
    activeCompounds?: string[];
    mechanism?: string;
    studies?: Array<{
      title: string;
      summary: string;
      pmid?: string;
    }>;
  };
}

// 약물 상호작용 인터페이스
export interface DrugInteraction {
  drugName: string;
  herbName: string;
  severity: 'critical' | 'warning' | 'info';
  mechanism: string;
  recommendation: string;
}

// 과학적 근거 인터페이스
export interface ScientificEvidence {
  overallEfficacy: string;
  evidenceLevel?: string; // A, B, C 등급
  keyStudies?: Array<{
    title: string;
    conclusion: string;
    sampleSize?: number;
    year?: number;
  }>;
}

export interface PrescriptionReportProps {
  // 기본 정보
  formulaName: string;
  clinicName: string;
  practitionerName?: string;
  startDate: string;
  endDate: string;
  duration: number;

  // 복용 정보
  dosageInstructions: string;
  patientExplanation?: string;

  // 처방 목적
  targetSymptoms?: string[];
  treatmentGoals?: string[];

  // 약재 정보
  herbs: HerbInfo[];

  // 안전성 정보
  drugInteractions?: DrugInteraction[];
  contraindications?: string[];
  sideEffects?: string[];

  // 과학적 근거
  scientificEvidence?: ScientificEvidence;

  // 기대 효과
  expectedEffects?: string[];
  expectedTimeline?: string;
}

type TabType = 'overview' | 'herbs' | 'science' | 'safety';

// 약재 역할에 따른 색상
const getPurposeColor = (purpose: string) => {
  if (purpose.includes('군') || purpose === '君') return '#EF4444'; // 빨강 - 주된 약
  if (purpose.includes('신') || purpose === '臣') return '#F59E0B'; // 주황 - 보조
  if (purpose.includes('좌') || purpose === '佐') return '#10B981'; // 초록 - 보좌
  if (purpose.includes('사') || purpose === '使') return '#6366F1'; // 보라 - 조화
  return '#6B7280'; // 기본
};

// 성질에 따른 색상
const getNatureColor = (nature: string) => {
  if (nature.includes('열') || nature.includes('熱')) return '#EF4444';
  if (nature.includes('온') || nature.includes('溫')) return '#F97316';
  if (nature.includes('평') || nature.includes('平')) return '#22C55E';
  if (nature.includes('량') || nature.includes('凉')) return '#0EA5E9';
  if (nature.includes('한') || nature.includes('寒')) return '#3B82F6';
  return '#6B7280';
};

export default function PrescriptionReport({
  formulaName,
  clinicName,
  practitionerName,
  startDate,
  endDate,
  duration,
  dosageInstructions,
  patientExplanation,
  targetSymptoms = [],
  treatmentGoals = [],
  herbs,
  drugInteractions = [],
  contraindications = [],
  sideEffects = [],
  scientificEvidence,
  expectedEffects = [],
  expectedTimeline,
}: PrescriptionReportProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedHerb, setSelectedHerb] = useState<HerbInfo | null>(null);

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'overview', label: '처방 개요', icon: 'document-text' },
    { key: 'herbs', label: '구성 약재', icon: 'leaf' },
    { key: 'science', label: '과학적 근거', icon: 'flask' },
    { key: 'safety', label: '안전성 정보', icon: 'shield-checkmark' },
  ];

  // 군신좌사 분류
  const classifyHerbs = () => {
    const groups: Record<string, HerbInfo[]> = {
      '군(君)': [],
      '신(臣)': [],
      '좌(佐)': [],
      '사(使)': [],
      '기타': [],
    };

    herbs.forEach(herb => {
      const purpose = herb.purpose;
      if (purpose.includes('군') || purpose === '君') {
        groups['군(君)'].push(herb);
      } else if (purpose.includes('신') || purpose === '臣') {
        groups['신(臣)'].push(herb);
      } else if (purpose.includes('좌') || purpose === '佐') {
        groups['좌(佐)'].push(herb);
      } else if (purpose.includes('사') || purpose === '使') {
        groups['사(使)'].push(herb);
      } else {
        groups['기타'].push(herb);
      }
    });

    return groups;
  };

  // 처방 구성도 (시각화)
  const renderFormulaComposition = () => {
    const herbGroups = classifyHerbs();
    const centerX = 150;
    const centerY = 150;

    const groupConfigs = [
      { key: '군(君)', radius: 0, color: '#EF4444', label: '군약', description: '주된 치료 효과' },
      { key: '신(臣)', radius: 50, color: '#F59E0B', label: '신약', description: '군약 보조' },
      { key: '좌(佐)', radius: 85, color: '#10B981', label: '좌약', description: '부작용 완화' },
      { key: '사(使)', radius: 115, color: '#6366F1', label: '사약', description: '약효 조화' },
    ];

    return (
      <View style={styles.compositionContainer}>
        <Svg width={300} height={300} viewBox="0 0 300 300">
          {/* 배경 원들 */}
          {groupConfigs.slice(1).map((config, idx) => (
            <Circle
              key={`bg-${idx}`}
              cx={centerX}
              cy={centerY}
              r={config.radius + 20}
              fill="none"
              stroke={config.color}
              strokeWidth={1}
              strokeDasharray="5,5"
              opacity={0.3}
            />
          ))}

          {/* 중앙 - 군약 */}
          {herbGroups['군(君)'].length > 0 && (
            <G>
              <Circle cx={centerX} cy={centerY} r={35} fill="#FEE2E2" />
              <Circle cx={centerX} cy={centerY} r={30} fill="#EF4444" opacity={0.8} />
              <SvgText
                x={centerX}
                y={centerY - 5}
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize={11}
                fontWeight="bold"
              >
                군약
              </SvgText>
              <SvgText
                x={centerX}
                y={centerY + 10}
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize={9}
              >
                {herbGroups['군(君)'].map(h => h.name).join(', ').substring(0, 8)}
              </SvgText>
            </G>
          )}

          {/* 신약 */}
          {herbGroups['신(臣)'].map((herb, idx) => {
            const angle = (idx / Math.max(herbGroups['신(臣)'].length, 1)) * 2 * Math.PI - Math.PI / 2;
            const x = centerX + Math.cos(angle) * 55;
            const y = centerY + Math.sin(angle) * 55;
            return (
              <G key={`sin-${idx}`}>
                <Circle cx={x} cy={y} r={20} fill="#FEF3C7" />
                <Circle cx={x} cy={y} r={16} fill="#F59E0B" opacity={0.8} />
                <SvgText
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize={8}
                  fontWeight="500"
                >
                  {herb.name.substring(0, 3)}
                </SvgText>
              </G>
            );
          })}

          {/* 좌약 */}
          {herbGroups['좌(佐)'].map((herb, idx) => {
            const angle = (idx / Math.max(herbGroups['좌(佐)'].length, 1)) * 2 * Math.PI - Math.PI / 2;
            const x = centerX + Math.cos(angle) * 90;
            const y = centerY + Math.sin(angle) * 90;
            return (
              <G key={`jwa-${idx}`}>
                <Circle cx={x} cy={y} r={16} fill="#D1FAE5" />
                <Circle cx={x} cy={y} r={12} fill="#10B981" opacity={0.8} />
                <SvgText
                  x={x}
                  y={y + 3}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize={7}
                >
                  {herb.name.substring(0, 2)}
                </SvgText>
              </G>
            );
          })}

          {/* 사약 */}
          {herbGroups['사(使)'].map((herb, idx) => {
            const angle = (idx / Math.max(herbGroups['사(使)'].length, 1)) * 2 * Math.PI - Math.PI / 2;
            const x = centerX + Math.cos(angle) * 120;
            const y = centerY + Math.sin(angle) * 120;
            return (
              <G key={`sa-${idx}`}>
                <Circle cx={x} cy={y} r={14} fill="#E0E7FF" />
                <Circle cx={x} cy={y} r={10} fill="#6366F1" opacity={0.8} />
                <SvgText
                  x={x}
                  y={y + 3}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize={6}
                >
                  {herb.name.substring(0, 2)}
                </SvgText>
              </G>
            );
          })}
        </Svg>

        {/* 범례 */}
        <View style={styles.compositionLegend}>
          {groupConfigs.map((config, idx) => {
            const count = herbGroups[config.key]?.length || 0;
            if (count === 0) return null;
            return (
              <View key={idx} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: config.color }]} />
                <Text style={styles.legendLabel}>{config.label}</Text>
                <Text style={styles.legendCount}>{count}종</Text>
                <Text style={styles.legendDesc}>{config.description}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* 처방 기본 정보 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="medical" size={20} color="#10B981" />
          <Text style={styles.cardTitle}>처방 정보</Text>
        </View>

        <View style={styles.formulaNameBox}>
          <Text style={styles.formulaNameLabel}>처방명</Text>
          <Text style={styles.formulaNameValue}>{formulaName}</Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.infoLabel}>복용 기간</Text>
            <Text style={styles.infoValue}>{duration}일</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="leaf-outline" size={16} color="#6B7280" />
            <Text style={styles.infoLabel}>약재 수</Text>
            <Text style={styles.infoValue}>{herbs.length}종</Text>
          </View>
        </View>

        <View style={styles.periodBox}>
          <Text style={styles.periodLabel}>복용 기간</Text>
          <Text style={styles.periodValue}>{startDate} ~ {endDate}</Text>
        </View>
      </View>

      {/* 복용 방법 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="time" size={20} color="#10B981" />
          <Text style={styles.cardTitle}>복용 방법</Text>
        </View>

        <View style={styles.dosageBox}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.dosageText}>{dosageInstructions}</Text>
        </View>
      </View>

      {/* 처방 설명 */}
      {patientExplanation && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.explainBadge}>
              <Ionicons name="chatbubble-ellipses" size={14} color="#FFFFFF" />
              <Text style={styles.explainBadgeText}>한의사 설명</Text>
            </View>
          </View>
          <Text style={styles.explanationText}>{patientExplanation}</Text>
        </View>
      )}

      {/* 치료 목표 */}
      {treatmentGoals.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="flag" size={20} color="#10B981" />
            <Text style={styles.cardTitle}>치료 목표</Text>
          </View>
          {treatmentGoals.map((goal, idx) => (
            <View key={idx} style={styles.goalItem}>
              <View style={styles.goalNumber}>
                <Text style={styles.goalNumberText}>{idx + 1}</Text>
              </View>
              <Text style={styles.goalText}>{goal}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 기대 효과 */}
      {expectedEffects.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="trending-up" size={20} color="#10B981" />
            <Text style={styles.cardTitle}>기대 효과</Text>
          </View>
          {expectedEffects.map((effect, idx) => (
            <View key={idx} style={styles.effectItem}>
              <Ionicons name="checkmark" size={16} color="#10B981" />
              <Text style={styles.effectText}>{effect}</Text>
            </View>
          ))}
          {expectedTimeline && (
            <View style={styles.timelineBox}>
              <Ionicons name="hourglass-outline" size={16} color="#6B7280" />
              <Text style={styles.timelineText}>{expectedTimeline}</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );

  const renderHerbsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* 처방 구성도 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="git-network" size={20} color="#10B981" />
          <Text style={styles.cardTitle}>처방 구성도</Text>
        </View>
        <Text style={styles.compositionDesc}>
          처방의 구조를 시각적으로 보여줍니다.{'\n'}
          중심부터 군신좌사(君臣佐使) 순서로 배치됩니다.
        </Text>
        {renderFormulaComposition()}
      </View>

      {/* 약재 목록 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="list" size={20} color="#10B981" />
          <Text style={styles.cardTitle}>구성 약재 ({herbs.length}종)</Text>
        </View>

        {herbs.map((herb, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.herbCard}
            onPress={() => setSelectedHerb(herb)}
          >
            <View style={styles.herbCardHeader}>
              <View style={styles.herbNameRow}>
                <View
                  style={[
                    styles.purposeIndicator,
                    { backgroundColor: getPurposeColor(herb.purpose) },
                  ]}
                />
                <Text style={styles.herbName}>{herb.name}</Text>
              </View>
              <View style={styles.herbMeta}>
                <Text style={styles.herbAmount}>{herb.amount}</Text>
                <View
                  style={[
                    styles.purposeBadge,
                    { backgroundColor: `${getPurposeColor(herb.purpose)}20` },
                  ]}
                >
                  <Text
                    style={[
                      styles.purposeText,
                      { color: getPurposeColor(herb.purpose) },
                    ]}
                  >
                    {herb.purpose}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.herbEfficacy} numberOfLines={2}>
              {herb.efficacy}
            </Text>

            {herb.properties && (
              <View style={styles.herbProperties}>
                <View
                  style={[
                    styles.propertyChip,
                    { backgroundColor: `${getNatureColor(herb.properties.nature)}15` },
                  ]}
                >
                  <Text
                    style={[
                      styles.propertyText,
                      { color: getNatureColor(herb.properties.nature) },
                    ]}
                  >
                    {herb.properties.nature}
                  </Text>
                </View>
                <View style={styles.propertyChip}>
                  <Text style={styles.propertyText}>{herb.properties.flavor}</Text>
                </View>
                {herb.properties.meridians.slice(0, 2).map((meridian, mIdx) => (
                  <View key={mIdx} style={[styles.propertyChip, styles.meridianChip]}>
                    <Text style={styles.meridianText}>{meridian}</Text>
                  </View>
                ))}
              </View>
            )}

            {herb.scientificInfo && (
              <View style={styles.scienceIndicator}>
                <Ionicons name="flask-outline" size={12} color="#10B981" />
                <Text style={styles.scienceIndicatorText}>과학적 근거 있음</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderScienceTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* 전체 과학적 근거 */}
      {scientificEvidence && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.scienceBadge}>
              <Ionicons name="flask" size={14} color="#FFFFFF" />
              <Text style={styles.scienceBadgeText}>과학적 근거</Text>
            </View>
            {scientificEvidence.evidenceLevel && (
              <View style={styles.evidenceLevelBadge}>
                <Text style={styles.evidenceLevelText}>
                  근거 수준 {scientificEvidence.evidenceLevel}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.evidenceOverview}>
            {scientificEvidence.overallEfficacy}
          </Text>

          {scientificEvidence.keyStudies && scientificEvidence.keyStudies.length > 0 && (
            <View style={styles.studiesSection}>
              <Text style={styles.studiesTitle}>주요 연구 결과</Text>
              {scientificEvidence.keyStudies.map((study, idx) => (
                <View key={idx} style={styles.studyCard}>
                  <View style={styles.studyHeader}>
                    <Ionicons name="document-text" size={14} color="#3B82F6" />
                    <Text style={styles.studyTitle}>{study.title}</Text>
                  </View>
                  <Text style={styles.studyConclusion}>{study.conclusion}</Text>
                  {(study.sampleSize || study.year) && (
                    <View style={styles.studyMeta}>
                      {study.sampleSize && (
                        <Text style={styles.studyMetaText}>
                          대상: {study.sampleSize}명
                        </Text>
                      )}
                      {study.year && (
                        <Text style={styles.studyMetaText}>{study.year}년</Text>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* 약재별 과학적 정보 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="analytics" size={20} color="#10B981" />
          <Text style={styles.cardTitle}>약재별 활성 성분</Text>
        </View>

        {herbs.filter(h => h.scientificInfo).map((herb, idx) => (
          <View key={idx} style={styles.herbScienceCard}>
            <Text style={styles.herbScienceName}>{herb.name}</Text>

            {herb.scientificInfo?.activeCompounds && (
              <View style={styles.compoundsSection}>
                <Text style={styles.compoundsLabel}>주요 활성 성분</Text>
                <View style={styles.compoundsList}>
                  {herb.scientificInfo.activeCompounds.map((compound, cIdx) => (
                    <View key={cIdx} style={styles.compoundChip}>
                      <Text style={styles.compoundText}>{compound}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {herb.scientificInfo?.mechanism && (
              <View style={styles.mechanismSection}>
                <Text style={styles.mechanismLabel}>작용 기전</Text>
                <Text style={styles.mechanismText}>{herb.scientificInfo.mechanism}</Text>
              </View>
            )}
          </View>
        ))}

        {herbs.filter(h => h.scientificInfo).length === 0 && (
          <View style={styles.noDataBox}>
            <Ionicons name="information-circle-outline" size={24} color="#9CA3AF" />
            <Text style={styles.noDataText}>
              아직 등록된 과학적 정보가 없습니다.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderSafetyTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* 약물 상호작용 */}
      {drugInteractions.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="warning" size={20} color="#F59E0B" />
            <Text style={styles.cardTitle}>약물 상호작용 주의</Text>
          </View>

          {drugInteractions.map((interaction, idx) => {
            const severityConfig = {
              critical: { bg: '#FEE2E2', text: '#991B1B', label: '위험' },
              warning: { bg: '#FEF3C7', text: '#92400E', label: '주의' },
              info: { bg: '#DBEAFE', text: '#1E40AF', label: '참고' },
            };
            const config = severityConfig[interaction.severity];

            return (
              <View
                key={idx}
                style={[styles.interactionCard, { backgroundColor: config.bg }]}
              >
                <View style={styles.interactionHeader}>
                  <View style={styles.interactionDrugs}>
                    <Text style={[styles.interactionDrug, { color: config.text }]}>
                      {interaction.herbName}
                    </Text>
                    <Ionicons name="close" size={14} color={config.text} />
                    <Text style={[styles.interactionDrug, { color: config.text }]}>
                      {interaction.drugName}
                    </Text>
                  </View>
                  <View style={[styles.severityBadge, { backgroundColor: config.text }]}>
                    <Text style={styles.severityBadgeText}>{config.label}</Text>
                  </View>
                </View>
                <Text style={[styles.interactionMechanism, { color: config.text }]}>
                  {interaction.mechanism}
                </Text>
                <View style={styles.interactionRecommendation}>
                  <Ionicons name="bulb" size={14} color={config.text} />
                  <Text style={[styles.recommendationText, { color: config.text }]}>
                    {interaction.recommendation}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* 금기사항 */}
      {contraindications.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="close-circle" size={20} color="#EF4444" />
            <Text style={styles.cardTitle}>복용 금기</Text>
          </View>

          {contraindications.map((item, idx) => (
            <View key={idx} style={styles.contraindicationItem}>
              <Ionicons name="ban" size={16} color="#EF4444" />
              <Text style={styles.contraindicationText}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 부작용 */}
      {sideEffects.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="alert-circle" size={20} color="#F59E0B" />
            <Text style={styles.cardTitle}>가능한 부작용</Text>
          </View>

          <Text style={styles.sideEffectInfo}>
            다음 증상이 나타나면 복용을 중단하고 한의원에 문의하세요.
          </Text>

          {sideEffects.map((effect, idx) => (
            <View key={idx} style={styles.sideEffectItem}>
              <View style={styles.sideEffectDot} />
              <Text style={styles.sideEffectText}>{effect}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 일반 주의사항 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <Text style={styles.cardTitle}>일반 복용 주의사항</Text>
        </View>

        <View style={styles.cautionList}>
          <View style={styles.cautionItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.cautionText}>정해진 시간에 규칙적으로 복용하세요</Text>
          </View>
          <View style={styles.cautionItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.cautionText}>식전 30분 또는 식후 30분에 복용하세요</Text>
          </View>
          <View style={styles.cautionItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.cautionText}>미지근한 물과 함께 복용하세요</Text>
          </View>
          <View style={styles.cautionItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.cautionText}>다른 약물과 함께 복용 시 한의사와 상담하세요</Text>
          </View>
          <View style={styles.cautionItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.cautionText}>이상 증상 발생 시 즉시 복용을 중단하세요</Text>
          </View>
        </View>
      </View>

      {/* 안전 확인 */}
      {drugInteractions.length === 0 && contraindications.length === 0 && (
        <View style={styles.safeCard}>
          <Ionicons name="shield-checkmark" size={48} color="#10B981" />
          <Text style={styles.safeTitle}>안전한 처방입니다</Text>
          <Text style={styles.safeDesc}>
            현재 등록된 약물 상호작용이나 금기사항이 없습니다.
          </Text>
        </View>
      )}
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
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'herbs' && renderHerbsTab()}
      {activeTab === 'science' && renderScienceTab()}
      {activeTab === 'safety' && renderSafetyTab()}

      {/* 약재 상세 모달 */}
      <Modal
        visible={!!selectedHerb}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedHerb(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedHerb && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <View
                      style={[
                        styles.modalPurposeIndicator,
                        { backgroundColor: getPurposeColor(selectedHerb.purpose) },
                      ]}
                    />
                    <Text style={styles.modalTitle}>{selectedHerb.name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedHerb(null)}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.modalSection}>
                    <View style={styles.modalMetaRow}>
                      <View style={styles.modalMetaItem}>
                        <Text style={styles.modalMetaLabel}>용량</Text>
                        <Text style={styles.modalMetaValue}>{selectedHerb.amount}</Text>
                      </View>
                      <View style={styles.modalMetaItem}>
                        <Text style={styles.modalMetaLabel}>역할</Text>
                        <Text style={styles.modalMetaValue}>{selectedHerb.purpose}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>효능</Text>
                    <Text style={styles.modalText}>{selectedHerb.efficacy}</Text>
                  </View>

                  {selectedHerb.properties && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>약성</Text>
                      <View style={styles.propertiesGrid}>
                        <View style={styles.propertyItem}>
                          <Text style={styles.propertyLabel}>성질</Text>
                          <View
                            style={[
                              styles.propertyValueBox,
                              { backgroundColor: `${getNatureColor(selectedHerb.properties.nature)}15` },
                            ]}
                          >
                            <Text
                              style={[
                                styles.propertyValue,
                                { color: getNatureColor(selectedHerb.properties.nature) },
                              ]}
                            >
                              {selectedHerb.properties.nature}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.propertyItem}>
                          <Text style={styles.propertyLabel}>맛</Text>
                          <View style={styles.propertyValueBox}>
                            <Text style={styles.propertyValue}>
                              {selectedHerb.properties.flavor}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.meridiansBox}>
                        <Text style={styles.meridiansLabel}>귀경</Text>
                        <View style={styles.meridiansList}>
                          {selectedHerb.properties.meridians.map((m, idx) => (
                            <View key={idx} style={styles.meridianItem}>
                              <Text style={styles.meridianItemText}>{m}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                  )}

                  {selectedHerb.scientificInfo && (
                    <>
                      {selectedHerb.scientificInfo.activeCompounds && (
                        <View style={styles.modalSection}>
                          <Text style={styles.modalSectionTitle}>주요 활성 성분</Text>
                          <View style={styles.compoundsList}>
                            {selectedHerb.scientificInfo.activeCompounds.map((c, idx) => (
                              <View key={idx} style={styles.compoundChip}>
                                <Text style={styles.compoundText}>{c}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {selectedHerb.scientificInfo.mechanism && (
                        <View style={styles.modalSection}>
                          <Text style={styles.modalSectionTitle}>작용 기전</Text>
                          <Text style={styles.modalText}>
                            {selectedHerb.scientificInfo.mechanism}
                          </Text>
                        </View>
                      )}

                      {selectedHerb.scientificInfo.studies && (
                        <View style={styles.modalSection}>
                          <Text style={styles.modalSectionTitle}>관련 연구</Text>
                          {selectedHerb.scientificInfo.studies.map((study, idx) => (
                            <View key={idx} style={styles.modalStudyCard}>
                              <Text style={styles.modalStudyTitle}>{study.title}</Text>
                              <Text style={styles.modalStudySummary}>{study.summary}</Text>
                              {study.pmid && (
                                <Text style={styles.modalStudyPmid}>
                                  PubMed ID: {study.pmid}
                                </Text>
                              )}
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  formulaNameBox: {
    marginBottom: 16,
  },
  formulaNameLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  formulaNameValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 'auto',
  },
  periodBox: {
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 8,
  },
  periodLabel: {
    fontSize: 12,
    color: '#065F46',
  },
  periodValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#047857',
    marginTop: 4,
  },
  dosageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
  },
  dosageText: {
    flex: 1,
    fontSize: 15,
    color: '#166534',
    lineHeight: 24,
  },
  explainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  explainBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  explanationText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  goalNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  goalText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  effectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  effectText: {
    fontSize: 14,
    color: '#374151',
  },
  timelineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  timelineText: {
    fontSize: 13,
    color: '#6B7280',
  },
  compositionContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  compositionDesc: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  compositionLegend: {
    width: '100%',
    marginTop: 16,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    width: 40,
  },
  legendCount: {
    fontSize: 12,
    color: '#6B7280',
    width: 30,
  },
  legendDesc: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  herbCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  herbCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  herbNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  purposeIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  herbName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  herbMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  herbAmount: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '500',
  },
  purposeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  purposeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  herbEfficacy: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  herbProperties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  propertyChip: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  propertyText: {
    fontSize: 11,
    color: '#374151',
  },
  meridianChip: {
    backgroundColor: '#DBEAFE',
  },
  meridianText: {
    fontSize: 11,
    color: '#1D4ED8',
  },
  scienceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scienceIndicatorText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
  },
  scienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  scienceBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  evidenceLevelBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  evidenceLevelText: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  evidenceOverview: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 16,
  },
  studiesSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  studiesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  studyCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  studyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  studyTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    lineHeight: 18,
  },
  studyConclusion: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  studyMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  studyMetaText: {
    fontSize: 11,
    color: '#6B7280',
  },
  herbScienceCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 12,
  },
  herbScienceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  compoundsSection: {
    marginBottom: 12,
  },
  compoundsLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  compoundsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  compoundChip: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  compoundText: {
    fontSize: 12,
    color: '#4338CA',
    fontWeight: '500',
  },
  mechanismSection: {
    marginTop: 8,
  },
  mechanismLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  mechanismText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  noDataBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  noDataText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  interactionCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  interactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  interactionDrugs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  interactionDrug: {
    fontSize: 14,
    fontWeight: '600',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  severityBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  interactionMechanism: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  interactionRecommendation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  contraindicationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  contraindicationText: {
    flex: 1,
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
  },
  sideEffectInfo: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  sideEffectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sideEffectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  sideEffectText: {
    fontSize: 14,
    color: '#374151',
  },
  cautionList: {
    gap: 10,
  },
  cautionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cautionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  safeCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#D1FAE5',
    borderRadius: 16,
    gap: 12,
  },
  safeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#047857',
  },
  safeDesc: {
    fontSize: 14,
    color: '#065F46',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalPurposeIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalMetaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  modalMetaItem: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  modalMetaLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  modalMetaValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  propertiesGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  propertyItem: {
    flex: 1,
  },
  propertyLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  propertyValueBox: {
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  propertyValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  meridiansBox: {
    marginTop: 4,
  },
  meridiansLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  meridiansList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  meridianItem: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  meridianItemText: {
    fontSize: 13,
    color: '#1D4ED8',
    fontWeight: '500',
  },
  modalStudyCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalStudyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 6,
  },
  modalStudySummary: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  modalStudyPmid: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 6,
  },
});
