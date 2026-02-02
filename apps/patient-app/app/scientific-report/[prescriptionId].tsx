import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getPrescriptionDetail } from '../../src/services/prescriptionService';
import {
  generateComprehensiveReport,
  calculateHealthScore,
  generateScientificRationale,
  generatePharmacologyReport,
  getSimilarPatientStatistics,
  ComprehensivePatientReport,
  HealthScoreResult,
  ScientificRationaleResult,
  PharmacologyReport as PharmacologyReportType,
  SimilarPatientStatistics,
} from '../../src/services/aiService';

// Import components
import HealthScoreDashboard from '../../src/components/HealthScoreDashboard';
import ScientificRationale from '../../src/components/ScientificRationale';
import PharmacologyDiagram from '../../src/components/PharmacologyDiagram';
import StatisticsChart from '../../src/components/StatisticsChart';
import EvidencePanel from '../../src/components/EvidencePanel';
import ComprehensiveReport from '../../src/components/ComprehensiveReport';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TabType = 'overview' | 'health' | 'rationale' | 'pharmacology' | 'statistics' | 'report';

export default function ScientificReportScreen() {
  const { prescriptionId } = useLocalSearchParams<{ prescriptionId: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch prescription data
  const {
    data: prescription,
    isLoading: isPrescriptionLoading,
    error: prescriptionError,
  } = useQuery({
    queryKey: ['prescription', prescriptionId],
    queryFn: () => getPrescriptionDetail(prescriptionId!),
    enabled: !!prescriptionId,
  });

  // Generate comprehensive report
  const {
    data: comprehensiveReport,
    isLoading: isReportLoading,
    refetch: refetchReport,
  } = useQuery({
    queryKey: ['comprehensiveReport', prescriptionId],
    queryFn: async () => {
      if (!prescription) return null;
      const herbs = prescription.herbs?.map((h: any) => ({
        name: h.name,
        amount: h.amount,
      })) || [];

      return generateComprehensiveReport({
        patientId: prescription.patientId || 'anonymous',
        prescriptionId: prescriptionId!,
        diagnosis: prescription.diagnosis || '',
        formulaName: prescription.formulaName || prescription.customFormulaName || '',
        herbs,
        symptoms: prescription.targetSymptoms || [],
        constitution: prescription.constitution,
      });
    },
    enabled: !!prescription,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Health Score
  const { data: healthScore, isLoading: isHealthLoading } = useQuery({
    queryKey: ['healthScore', prescriptionId],
    queryFn: async () => {
      if (!prescription) return null;
      return calculateHealthScore({
        patientId: prescription.patientId || 'anonymous',
        symptoms: prescription.targetSymptoms || [],
        diagnosis: prescription.diagnosis,
      });
    },
    enabled: !!prescription,
    staleTime: 1000 * 60 * 30,
  });

  // Scientific Rationale
  const { data: scientificRationale, isLoading: isRationaleLoading } = useQuery({
    queryKey: ['scientificRationale', prescriptionId],
    queryFn: async () => {
      if (!prescription) return null;
      const herbs = prescription.herbs?.map((h: any) => ({
        name: h.name,
        amount: h.amount,
      })) || [];

      return generateScientificRationale({
        patientId: prescription.patientId || 'anonymous',
        diagnosis: prescription.diagnosis || '',
        prescriptionId: prescriptionId!,
        formulaName: prescription.formulaName || prescription.customFormulaName || '',
        herbs,
        symptoms: prescription.targetSymptoms || [],
        constitution: prescription.constitution,
      });
    },
    enabled: !!prescription,
    staleTime: 1000 * 60 * 30,
  });

  // Pharmacology Report
  const { data: pharmacologyReport, isLoading: isPharmacologyLoading } = useQuery({
    queryKey: ['pharmacologyReport', prescriptionId],
    queryFn: async () => {
      if (!prescription) return null;
      const herbs = prescription.herbs?.map((h: any) => ({
        name: h.name,
        amount: h.amount,
      })) || [];

      return generatePharmacologyReport({
        formulaName: prescription.formulaName || prescription.customFormulaName || '',
        herbs,
        targetCondition: prescription.diagnosis,
      });
    },
    enabled: !!prescription,
    staleTime: 1000 * 60 * 30,
  });

  // Statistics
  const { data: statistics, isLoading: isStatisticsLoading } = useQuery({
    queryKey: ['statistics', prescriptionId],
    queryFn: async () => {
      if (!prescription) return null;
      return getSimilarPatientStatistics({
        symptoms: prescription.targetSymptoms || [],
        diagnosis: prescription.diagnosis,
        constitution: prescription.constitution,
      });
    },
    enabled: !!prescription,
    staleTime: 1000 * 60 * 30,
  });

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'overview', label: '요약', icon: 'home' },
    { key: 'health', label: '건강점수', icon: 'heart' },
    { key: 'rationale', label: '과학근거', icon: 'flask' },
    { key: 'pharmacology', label: '약리기전', icon: 'git-network' },
    { key: 'statistics', label: '통계', icon: 'stats-chart' },
    { key: 'report', label: '보고서', icon: 'document-text' },
  ];

  const isLoading = isPrescriptionLoading || isReportLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>과학적 분석 생성 중...</Text>
          <Text style={styles.loadingSubtext}>AI가 처방을 분석하고 있습니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (prescriptionError || !prescription) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>과학적 분석</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>분석을 불러올 수 없습니다</Text>
          <Text style={styles.errorDescription}>
            처방 정보를 찾을 수 없거나 네트워크 오류가 발생했습니다.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formulaName = prescription.formulaName || prescription.customFormulaName || '처방';

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Ionicons name="analytics" size={24} color="#10B981" />
          <Text style={styles.summaryTitle}>과학적 분석 요약</Text>
        </View>
        <Text style={styles.formulaName}>{formulaName}</Text>

        {comprehensiveReport && (
          <>
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {comprehensiveReport.healthScore?.scores?.overallHealth || '-'}
                </Text>
                <Text style={styles.statLabel}>건강지수</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {comprehensiveReport.statistics?.successRate
                    ? `${comprehensiveReport.statistics.successRate}%`
                    : '-'}
                </Text>
                <Text style={styles.statLabel}>치료성공률</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {comprehensiveReport.scientificEvidence?.overallEvidenceLevel || '-'}
                </Text>
                <Text style={styles.statLabel}>근거수준</Text>
              </View>
            </View>

            {comprehensiveReport.prognosis && (
              <View style={styles.prognosisBox}>
                <Ionicons name="trending-up" size={18} color="#10B981" />
                <Text style={styles.prognosisText}>
                  {comprehensiveReport.prognosis.expectedOutcome}
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Quick Access Cards */}
      <Text style={styles.sectionTitle}>상세 분석</Text>
      <View style={styles.quickAccessGrid}>
        <TouchableOpacity
          style={styles.quickAccessCard}
          onPress={() => setActiveTab('health')}
        >
          <View style={[styles.quickAccessIcon, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="heart" size={24} color="#EF4444" />
          </View>
          <Text style={styles.quickAccessTitle}>건강 점수</Text>
          <Text style={styles.quickAccessDesc}>체열, 근실도, 장부기능</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAccessCard}
          onPress={() => setActiveTab('rationale')}
        >
          <View style={[styles.quickAccessIcon, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="flask" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.quickAccessTitle}>과학적 근거</Text>
          <Text style={styles.quickAccessDesc}>전통의학 + 현대의학</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAccessCard}
          onPress={() => setActiveTab('pharmacology')}
        >
          <View style={[styles.quickAccessIcon, { backgroundColor: '#E0E7FF' }]}>
            <Ionicons name="git-network" size={24} color="#6366F1" />
          </View>
          <Text style={styles.quickAccessTitle}>약리 기전</Text>
          <Text style={styles.quickAccessDesc}>분자 타겟, 신호경로</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAccessCard}
          onPress={() => setActiveTab('statistics')}
        >
          <View style={[styles.quickAccessIcon, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="stats-chart" size={24} color="#10B981" />
          </View>
          <Text style={styles.quickAccessTitle}>치료 통계</Text>
          <Text style={styles.quickAccessDesc}>유사환자 성공률</Text>
        </TouchableOpacity>
      </View>

      {/* Evidence Summary */}
      {scientificRationale?.research?.studies && scientificRationale.research.studies.length > 0 && (
        <View style={styles.evidencePreview}>
          <View style={styles.evidencePreviewHeader}>
            <Ionicons name="library" size={20} color="#3B82F6" />
            <Text style={styles.evidencePreviewTitle}>관련 연구</Text>
            <TouchableOpacity onPress={() => setActiveTab('rationale')}>
              <Text style={styles.seeAllText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          {scientificRationale.research.studies.slice(0, 2).map((study, idx) => (
            <View key={idx} style={styles.studyPreviewCard}>
              <View style={styles.evidenceBadge}>
                <Text style={styles.evidenceBadgeText}>
                  {study.evidenceLevel}등급
                </Text>
              </View>
              <Text style={styles.studyPreviewTitle} numberOfLines={2}>
                {study.title}
              </Text>
              <Text style={styles.studyPreviewMeta}>
                {study.journal} ({study.year})
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer} />
    </ScrollView>
  );

  const renderHealthTab = () => {
    // Transform API response to HealthScoreDashboard props
    const transformedHealthScore = healthScore ? {
      evaluatedAt: healthScore.calculatedAt,
      bodyHeatScore: healthScore.scores?.bodyHeat || 0,
      bodyHeatInterpretation: {
        traditional: healthScore.scores?.bodyHeat > 0 ? '열성 체질' : healthScore.scores?.bodyHeat < 0 ? '한성 체질' : '평성 체질',
        modern: healthScore.scores?.bodyHeat > 0 ? '대사 항진 경향' : healthScore.scores?.bodyHeat < 0 ? '대사 저하 경향' : '대사 균형',
        relatedSymptoms: [],
        recommendations: healthScore.interpretation?.recommendations || [],
      },
      bodyStrengthScore: healthScore.scores?.bodyStrength || 0,
      bodyStrengthInterpretation: {
        traditional: healthScore.scores?.bodyStrength > 0 ? '실증' : healthScore.scores?.bodyStrength < 0 ? '허증' : '중간',
        modern: healthScore.scores?.bodyStrength > 0 ? '기능 항진' : healthScore.scores?.bodyStrength < 0 ? '기능 저하' : '기능 균형',
        relatedSymptoms: [],
        recommendations: [],
      },
      circulationScore: healthScore.scores?.energyCirculation || 50,
      circulationInterpretation: healthScore.scores?.energyCirculation >= 70 ? '양호한 순환' : healthScore.scores?.energyCirculation >= 40 ? '보통' : '순환 개선 필요',
      organFunctionScores: {
        spleen: healthScore.scores?.organScores?.find((o: any) => o.name === 'spleen')?.score || 50,
        lung: healthScore.scores?.organScores?.find((o: any) => o.name === 'lung')?.score || 50,
        kidney: healthScore.scores?.organScores?.find((o: any) => o.name === 'kidney')?.score || 50,
        liver: healthScore.scores?.organScores?.find((o: any) => o.name === 'liver')?.score || 50,
        heart: healthScore.scores?.organScores?.find((o: any) => o.name === 'heart')?.score || 50,
      },
      organInterpretations: {
        spleen: healthScore.scores?.organScores?.find((o: any) => o.name === 'spleen')?.description || '',
        lung: healthScore.scores?.organScores?.find((o: any) => o.name === 'lung')?.description || '',
        kidney: healthScore.scores?.organScores?.find((o: any) => o.name === 'kidney')?.description || '',
        liver: healthScore.scores?.organScores?.find((o: any) => o.name === 'liver')?.description || '',
        heart: healthScore.scores?.organScores?.find((o: any) => o.name === 'heart')?.description || '',
      },
      overallHealthIndex: healthScore.scores?.overallHealth || 50,
      overallInterpretation: healthScore.interpretation?.primaryPattern || '',
      confidenceLevel: healthScore.confidence || 0.5,
      trend: healthScore.previousScore ? {
        changeFromLast: (healthScore.scores?.overallHealth || 0) - healthScore.previousScore.overallHealth,
        direction: ((healthScore.scores?.overallHealth || 0) > healthScore.previousScore.overallHealth ? 'improving' :
                   (healthScore.scores?.overallHealth || 0) < healthScore.previousScore.overallHealth ? 'declining' : 'stable') as 'improving' | 'stable' | 'declining',
        interpretation: '',
      } : undefined,
    } : null;

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {isHealthLoading ? (
          <View style={styles.tabLoadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.tabLoadingText}>건강 점수 계산 중...</Text>
          </View>
        ) : transformedHealthScore ? (
          <HealthScoreDashboard
            evaluatedAt={transformedHealthScore.evaluatedAt}
            bodyHeatScore={transformedHealthScore.bodyHeatScore}
            bodyHeatInterpretation={transformedHealthScore.bodyHeatInterpretation}
            bodyStrengthScore={transformedHealthScore.bodyStrengthScore}
            bodyStrengthInterpretation={transformedHealthScore.bodyStrengthInterpretation}
            circulationScore={transformedHealthScore.circulationScore}
            circulationInterpretation={transformedHealthScore.circulationInterpretation}
            organFunctionScores={transformedHealthScore.organFunctionScores}
            organInterpretations={transformedHealthScore.organInterpretations}
            overallHealthIndex={transformedHealthScore.overallHealthIndex}
            overallInterpretation={transformedHealthScore.overallInterpretation}
            confidenceLevel={transformedHealthScore.confidenceLevel}
            trend={transformedHealthScore.trend}
          />
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="heart-outline" size={48} color="#9CA3AF" />
            <Text style={styles.noDataText}>건강 점수 데이터가 없습니다</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderRationaleTab = () => {
    // Transform API response to ScientificRationale component props
    const transformedRationale = scientificRationale ? {
      formulaName: formulaName,
      summary: {
        oneLiner: scientificRationale.patientFriendlySummary || '',
        patientFriendlyExplanation: scientificRationale.patientFriendlySummary || '',
        keyPoints: [
          scientificRationale.traditional?.treatmentPrinciple,
          scientificRationale.modern?.clinicalMechanism,
        ].filter(Boolean) as string[],
      },
      traditionalEvidence: scientificRationale.traditional ? {
        treatmentMethods: [{
          name: scientificRationale.traditional.treatmentPrinciple,
          description: scientificRationale.traditional.pathogenesis,
          rationale: scientificRationale.traditional.formulaExplanation,
        }],
        pathogenesis: [{
          name: '병기',
          description: scientificRationale.traditional.pathogenesis,
        }],
        classicalSources: [],
        formulaStructure: scientificRationale.traditional.herbRoles ? {
          sovereign: scientificRationale.traditional.herbRoles
            .filter((h: any) => h.role?.includes('군') || h.role === '君')
            .map((h: any) => ({ herb: h.herb, role: h.explanation })),
          minister: scientificRationale.traditional.herbRoles
            .filter((h: any) => h.role?.includes('신') || h.role === '臣')
            .map((h: any) => ({ herb: h.herb, role: h.explanation })),
          assistant: scientificRationale.traditional.herbRoles
            .filter((h: any) => h.role?.includes('좌') || h.role === '佐')
            .map((h: any) => ({ herb: h.herb, role: h.explanation })),
          courier: scientificRationale.traditional.herbRoles
            .filter((h: any) => h.role?.includes('사') || h.role === '使')
            .map((h: any) => ({ herb: h.herb, role: h.explanation })),
          synergy: scientificRationale.traditional.constitutionMatch || '',
        } : undefined,
      } : undefined,
      modernEvidence: scientificRationale.modern ? {
        molecularTargets: scientificRationale.modern.molecularTargets?.map((target: string, idx: number) => ({
          name: target,
          type: 'protein',
          activeCompound: '',
          herb: '',
          action: 'modulation',
          effect: scientificRationale.modern?.pharmacologicalEffects?.[idx] || '',
        })) || [],
        signalingPathways: scientificRationale.modern.signalingPathways?.map((pathway: string) => ({
          name: pathway,
          compounds: [],
          mechanism: scientificRationale.modern?.clinicalMechanism || '',
          clinicalRelevance: '',
        })) || [],
        pharmacologicalActions: scientificRationale.modern.pharmacologicalEffects?.map((effect: string) => ({
          type: 'general',
          nameKo: effect,
          description: effect,
          relatedHerbs: [],
        })) || [],
        activeCompounds: [],
      } : undefined,
      statisticalEvidence: scientificRationale.research ? {
        clinicalStudies: scientificRationale.research.studies?.map((study: any) => ({
          title: study.title,
          authors: study.authors ? [study.authors] : [],
          year: study.year,
          journal: study.journal,
          pmid: study.pmid,
          studyType: 'clinical',
          sampleSize: undefined,
          mainFindings: study.summary,
          conclusion: study.summary,
        })) || [],
        overallEvidenceLevel: scientificRationale.research.overallEvidenceLevel,
        evidenceLevelExplanation: `근거 수준 ${scientificRationale.research.overallEvidenceLevel} 등급`,
      } : undefined,
    } : null;

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {isRationaleLoading ? (
          <View style={styles.tabLoadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.tabLoadingText}>과학적 근거 분석 중...</Text>
          </View>
        ) : transformedRationale ? (
          <>
            <ScientificRationale
              formulaName={transformedRationale.formulaName}
              summary={transformedRationale.summary}
              traditionalEvidence={transformedRationale.traditionalEvidence}
              modernEvidence={transformedRationale.modernEvidence}
              statisticalEvidence={transformedRationale.statisticalEvidence}
            />
            {scientificRationale?.research?.studies && scientificRationale.research.studies.length > 0 && (
              <EvidencePanel
                clinicalStudies={scientificRationale.research.studies.map((study: any) => ({
                  title: study.title,
                  authors: study.authors ? [study.authors] : undefined,
                  year: study.year,
                  journal: study.journal,
                  pmid: study.pmid,
                  studyType: 'other' as const,
                  mainFindings: study.summary,
                  conclusion: study.summary,
                  evidenceLevel: study.evidenceLevel,
                }))}
                evidenceSummary={{
                  totalStudies: scientificRationale.research.studies.length,
                  rctCount: 0,
                  metaAnalysisCount: scientificRationale.research.metaAnalyses?.length || 0,
                  overallEvidenceLevel: scientificRationale.research.overallEvidenceLevel,
                  keyFindings: scientificRationale.research.studies.slice(0, 3).map((s: any) => s.summary),
                }}
                showEvidenceLevelGuide={true}
              />
            )}
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="flask-outline" size={48} color="#9CA3AF" />
            <Text style={styles.noDataText}>과학적 근거 데이터가 없습니다</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderPharmacologyTab = () => {
    // Transform API response to PharmacologyDiagram props
    const transformedPharmacology = pharmacologyReport ? {
      title: `${pharmacologyReport.formulaName} 약리 기전`,
      formulaName: pharmacologyReport.formulaName,
      herbs: pharmacologyReport.herbs?.map((herb: any) => ({
        name: herb.herbName,
        activeCompounds: herb.compounds?.map((c: any) => ({
          name: c.name,
          nameKo: c.koreanName,
          herb: herb.herbName,
          targets: c.targets?.map((t: any) => ({
            name: t.name,
            type: t.type || 'other',
            action: 'modulation' as const,
            activeCompound: c.name,
            herb: herb.herbName,
            effect: t.effect,
          })) || [],
          mainEffects: herb.primaryActions || [],
          evidenceLevel: 'B' as const,
        })) || [],
        effectSummary: herb.primaryActions?.join(', ') || '',
        mechanismSummary: herb.synergies?.join(', ') || '',
      })) || [],
      mechanismFlowchart: pharmacologyReport.flowchart || { nodes: [], edges: [] },
      patientSummary: {
        oneLiner: pharmacologyReport.summary || '',
        howItWorks: pharmacologyReport.summary || '',
        keyPoints: pharmacologyReport.clinicalImplications || [],
        precautions: [],
      },
      overallEvidenceLevel: 'B' as const,
    } : null;

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {isPharmacologyLoading ? (
          <View style={styles.tabLoadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.tabLoadingText}>약리 기전 분석 중...</Text>
          </View>
        ) : transformedPharmacology ? (
          <PharmacologyDiagram
            title={transformedPharmacology.title}
            formulaName={transformedPharmacology.formulaName}
            herbs={transformedPharmacology.herbs}
            mechanismFlowchart={transformedPharmacology.mechanismFlowchart}
            patientSummary={transformedPharmacology.patientSummary}
            overallEvidenceLevel={transformedPharmacology.overallEvidenceLevel}
          />
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="git-network-outline" size={48} color="#9CA3AF" />
            <Text style={styles.noDataText}>약리 기전 데이터가 없습니다</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderStatisticsTab = () => {
    // Transform API response to StatisticsChart props
    const transformedStatistics = statistics ? {
      successGauge: {
        successRate: statistics.overallSuccessRate || 0,
        totalCases: statistics.totalCases || 0,
        confidenceLevel: (statistics.confidenceLevel > 0.7 ? 'high' :
                         statistics.confidenceLevel > 0.4 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      },
      outcomeDistribution: statistics.outcomeDistribution ? {
        cured: statistics.outcomeDistribution.significantImprovement || 0,
        markedlyImproved: statistics.outcomeDistribution.moderateImprovement || 0,
        improved: statistics.outcomeDistribution.slightImprovement || 0,
        noChange: statistics.outcomeDistribution.noChange || 0,
        worsened: statistics.outcomeDistribution.worsened || 0,
      } : undefined,
    } : null;

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {isStatisticsLoading ? (
          <View style={styles.tabLoadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.tabLoadingText}>통계 데이터 분석 중...</Text>
          </View>
        ) : transformedStatistics ? (
          <>
            <StatisticsChart
              successGauge={transformedStatistics.successGauge}
              outcomeDistribution={transformedStatistics.outcomeDistribution}
              showLegend={true}
            />
            {/* Additional statistics info */}
            {statistics && (
              <View style={styles.additionalStats}>
                <View style={styles.statsCard}>
                  <Text style={styles.statsCardTitle}>치료 통계 요약</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statsItem}>
                      <Text style={styles.statsValue}>{statistics.totalCases}명</Text>
                      <Text style={styles.statsLabel}>유사 환자</Text>
                    </View>
                    <View style={styles.statsItem}>
                      <Text style={styles.statsValue}>{statistics.averageTreatmentDuration}주</Text>
                      <Text style={styles.statsLabel}>평균 치료 기간</Text>
                    </View>
                    <View style={styles.statsItem}>
                      <Text style={[styles.statsValue, { color: '#10B981' }]}>
                        {statistics.overallSuccessRate}%
                      </Text>
                      <Text style={styles.statsLabel}>성공률</Text>
                    </View>
                  </View>
                </View>
                {statistics.topFormulas && statistics.topFormulas.length > 0 && (
                  <View style={styles.statsCard}>
                    <Text style={styles.statsCardTitle}>관련 처방 비교</Text>
                    {statistics.topFormulas.slice(0, 3).map((formula: any, idx: number) => (
                      <View key={idx} style={styles.formulaRow}>
                        <Text style={styles.formulaName}>{formula.formulaName}</Text>
                        <Text style={styles.formulaRate}>{formula.successRate}%</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="stats-chart-outline" size={48} color="#9CA3AF" />
            <Text style={styles.noDataText}>통계 데이터가 없습니다</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderReportTab = () => {
    // Transform API response to ComprehensiveReport component props
    const transformedReport = comprehensiveReport ? {
      reportId: comprehensiveReport.id || prescriptionId || 'report-1',
      reportType: 'consultation' as const,
      title: `${formulaName} 과학적 분석 보고서`,
      generatedAt: new Date(comprehensiveReport.generatedAt),
      patientInfo: {
        name: comprehensiveReport.patient?.name,
        age: comprehensiveReport.patient?.age,
        gender: comprehensiveReport.patient?.gender,
      },
      consultationInfo: {
        date: comprehensiveReport.generatedAt,
        chiefComplaint: prescription?.diagnosis || '',
        symptoms: prescription?.targetSymptoms || [],
        diagnosis: prescription?.diagnosis,
      },
      healthScore: comprehensiveReport.healthScore ? {
        bodyHeatScore: comprehensiveReport.healthScore.scores?.bodyHeat || 0,
        bodyHeatInterpretation: {
          level: comprehensiveReport.healthScore.scores?.bodyHeat > 0 ? '열' : comprehensiveReport.healthScore.scores?.bodyHeat < 0 ? '한' : '평',
          traditional: comprehensiveReport.healthScore.interpretation?.constitution || '',
          modern: '',
        },
        bodyStrengthScore: comprehensiveReport.healthScore.scores?.bodyStrength || 0,
        bodyStrengthInterpretation: {
          level: comprehensiveReport.healthScore.scores?.bodyStrength > 0 ? '실' : comprehensiveReport.healthScore.scores?.bodyStrength < 0 ? '허' : '중',
          traditional: '',
          modern: '',
        },
        circulationScore: comprehensiveReport.healthScore.scores?.energyCirculation || 50,
        organFunctionScores: {
          spleen: comprehensiveReport.healthScore.scores?.organScores?.find((o: any) => o.name === 'spleen')?.score || 50,
          lung: comprehensiveReport.healthScore.scores?.organScores?.find((o: any) => o.name === 'lung')?.score || 50,
          kidney: comprehensiveReport.healthScore.scores?.organScores?.find((o: any) => o.name === 'kidney')?.score || 50,
          liver: comprehensiveReport.healthScore.scores?.organScores?.find((o: any) => o.name === 'liver')?.score || 50,
          heart: comprehensiveReport.healthScore.scores?.organScores?.find((o: any) => o.name === 'heart')?.score || 50,
        },
        overallHealthIndex: comprehensiveReport.healthScore.scores?.overallHealth || 50,
        overallInterpretation: comprehensiveReport.healthScore.interpretation?.primaryPattern || '',
      } : {
        bodyHeatScore: 0,
        bodyHeatInterpretation: { level: '평', traditional: '', modern: '' },
        bodyStrengthScore: 0,
        bodyStrengthInterpretation: { level: '중', traditional: '', modern: '' },
        circulationScore: 50,
        organFunctionScores: { spleen: 50, lung: 50, kidney: 50, liver: 50, heart: 50 },
        overallHealthIndex: 50,
        overallInterpretation: '',
      },
      prescription: {
        formulaName: comprehensiveReport.prescription?.formulaName || formulaName,
        herbs: comprehensiveReport.prescription?.herbs?.map((h: any) => ({
          name: h.name,
          amount: h.amount,
          role: h.role,
        })) || [],
        purpose: prescription?.diagnosis || '',
        treatmentMethod: {
          name: '',
          description: '',
        },
        dosageInstructions: comprehensiveReport.prescription?.dosageInstructions || '',
        precautions: [],
      },
      scientificEvidence: {
        traditionalEvidence: {
          sources: [],
          summary: comprehensiveReport.scientificEvidence?.traditionRationale || '',
        },
        modernEvidence: {
          keyMechanisms: [],
          activeCompounds: [],
          summary: comprehensiveReport.scientificEvidence?.modernRationale || '',
        },
        statisticalEvidence: {
          similarCases: comprehensiveReport.statistics?.similarCases || 0,
          successRate: comprehensiveReport.statistics?.successRate || 0,
          outcomeDistribution: comprehensiveReport.statistics?.outcomeDistribution ? {
            cured: comprehensiveReport.statistics.outcomeDistribution.significantImprovement || 0,
            markedlyImproved: comprehensiveReport.statistics.outcomeDistribution.moderateImprovement || 0,
            improved: comprehensiveReport.statistics.outcomeDistribution.slightImprovement || 0,
            noChange: comprehensiveReport.statistics.outcomeDistribution.noChange || 0,
            worsened: comprehensiveReport.statistics.outcomeDistribution.worsened || 0,
          } : { cured: 0, markedlyImproved: 0, improved: 0, noChange: 0, worsened: 0 },
          averageDuration: `${comprehensiveReport.statistics?.averageDuration || 0}주`,
        },
        overallEvidenceLevel: (comprehensiveReport.scientificEvidence?.overallEvidenceLevel || 'C') as 'A' | 'B' | 'C' | 'D',
        keyStudies: comprehensiveReport.scientificEvidence?.keyStudies?.map((s: any) => ({
          title: s.title,
          year: 2023,
          finding: s.conclusion,
        })) || [],
      },
      prognosis: {
        expectedOutcome: comprehensiveReport.prognosis?.expectedOutcome || '',
        expectedDuration: comprehensiveReport.prognosis?.expectedDuration || '',
        confidence: 0.7,
        positiveFactors: [],
        cautionFactors: [],
        recommendations: comprehensiveReport.healthScore?.interpretation?.recommendations || [],
      },
      lifestyle: comprehensiveReport.lifestyle ? {
        diet: {
          recommended: comprehensiveReport.lifestyle.dietary || [],
          avoid: comprehensiveReport.lifestyle.avoidance || [],
          tips: [],
        },
        exercise: {
          recommended: comprehensiveReport.lifestyle.exercise || [],
          avoid: [],
          tips: [],
        },
        lifestyle: {
          recommended: comprehensiveReport.lifestyle.sleep || [],
          avoid: [],
        },
      } : undefined,
      executiveSummary: {
        oneLiner: comprehensiveReport.prognosis?.expectedOutcome || '',
        keyPoints: [
          comprehensiveReport.scientificEvidence?.traditionRationale,
          comprehensiveReport.scientificEvidence?.modernRationale,
        ].filter(Boolean) as string[],
        actionItems: comprehensiveReport.healthScore?.interpretation?.recommendations || [],
      },
      metadata: {
        version: '1.0',
        generatedBy: '온고지신 AI',
        confidenceLevel: comprehensiveReport.healthScore?.confidence || 0.7,
        dataSources: ['치험례 데이터베이스', 'PubMed', '한의학 고전'],
      },
    } : null;

    return (
      <View style={styles.tabContent}>
        {isReportLoading ? (
          <View style={styles.tabLoadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.tabLoadingText}>종합 보고서 생성 중...</Text>
          </View>
        ) : transformedReport ? (
          <ComprehensiveReport report={transformedReport} />
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
            <Text style={styles.noDataText}>보고서 데이터가 없습니다</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>과학적 분석</Text>
          <Text style={styles.headerSubtitle}>{formulaName}</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => refetchReport()}
        >
          <Ionicons name="refresh" size={22} color="#10B981" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScrollContainer}
        contentContainerStyle={styles.tabBar}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
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
      </ScrollView>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'health' && renderHealthTab()}
      {activeTab === 'rationale' && renderRationaleTab()}
      {activeTab === 'pharmacology' && renderPharmacologyTab()}
      {activeTab === 'statistics' && renderStatisticsTab()}
      {activeTab === 'report' && renderReportTab()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  errorDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  headerRight: {
    width: 32,
  },
  refreshButton: {
    padding: 4,
  },
  tabScrollContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    maxHeight: 56,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 6,
    marginHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#10B981',
  },
  tabLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#10B981',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  tabLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  tabLoadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  noDataText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  formulaName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  prognosisBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#D1FAE5',
    padding: 14,
    borderRadius: 10,
  },
  prognosisText: {
    flex: 1,
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  quickAccessCard: {
    width: (SCREEN_WIDTH - 40) / 2,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  quickAccessIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickAccessTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  quickAccessDesc: {
    fontSize: 12,
    color: '#6B7280',
  },
  evidencePreview: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  evidencePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  evidencePreviewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  seeAllText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
  studyPreviewCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  evidenceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  evidenceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  studyPreviewTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    lineHeight: 18,
    marginBottom: 4,
  },
  studyPreviewMeta: {
    fontSize: 11,
    color: '#6B7280',
  },
  footer: {
    height: 32,
  },
  additionalStats: {
    padding: 16,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statsCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statsItem: {
    alignItems: 'center',
  },
  statsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statsLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  formulaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  formulaName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  formulaRate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10B981',
  },
});
