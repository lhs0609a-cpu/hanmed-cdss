import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { getRecordDetail } from '../../src/services/recordService';
import TreatmentReport from '../../src/components/TreatmentReport';
import { BodyPart } from '../../src/components/BodyDiagram';

// 증상 정보에서 신체 부위 데이터 추출
function extractBodyPartsFromRecord(record: any): BodyPart[] {
  const bodyParts: BodyPart[] = [];

  // 증상 매핑: 증상명 -> 신체 부위 ID
  const symptomToBodyPart: Record<string, { id: string; nameKo: string; meridian?: string }> = {
    '두통': { id: 'head', nameKo: '머리', meridian: '족태양방광경' },
    '머리 아픔': { id: 'head', nameKo: '머리', meridian: '족태양방광경' },
    '편두통': { id: 'head', nameKo: '머리', meridian: '족소양담경' },
    '안통': { id: 'eyes', nameKo: '눈', meridian: '족궐음간경' },
    '눈 피로': { id: 'eyes', nameKo: '눈', meridian: '족궐음간경' },
    '시력 저하': { id: 'eyes', nameKo: '눈', meridian: '족궐음간경' },
    '어지러움': { id: 'head', nameKo: '머리', meridian: '족소양담경' },
    '이명': { id: 'ears', nameKo: '귀', meridian: '수소양삼초경' },
    '청력 저하': { id: 'ears', nameKo: '귀', meridian: '수소양삼초경' },
    '비염': { id: 'nose', nameKo: '코', meridian: '수양명대장경' },
    '코막힘': { id: 'nose', nameKo: '코', meridian: '수양명대장경' },
    '인후통': { id: 'neck', nameKo: '목', meridian: '수태음폐경' },
    '목 통증': { id: 'neck', nameKo: '목', meridian: '족태양방광경' },
    '목 뻣뻣함': { id: 'neck', nameKo: '목', meridian: '족태양방광경' },
    '어깨 통증': { id: 'left_shoulder', nameKo: '어깨', meridian: '수양명대장경' },
    '어깨 결림': { id: 'right_shoulder', nameKo: '어깨', meridian: '수태양소장경' },
    '오십견': { id: 'left_shoulder', nameKo: '어깨', meridian: '수태양소장경' },
    '흉통': { id: 'chest', nameKo: '가슴', meridian: '수궐음심포경' },
    '가슴 답답함': { id: 'chest', nameKo: '가슴', meridian: '수소음심경' },
    '심장 두근거림': { id: 'heart', nameKo: '심장', meridian: '수소음심경' },
    '호흡 곤란': { id: 'lungs', nameKo: '폐', meridian: '수태음폐경' },
    '기침': { id: 'lungs', nameKo: '폐', meridian: '수태음폐경' },
    '천식': { id: 'lungs', nameKo: '폐', meridian: '수태음폐경' },
    '복통': { id: 'abdomen', nameKo: '복부', meridian: '족양명위경' },
    '소화불량': { id: 'stomach', nameKo: '위장', meridian: '족양명위경' },
    '위장 장애': { id: 'stomach', nameKo: '위장', meridian: '족양명위경' },
    '속쓰림': { id: 'stomach', nameKo: '위장', meridian: '족양명위경' },
    '간 기능 저하': { id: 'liver', nameKo: '간', meridian: '족궐음간경' },
    '피로': { id: 'liver', nameKo: '간', meridian: '족궐음간경' },
    '황달': { id: 'liver', nameKo: '간', meridian: '족궐음간경' },
    '비장 이상': { id: 'spleen', nameKo: '비장', meridian: '족태음비경' },
    '식욕부진': { id: 'spleen', nameKo: '비장', meridian: '족태음비경' },
    '장 트러블': { id: 'intestines', nameKo: '장', meridian: '수양명대장경' },
    '변비': { id: 'intestines', nameKo: '장', meridian: '수양명대장경' },
    '설사': { id: 'intestines', nameKo: '장', meridian: '수양명대장경' },
    '요통': { id: 'lower_back', nameKo: '허리', meridian: '족태양방광경' },
    '허리 통증': { id: 'lower_back', nameKo: '허리', meridian: '족태양방광경' },
    '디스크': { id: 'lower_back', nameKo: '허리', meridian: '족태양방광경' },
    '좌골신경통': { id: 'lower_back', nameKo: '허리', meridian: '족태양방광경' },
    '골반 통증': { id: 'pelvis', nameKo: '골반', meridian: '족궐음간경' },
    '생리통': { id: 'pelvis', nameKo: '골반', meridian: '족궐음간경' },
    '배뇨 장애': { id: 'kidneys', nameKo: '신장', meridian: '족소음신경' },
    '신장 이상': { id: 'kidneys', nameKo: '신장', meridian: '족소음신경' },
    '팔 통증': { id: 'left_arm', nameKo: '팔', meridian: '수양명대장경' },
    '팔 저림': { id: 'right_arm', nameKo: '팔', meridian: '수태음폐경' },
    '팔꿈치 통증': { id: 'left_elbow', nameKo: '팔꿈치', meridian: '수양명대장경' },
    '테니스 엘보': { id: 'right_elbow', nameKo: '팔꿈치', meridian: '수양명대장경' },
    '손목 통증': { id: 'left_wrist', nameKo: '손목', meridian: '수궐음심포경' },
    '손목터널증후군': { id: 'right_wrist', nameKo: '손목', meridian: '수궐음심포경' },
    '손 저림': { id: 'left_hand', nameKo: '손', meridian: '수태음폐경' },
    '손 통증': { id: 'right_hand', nameKo: '손', meridian: '수양명대장경' },
    '관절염': { id: 'left_hand', nameKo: '손', meridian: '수양명대장경' },
    '허벅지 통증': { id: 'left_thigh', nameKo: '허벅지', meridian: '족양명위경' },
    '다리 저림': { id: 'right_thigh', nameKo: '허벅지', meridian: '족양명위경' },
    '무릎 통증': { id: 'left_knee', nameKo: '무릎', meridian: '족양명위경' },
    '퇴행성 관절염': { id: 'right_knee', nameKo: '무릎', meridian: '족양명위경' },
    '종아리 통증': { id: 'left_calf', nameKo: '종아리', meridian: '족태양방광경' },
    '쥐남': { id: 'right_calf', nameKo: '종아리', meridian: '족태양방광경' },
    '발목 통증': { id: 'left_ankle', nameKo: '발목', meridian: '족태양방광경' },
    '발목 염좌': { id: 'right_ankle', nameKo: '발목', meridian: '족소양담경' },
    '발 통증': { id: 'left_foot', nameKo: '발', meridian: '족소음신경' },
    '족저근막염': { id: 'right_foot', nameKo: '발', meridian: '족소음신경' },
    '등 통증': { id: 'upper_back', nameKo: '등', meridian: '족태양방광경' },
  };

  // 증상 배열에서 신체 부위 추출
  if (record.symptoms && Array.isArray(record.symptoms)) {
    const partsMap = new Map<string, BodyPart>();

    record.symptoms.forEach((symptom: any) => {
      const symptomName = symptom.name || symptom;
      const mapping = symptomToBodyPart[symptomName];

      if (mapping) {
        const existing = partsMap.get(mapping.id);
        if (existing) {
          // 기존 부위에 증상 추가
          if (!existing.symptoms?.includes(symptomName)) {
            existing.symptoms = [...(existing.symptoms || []), symptomName];
          }
          // 심각도 업데이트 (더 높은 값으로)
          if (symptom.severity && (!existing.severity || symptom.severity > existing.severity)) {
            existing.severity = symptom.severity;
          }
        } else {
          partsMap.set(mapping.id, {
            id: mapping.id,
            name: mapping.id,
            nameKo: mapping.nameKo,
            severity: symptom.severity || 5,
            symptoms: [symptomName],
            meridian: mapping.meridian,
            description: symptom.description || `${mapping.nameKo} 부위에 ${symptomName} 증상이 있습니다.`,
          });
        }
      }
    });

    bodyParts.push(...partsMap.values());
  }

  // AI 분석 결과에서 추가 부위 추출
  if (record.aiHealthInsights?.keyFindings) {
    record.aiHealthInsights.keyFindings.forEach((finding: any) => {
      const area = finding.area?.toLowerCase() || '';
      let bodyPartId = '';
      let nameKo = '';

      // 영역명에서 부위 추출
      if (area.includes('머리') || area.includes('두부')) {
        bodyPartId = 'head';
        nameKo = '머리';
      } else if (area.includes('목') || area.includes('경부')) {
        bodyPartId = 'neck';
        nameKo = '목';
      } else if (area.includes('어깨')) {
        bodyPartId = 'left_shoulder';
        nameKo = '어깨';
      } else if (area.includes('허리') || area.includes('요부')) {
        bodyPartId = 'lower_back';
        nameKo = '허리';
      } else if (area.includes('위장') || area.includes('소화')) {
        bodyPartId = 'stomach';
        nameKo = '위장';
      } else if (area.includes('간')) {
        bodyPartId = 'liver';
        nameKo = '간';
      }

      if (bodyPartId && !bodyParts.find(p => p.id === bodyPartId)) {
        const severityMap: Record<string, number> = {
          '심각': 9,
          '중등도': 6,
          '경도': 4,
          '경미': 2,
        };

        bodyParts.push({
          id: bodyPartId,
          name: bodyPartId,
          nameKo,
          severity: severityMap[finding.severity] || 5,
          description: finding.finding,
        });
      }
    });
  }

  return bodyParts;
}

// AI 인사이트 데이터 변환
function transformAiInsights(record: any) {
  if (!record.aiHealthInsights) return undefined;

  const insights = record.aiHealthInsights;

  return {
    summary: insights.summary || '',
    keyFindings: insights.keyFindings?.map((finding: any) => ({
      area: finding.area || finding,
      finding: finding.finding || finding,
      severity: finding.severity,
      recommendation: finding.recommendation,
    })) || insights.riskFactors?.map((risk: string) => ({
      area: '주의사항',
      finding: risk,
      severity: '주의',
    })) || [],
    overallAssessment: insights.improvements?.join('. ') || '',
  };
}

// 생활 습관 권장 사항 변환
function transformLifestyleRecommendations(record: any) {
  const recommendations: any[] = [];

  if (record.aiHealthInsights?.lifestyleAdvice) {
    record.aiHealthInsights.lifestyleAdvice.forEach((advice: string, idx: number) => {
      recommendations.push({
        category: '생활',
        title: `권장 사항 ${idx + 1}`,
        description: advice,
        tips: [],
      });
    });
  }

  return recommendations;
}

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: record, isLoading, error } = useQuery({
    queryKey: ['record', id],
    queryFn: () => getRecordDetail(id!),
    enabled: !!id,
  });

  // 신체 부위 데이터 추출
  const affectedBodyParts = useMemo(() => {
    if (!record) return [];
    return extractBodyPartsFromRecord(record);
  }, [record]);

  // AI 인사이트 변환
  const aiHealthInsights = useMemo(() => {
    if (!record) return undefined;
    return transformAiInsights(record);
  }, [record]);

  // 생활 습관 권장 변환
  const lifestyleRecommendations = useMemo(() => {
    if (!record) return [];
    return transformLifestyleRecommendations(record);
  }, [record]);

  const handleShare = async () => {
    if (!record) return;

    try {
      const shareMessage = `
[한의원 진료 기록]
${record.clinic?.name || '한의원'}
${format(new Date(record.visitDate), 'yyyy년 M월 d일', { locale: ko })}

주요 증상: ${record.chiefComplaint}
${record.diagnosis ? `진단: ${record.diagnosis}` : ''}

HanMed 환자 앱에서 확인하세요.
      `.trim();

      await Share.share({
        message: shareMessage,
        title: '진료 기록 공유',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>진료 기록을 불러오는 중...</Text>
      </SafeAreaView>
    );
  }

  if (error || !record) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>기록을 불러올 수 없습니다</Text>
        <Text style={styles.errorDescription}>
          네트워크 연결을 확인하고 다시 시도해주세요.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>돌아가기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#374151" />
          <Text style={styles.backText}>뒤로</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{record.clinic?.name || '진료 기록'}</Text>
          <Text style={styles.headerDate}>
            {format(new Date(record.visitDate), 'yyyy.M.d (EEEE)', { locale: ko })}
          </Text>
        </View>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color="#10B981" />
        </TouchableOpacity>
      </View>

      {/* 담당 한의사 정보 */}
      <View style={styles.practitionerBar}>
        <Ionicons name="person" size={16} color="#6B7280" />
        <Text style={styles.practitionerText}>
          담당: {record.practitioner?.name || '한의사'}
        </Text>
        {record.aiHealthInsights && (
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={12} color="#FFFFFF" />
            <Text style={styles.aiBadgeText}>AI 분석 완료</Text>
          </View>
        )}
      </View>

      {/* 치료 리포트 */}
      <TreatmentReport
        clinicName={record.clinic?.name || '한의원'}
        practitionerName={record.practitioner?.name || '한의사'}
        visitDate={format(new Date(record.visitDate), 'yyyy년 M월 d일', { locale: ko })}
        chiefComplaint={record.chiefComplaint}
        diagnosisSummary={record.diagnosis}
        patternDiagnosis={record.patternDiagnosis}
        constitutionResult={record.constitutionResult}
        affectedBodyParts={affectedBodyParts}
        aiHealthInsights={aiHealthInsights}
        lifestyleRecommendations={lifestyleRecommendations}
        prescription={
          record.prescription
            ? {
                formulaName: record.prescription.formulaName || '처방약',
                composition: record.prescription.composition,
                dosageInstructions: record.prescription.dosageInstructions || '식후 30분',
                durationDays: record.prescription.durationDays || 7,
                effects: record.prescription.effects,
              }
            : undefined
        }
        nextVisitRecommended={record.nextVisitRecommended}
        nextVisitNotes={record.patientExplanation}
      />
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
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  headerDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  shareButton: {
    padding: 8,
  },
  practitionerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  practitionerText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  aiBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
