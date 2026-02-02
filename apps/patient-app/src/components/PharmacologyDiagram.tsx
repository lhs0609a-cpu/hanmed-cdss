import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Svg, { Line, Circle, Rect, G, Defs, Marker, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============ 타입 정의 ============

interface FlowchartNode {
  id: string;
  type: 'herb' | 'compound' | 'target' | 'pathway' | 'effect';
  label: string;
  labelKo?: string;
  description?: string;
  color?: string;
}

interface FlowchartEdge {
  source: string;
  target: string;
  label?: string;
  type?: 'activation' | 'inhibition' | 'modulation';
}

interface MechanismFlowchart {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
}

interface MolecularTarget {
  name: string;
  type: 'enzyme' | 'receptor' | 'channel' | 'transporter' | 'transcription_factor' | 'other';
  action: 'activation' | 'inhibition' | 'modulation';
  activeCompound: string;
  herb: string;
  potency?: string;
  effect: string;
  evidenceLevel?: 'A' | 'B' | 'C' | 'D';
}

interface CompoundPharmacology {
  name: string;
  nameKo?: string;
  herb: string;
  chemicalClass?: string;
  targets: MolecularTarget[];
  mainEffects: string[];
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
}

interface HerbPharmacology {
  name: string;
  nameEn?: string;
  activeCompounds: CompoundPharmacology[];
  effectSummary: string;
  mechanismSummary: string;
}

interface PatientSummary {
  oneLiner: string;
  howItWorks: string;
  keyPoints: string[];
  precautions: string[];
}

export interface PharmacologyDiagramProps {
  title: string;
  formulaName?: string;
  herbs: HerbPharmacology[];
  mechanismFlowchart: MechanismFlowchart;
  patientSummary: PatientSummary;
  overallEvidenceLevel: 'A' | 'B' | 'C' | 'D';
  onCompoundPress?: (compound: CompoundPharmacology) => void;
  onTargetPress?: (target: MolecularTarget) => void;
}

// ============ 상수 ============

const COLORS = {
  herb: '#4CAF50',
  compound: '#2196F3',
  target: '#FF9800',
  pathway: '#9C27B0',
  effect: '#E91E63',
  background: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  activation: '#4CAF50',
  inhibition: '#F44336',
  modulation: '#FF9800',
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  enzyme: '효소',
  receptor: '수용체',
  channel: '이온채널',
  transporter: '수송체',
  transcription_factor: '전사인자',
  other: '기타',
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  activation: '활성화',
  inhibition: '억제',
  modulation: '조절',
};

const EVIDENCE_LEVEL_COLORS: Record<string, string> = {
  A: '#4CAF50',
  B: '#2196F3',
  C: '#FF9800',
  D: '#9E9E9E',
};

const EVIDENCE_LEVEL_LABELS: Record<string, string> = {
  A: '강한 근거',
  B: '중등도 근거',
  C: '약한 근거',
  D: '매우 약한 근거',
};

// ============ 서브 컴포넌트 ============

const TabButton: React.FC<{
  label: string;
  isActive: boolean;
  onPress: () => void;
  icon: string;
}> = ({ label, isActive, onPress, icon }) => (
  <TouchableOpacity
    style={[styles.tabButton, isActive && styles.tabButtonActive]}
    onPress={onPress}
  >
    <Ionicons
      name={icon as any}
      size={18}
      color={isActive ? COLORS.compound : COLORS.textSecondary}
    />
    <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const EvidenceBadge: React.FC<{ level: 'A' | 'B' | 'C' | 'D' }> = ({ level }) => (
  <View style={[styles.evidenceBadge, { backgroundColor: EVIDENCE_LEVEL_COLORS[level] }]}>
    <Text style={styles.evidenceBadgeText}>
      {level} ({EVIDENCE_LEVEL_LABELS[level]})
    </Text>
  </View>
);

const ActionBadge: React.FC<{ action: 'activation' | 'inhibition' | 'modulation' }> = ({ action }) => {
  const color = action === 'activation' ? COLORS.activation :
                action === 'inhibition' ? COLORS.inhibition : COLORS.modulation;
  const icon = action === 'activation' ? 'arrow-up' :
               action === 'inhibition' ? 'arrow-down' : 'swap-horizontal';

  return (
    <View style={[styles.actionBadge, { backgroundColor: color + '20', borderColor: color }]}>
      <Ionicons name={icon as any} size={12} color={color} />
      <Text style={[styles.actionBadgeText, { color }]}>{ACTION_TYPE_LABELS[action]}</Text>
    </View>
  );
};

// ============ 플로우차트 컴포넌트 ============

const FlowchartView: React.FC<{
  flowchart: MechanismFlowchart;
  onNodePress?: (node: FlowchartNode) => void;
}> = ({ flowchart, onNodePress }) => {
  // 노드 위치 계산
  const layout = useMemo(() => {
    const nodesByType: Record<string, FlowchartNode[]> = {
      herb: [],
      compound: [],
      target: [],
      pathway: [],
      effect: [],
    };

    flowchart.nodes.forEach(node => {
      if (nodesByType[node.type]) {
        nodesByType[node.type].push(node);
      }
    });

    const columnWidth = (SCREEN_WIDTH - 60) / 5;
    const nodePositions: Record<string, { x: number; y: number }> = {};

    const typeOrder = ['herb', 'compound', 'target', 'pathway', 'effect'];
    typeOrder.forEach((type, colIndex) => {
      const nodes = nodesByType[type] || [];
      nodes.forEach((node, rowIndex) => {
        nodePositions[node.id] = {
          x: 30 + colIndex * columnWidth + columnWidth / 2,
          y: 60 + rowIndex * 70,
        };
      });
    });

    const maxRows = Math.max(...typeOrder.map(t => (nodesByType[t]?.length || 0)));
    const height = Math.max(200, maxRows * 70 + 100);

    return { nodePositions, height };
  }, [flowchart.nodes]);

  const nodeRadius = 25;

  return (
    <View style={styles.flowchartContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={SCREEN_WIDTH - 40} height={layout.height}>
          <Defs>
            <Marker
              id="arrowhead"
              markerWidth={10}
              markerHeight={7}
              refX={9}
              refY={3.5}
              orient="auto"
            >
              <Path d="M0,0 L0,7 L10,3.5 z" fill={COLORS.textSecondary} />
            </Marker>
            <Marker
              id="arrowhead-green"
              markerWidth={10}
              markerHeight={7}
              refX={9}
              refY={3.5}
              orient="auto"
            >
              <Path d="M0,0 L0,7 L10,3.5 z" fill={COLORS.activation} />
            </Marker>
            <Marker
              id="arrowhead-red"
              markerWidth={10}
              markerHeight={7}
              refX={9}
              refY={3.5}
              orient="auto"
            >
              <Path d="M0,0 L0,7 L10,3.5 z" fill={COLORS.inhibition} />
            </Marker>
          </Defs>

          {/* 레이블 헤더 */}
          {['약재', '성분', '타겟', '경로', '효과'].map((label, index) => (
            <G key={`header-${index}`}>
              <Rect
                x={10 + index * ((SCREEN_WIDTH - 60) / 5)}
                y={10}
                width={(SCREEN_WIDTH - 60) / 5 - 5}
                height={25}
                rx={4}
                fill={[COLORS.herb, COLORS.compound, COLORS.target, COLORS.pathway, COLORS.effect][index] + '30'}
              />
              <Text
                x={10 + index * ((SCREEN_WIDTH - 60) / 5) + ((SCREEN_WIDTH - 60) / 5 - 5) / 2}
                y={27}
                textAnchor="middle"
                fontSize={11}
                fontWeight="600"
                fill={COLORS.text}
              >
                {label}
              </Text>
            </G>
          ))}

          {/* 엣지 */}
          {flowchart.edges.map((edge, index) => {
            const sourcePos = layout.nodePositions[edge.source];
            const targetPos = layout.nodePositions[edge.target];
            if (!sourcePos || !targetPos) return null;

            const edgeColor = edge.type === 'activation' ? COLORS.activation :
                             edge.type === 'inhibition' ? COLORS.inhibition :
                             COLORS.textSecondary;
            const markerId = edge.type === 'activation' ? 'arrowhead-green' :
                            edge.type === 'inhibition' ? 'arrowhead-red' :
                            'arrowhead';

            return (
              <Line
                key={`edge-${index}`}
                x1={sourcePos.x + nodeRadius}
                y1={sourcePos.y}
                x2={targetPos.x - nodeRadius - 5}
                y2={targetPos.y}
                stroke={edgeColor}
                strokeWidth={2}
                markerEnd={`url(#${markerId})`}
                strokeDasharray={edge.type === 'inhibition' ? '5,3' : undefined}
              />
            );
          })}

          {/* 노드 */}
          {flowchart.nodes.map((node) => {
            const pos = layout.nodePositions[node.id];
            if (!pos) return null;

            const nodeColor = node.color || {
              herb: COLORS.herb,
              compound: COLORS.compound,
              target: COLORS.target,
              pathway: COLORS.pathway,
              effect: COLORS.effect,
            }[node.type];

            return (
              <G key={node.id}>
                <Circle
                  cx={pos.x}
                  cy={pos.y}
                  r={nodeRadius}
                  fill={nodeColor}
                  opacity={0.9}
                  onPress={() => onNodePress?.(node)}
                />
                <Text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight="500"
                  fill="#FFFFFF"
                  numberOfLines={2}
                >
                  {node.labelKo || node.label}
                </Text>
              </G>
            );
          })}
        </Svg>
      </ScrollView>

      {/* 범례 */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: COLORS.activation }]} />
          <Text style={styles.legendText}>활성화</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLineDashed, { borderColor: COLORS.inhibition }]} />
          <Text style={styles.legendText}>억제</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: COLORS.modulation }]} />
          <Text style={styles.legendText}>조절</Text>
        </View>
      </View>
    </View>
  );
};

// ============ 요약 탭 ============

const SummaryTab: React.FC<{
  patientSummary: PatientSummary;
  herbs: HerbPharmacology[];
  overallEvidenceLevel: 'A' | 'B' | 'C' | 'D';
}> = ({ patientSummary, herbs, overallEvidenceLevel }) => (
  <ScrollView style={styles.tabContent}>
    {/* 핵심 요약 */}
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Ionicons name="flash" size={24} color={COLORS.compound} />
        <Text style={styles.summaryTitle}>작용 기전 요약</Text>
      </View>
      <Text style={styles.summaryOneLiner}>{patientSummary.oneLiner}</Text>
      <Text style={styles.summaryExplanation}>{patientSummary.howItWorks}</Text>
    </View>

    {/* 근거 수준 */}
    <View style={styles.evidenceCard}>
      <Text style={styles.sectionTitle}>전체 근거 수준</Text>
      <EvidenceBadge level={overallEvidenceLevel} />
    </View>

    {/* 핵심 포인트 */}
    {patientSummary.keyPoints.length > 0 && (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>핵심 포인트</Text>
        {patientSummary.keyPoints.map((point, index) => (
          <View key={index} style={styles.keyPointItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.activation} />
            <Text style={styles.keyPointText}>{point}</Text>
          </View>
        ))}
      </View>
    )}

    {/* 주요 약재 요약 */}
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>약재별 기전</Text>
      {herbs.slice(0, 4).map((herb, index) => (
        <View key={index} style={styles.herbSummaryItem}>
          <View style={styles.herbSummaryHeader}>
            <View style={[styles.herbDot, { backgroundColor: COLORS.herb }]} />
            <Text style={styles.herbName}>{herb.name}</Text>
            {herb.nameEn && <Text style={styles.herbNameEn}>({herb.nameEn})</Text>}
          </View>
          <Text style={styles.herbMechanism} numberOfLines={2}>
            {herb.mechanismSummary}
          </Text>
        </View>
      ))}
    </View>

    {/* 주의사항 */}
    {patientSummary.precautions.length > 0 && (
      <View style={[styles.card, styles.warningCard]}>
        <View style={styles.warningHeader}>
          <Ionicons name="warning" size={20} color="#F57C00" />
          <Text style={styles.warningTitle}>주의사항</Text>
        </View>
        {patientSummary.precautions.map((precaution, index) => (
          <Text key={index} style={styles.precautionText}>
            {precaution}
          </Text>
        ))}
      </View>
    )}
  </ScrollView>
);

// ============ 플로우차트 탭 ============

const FlowchartTab: React.FC<{
  flowchart: MechanismFlowchart;
  onNodePress?: (node: FlowchartNode) => void;
}> = ({ flowchart, onNodePress }) => (
  <ScrollView style={styles.tabContent}>
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>약리 기전 플로우차트</Text>
      <Text style={styles.flowchartDescription}>
        약재에서 성분이 추출되어 분자 타겟에 작용하고, 신호 경로를 거쳐 최종 효과를 나타내는 과정입니다.
      </Text>
      <FlowchartView flowchart={flowchart} onNodePress={onNodePress} />
    </View>

    <View style={styles.card}>
      <Text style={styles.sectionTitle}>노드 설명</Text>
      <View style={styles.nodeExplanation}>
        <View style={styles.nodeExplanationItem}>
          <View style={[styles.nodeIcon, { backgroundColor: COLORS.herb }]} />
          <View style={styles.nodeExplanationText}>
            <Text style={styles.nodeExplanationTitle}>약재 (Herb)</Text>
            <Text style={styles.nodeExplanationDesc}>천연 약재 원료</Text>
          </View>
        </View>
        <View style={styles.nodeExplanationItem}>
          <View style={[styles.nodeIcon, { backgroundColor: COLORS.compound }]} />
          <View style={styles.nodeExplanationText}>
            <Text style={styles.nodeExplanationTitle}>활성 성분 (Compound)</Text>
            <Text style={styles.nodeExplanationDesc}>약리 작용을 나타내는 화학 물질</Text>
          </View>
        </View>
        <View style={styles.nodeExplanationItem}>
          <View style={[styles.nodeIcon, { backgroundColor: COLORS.target }]} />
          <View style={styles.nodeExplanationText}>
            <Text style={styles.nodeExplanationTitle}>분자 타겟 (Target)</Text>
            <Text style={styles.nodeExplanationDesc}>성분이 작용하는 효소/수용체</Text>
          </View>
        </View>
        <View style={styles.nodeExplanationItem}>
          <View style={[styles.nodeIcon, { backgroundColor: COLORS.pathway }]} />
          <View style={styles.nodeExplanationText}>
            <Text style={styles.nodeExplanationTitle}>신호 경로 (Pathway)</Text>
            <Text style={styles.nodeExplanationDesc}>세포 내 신호 전달 경로</Text>
          </View>
        </View>
        <View style={styles.nodeExplanationItem}>
          <View style={[styles.nodeIcon, { backgroundColor: COLORS.effect }]} />
          <View style={styles.nodeExplanationText}>
            <Text style={styles.nodeExplanationTitle}>효과 (Effect)</Text>
            <Text style={styles.nodeExplanationDesc}>최종 치료 효과</Text>
          </View>
        </View>
      </View>
    </View>
  </ScrollView>
);

// ============ 성분 상세 탭 ============

const CompoundsTab: React.FC<{
  herbs: HerbPharmacology[];
  onCompoundPress?: (compound: CompoundPharmacology) => void;
}> = ({ herbs, onCompoundPress }) => (
  <ScrollView style={styles.tabContent}>
    {herbs.map((herb, herbIndex) => (
      <View key={herbIndex} style={styles.card}>
        <View style={styles.herbHeader}>
          <View style={[styles.herbDot, { backgroundColor: COLORS.herb }]} />
          <Text style={styles.herbNameLarge}>{herb.name}</Text>
          {herb.nameEn && <Text style={styles.herbNameEnSmall}>({herb.nameEn})</Text>}
        </View>

        <Text style={styles.herbEffect}>{herb.effectSummary}</Text>

        {herb.activeCompounds.map((compound, compoundIndex) => (
          <TouchableOpacity
            key={compoundIndex}
            style={styles.compoundCard}
            onPress={() => onCompoundPress?.(compound)}
          >
            <View style={styles.compoundHeader}>
              <View style={[styles.compoundDot, { backgroundColor: COLORS.compound }]} />
              <View style={styles.compoundNameContainer}>
                <Text style={styles.compoundName}>{compound.name}</Text>
                {compound.nameKo && (
                  <Text style={styles.compoundNameKo}>{compound.nameKo}</Text>
                )}
              </View>
              <EvidenceBadge level={compound.evidenceLevel} />
            </View>

            {compound.chemicalClass && (
              <Text style={styles.chemicalClass}>
                화학적 분류: {compound.chemicalClass}
              </Text>
            )}

            <Text style={styles.effectsLabel}>주요 효과:</Text>
            <View style={styles.effectsContainer}>
              {compound.mainEffects.map((effect, index) => (
                <View key={index} style={styles.effectTag}>
                  <Text style={styles.effectTagText}>{effect}</Text>
                </View>
              ))}
            </View>

            {compound.targets.length > 0 && (
              <>
                <Text style={styles.targetsLabel}>분자 타겟:</Text>
                {compound.targets.slice(0, 3).map((target, index) => (
                  <View key={index} style={styles.targetItem}>
                    <View style={styles.targetInfo}>
                      <Text style={styles.targetName}>{target.name}</Text>
                      <Text style={styles.targetType}>
                        ({TARGET_TYPE_LABELS[target.type]})
                      </Text>
                    </View>
                    <ActionBadge action={target.action} />
                  </View>
                ))}
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>
    ))}
  </ScrollView>
);

// ============ 메인 컴포넌트 ============

const PharmacologyDiagram: React.FC<PharmacologyDiagramProps> = ({
  title,
  formulaName,
  herbs,
  mechanismFlowchart,
  patientSummary,
  overallEvidenceLevel,
  onCompoundPress,
  onTargetPress,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'flowchart' | 'compounds'>('summary');

  const handleNodePress = (node: FlowchartNode) => {
    // 노드 클릭 시 상세 정보 표시 로직
    console.log('Node pressed:', node);
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {formulaName && <Text style={styles.formulaName}>{formulaName}</Text>}
      </View>

      {/* 탭 네비게이션 */}
      <View style={styles.tabContainer}>
        <TabButton
          label="요약"
          icon="document-text-outline"
          isActive={activeTab === 'summary'}
          onPress={() => setActiveTab('summary')}
        />
        <TabButton
          label="플로우차트"
          icon="git-network-outline"
          isActive={activeTab === 'flowchart'}
          onPress={() => setActiveTab('flowchart')}
        />
        <TabButton
          label="성분 상세"
          icon="flask-outline"
          isActive={activeTab === 'compounds'}
          onPress={() => setActiveTab('compounds')}
        />
      </View>

      {/* 탭 콘텐츠 */}
      {activeTab === 'summary' && (
        <SummaryTab
          patientSummary={patientSummary}
          herbs={herbs}
          overallEvidenceLevel={overallEvidenceLevel}
        />
      )}
      {activeTab === 'flowchart' && (
        <FlowchartTab
          flowchart={mechanismFlowchart}
          onNodePress={handleNodePress}
        />
      )}
      {activeTab === 'compounds' && (
        <CompoundsTab
          herbs={herbs}
          onCompoundPress={onCompoundPress}
        />
      )}
    </View>
  );
};

// ============ 스타일 ============

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  formulaName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  tabButtonActive: {
    backgroundColor: COLORS.compound + '15',
  },
  tabButtonText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  tabButtonTextActive: {
    color: COLORS.compound,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: COLORS.compound + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.compound,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 8,
  },
  summaryOneLiner: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  summaryExplanation: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  evidenceCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  evidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  evidenceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  keyPointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  keyPointText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 10,
    flex: 1,
  },
  herbSummaryItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  herbSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  herbDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  herbName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  herbNameEn: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  herbMechanism: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 16,
  },
  warningCard: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#F57C00',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E65100',
    marginLeft: 8,
  },
  precautionText: {
    fontSize: 14,
    color: '#795548',
    paddingVertical: 4,
    paddingLeft: 28,
  },
  flowchartContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  flowchartDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendLine: {
    width: 20,
    height: 3,
    borderRadius: 2,
    marginRight: 6,
  },
  legendLineDashed: {
    width: 20,
    height: 0,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  nodeExplanation: {
    marginTop: 8,
  },
  nodeExplanationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  nodeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  nodeExplanationText: {
    flex: 1,
  },
  nodeExplanationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  nodeExplanationDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  herbHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  herbNameLarge: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  herbNameEnSmall: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  herbEffect: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  compoundCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  compoundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  compoundDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  compoundNameContainer: {
    flex: 1,
  },
  compoundName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  compoundNameKo: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  chemicalClass: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  effectsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 6,
  },
  effectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  effectTag: {
    backgroundColor: COLORS.compound + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  effectTagText: {
    fontSize: 11,
    color: COLORS.compound,
    fontWeight: '500',
  },
  targetsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 6,
  },
  targetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  targetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  targetType: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default PharmacologyDiagram;
