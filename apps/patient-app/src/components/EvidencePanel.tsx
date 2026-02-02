import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============ 타입 정의 ============

export interface ClinicalStudy {
  id?: string;
  title: string;
  authors?: string[];
  year: number;
  journal?: string;
  pmid?: string;
  studyType: 'rct' | 'meta_analysis' | 'cohort' | 'case_control' | 'case_series' | 'case_report' | 'review' | 'other';
  sampleSize?: number;
  mainFindings: string;
  conclusion: string;
  evidenceLevel?: 'A' | 'B' | 'C' | 'D';
}

export interface EvidenceSource {
  name: string;
  type: 'database' | 'guideline' | 'textbook' | 'clinical_experience';
  description?: string;
  url?: string;
}

export interface EvidenceSummary {
  totalStudies: number;
  rctCount: number;
  metaAnalysisCount: number;
  overallEvidenceLevel: 'A' | 'B' | 'C' | 'D';
  keyFindings: string[];
  limitations?: string[];
}

export interface EvidencePanelProps {
  title?: string;
  clinicalStudies: ClinicalStudy[];
  evidenceSummary?: EvidenceSummary;
  evidenceSources?: EvidenceSource[];
  showEvidenceLevelGuide?: boolean;
  onStudyPress?: (study: ClinicalStudy) => void;
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
  link: '#1976D2',
};

const EVIDENCE_LEVEL_CONFIG: Record<string, {
  label: string;
  color: string;
  icon: string;
  description: string;
}> = {
  A: {
    label: '강한 근거',
    color: '#4CAF50',
    icon: 'shield-checkmark',
    description: '잘 설계된 무작위 대조 시험(RCT) 또는 메타분석',
  },
  B: {
    label: '중등도 근거',
    color: '#2196F3',
    icon: 'checkmark-circle',
    description: '1개의 RCT 또는 잘 설계된 비무작위 연구',
  },
  C: {
    label: '약한 근거',
    color: '#FF9800',
    icon: 'alert-circle',
    description: '관찰 연구, 증례 보고, 또는 전문가 의견',
  },
  D: {
    label: '매우 약한 근거',
    color: '#9E9E9E',
    icon: 'help-circle',
    description: '전임상 연구 또는 이론적 근거만 존재',
  },
};

const STUDY_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  meta_analysis: { label: '메타분석', color: '#4CAF50' },
  rct: { label: 'RCT', color: '#2196F3' },
  cohort: { label: '코호트', color: '#03A9F4' },
  case_control: { label: '환자-대조군', color: '#00BCD4' },
  case_series: { label: '증례 시리즈', color: '#FF9800' },
  case_report: { label: '증례 보고', color: '#FFC107' },
  review: { label: '문헌 고찰', color: '#9C27B0' },
  other: { label: '기타', color: '#9E9E9E' },
};

// ============ 서브 컴포넌트 ============

const EvidenceLevelBadge: React.FC<{ level: 'A' | 'B' | 'C' | 'D'; size?: 'small' | 'medium' | 'large' }> = ({
  level,
  size = 'medium',
}) => {
  const config = EVIDENCE_LEVEL_CONFIG[level];
  const fontSize = size === 'small' ? 10 : size === 'medium' ? 12 : 14;
  const padding = size === 'small' ? 4 : size === 'medium' ? 6 : 8;

  return (
    <View style={[styles.evidenceBadge, { backgroundColor: config.color, paddingHorizontal: padding * 1.5, paddingVertical: padding }]}>
      <Ionicons name={config.icon as any} size={fontSize + 2} color="#FFFFFF" />
      <Text style={[styles.evidenceBadgeText, { fontSize, marginLeft: 4 }]}>
        {level} ({config.label})
      </Text>
    </View>
  );
};

const StudyTypeBadge: React.FC<{ type: ClinicalStudy['studyType'] }> = ({ type }) => {
  const config = STUDY_TYPE_CONFIG[type] || STUDY_TYPE_CONFIG.other;

  return (
    <View style={[styles.studyTypeBadge, { backgroundColor: config.color + '20', borderColor: config.color }]}>
      <Text style={[styles.studyTypeBadgeText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
};

const StudyCard: React.FC<{
  study: ClinicalStudy;
  onPress?: () => void;
}> = ({ study, onPress }) => {
  const openPubMed = () => {
    if (study.pmid) {
      Linking.openURL(`https://pubmed.ncbi.nlm.nih.gov/${study.pmid}/`);
    }
  };

  return (
    <TouchableOpacity
      style={styles.studyCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.studyHeader}>
        <StudyTypeBadge type={study.studyType} />
        {study.evidenceLevel && (
          <EvidenceLevelBadge level={study.evidenceLevel} size="small" />
        )}
      </View>

      <Text style={styles.studyTitle} numberOfLines={2}>
        {study.title}
      </Text>

      <View style={styles.studyMeta}>
        {study.authors && study.authors.length > 0 && (
          <Text style={styles.studyAuthors} numberOfLines={1}>
            {study.authors[0]}{study.authors.length > 1 ? ' 외' : ''}
          </Text>
        )}
        <Text style={styles.studyYear}>{study.year}</Text>
        {study.journal && (
          <Text style={styles.studyJournal} numberOfLines={1}>
            {study.journal}
          </Text>
        )}
      </View>

      {study.sampleSize && (
        <Text style={styles.sampleSize}>
          <Ionicons name="people-outline" size={12} color={COLORS.textSecondary} />
          {' '}대상자 {study.sampleSize.toLocaleString()}명
        </Text>
      )}

      <Text style={styles.studyFindings} numberOfLines={3}>
        {study.mainFindings}
      </Text>

      {study.pmid && (
        <TouchableOpacity style={styles.pubmedLink} onPress={openPubMed}>
          <Ionicons name="open-outline" size={14} color={COLORS.link} />
          <Text style={styles.pubmedLinkText}>PubMed 보기 (PMID: {study.pmid})</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const EvidenceSummaryCard: React.FC<{ summary: EvidenceSummary }> = ({ summary }) => {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>근거 요약</Text>
        <EvidenceLevelBadge level={summary.overallEvidenceLevel} />
      </View>

      <View style={styles.summaryStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{summary.totalStudies}</Text>
          <Text style={styles.statLabel}>총 연구</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{summary.rctCount}</Text>
          <Text style={styles.statLabel}>RCT</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{summary.metaAnalysisCount}</Text>
          <Text style={styles.statLabel}>메타분석</Text>
        </View>
      </View>

      <View style={styles.keyFindings}>
        <Text style={styles.keyFindingsTitle}>핵심 발견:</Text>
        {summary.keyFindings.map((finding, index) => (
          <View key={index} style={styles.findingItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.findingText}>{finding}</Text>
          </View>
        ))}
      </View>

      {summary.limitations && summary.limitations.length > 0 && (
        <View style={styles.limitations}>
          <Text style={styles.limitationsTitle}>제한점:</Text>
          {summary.limitations.map((limitation, index) => (
            <View key={index} style={styles.limitationItem}>
              <Ionicons name="alert-circle-outline" size={14} color={COLORS.warning} />
              <Text style={styles.limitationText}>{limitation}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const EvidenceLevelGuide: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.guideModal}>
          <View style={styles.guideHeader}>
            <Text style={styles.guideTitle}>근거 수준 가이드</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.guideContent}>
            {Object.entries(EVIDENCE_LEVEL_CONFIG).map(([level, config]) => (
              <View key={level} style={styles.guideItem}>
                <View style={[styles.guideLevelBadge, { backgroundColor: config.color }]}>
                  <Ionicons name={config.icon as any} size={20} color="#FFFFFF" />
                  <Text style={styles.guideLevelText}>{level}</Text>
                </View>
                <View style={styles.guideInfo}>
                  <Text style={styles.guideLevelLabel}>{config.label}</Text>
                  <Text style={styles.guideLevelDesc}>{config.description}</Text>
                </View>
              </View>
            ))}

            <View style={styles.guideNote}>
              <Ionicons name="information-circle" size={18} color={COLORS.primary} />
              <Text style={styles.guideNoteText}>
                근거 수준이 낮더라도 오랜 임상 경험에 기반한 전통의학의 가치를 부정하지 않습니다.
                다만, 현대 과학적 검증의 정도를 나타내는 지표입니다.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ============ 메인 컴포넌트 ============

const EvidencePanel: React.FC<EvidencePanelProps> = ({
  title = '연구 근거',
  clinicalStudies,
  evidenceSummary,
  evidenceSources,
  showEvidenceLevelGuide = true,
  onStudyPress,
}) => {
  const [guideVisible, setGuideVisible] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState<ClinicalStudy | null>(null);

  const handleStudyPress = (study: ClinicalStudy) => {
    if (onStudyPress) {
      onStudyPress(study);
    } else {
      setSelectedStudy(study);
    }
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="library-outline" size={20} color={COLORS.primary} />
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        {showEvidenceLevelGuide && (
          <TouchableOpacity
            style={styles.guideButton}
            onPress={() => setGuideVisible(true)}
          >
            <Ionicons name="help-circle-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.guideButtonText}>근거 수준 안내</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 근거 요약 */}
      {evidenceSummary && (
        <EvidenceSummaryCard summary={evidenceSummary} />
      )}

      {/* 연구 목록 */}
      {clinicalStudies.length > 0 && (
        <View style={styles.studiesSection}>
          <Text style={styles.sectionTitle}>
            관련 연구 ({clinicalStudies.length}건)
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.studiesScroll}
          >
            {clinicalStudies.map((study, index) => (
              <StudyCard
                key={study.id || index}
                study={study}
                onPress={() => handleStudyPress(study)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* 데이터 소스 */}
      {evidenceSources && evidenceSources.length > 0 && (
        <View style={styles.sourcesSection}>
          <Text style={styles.sectionTitle}>데이터 출처</Text>
          <View style={styles.sourcesList}>
            {evidenceSources.map((source, index) => (
              <TouchableOpacity
                key={index}
                style={styles.sourceItem}
                onPress={() => source.url && Linking.openURL(source.url)}
                disabled={!source.url}
              >
                <Ionicons
                  name={
                    source.type === 'database' ? 'server-outline' :
                    source.type === 'guideline' ? 'document-text-outline' :
                    source.type === 'textbook' ? 'book-outline' :
                    'medkit-outline'
                  }
                  size={16}
                  color={COLORS.primary}
                />
                <Text style={styles.sourceName}>{source.name}</Text>
                {source.url && (
                  <Ionicons name="open-outline" size={14} color={COLORS.link} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 연구가 없는 경우 */}
      {clinicalStudies.length === 0 && !evidenceSummary && (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={COLORS.border} />
          <Text style={styles.emptyText}>관련 연구 정보가 없습니다.</Text>
        </View>
      )}

      {/* 근거 수준 가이드 모달 */}
      <EvidenceLevelGuide
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
      />

      {/* 연구 상세 모달 */}
      <Modal
        visible={!!selectedStudy}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedStudy(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.studyDetailModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>연구 상세</Text>
              <TouchableOpacity onPress={() => setSelectedStudy(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedStudy && (
              <ScrollView style={styles.modalContent}>
                <View style={styles.studyDetailHeader}>
                  <StudyTypeBadge type={selectedStudy.studyType} />
                  {selectedStudy.evidenceLevel && (
                    <EvidenceLevelBadge level={selectedStudy.evidenceLevel} />
                  )}
                </View>

                <Text style={styles.studyDetailTitle}>{selectedStudy.title}</Text>

                {selectedStudy.authors && (
                  <Text style={styles.studyDetailMeta}>
                    저자: {selectedStudy.authors.join(', ')}
                  </Text>
                )}

                <Text style={styles.studyDetailMeta}>
                  {selectedStudy.year}년 {selectedStudy.journal && `| ${selectedStudy.journal}`}
                </Text>

                {selectedStudy.sampleSize && (
                  <Text style={styles.studyDetailMeta}>
                    대상자: {selectedStudy.sampleSize.toLocaleString()}명
                  </Text>
                )}

                <View style={styles.studyDetailSection}>
                  <Text style={styles.studyDetailLabel}>주요 발견</Text>
                  <Text style={styles.studyDetailText}>{selectedStudy.mainFindings}</Text>
                </View>

                <View style={styles.studyDetailSection}>
                  <Text style={styles.studyDetailLabel}>결론</Text>
                  <Text style={styles.studyDetailText}>{selectedStudy.conclusion}</Text>
                </View>

                {selectedStudy.pmid && (
                  <TouchableOpacity
                    style={styles.pubmedButton}
                    onPress={() => Linking.openURL(`https://pubmed.ncbi.nlm.nih.gov/${selectedStudy.pmid}/`)}
                  >
                    <Ionicons name="open-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.pubmedButtonText}>PubMed에서 보기</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ============ 스타일 ============

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 8,
  },
  guideButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guideButtonText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  evidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
  },
  evidenceBadgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  studyTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  studyTypeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: COLORS.primary + '08',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: COLORS.card,
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  keyFindings: {
    marginTop: 8,
  },
  keyFindingsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  findingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  findingText: {
    fontSize: 13,
    color: COLORS.text,
    marginLeft: 8,
    flex: 1,
  },
  limitations: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  limitationsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.warning,
    marginBottom: 6,
  },
  limitationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  limitationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  studiesSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  studiesScroll: {
    paddingRight: 16,
  },
  studyCard: {
    width: SCREEN_WIDTH * 0.75,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  studyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  studyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  studyMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  studyAuthors: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  studyYear: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginRight: 8,
  },
  studyJournal: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  sampleSize: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  studyFindings: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: 10,
  },
  pubmedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  pubmedLinkText: {
    fontSize: 12,
    color: COLORS.link,
    marginLeft: 6,
  },
  sourcesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sourcesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sourceName: {
    fontSize: 12,
    color: COLORS.text,
    marginHorizontal: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  guideModal: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
  },
  guideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  guideContent: {
    padding: 16,
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  guideLevelBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  guideLevelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  guideInfo: {
    flex: 1,
  },
  guideLevelLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  guideLevelDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  guideNote: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary + '10',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  guideNoteText: {
    fontSize: 12,
    color: COLORS.text,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  studyDetailModal: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    width: '100%',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalContent: {
    padding: 16,
  },
  studyDetailHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  studyDetailTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: 12,
  },
  studyDetailMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  studyDetailSection: {
    marginTop: 16,
  },
  studyDetailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 6,
  },
  studyDetailText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  pubmedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  pubmedButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

export default EvidencePanel;
