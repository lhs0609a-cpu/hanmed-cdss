import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============ 타입 정의 ============

interface HealthScoreSection {
  bodyHeatScore: number;
  bodyHeatInterpretation: {
    level: string;
    traditional: string;
    modern: string;
  };
  bodyStrengthScore: number;
  bodyStrengthInterpretation: {
    level: string;
    traditional: string;
    modern: string;
  };
  circulationScore: number;
  organFunctionScores: {
    spleen: number;
    lung: number;
    kidney: number;
    liver: number;
    heart: number;
  };
  overallHealthIndex: number;
  overallInterpretation: string;
  trend?: {
    changeFromLast: number;
    direction: 'improving' | 'stable' | 'declining';
    interpretation: string;
  };
}

interface PrescriptionSection {
  formulaName: string;
  formulaHanja?: string;
  herbs: {
    name: string;
    amount?: string;
    role?: string;
    effect?: string;
  }[];
  purpose: string;
  treatmentMethod: {
    name: string;
    hanja?: string;
    description: string;
  };
  dosageInstructions: string;
  precautions: string[];
}

interface ScientificEvidenceSection {
  traditionalEvidence: {
    sources: string[];
    summary: string;
  };
  modernEvidence: {
    keyMechanisms: string[];
    activeCompounds: {
      name: string;
      herb: string;
      effect: string;
    }[];
    summary: string;
  };
  statisticalEvidence: {
    similarCases: number;
    successRate: number;
    outcomeDistribution: {
      cured: number;
      markedlyImproved: number;
      improved: number;
      noChange: number;
      worsened: number;
    };
    averageDuration: string;
  };
  overallEvidenceLevel: 'A' | 'B' | 'C' | 'D';
  keyStudies: {
    title: string;
    year: number;
    pmid?: string;
    finding: string;
  }[];
}

interface PrognosisSection {
  expectedOutcome: string;
  expectedDuration: string;
  confidence: number;
  positiveFactors: string[];
  cautionFactors: string[];
  recommendations: string[];
  followUp?: {
    recommended: boolean;
    timing?: string;
    reason?: string;
  };
}

interface LifestyleSection {
  diet: {
    recommended: string[];
    avoid: string[];
    tips: string[];
  };
  exercise: {
    recommended: string[];
    avoid: string[];
    tips: string[];
  };
  lifestyle: {
    recommended: string[];
    avoid: string[];
  };
  seasonalAdvice?: string;
}

interface ExecutiveSummary {
  oneLiner: string;
  keyPoints: string[];
  actionItems: string[];
}

export interface ComprehensiveReportData {
  reportId: string;
  reportType: 'consultation' | 'followup' | 'summary';
  title: string;
  generatedAt: Date;
  patientInfo: {
    name?: string;
    age?: number;
    gender?: string;
    constitution?: string;
  };
  consultationInfo: {
    date: string;
    chiefComplaint: string;
    symptoms: string[];
    diagnosis?: string;
    patternDiagnosis?: string;
  };
  healthScore: HealthScoreSection;
  prescription: PrescriptionSection;
  scientificEvidence: ScientificEvidenceSection;
  prognosis: PrognosisSection;
  lifestyle?: LifestyleSection;
  executiveSummary: ExecutiveSummary;
  metadata: {
    version: string;
    generatedBy: string;
    confidenceLevel: number;
    dataSources: string[];
  };
}

export interface ComprehensiveReportProps {
  report: ComprehensiveReportData;
  htmlContent?: string;
  clinicName?: string;
  onShare?: () => void;
  onDownloadPdf?: () => void;
}

// ============ 상수 ============

const COLORS = {
  primary: '#2196F3',
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#F44336',
  neutral: '#9E9E9E',
  background: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
};

const EVIDENCE_COLORS: Record<string, string> = {
  A: '#4CAF50',
  B: '#2196F3',
  C: '#FF9800',
  D: '#9E9E9E',
};

const ORGAN_LABELS: Record<string, string> = {
  spleen: '비위',
  lung: '폐',
  kidney: '신',
  liver: '간',
  heart: '심',
};

// ============ 서브 컴포넌트 ============

const SectionHeader: React.FC<{ title: string; icon: string; color?: string }> = ({
  title,
  icon,
  color = COLORS.primary,
}) => (
  <View style={styles.sectionHeader}>
    <Ionicons name={icon as any} size={22} color={color} />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const ScoreGauge: React.FC<{ value: number; max: number; label: string; color?: string }> = ({
  value,
  max,
  label,
  color = COLORS.primary,
}) => {
  const percentage = Math.min(100, (value / max) * 100);

  return (
    <View style={styles.scoreGauge}>
      <View style={styles.scoreGaugeBar}>
        <View style={[styles.scoreGaugeFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
      <View style={styles.scoreGaugeInfo}>
        <Text style={styles.scoreGaugeValue}>{value}</Text>
        <Text style={styles.scoreGaugeLabel}>{label}</Text>
      </View>
    </View>
  );
};

const SpectrumBar: React.FC<{
  value: number;
  min: number;
  max: number;
  labels: [string, string, string];
}> = ({ value, min, max, labels }) => {
  const normalizedValue = ((value - min) / (max - min)) * 100;

  return (
    <View style={styles.spectrumContainer}>
      <View style={styles.spectrumBar}>
        <View style={styles.spectrumGradient}>
          <View style={[styles.spectrumMarker, { left: `${normalizedValue}%` }]} />
        </View>
      </View>
      <View style={styles.spectrumLabels}>
        <Text style={styles.spectrumLabel}>{labels[0]}</Text>
        <Text style={styles.spectrumLabel}>{labels[1]}</Text>
        <Text style={styles.spectrumLabel}>{labels[2]}</Text>
      </View>
    </View>
  );
};

const OutcomeBar: React.FC<{
  distribution: ScientificEvidenceSection['statisticalEvidence']['outcomeDistribution'];
}> = ({ distribution }) => {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const segments = [
    { key: 'cured', label: '완치', color: '#4CAF50', value: distribution.cured },
    { key: 'markedlyImproved', label: '현저호전', color: '#8BC34A', value: distribution.markedlyImproved },
    { key: 'improved', label: '호전', color: '#03A9F4', value: distribution.improved },
    { key: 'noChange', label: '불변', color: '#FF9800', value: distribution.noChange },
    { key: 'worsened', label: '악화', color: '#F44336', value: distribution.worsened },
  ];

  return (
    <View style={styles.outcomeBarContainer}>
      <View style={styles.outcomeBar}>
        {segments.map(seg => {
          const width = (seg.value / total) * 100;
          if (width < 1) return null;
          return (
            <View
              key={seg.key}
              style={[styles.outcomeBarSegment, { width: `${width}%`, backgroundColor: seg.color }]}
            />
          );
        })}
      </View>
      <View style={styles.outcomeLegend}>
        {segments.filter(s => s.value > 0).map(seg => (
          <View key={seg.key} style={styles.outcomeLegendItem}>
            <View style={[styles.outcomeLegendColor, { backgroundColor: seg.color }]} />
            <Text style={styles.outcomeLegendText}>{seg.label} {Math.round((seg.value / total) * 100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ============ 섹션 컴포넌트 ============

const SummarySection: React.FC<{ summary: ExecutiveSummary; patientName?: string }> = ({
  summary,
  patientName,
}) => (
  <View style={styles.summarySection}>
    <View style={styles.summaryHeader}>
      <Ionicons name="document-text" size={24} color="#FFFFFF" />
      <Text style={styles.summaryTitle}>진료 요약</Text>
    </View>
    <Text style={styles.summaryOneLiner}>{summary.oneLiner}</Text>
    <View style={styles.summaryKeyPoints}>
      {summary.keyPoints.map((point, index) => (
        <View key={index} style={styles.summaryKeyPoint}>
          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
          <Text style={styles.summaryKeyPointText}>{point}</Text>
        </View>
      ))}
    </View>
  </View>
);

const HealthScoreSection: React.FC<{ healthScore: HealthScoreSection }> = ({ healthScore }) => (
  <View style={styles.section}>
    <SectionHeader title="건강 점수" icon="fitness-outline" />

    {/* 종합 건강지수 */}
    <View style={styles.overallScoreCard}>
      <Text style={styles.overallScoreValue}>{healthScore.overallHealthIndex}</Text>
      <Text style={styles.overallScoreLabel}>종합 건강지수</Text>
      <Text style={styles.overallScoreInterpretation}>{healthScore.overallInterpretation}</Text>
    </View>

    {/* 체열/근실도 */}
    <View style={styles.spectrumSection}>
      <Text style={styles.spectrumTitle}>체열 (寒熱): {healthScore.bodyHeatInterpretation.level}</Text>
      <SpectrumBar value={healthScore.bodyHeatScore} min={-10} max={10} labels={['한(寒)', '평(平)', '열(熱)']} />
      <Text style={styles.spectrumDescription}>{healthScore.bodyHeatInterpretation.modern}</Text>
    </View>

    <View style={styles.spectrumSection}>
      <Text style={styles.spectrumTitle}>근실도 (虛實): {healthScore.bodyStrengthInterpretation.level}</Text>
      <SpectrumBar value={healthScore.bodyStrengthScore} min={-10} max={10} labels={['허(虛)', '평(平)', '실(實)']} />
      <Text style={styles.spectrumDescription}>{healthScore.bodyStrengthInterpretation.modern}</Text>
    </View>

    {/* 장부 기능 */}
    <View style={styles.organScoresContainer}>
      <Text style={styles.organScoresTitle}>장부 기능 점수</Text>
      {Object.entries(healthScore.organFunctionScores).map(([organ, score]) => (
        <ScoreGauge
          key={organ}
          value={score}
          max={100}
          label={ORGAN_LABELS[organ] || organ}
          color={score >= 70 ? COLORS.success : score >= 50 ? COLORS.warning : COLORS.danger}
        />
      ))}
    </View>

    {healthScore.trend && (
      <View style={styles.trendCard}>
        <Ionicons
          name={healthScore.trend.direction === 'improving' ? 'trending-up' : healthScore.trend.direction === 'declining' ? 'trending-down' : 'remove'}
          size={24}
          color={healthScore.trend.direction === 'improving' ? COLORS.success : healthScore.trend.direction === 'declining' ? COLORS.danger : COLORS.neutral}
        />
        <Text style={styles.trendText}>{healthScore.trend.interpretation}</Text>
      </View>
    )}
  </View>
);

const PrescriptionSection: React.FC<{ prescription: PrescriptionSection }> = ({ prescription }) => (
  <View style={styles.section}>
    <SectionHeader title="처방 정보" icon="medical-outline" color={COLORS.success} />

    <View style={styles.formulaHeader}>
      <Text style={styles.formulaName}>{prescription.formulaName}</Text>
      {prescription.formulaHanja && (
        <Text style={styles.formulaHanja}>({prescription.formulaHanja})</Text>
      )}
    </View>

    <Text style={styles.formulaPurpose}>{prescription.purpose}</Text>

    <View style={styles.treatmentMethod}>
      <Text style={styles.treatmentMethodTitle}>치법: {prescription.treatmentMethod.name}</Text>
      <Text style={styles.treatmentMethodDesc}>{prescription.treatmentMethod.description}</Text>
    </View>

    <Text style={styles.herbsTitle}>구성 약재</Text>
    <View style={styles.herbsList}>
      {prescription.herbs.map((herb, index) => (
        <View key={index} style={styles.herbItem}>
          <View style={styles.herbInfo}>
            <Text style={styles.herbName}>{herb.name}</Text>
            {herb.role && <Text style={styles.herbRole}>({herb.role})</Text>}
          </View>
          <Text style={styles.herbAmount}>{herb.amount}</Text>
        </View>
      ))}
    </View>

    <View style={styles.dosageCard}>
      <Ionicons name="time-outline" size={18} color={COLORS.primary} />
      <Text style={styles.dosageText}>{prescription.dosageInstructions}</Text>
    </View>

    {prescription.precautions.length > 0 && (
      <View style={styles.precautionsCard}>
        <Text style={styles.precautionsTitle}>주의사항</Text>
        {prescription.precautions.map((precaution, index) => (
          <View key={index} style={styles.precautionItem}>
            <Ionicons name="alert-circle-outline" size={14} color={COLORS.warning} />
            <Text style={styles.precautionText}>{precaution}</Text>
          </View>
        ))}
      </View>
    )}
  </View>
);

const EvidenceSection: React.FC<{ evidence: ScientificEvidenceSection }> = ({ evidence }) => (
  <View style={styles.section}>
    <SectionHeader title="과학적 근거" icon="flask-outline" color="#9C27B0" />

    <View style={styles.evidenceLevelCard}>
      <View style={[styles.evidenceBadge, { backgroundColor: EVIDENCE_COLORS[evidence.overallEvidenceLevel] }]}>
        <Text style={styles.evidenceBadgeText}>{evidence.overallEvidenceLevel}등급</Text>
      </View>
      <Text style={styles.evidenceLevelDesc}>
        {evidence.overallEvidenceLevel === 'A' ? '강한 근거 (RCT/메타분석)' :
         evidence.overallEvidenceLevel === 'B' ? '중등도 근거 (임상 연구)' :
         evidence.overallEvidenceLevel === 'C' ? '약한 근거 (관찰 연구)' : '제한적 근거 (전임상 연구)'}
      </Text>
    </View>

    {/* 통계적 근거 */}
    <View style={styles.statisticsCard}>
      <Text style={styles.statisticsTitle}>유사 환자 치료 통계</Text>
      <View style={styles.statisticsRow}>
        <View style={styles.statisticItem}>
          <Text style={styles.statisticValue}>{evidence.statisticalEvidence.similarCases}</Text>
          <Text style={styles.statisticLabel}>유사 케이스</Text>
        </View>
        <View style={styles.statisticItem}>
          <Text style={[styles.statisticValue, { color: COLORS.success }]}>
            {evidence.statisticalEvidence.successRate}%
          </Text>
          <Text style={styles.statisticLabel}>성공률</Text>
        </View>
        <View style={styles.statisticItem}>
          <Text style={styles.statisticValue}>{evidence.statisticalEvidence.averageDuration}</Text>
          <Text style={styles.statisticLabel}>평균 기간</Text>
        </View>
      </View>
      <OutcomeBar distribution={evidence.statisticalEvidence.outcomeDistribution} />
    </View>

    {/* 현대 약리학 */}
    <View style={styles.modernEvidenceCard}>
      <Text style={styles.modernEvidenceTitle}>현대 약리학적 근거</Text>
      <Text style={styles.modernEvidenceText}>{evidence.modernEvidence.summary}</Text>
      {evidence.modernEvidence.activeCompounds.length > 0 && (
        <View style={styles.compoundsContainer}>
          {evidence.modernEvidence.activeCompounds.slice(0, 3).map((compound, index) => (
            <View key={index} style={styles.compoundItem}>
              <Text style={styles.compoundName}>{compound.name}</Text>
              <Text style={styles.compoundHerb}>({compound.herb})</Text>
              <Text style={styles.compoundEffect}>{compound.effect}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  </View>
);

const PrognosisSection: React.FC<{ prognosis: PrognosisSection }> = ({ prognosis }) => (
  <View style={styles.section}>
    <SectionHeader title="예후 및 권고" icon="trending-up-outline" color={COLORS.warning} />

    <View style={styles.prognosisCard}>
      <View style={styles.prognosisHeader}>
        <Text style={styles.prognosisOutcome}>{prognosis.expectedOutcome}</Text>
        <Text style={styles.prognosisDuration}>예상 기간: {prognosis.expectedDuration}</Text>
      </View>

      {prognosis.positiveFactors.length > 0 && (
        <View style={styles.factorsContainer}>
          <Text style={styles.factorsTitle}>긍정적 요인</Text>
          {prognosis.positiveFactors.map((factor, index) => (
            <View key={index} style={styles.factorItem}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.factorText}>{factor}</Text>
            </View>
          ))}
        </View>
      )}

      {prognosis.cautionFactors.length > 0 && (
        <View style={styles.factorsContainer}>
          <Text style={[styles.factorsTitle, { color: COLORS.warning }]}>주의 요인</Text>
          {prognosis.cautionFactors.map((factor, index) => (
            <View key={index} style={styles.factorItem}>
              <Ionicons name="alert-circle" size={16} color={COLORS.warning} />
              <Text style={styles.factorText}>{factor}</Text>
            </View>
          ))}
        </View>
      )}
    </View>

    <View style={styles.recommendationsCard}>
      <Text style={styles.recommendationsTitle}>권고 사항</Text>
      {prognosis.recommendations.map((rec, index) => (
        <View key={index} style={styles.recommendationItem}>
          <Text style={styles.recommendationNumber}>{index + 1}</Text>
          <Text style={styles.recommendationText}>{rec}</Text>
        </View>
      ))}
    </View>

    {prognosis.followUp?.recommended && (
      <View style={styles.followUpCard}>
        <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
        <View style={styles.followUpInfo}>
          <Text style={styles.followUpTiming}>다음 진료: {prognosis.followUp.timing}</Text>
          <Text style={styles.followUpReason}>{prognosis.followUp.reason}</Text>
        </View>
      </View>
    )}
  </View>
);

const LifestyleSection: React.FC<{ lifestyle: LifestyleSection }> = ({ lifestyle }) => (
  <View style={styles.section}>
    <SectionHeader title="생활 관리" icon="leaf-outline" color="#4CAF50" />

    <View style={styles.lifestyleCard}>
      <Text style={styles.lifestyleTitle}>식이 권고</Text>
      <View style={styles.lifestyleGroup}>
        <Text style={styles.lifestyleSubtitle}>권장 음식:</Text>
        {lifestyle.diet.recommended.map((item, i) => (
          <Text key={i} style={styles.lifestyleItem}>• {item}</Text>
        ))}
      </View>
      <View style={styles.lifestyleGroup}>
        <Text style={[styles.lifestyleSubtitle, { color: COLORS.danger }]}>피해야 할 음식:</Text>
        {lifestyle.diet.avoid.map((item, i) => (
          <Text key={i} style={styles.lifestyleItem}>• {item}</Text>
        ))}
      </View>
    </View>

    <View style={styles.lifestyleCard}>
      <Text style={styles.lifestyleTitle}>운동 권고</Text>
      <View style={styles.lifestyleGroup}>
        <Text style={styles.lifestyleSubtitle}>권장 운동:</Text>
        {lifestyle.exercise.recommended.map((item, i) => (
          <Text key={i} style={styles.lifestyleItem}>• {item}</Text>
        ))}
      </View>
    </View>

    {lifestyle.seasonalAdvice && (
      <View style={styles.seasonalCard}>
        <Ionicons name="sunny-outline" size={18} color={COLORS.warning} />
        <Text style={styles.seasonalText}>{lifestyle.seasonalAdvice}</Text>
      </View>
    )}
  </View>
);

// ============ 메인 컴포넌트 ============

const ComprehensiveReport: React.FC<ComprehensiveReportProps> = ({
  report,
  htmlContent,
  clinicName = '온고지신 한의원',
  onShare,
  onDownloadPdf,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleShare = async () => {
    if (onShare) {
      onShare();
      return;
    }

    try {
      await Share.share({
        message: `${report.title}\n\n${report.executiveSummary.oneLiner}\n\n주요 포인트:\n${report.executiveSummary.keyPoints.join('\n')}\n\n생성: ${clinicName}`,
        title: report.title,
      });
    } catch (error) {
      console.error('공유 실패:', error);
    }
  };

  const handleDownloadPdf = async () => {
    if (onDownloadPdf) {
      onDownloadPdf();
      return;
    }

    if (!htmlContent) {
      console.error('HTML 콘텐츠가 없습니다.');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('PDF 생성 실패:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{report.title}</Text>
          <Text style={styles.headerMeta}>
            {clinicName} | {report.consultationInfo.date}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDownloadPdf}
            disabled={isGeneratingPdf || !htmlContent}
          >
            {isGeneratingPdf ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons
                name="download-outline"
                size={22}
                color={htmlContent ? COLORS.primary : COLORS.neutral}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 콘텐츠 */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 요약 섹션 */}
        <SummarySection
          summary={report.executiveSummary}
          patientName={report.patientInfo.name}
        />

        {/* 건강 점수 */}
        <HealthScoreSection healthScore={report.healthScore} />

        {/* 처방 정보 */}
        <PrescriptionSection prescription={report.prescription} />

        {/* 과학적 근거 */}
        <EvidenceSection evidence={report.scientificEvidence} />

        {/* 예후 */}
        <PrognosisSection prognosis={report.prognosis} />

        {/* 생활 관리 */}
        {report.lifestyle && <LifestyleSection lifestyle={report.lifestyle} />}

        {/* 푸터 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            본 보고서는 {report.metadata.generatedBy}에 의해 자동 생성되었습니다.
          </Text>
          <Text style={styles.footerText}>
            의료적 판단은 담당 의료진과 상담해 주세요.
          </Text>
          <Text style={styles.footerMeta}>
            보고서 ID: {report.reportId.substring(0, 8)}... | 신뢰도: {Math.round(report.metadata.confidenceLevel * 100)}%
          </Text>
        </View>
      </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '10',
  },
  content: {
    flex: 1,
  },
  summarySection: {
    backgroundColor: COLORS.primary,
    padding: 20,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  summaryOneLiner: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 16,
  },
  summaryKeyPoints: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
    paddingTop: 12,
  },
  summaryKeyPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryKeyPointText: {
    fontSize: 13,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  section: {
    backgroundColor: COLORS.card,
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 10,
  },
  overallScoreCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    marginBottom: 16,
  },
  overallScoreValue: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.primary,
  },
  overallScoreLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  overallScoreInterpretation: {
    fontSize: 13,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 8,
  },
  spectrumSection: {
    marginBottom: 16,
  },
  spectrumTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  spectrumContainer: {
    marginBottom: 8,
  },
  spectrumBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  spectrumGradient: {
    flex: 1,
    backgroundColor: COLORS.primary,
    position: 'relative',
  },
  spectrumMarker: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    backgroundColor: COLORS.text,
    borderRadius: 8,
    marginLeft: -8,
  },
  spectrumLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  spectrumLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  spectrumDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  organScoresContainer: {
    marginTop: 16,
  },
  organScoresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  scoreGauge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreGaugeBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  scoreGaugeFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreGaugeInfo: {
    width: 70,
    alignItems: 'flex-end',
  },
  scoreGaugeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  scoreGaugeLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  trendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  trendText: {
    fontSize: 13,
    color: COLORS.text,
    marginLeft: 10,
    flex: 1,
  },
  formulaHeader: {
    marginBottom: 12,
  },
  formulaName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  formulaHanja: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  formulaPurpose: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 16,
  },
  treatmentMethod: {
    backgroundColor: COLORS.success + '10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  treatmentMethodTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  treatmentMethodDesc: {
    fontSize: 13,
    color: COLORS.text,
    marginTop: 4,
  },
  herbsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  herbsList: {
    marginBottom: 16,
  },
  herbItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  herbInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  herbName: {
    fontSize: 14,
    color: COLORS.text,
  },
  herbRole: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  herbAmount: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  dosageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    padding: 12,
    borderRadius: 8,
  },
  dosageText: {
    fontSize: 13,
    color: COLORS.text,
    marginLeft: 8,
  },
  precautionsCard: {
    marginTop: 16,
    padding: 12,
    backgroundColor: COLORS.warning + '10',
    borderRadius: 8,
  },
  precautionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.warning,
    marginBottom: 8,
  },
  precautionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  precautionText: {
    fontSize: 12,
    color: COLORS.text,
    marginLeft: 6,
    flex: 1,
  },
  evidenceLevelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  evidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  evidenceBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  evidenceLevelDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 10,
    flex: 1,
  },
  statisticsCard: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statisticsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  statisticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statisticItem: {
    alignItems: 'center',
  },
  statisticValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  statisticLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  outcomeBarContainer: {
    marginTop: 8,
  },
  outcomeBar: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  outcomeBarSegment: {
    height: '100%',
  },
  outcomeLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  outcomeLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  outcomeLegendColor: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginRight: 4,
  },
  outcomeLegendText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  modernEvidenceCard: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
  },
  modernEvidenceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  modernEvidenceText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },
  compoundsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  compoundItem: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 4,
  },
  compoundName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  compoundHerb: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  compoundEffect: {
    fontSize: 11,
    color: COLORS.text,
    marginLeft: 6,
  },
  prognosisCard: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  prognosisHeader: {
    marginBottom: 12,
  },
  prognosisOutcome: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.success,
  },
  prognosisDuration: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  factorsContainer: {
    marginTop: 12,
  },
  factorsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.success,
    marginBottom: 6,
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  factorText: {
    fontSize: 13,
    color: COLORS.text,
    marginLeft: 6,
    flex: 1,
  },
  recommendationsCard: {
    backgroundColor: COLORS.primary + '08',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  recommendationNumber: {
    width: 20,
    height: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 10,
  },
  recommendationText: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
  },
  followUpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
  },
  followUpInfo: {
    marginLeft: 10,
  },
  followUpTiming: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  followUpReason: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  lifestyleCard: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  lifestyleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  lifestyleGroup: {
    marginBottom: 10,
  },
  lifestyleSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.success,
    marginBottom: 4,
  },
  lifestyleItem: {
    fontSize: 13,
    color: COLORS.text,
    marginLeft: 8,
    marginBottom: 2,
  },
  seasonalCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.warning + '10',
    padding: 12,
    borderRadius: 8,
  },
  seasonalText: {
    fontSize: 13,
    color: COLORS.text,
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 40,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  footerMeta: {
    fontSize: 10,
    color: COLORS.neutral,
    marginTop: 8,
  },
});

export default ComprehensiveReport;
