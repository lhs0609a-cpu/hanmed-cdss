import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BodyDiagram, { BodyPart } from './BodyDiagram';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HealthInsights {
  summary: string;
  keyFindings: Array<{
    area: string;
    finding: string;
    severity?: string;
    recommendation?: string;
  }>;
  overallAssessment?: string;
}

interface DietRecommendation {
  recommended: Array<{
    name: string;
    reason: string;
    examples?: string[];
  }>;
  avoid: Array<{
    name: string;
    reason: string;
    examples?: string[];
  }>;
  generalAdvice: string[];
}

interface ExerciseRecommendation {
  type: string;
  frequency: string;
  duration: string;
  intensity: string;
  description: string;
  cautions?: string[];
}

interface LifestyleRecommendation {
  category: string;
  title: string;
  description: string;
  tips: string[];
}

export interface TreatmentReportProps {
  // 기본 정보
  clinicName: string;
  practitionerName: string;
  visitDate: string;

  // 진단 정보
  chiefComplaint?: string;
  diagnosisSummary?: string;
  patternDiagnosis?: string;
  constitutionResult?: string;

  // 영향받는 신체 부위
  affectedBodyParts?: BodyPart[];

  // AI 분석 결과
  aiHealthInsights?: HealthInsights;
  lifestyleRecommendations?: LifestyleRecommendation[];
  dietRecommendations?: DietRecommendation;
  exerciseRecommendations?: ExerciseRecommendation[];

  // 처방 정보
  prescription?: {
    formulaName: string;
    composition?: string;
    dosageInstructions: string;
    durationDays: number;
    effects?: string[];
  };

  // 다음 방문
  nextVisitRecommended?: string;
  nextVisitNotes?: string;
}

type TabType = 'overview' | 'body' | 'lifestyle' | 'prescription';

export default function TreatmentReport({
  clinicName,
  practitionerName,
  visitDate,
  chiefComplaint,
  diagnosisSummary,
  patternDiagnosis,
  constitutionResult,
  affectedBodyParts = [],
  aiHealthInsights,
  lifestyleRecommendations = [],
  dietRecommendations,
  exerciseRecommendations = [],
  prescription,
  nextVisitRecommended,
  nextVisitNotes,
}: TreatmentReportProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'overview', label: '진단 요약', icon: 'document-text' },
    { key: 'body', label: '신체 분석', icon: 'body' },
    { key: 'lifestyle', label: '생활 조언', icon: 'leaf' },
    { key: 'prescription', label: '처방 정보', icon: 'medical' },
  ];

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* 진단 카드 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="analytics" size={20} color="#10B981" />
          <Text style={styles.cardTitle}>진단 요약</Text>
        </View>

        {chiefComplaint && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>주요 호소</Text>
            <Text style={styles.infoValue}>{chiefComplaint}</Text>
          </View>
        )}

        {diagnosisSummary && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>진단 결과</Text>
            <Text style={styles.infoValueLarge}>{diagnosisSummary}</Text>
          </View>
        )}

        {patternDiagnosis && (
          <View style={styles.patternBox}>
            <Text style={styles.patternLabel}>변증 (辨證)</Text>
            <Text style={styles.patternValue}>{patternDiagnosis}</Text>
          </View>
        )}

        {constitutionResult && (
          <View style={styles.constitutionBox}>
            <Text style={styles.constitutionLabel}>체질 분석</Text>
            <Text style={styles.constitutionValue}>{constitutionResult}</Text>
          </View>
        )}
      </View>

      {/* AI 건강 인사이트 */}
      {aiHealthInsights && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={14} color="#FFFFFF" />
              <Text style={styles.aiBadgeText}>AI 분석</Text>
            </View>
            <Text style={styles.cardTitle}>건강 인사이트</Text>
          </View>

          <Text style={styles.insightSummary}>{aiHealthInsights.summary}</Text>

          {aiHealthInsights.keyFindings?.length > 0 && (
            <View style={styles.findingsContainer}>
              <Text style={styles.findingsTitle}>주요 소견</Text>
              {aiHealthInsights.keyFindings.map((finding, idx) => (
                <View key={idx} style={styles.findingItem}>
                  <View style={styles.findingHeader}>
                    <View style={styles.findingArea}>
                      <Ionicons name="location" size={14} color="#6B7280" />
                      <Text style={styles.findingAreaText}>{finding.area}</Text>
                    </View>
                    {finding.severity && (
                      <View
                        style={[
                          styles.severityBadge,
                          {
                            backgroundColor:
                              finding.severity === '심각'
                                ? '#FEE2E2'
                                : finding.severity === '중등도'
                                ? '#FEF3C7'
                                : '#D1FAE5',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.severityText,
                            {
                              color:
                                finding.severity === '심각'
                                  ? '#DC2626'
                                  : finding.severity === '중등도'
                                  ? '#D97706'
                                  : '#059669',
                            },
                          ]}
                        >
                          {finding.severity}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.findingText}>{finding.finding}</Text>
                  {finding.recommendation && (
                    <View style={styles.findingRecommendation}>
                      <Ionicons name="bulb" size={14} color="#F59E0B" />
                      <Text style={styles.findingRecommendationText}>
                        {finding.recommendation}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {aiHealthInsights.overallAssessment && (
            <View style={styles.overallAssessment}>
              <Text style={styles.overallAssessmentTitle}>종합 평가</Text>
              <Text style={styles.overallAssessmentText}>
                {aiHealthInsights.overallAssessment}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 다음 방문 */}
      {nextVisitRecommended && (
        <View style={styles.nextVisitCard}>
          <Ionicons name="calendar" size={24} color="#10B981" />
          <View style={styles.nextVisitInfo}>
            <Text style={styles.nextVisitLabel}>다음 방문 권장일</Text>
            <Text style={styles.nextVisitDate}>{nextVisitRecommended}</Text>
            {nextVisitNotes && (
              <Text style={styles.nextVisitNotes}>{nextVisitNotes}</Text>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );

  const renderBodyTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="body" size={20} color="#10B981" />
          <Text style={styles.cardTitle}>신체 부위별 분석</Text>
        </View>

        <Text style={styles.bodyDescription}>
          아래 인체 그림에서 색상이 표시된 부위를 터치하면{'\n'}
          해당 부위의 상세 정보를 확인할 수 있습니다.
        </Text>

        <View style={styles.bodyDiagramContainer}>
          <BodyDiagram
            affectedParts={affectedBodyParts}
            size="large"
            showLabels={true}
          />
        </View>
      </View>

      {/* 부위별 상세 목록 */}
      {affectedBodyParts.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>상세 분석</Text>
          {affectedBodyParts.map((part, idx) => (
            <View key={idx} style={styles.bodyPartItem}>
              <View style={styles.bodyPartHeader}>
                <View
                  style={[
                    styles.bodyPartIndicator,
                    {
                      backgroundColor:
                        part.severity && part.severity >= 7
                          ? '#EF4444'
                          : part.severity && part.severity >= 4
                          ? '#F59E0B'
                          : '#10B981',
                    },
                  ]}
                />
                <Text style={styles.bodyPartName}>{part.nameKo}</Text>
                {part.meridian && (
                  <View style={styles.meridianTag}>
                    <Text style={styles.meridianTagText}>{part.meridian}</Text>
                  </View>
                )}
              </View>
              {part.description && (
                <Text style={styles.bodyPartDescription}>{part.description}</Text>
              )}
              {part.symptoms && part.symptoms.length > 0 && (
                <View style={styles.bodyPartSymptoms}>
                  {part.symptoms.map((symptom, sIdx) => (
                    <View key={sIdx} style={styles.symptomChip}>
                      <Text style={styles.symptomChipText}>{symptom}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderLifestyleTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* 식이 권장 */}
      {dietRecommendations && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="restaurant" size={20} color="#10B981" />
            <Text style={styles.cardTitle}>식이 조언</Text>
          </View>

          {dietRecommendations.recommended?.length > 0 && (
            <View style={styles.dietSection}>
              <View style={styles.dietSectionHeader}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.dietSectionTitle}>권장 음식</Text>
              </View>
              {dietRecommendations.recommended.map((item, idx) => (
                <View key={idx} style={styles.dietItem}>
                  <Text style={styles.dietItemName}>{item.name}</Text>
                  <Text style={styles.dietItemReason}>{item.reason}</Text>
                  {item.examples && (
                    <Text style={styles.dietItemExamples}>
                      예: {item.examples.join(', ')}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {dietRecommendations.avoid?.length > 0 && (
            <View style={styles.dietSection}>
              <View style={styles.dietSectionHeader}>
                <Ionicons name="close-circle" size={18} color="#EF4444" />
                <Text style={[styles.dietSectionTitle, { color: '#EF4444' }]}>
                  피해야 할 음식
                </Text>
              </View>
              {dietRecommendations.avoid.map((item, idx) => (
                <View key={idx} style={styles.dietItem}>
                  <Text style={styles.dietItemName}>{item.name}</Text>
                  <Text style={styles.dietItemReason}>{item.reason}</Text>
                </View>
              ))}
            </View>
          )}

          {dietRecommendations.generalAdvice?.length > 0 && (
            <View style={styles.generalAdvice}>
              <Text style={styles.generalAdviceTitle}>일반 조언</Text>
              {dietRecommendations.generalAdvice.map((advice, idx) => (
                <View key={idx} style={styles.adviceItem}>
                  <Text style={styles.adviceBullet}>•</Text>
                  <Text style={styles.adviceText}>{advice}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* 운동 권장 */}
      {exerciseRecommendations.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="fitness" size={20} color="#10B981" />
            <Text style={styles.cardTitle}>운동 권장</Text>
          </View>

          {exerciseRecommendations.map((exercise, idx) => (
            <View key={idx} style={styles.exerciseItem}>
              <Text style={styles.exerciseType}>{exercise.type}</Text>
              <View style={styles.exerciseDetails}>
                <View style={styles.exerciseDetail}>
                  <Ionicons name="repeat" size={14} color="#6B7280" />
                  <Text style={styles.exerciseDetailText}>{exercise.frequency}</Text>
                </View>
                <View style={styles.exerciseDetail}>
                  <Ionicons name="time" size={14} color="#6B7280" />
                  <Text style={styles.exerciseDetailText}>{exercise.duration}</Text>
                </View>
                <View style={styles.exerciseDetail}>
                  <Ionicons name="speedometer" size={14} color="#6B7280" />
                  <Text style={styles.exerciseDetailText}>{exercise.intensity}</Text>
                </View>
              </View>
              <Text style={styles.exerciseDescription}>{exercise.description}</Text>
              {exercise.cautions && exercise.cautions.length > 0 && (
                <View style={styles.exerciseCautions}>
                  <Ionicons name="warning" size={14} color="#F59E0B" />
                  <Text style={styles.exerciseCautionText}>
                    {exercise.cautions.join(' ')}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* 생활습관 권장 */}
      {lifestyleRecommendations.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="sunny" size={20} color="#10B981" />
            <Text style={styles.cardTitle}>생활 습관</Text>
          </View>

          {lifestyleRecommendations.map((item, idx) => (
            <View key={idx} style={styles.lifestyleItem}>
              <View style={styles.lifestyleHeader}>
                <View style={styles.lifestyleCategory}>
                  <Text style={styles.lifestyleCategoryText}>{item.category}</Text>
                </View>
                <Text style={styles.lifestyleTitle}>{item.title}</Text>
              </View>
              <Text style={styles.lifestyleDescription}>{item.description}</Text>
              {item.tips.length > 0 && (
                <View style={styles.lifestyleTips}>
                  {item.tips.map((tip, tIdx) => (
                    <View key={tIdx} style={styles.tipItem}>
                      <Ionicons name="checkmark" size={14} color="#10B981" />
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderPrescriptionTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {prescription ? (
        <>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="medical" size={20} color="#10B981" />
              <Text style={styles.cardTitle}>처방 정보</Text>
            </View>

            <View style={styles.prescriptionName}>
              <Text style={styles.prescriptionNameLabel}>처방명</Text>
              <Text style={styles.prescriptionNameValue}>
                {prescription.formulaName}
              </Text>
            </View>

            {prescription.composition && (
              <View style={styles.prescriptionSection}>
                <Text style={styles.prescriptionSectionTitle}>구성 약재</Text>
                <Text style={styles.prescriptionComposition}>
                  {prescription.composition}
                </Text>
              </View>
            )}

            <View style={styles.prescriptionSection}>
              <Text style={styles.prescriptionSectionTitle}>복용 방법</Text>
              <Text style={styles.prescriptionDosage}>
                {prescription.dosageInstructions}
              </Text>
            </View>

            <View style={styles.prescriptionDuration}>
              <Ionicons name="calendar-outline" size={18} color="#6B7280" />
              <Text style={styles.prescriptionDurationText}>
                복용 기간: {prescription.durationDays}일
              </Text>
            </View>

            {prescription.effects && prescription.effects.length > 0 && (
              <View style={styles.prescriptionEffects}>
                <Text style={styles.prescriptionSectionTitle}>기대 효과</Text>
                {prescription.effects.map((effect, idx) => (
                  <View key={idx} style={styles.effectItem}>
                    <Ionicons name="leaf" size={14} color="#10B981" />
                    <Text style={styles.effectText}>{effect}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.cautionCard}>
            <Ionicons name="information-circle" size={24} color="#3B82F6" />
            <View style={styles.cautionContent}>
              <Text style={styles.cautionTitle}>복용 시 주의사항</Text>
              <Text style={styles.cautionText}>
                • 정해진 시간에 규칙적으로 복용해주세요{'\n'}
                • 식전 30분 또는 식후 30분에 복용하세요{'\n'}
                • 이상 증상 발생 시 복용을 중단하고 한의원에 문의하세요{'\n'}
                • 다른 약물과 함께 복용 시 한의사와 상담하세요
              </Text>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.noPrescription}>
          <Ionicons name="document-outline" size={48} color="#D1D5DB" />
          <Text style={styles.noPrescriptionText}>처방 정보가 없습니다</Text>
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
      {activeTab === 'body' && renderBodyTab()}
      {activeTab === 'lifestyle' && renderLifestyleTab()}
      {activeTab === 'prescription' && renderPrescriptionTab()}
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
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  aiBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#374151',
  },
  infoValueLarge: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    lineHeight: 22,
  },
  patternBox: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  patternLabel: {
    fontSize: 12,
    color: '#92400E',
    marginBottom: 4,
  },
  patternValue: {
    fontSize: 16,
    color: '#78350F',
    fontWeight: '600',
  },
  constitutionBox: {
    backgroundColor: '#DBEAFE',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  constitutionLabel: {
    fontSize: 12,
    color: '#1E40AF',
    marginBottom: 4,
  },
  constitutionValue: {
    fontSize: 16,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  insightSummary: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 16,
  },
  findingsContainer: {
    marginTop: 8,
  },
  findingsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  findingItem: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  findingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  findingArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  findingAreaText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  findingText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  findingRecommendation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 6,
  },
  findingRecommendationText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  overallAssessment: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  overallAssessmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  overallAssessmentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  nextVisitCard: {
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  nextVisitInfo: {
    flex: 1,
  },
  nextVisitLabel: {
    fontSize: 12,
    color: '#065F46',
  },
  nextVisitDate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#047857',
    marginTop: 4,
  },
  nextVisitNotes: {
    fontSize: 13,
    color: '#065F46',
    marginTop: 4,
  },
  bodyDescription: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  bodyDiagramContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  bodyPartItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 12,
  },
  bodyPartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bodyPartIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bodyPartName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  meridianTag: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  meridianTagText: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '500',
  },
  bodyPartDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 8,
    lineHeight: 20,
  },
  bodyPartSymptoms: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  symptomChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  symptomChipText: {
    fontSize: 12,
    color: '#4B5563',
  },
  dietSection: {
    marginBottom: 16,
  },
  dietSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  dietSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  dietItem: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  dietItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  dietItemReason: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 4,
  },
  dietItemExamples: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  generalAdvice: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  generalAdviceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  adviceItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  adviceBullet: {
    color: '#10B981',
    fontWeight: '600',
  },
  adviceText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  exerciseItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 12,
  },
  exerciseType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  exerciseDetails: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  exerciseDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exerciseDetailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  exerciseDescription: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 8,
    lineHeight: 18,
  },
  exerciseCautions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 6,
  },
  exerciseCautionText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  lifestyleItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 12,
  },
  lifestyleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  lifestyleCategory: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lifestyleCategoryText: {
    fontSize: 11,
    color: '#4338CA',
    fontWeight: '600',
  },
  lifestyleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  lifestyleDescription: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  lifestyleTips: {
    marginTop: 8,
    gap: 4,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tipText: {
    fontSize: 13,
    color: '#374151',
  },
  prescriptionName: {
    marginBottom: 16,
  },
  prescriptionNameLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  prescriptionNameValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  prescriptionSection: {
    marginBottom: 16,
  },
  prescriptionSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  prescriptionComposition: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  prescriptionDosage: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  prescriptionDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  prescriptionDurationText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  prescriptionEffects: {
    marginTop: 16,
  },
  effectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  effectText: {
    fontSize: 14,
    color: '#374151',
  },
  cautionCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cautionContent: {
    flex: 1,
  },
  cautionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D4ED8',
    marginBottom: 8,
  },
  cautionText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 20,
  },
  noPrescription: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noPrescriptionText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
});
