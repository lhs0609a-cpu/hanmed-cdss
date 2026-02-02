import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { getPrescriptionDetail, HerbDetail } from '../../src/services/prescriptionService';
import PrescriptionReport, { HerbInfo, DrugInteraction, ScientificEvidence } from '../../src/components/PrescriptionReport';

// API 응답을 컴포넌트 props로 변환
function transformHerbs(herbs: HerbDetail[]): HerbInfo[] {
  return herbs.map(herb => ({
    name: herb.name,
    amount: herb.amount,
    purpose: herb.purpose,
    efficacy: herb.efficacy,
    properties: herb.properties ? {
      nature: herb.properties.nature || '평(平)',
      flavor: herb.properties.flavor || '담(淡)',
      meridians: herb.properties.meridians || [],
    } : undefined,
    scientificInfo: herb.scientificInfo ? {
      activeCompounds: herb.scientificInfo.activeCompounds,
      mechanism: herb.scientificInfo.mechanism,
      studies: herb.scientificInfo.studies,
    } : undefined,
  }));
}

function transformDrugInteractions(interactions: any[]): DrugInteraction[] {
  return interactions.map(interaction => ({
    drugName: interaction.drugName,
    herbName: interaction.herbName,
    severity: interaction.severity as 'critical' | 'warning' | 'info',
    mechanism: interaction.mechanism,
    recommendation: interaction.recommendation,
  }));
}

function transformScientificEvidence(evidence: any): ScientificEvidence | undefined {
  if (!evidence) return undefined;

  return {
    overallEfficacy: evidence.overallEfficacy,
    evidenceLevel: evidence.evidenceLevel,
    keyStudies: evidence.keyStudies?.map((study: any) => ({
      title: study.title,
      conclusion: study.conclusion,
      sampleSize: study.sampleSize,
      year: study.year,
    })),
  };
}

// 처방 설명에서 목표 추출
function extractTreatmentGoals(explanation?: string): string[] {
  if (!explanation) return [];

  const goals: string[] = [];
  const lines = explanation.split('\n').filter(line => line.trim());

  lines.forEach(line => {
    if (line.includes('목표') || line.includes('효과') || line.includes('개선')) {
      goals.push(line.trim());
    }
  });

  return goals.length > 0 ? goals : [];
}

// 기대 효과 추출
function extractExpectedEffects(prescription: any): string[] {
  const effects: string[] = [];

  // 처방의 기대 효과 필드가 있는 경우
  if (prescription.expectedEffects && Array.isArray(prescription.expectedEffects)) {
    return prescription.expectedEffects;
  }

  // 약재의 효능에서 추출
  if (prescription.herbs && prescription.herbs.length > 0) {
    // 군약의 효능을 주요 효과로
    const kingHerbs = prescription.herbs.filter((h: any) =>
      h.purpose?.includes('군') || h.purpose === '君'
    );

    kingHerbs.forEach((herb: any) => {
      if (herb.efficacy) {
        const efficacyParts = herb.efficacy.split(/[,，]/).slice(0, 2);
        efficacyParts.forEach((part: string) => {
          const trimmed = part.trim();
          if (trimmed && !effects.includes(trimmed)) {
            effects.push(trimmed);
          }
        });
      }
    });
  }

  return effects;
}

export default function PrescriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: prescription, isLoading, error } = useQuery({
    queryKey: ['prescription', id],
    queryFn: () => getPrescriptionDetail(id!),
    enabled: !!id,
  });

  // 데이터 변환
  const transformedData = useMemo(() => {
    if (!prescription) return null;

    return {
      herbs: transformHerbs(prescription.herbs || []),
      drugInteractions: transformDrugInteractions(prescription.drugInteractions || []),
      scientificEvidence: transformScientificEvidence(prescription.scientificEvidence),
      treatmentGoals: extractTreatmentGoals(prescription.patientExplanation),
      expectedEffects: extractExpectedEffects(prescription),
    };
  }, [prescription]);

  const handleShare = async () => {
    if (!prescription) return;

    try {
      const formulaName = prescription.formulaName || prescription.customFormulaName || '처방';
      const shareMessage = `
[한의원 처방 정보]
${formulaName}
${prescription.clinic?.name || '한의원'}

복용 기간: ${format(new Date(prescription.startDate), 'M월 d일', { locale: ko })} ~ ${format(new Date(prescription.endDate), 'M월 d일', { locale: ko })} (${prescription.duration}일)

복용 방법: ${prescription.dosageInstructions}

HanMed 환자 앱에서 확인하세요.
      `.trim();

      await Share.share({
        message: shareMessage,
        title: '처방 정보 공유',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleMedicationRecord = () => {
    router.push('/health/reminders');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>처방 정보를 불러오는 중...</Text>
      </SafeAreaView>
    );
  }

  if (error || !prescription || !transformedData) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>처방을 불러올 수 없습니다</Text>
        <Text style={styles.errorDescription}>
          네트워크 연결을 확인하고 다시 시도해주세요.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>돌아가기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const formulaName = prescription.formulaName || prescription.customFormulaName || '처방';

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#374151" />
          <Text style={styles.backText}>뒤로</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{formulaName}</Text>
          <Text style={styles.headerSubtitle}>
            {prescription.clinic?.name || '한의원'}
          </Text>
        </View>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color="#10B981" />
        </TouchableOpacity>
      </View>

      {/* 진행 상태 바 */}
      <View style={styles.progressBar}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressLabel}>복용 진행률</Text>
          <Text style={styles.progressValue}>
            {calculateProgress(prescription.startDate, prescription.endDate)}%
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${calculateProgress(prescription.startDate, prescription.endDate)}%` },
            ]}
          />
        </View>
        <View style={styles.progressDates}>
          <Text style={styles.progressDate}>
            {format(new Date(prescription.startDate), 'M/d', { locale: ko })}
          </Text>
          <Text style={styles.progressDate}>
            {format(new Date(prescription.endDate), 'M/d', { locale: ko })}
          </Text>
        </View>
      </View>

      {/* 과학적 분석 배너 */}
      <TouchableOpacity
        style={styles.scientificBanner}
        onPress={() => router.push(`/scientific-report/${id}`)}
      >
        <View style={styles.scientificBannerIcon}>
          <Ionicons name="flask" size={24} color="#3B82F6" />
        </View>
        <View style={styles.scientificBannerContent}>
          <Text style={styles.scientificBannerTitle}>과학적 분석 보기</Text>
          <Text style={styles.scientificBannerDesc}>
            건강점수, 약리기전, 치료통계 등 상세 분석
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>

      {/* 처방 리포트 */}
      <PrescriptionReport
        formulaName={formulaName}
        clinicName={prescription.clinic?.name || '한의원'}
        practitionerName={prescription.practitioner?.name}
        startDate={format(new Date(prescription.startDate), 'yyyy년 M월 d일', { locale: ko })}
        endDate={format(new Date(prescription.endDate), 'yyyy년 M월 d일', { locale: ko })}
        duration={prescription.duration}
        dosageInstructions={prescription.dosageInstructions}
        patientExplanation={prescription.patientExplanation}
        targetSymptoms={prescription.targetSymptoms}
        treatmentGoals={transformedData.treatmentGoals}
        herbs={transformedData.herbs}
        drugInteractions={transformedData.drugInteractions}
        contraindications={prescription.contraindications}
        sideEffects={prescription.sideEffects}
        scientificEvidence={transformedData.scientificEvidence}
        expectedEffects={transformedData.expectedEffects}
        expectedTimeline={prescription.expectedTimeline}
      />

      {/* 하단 버튼 */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.recordButton}
          onPress={handleMedicationRecord}
        >
          <Ionicons name="notifications" size={20} color="#FFFFFF" />
          <Text style={styles.recordButtonText}>복약 알림 설정</Text>
        </TouchableOpacity>

        {prescription.recordId && (
          <TouchableOpacity
            style={styles.recordLinkButton}
            onPress={() => router.push(`/record/${prescription.recordId}`)}
          >
            <Ionicons name="document-text-outline" size={20} color="#10B981" />
            <Text style={styles.recordLinkText}>관련 진료 기록</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// 복용 진행률 계산
function calculateProgress(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = new Date().getTime();

  if (now < start) return 0;
  if (now > end) return 100;

  const total = end - start;
  const elapsed = now - start;
  return Math.round((elapsed / total) * 100);
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
    backgroundColor: '#F9FAFB',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  backText: {
    fontSize: 16,
    color: '#374151',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
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
  shareButton: {
    padding: 8,
  },
  progressBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  recordButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
  },
  recordButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  recordLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  recordLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  scientificBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  scientificBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scientificBannerContent: {
    flex: 1,
  },
  scientificBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 2,
  },
  scientificBannerDesc: {
    fontSize: 12,
    color: '#3B82F6',
  },
});
