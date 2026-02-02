import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G, Path, Rect, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { format, subDays, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  getJournalByDate,
  getTodayLogs,
  getActiveReminders,
  createMedicationLog,
  MedicationReminder,
  MedicationLog,
} from '../../src/services/healthService';
import { getActivePrescriptions } from '../../src/services/prescriptionService';

// 자주 사용하는 증상 목록
const COMMON_SYMPTOMS = [
  { id: 'headache', name: '두통', icon: 'fitness-outline', color: '#EF4444' },
  { id: 'fatigue', name: '피로', icon: 'battery-dead-outline', color: '#F59E0B' },
  { id: 'insomnia', name: '불면', icon: 'moon-outline', color: '#6366F1' },
  { id: 'digestion', name: '소화불량', icon: 'restaurant-outline', color: '#10B981' },
  { id: 'pain', name: '통증', icon: 'bandage-outline', color: '#EC4899' },
  { id: 'cold', name: '오한', icon: 'snow-outline', color: '#3B82F6' },
  { id: 'fever', name: '발열', icon: 'thermometer-outline', color: '#EF4444' },
  { id: 'cough', name: '기침', icon: 'medical-outline', color: '#8B5CF6' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TabType = 'today' | 'reminders' | 'stats';

// 원형 진행률 컴포넌트
function CircularProgress({
  progress,
  size = 80,
  strokeWidth = 8,
  color = '#10B981',
  bgColor = '#E5E7EB',
  label,
  value,
  unit,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  label: string;
  value: string | number;
  unit?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={bgColor}
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
            />
          </G>
        </Svg>
        <View style={[styles.circularProgressCenter, { width: size, height: size }]}>
          <Text style={[styles.circularProgressValue, { color }]}>{value}</Text>
          {unit && <Text style={styles.circularProgressUnit}>{unit}</Text>}
        </View>
      </View>
      <Text style={styles.circularProgressLabel}>{label}</Text>
    </View>
  );
}

// 주간 트렌드 미니 차트
function WeeklyTrendChart({ data }: { data: number[] }) {
  const maxValue = Math.max(...data, 10);
  const barWidth = (SCREEN_WIDTH - 80) / 7 - 4;

  return (
    <View style={styles.weeklyTrendChart}>
      {data.map((value, index) => {
        const height = (value / maxValue) * 40;
        const dayLabel = format(subDays(new Date(), 6 - index), 'EEE', { locale: ko });

        return (
          <View key={index} style={styles.weeklyTrendBar}>
            <View style={styles.weeklyTrendBarContainer}>
              <View
                style={[
                  styles.weeklyTrendBarFill,
                  {
                    height,
                    backgroundColor: index === 6 ? '#10B981' : '#D1FAE5',
                  },
                ]}
              />
            </View>
            <Text style={[
              styles.weeklyTrendLabel,
              index === 6 && styles.weeklyTrendLabelToday
            ]}>
              {dayLabel}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// 시간대별 인사말
function getGreeting(): { text: string; icon: string } {
  const hour = new Date().getHours();
  if (hour < 6) return { text: '좋은 밤이에요', icon: 'moon-outline' };
  if (hour < 12) return { text: '좋은 아침이에요', icon: 'sunny-outline' };
  if (hour < 18) return { text: '좋은 오후예요', icon: 'partly-sunny-outline' };
  return { text: '좋은 저녁이에요', icon: 'moon-outline' };
}

// 컨디션 색상
function getConditionColor(value: number): string {
  if (value >= 8) return '#10B981';
  if (value >= 6) return '#84CC16';
  if (value >= 4) return '#F59E0B';
  return '#EF4444';
}

// 컨디션 이모지
function getConditionEmoji(value: number): string {
  if (value >= 8) return '😊';
  if (value >= 6) return '🙂';
  if (value >= 4) return '😐';
  if (value >= 2) return '😔';
  return '😢';
}

// 빠른 증상 입력 모달 컴포넌트
function QuickSymptomModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (symptoms: { id: string; severity: number }[], note?: string) => void;
}) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<{ id: string; severity: number }[]>([]);
  const [note, setNote] = useState('');

  const handleSymptomToggle = (symptomId: string) => {
    setSelectedSymptoms(prev => {
      const existing = prev.find(s => s.id === symptomId);
      if (existing) {
        return prev.filter(s => s.id !== symptomId);
      }
      return [...prev, { id: symptomId, severity: 5 }];
    });
  };

  const handleSeverityChange = (symptomId: string, severity: number) => {
    setSelectedSymptoms(prev =>
      prev.map(s => (s.id === symptomId ? { ...s, severity } : s))
    );
  };

  const handleSubmit = () => {
    if (selectedSymptoms.length === 0) {
      Alert.alert('알림', '하나 이상의 증상을 선택해주세요.');
      return;
    }
    onSubmit(selectedSymptoms, note || undefined);
    setSelectedSymptoms([]);
    setNote('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>빠른 증상 기록</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.modalSubtitle}>증상 선택</Text>
            <View style={styles.symptomGrid}>
              {COMMON_SYMPTOMS.map(symptom => {
                const isSelected = selectedSymptoms.some(s => s.id === symptom.id);
                const selectedSymptom = selectedSymptoms.find(s => s.id === symptom.id);

                return (
                  <View key={symptom.id} style={styles.symptomItemContainer}>
                    <TouchableOpacity
                      style={[
                        styles.symptomItem,
                        isSelected && { borderColor: symptom.color, backgroundColor: `${symptom.color}10` },
                      ]}
                      onPress={() => handleSymptomToggle(symptom.id)}
                    >
                      <Ionicons
                        name={symptom.icon as any}
                        size={24}
                        color={isSelected ? symptom.color : '#9CA3AF'}
                      />
                      <Text style={[styles.symptomName, isSelected && { color: symptom.color }]}>
                        {symptom.name}
                      </Text>
                    </TouchableOpacity>
                    {isSelected && (
                      <View style={styles.severitySlider}>
                        <Text style={styles.severityLabel}>심각도: {selectedSymptom?.severity}/10</Text>
                        <View style={styles.severityButtons}>
                          {[1, 3, 5, 7, 10].map(level => (
                            <TouchableOpacity
                              key={level}
                              style={[
                                styles.severityButton,
                                selectedSymptom?.severity === level && {
                                  backgroundColor: symptom.color,
                                },
                              ]}
                              onPress={() => handleSeverityChange(symptom.id, level)}
                            >
                              <Text
                                style={[
                                  styles.severityButtonText,
                                  selectedSymptom?.severity === level && { color: '#FFFFFF' },
                                ]}
                              >
                                {level}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <Text style={[styles.modalSubtitle, { marginTop: 16 }]}>메모 (선택)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="추가 메모를 입력하세요..."
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// 한의사 공유 모달
function ShareWithDoctorModal({
  visible,
  onClose,
  onShare,
}: {
  visible: boolean;
  onClose: () => void;
  onShare: (days: number, includeSymptoms: boolean, includeMedication: boolean) => void;
}) {
  const [days, setDays] = useState(7);
  const [includeSymptoms, setIncludeSymptoms] = useState(true);
  const [includeMedication, setIncludeMedication] = useState(true);

  const handleShare = () => {
    onShare(days, includeSymptoms, includeMedication);
    onClose();
    Alert.alert('공유 완료', '담당 한의사에게 건강 기록이 공유되었습니다.');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '50%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>한의사에게 공유</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalSubtitle}>공유 기간</Text>
            <View style={styles.periodButtons}>
              {[3, 7, 14, 30].map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.periodButton, days === d && styles.periodButtonActive]}
                  onPress={() => setDays(d)}
                >
                  <Text style={[styles.periodButtonText, days === d && styles.periodButtonTextActive]}>
                    {d}일
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalSubtitle, { marginTop: 16 }]}>공유 항목</Text>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setIncludeSymptoms(!includeSymptoms)}
            >
              <Ionicons
                name={includeSymptoms ? 'checkbox' : 'square-outline'}
                size={24}
                color={includeSymptoms ? '#10B981' : '#9CA3AF'}
              />
              <Text style={styles.checkboxLabel}>증상 기록</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setIncludeMedication(!includeMedication)}
            >
              <Ionicons
                name={includeMedication ? 'checkbox' : 'square-outline'}
                size={24}
                color={includeMedication ? '#10B981' : '#9CA3AF'}
              />
              <Text style={styles.checkboxLabel}>복약 기록</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitButton, { backgroundColor: '#6366F1' }]} onPress={handleShare}>
              <Ionicons name="share-outline" size={18} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>공유하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function HealthScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [refreshing, setRefreshing] = useState(false);
  const [showQuickSymptom, setShowQuickSymptom] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const greeting = getGreeting();

  // 오늘 건강 일지
  const { data: todayJournal, isLoading: journalLoading, refetch: refetchJournal } = useQuery({
    queryKey: ['todayJournal', today],
    queryFn: () => getJournalByDate(today),
  });

  // 오늘 복약 기록
  const { data: todayLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['todayLogs'],
    queryFn: getTodayLogs,
  });

  // 활성 알림
  const { data: reminders, isLoading: remindersLoading, refetch: refetchReminders } = useQuery({
    queryKey: ['activeReminders'],
    queryFn: getActiveReminders,
  });

  // 활성 처방
  const { data: activePrescriptions, refetch: refetchPrescriptions } = useQuery({
    queryKey: ['activePrescriptions'],
    queryFn: getActivePrescriptions,
  });

  // 복약 기록 생성
  const logMutation = useMutation({
    mutationFn: createMedicationLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayLogs'] });
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchJournal(),
      refetchLogs(),
      refetchReminders(),
      refetchPrescriptions(),
    ]);
    setRefreshing(false);
  };

  const handleTakeMedication = (prescriptionId?: string, reminderId?: string) => {
    logMutation.mutate({
      prescriptionId,
      reminderId,
      takenAt: new Date().toISOString(),
      status: 'taken',
    });
  };

  const handleSkipMedication = (prescriptionId?: string, reminderId?: string) => {
    logMutation.mutate({
      prescriptionId,
      reminderId,
      takenAt: new Date().toISOString(),
      status: 'skipped',
    });
  };

  const handleQuickSymptomSubmit = async (
    symptoms: { id: string; severity: number }[],
    note?: string
  ) => {
    // 실제로는 API를 호출해야 함
    console.log('Quick symptom submit:', symptoms, note);
    await refetchJournal();
    Alert.alert('저장 완료', '증상이 기록되었습니다.');
  };

  const handleShareWithDoctor = async (
    days: number,
    includeSymptoms: boolean,
    includeMedication: boolean
  ) => {
    // 실제로는 API를 호출해야 함
    console.log('Share with doctor:', { days, includeSymptoms, includeMedication });
  };

  // 통계 계산
  const stats = useMemo(() => {
    const takenCount = todayLogs?.filter(l => l.status === 'taken').length || 0;
    const totalPrescriptions = activePrescriptions?.length || 0;
    const complianceRate = totalPrescriptions > 0 ? Math.round((takenCount / totalPrescriptions) * 100) : 0;
    const activeRemindersCount = reminders?.filter(r => r.isActive).length || 0;

    // 가상의 주간 컨디션 데이터 (실제로는 API에서 가져와야 함)
    const weeklyCondition = [6, 7, 5, 8, 7, 6, todayJournal?.overallCondition || 0];

    return {
      takenCount,
      totalPrescriptions,
      complianceRate,
      activeRemindersCount,
      weeklyCondition,
    };
  }, [todayLogs, activePrescriptions, reminders, todayJournal]);

  const isLoading = journalLoading || logsLoading || remindersLoading;

  const renderTodayTab = () => (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#10B981']}
          tintColor="#10B981"
        />
      }
    >
      {/* 인사 카드 */}
      <View style={styles.greetingCard}>
        <View style={styles.greetingContent}>
          <View style={styles.greetingTextContainer}>
            <View style={styles.greetingRow}>
              <Ionicons name={greeting.icon as any} size={24} color="#F59E0B" />
              <Text style={styles.greetingText}>{greeting.text}</Text>
            </View>
            <Text style={styles.dateText}>
              {format(new Date(), 'M월 d일 EEEE', { locale: ko })}
            </Text>
          </View>
          {todayJournal ? (
            <View style={styles.todayMoodContainer}>
              <Text style={styles.todayMoodEmoji}>
                {getConditionEmoji(todayJournal.overallCondition || 5)}
              </Text>
              <Text style={styles.todayMoodText}>
                {todayJournal.overallCondition}/10
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.recordConditionButton}
              onPress={() => router.push('/health/journal')}
            >
              <Ionicons name="add-circle" size={20} color="#10B981" />
              <Text style={styles.recordConditionText}>기록</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 오늘의 건강 상태 */}
      {todayJournal ? (
        <View style={styles.healthStatusCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="heart" size={18} color="#EF4444" />
              <Text style={styles.sectionTitle}>오늘의 건강 상태</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/health/journal')}>
              <Text style={styles.sectionAction}>수정</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.healthMetrics}>
            <CircularProgress
              progress={(todayJournal.overallCondition || 0) * 10}
              color={getConditionColor(todayJournal.overallCondition || 0)}
              label="컨디션"
              value={todayJournal.overallCondition || 0}
              unit="/10"
            />
            <CircularProgress
              progress={(todayJournal.energyLevel || 0) * 10}
              color="#F59E0B"
              label="에너지"
              value={todayJournal.energyLevel || 0}
              unit="/10"
            />
            <CircularProgress
              progress={Math.min((todayJournal.sleepHours || 0) / 8 * 100, 100)}
              color="#6366F1"
              label="수면"
              value={todayJournal.sleepHours || 0}
              unit="시간"
            />
          </View>

          {todayJournal.notes && (
            <View style={styles.healthNotes}>
              <Ionicons name="chatbubble-outline" size={14} color="#6B7280" />
              <Text style={styles.healthNotesText}>{todayJournal.notes}</Text>
            </View>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={styles.emptyHealthCard}
          onPress={() => router.push('/health/journal')}
        >
          <View style={styles.emptyHealthIcon}>
            <Ionicons name="fitness-outline" size={32} color="#10B981" />
          </View>
          <View style={styles.emptyHealthContent}>
            <Text style={styles.emptyHealthTitle}>오늘의 컨디션을 기록해보세요</Text>
            <Text style={styles.emptyHealthSubtitle}>
              매일 기록하면 건강 패턴을 파악할 수 있어요
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
        </TouchableOpacity>
      )}

      {/* 복약 현황 */}
      <View style={styles.medicationSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="medical" size={18} color="#10B981" />
            <Text style={styles.sectionTitle}>오늘의 복약</Text>
          </View>
          <View style={styles.medicationStats}>
            <Text style={styles.medicationStatsText}>
              {stats.takenCount}/{stats.totalPrescriptions}회
            </Text>
            {stats.complianceRate === 100 && (
              <View style={styles.completeBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              </View>
            )}
          </View>
        </View>

        {/* 복약 진행률 바 */}
        {stats.totalPrescriptions > 0 && (
          <View style={styles.medicationProgressContainer}>
            <View style={styles.medicationProgressBar}>
              <View
                style={[
                  styles.medicationProgressFill,
                  { width: `${stats.complianceRate}%` },
                ]}
              />
            </View>
            <Text style={styles.medicationProgressText}>{stats.complianceRate}%</Text>
          </View>
        )}

        {/* 처방 목록 */}
        {activePrescriptions && activePrescriptions.length > 0 ? (
          <View style={styles.prescriptionsList}>
            {activePrescriptions.map((prescription) => {
              const log = todayLogs?.find(l => l.prescriptionId === prescription.id);
              const isTaken = log?.status === 'taken';
              const isSkipped = log?.status === 'skipped';
              const daysRemaining = differenceInDays(
                new Date(prescription.endDate),
                new Date()
              );

              return (
                <View key={prescription.id} style={styles.prescriptionCard}>
                  <View style={styles.prescriptionIconContainer}>
                    <Ionicons
                      name={isTaken ? 'checkmark-circle' : 'medical-outline'}
                      size={24}
                      color={isTaken ? '#10B981' : isSkipped ? '#9CA3AF' : '#6366F1'}
                    />
                  </View>

                  <View style={styles.prescriptionInfo}>
                    <Text style={[
                      styles.prescriptionName,
                      (isTaken || isSkipped) && styles.prescriptionNameDone
                    ]}>
                      {prescription.formulaName || prescription.customFormulaName}
                    </Text>
                    <Text style={styles.prescriptionDosage}>
                      {prescription.dosageInstructions}
                    </Text>
                    <View style={styles.prescriptionMeta}>
                      <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.prescriptionMetaText}>
                        D-{daysRemaining} 남음
                      </Text>
                    </View>
                  </View>

                  {isTaken ? (
                    <View style={styles.takenBadge}>
                      <Ionicons name="checkmark" size={14} color="#059669" />
                      <Text style={styles.takenBadgeText}>복용</Text>
                    </View>
                  ) : isSkipped ? (
                    <View style={styles.skippedBadge}>
                      <Text style={styles.skippedBadgeText}>건너뜀</Text>
                    </View>
                  ) : (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.takeButton}
                        onPress={() => handleTakeMedication(prescription.id)}
                        disabled={logMutation.isPending}
                      >
                        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.skipButton}
                        onPress={() => handleSkipMedication(prescription.id)}
                        disabled={logMutation.isPending}
                      >
                        <Ionicons name="close" size={18} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyPrescriptions}>
            <Ionicons name="medical-outline" size={32} color="#D1D5DB" />
            <Text style={styles.emptyPrescriptionsText}>
              현재 복용 중인 처방이 없습니다
            </Text>
          </View>
        )}
      </View>

      {/* 빠른 증상 기록 버튼 */}
      <TouchableOpacity
        style={styles.quickSymptomCard}
        onPress={() => setShowQuickSymptom(true)}
      >
        <View style={styles.quickSymptomIconContainer}>
          <Ionicons name="flash" size={24} color="#F59E0B" />
        </View>
        <View style={styles.quickSymptomContent}>
          <Text style={styles.quickSymptomTitle}>빠른 증상 기록</Text>
          <Text style={styles.quickSymptomSubtitle}>탭 한 번으로 증상을 기록하세요</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
      </TouchableOpacity>

      {/* 한의사에게 공유 버튼 */}
      <TouchableOpacity
        style={styles.shareWithDoctorCard}
        onPress={() => setShowShareModal(true)}
      >
        <View style={[styles.quickSymptomIconContainer, { backgroundColor: '#EEF2FF' }]}>
          <Ionicons name="share-social" size={24} color="#6366F1" />
        </View>
        <View style={styles.quickSymptomContent}>
          <Text style={styles.quickSymptomTitle}>한의사에게 공유</Text>
          <Text style={styles.quickSymptomSubtitle}>건강 기록을 담당 한의사와 공유</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
      </TouchableOpacity>

      {/* 빠른 메뉴 */}
      <View style={styles.quickMenuSection}>
        <Text style={styles.quickMenuTitle}>바로가기</Text>
        <View style={styles.quickMenuGrid}>
          <TouchableOpacity
            style={styles.quickMenuItem}
            onPress={() => router.push('/health/journal')}
          >
            <View style={[styles.quickMenuIcon, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="create-outline" size={24} color="#10B981" />
            </View>
            <Text style={styles.quickMenuText}>건강 일지</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickMenuItem}
            onPress={() => router.push('/health/report')}
          >
            <View style={[styles.quickMenuIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="bar-chart-outline" size={24} color="#6366F1" />
            </View>
            <Text style={styles.quickMenuText}>건강 리포트</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickMenuItem}
            onPress={() => router.push('/health/reminders')}
          >
            <View style={[styles.quickMenuIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="notifications-outline" size={24} color="#D97706" />
            </View>
            <Text style={styles.quickMenuText}>알림 설정</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickMenuItem}
            onPress={() => router.push('/(tabs)/prescriptions')}
          >
            <View style={[styles.quickMenuIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="document-text-outline" size={24} color="#DC2626" />
            </View>
            <Text style={styles.quickMenuText}>처방전</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 주간 컨디션 트렌드 */}
      <View style={styles.trendSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="trending-up" size={18} color="#6366F1" />
            <Text style={styles.sectionTitle}>주간 컨디션</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/health/report')}>
            <Text style={styles.sectionAction}>상세</Text>
          </TouchableOpacity>
        </View>
        <WeeklyTrendChart data={stats.weeklyCondition} />
      </View>
    </ScrollView>
  );

  const renderRemindersTab = () => (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#10B981']}
          tintColor="#10B981"
        />
      }
    >
      {/* 알림 요약 */}
      <View style={styles.remindersSummary}>
        <View style={styles.remindersSummaryItem}>
          <View style={[styles.remindersSummaryIcon, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="notifications" size={24} color="#10B981" />
          </View>
          <Text style={styles.remindersSummaryValue}>{stats.activeRemindersCount}</Text>
          <Text style={styles.remindersSummaryLabel}>활성 알림</Text>
        </View>
        <View style={styles.remindersSummaryItem}>
          <View style={[styles.remindersSummaryIcon, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="medical" size={24} color="#6366F1" />
          </View>
          <Text style={styles.remindersSummaryValue}>{stats.totalPrescriptions}</Text>
          <Text style={styles.remindersSummaryLabel}>복용 처방</Text>
        </View>
        <View style={styles.remindersSummaryItem}>
          <View style={[styles.remindersSummaryIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="checkmark-done" size={24} color="#D97706" />
          </View>
          <Text style={styles.remindersSummaryValue}>{stats.complianceRate}%</Text>
          <Text style={styles.remindersSummaryLabel}>복약률</Text>
        </View>
      </View>

      {/* 알림 목록 */}
      <View style={styles.remindersSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>복약 알림</Text>
          <TouchableOpacity
            style={styles.addReminderButton}
            onPress={() => router.push('/health/reminders')}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addReminderButtonText}>추가</Text>
          </TouchableOpacity>
        </View>

        {reminders && reminders.length > 0 ? (
          reminders.map((reminder) => (
            <TouchableOpacity
              key={reminder.id}
              style={styles.reminderCard}
              onPress={() => router.push('/health/reminders')}
            >
              <View style={[
                styles.reminderTimeContainer,
                !reminder.isActive && styles.reminderTimeContainerInactive
              ]}>
                <Text style={[
                  styles.reminderTime,
                  !reminder.isActive && styles.reminderTimeInactive
                ]}>
                  {reminder.reminderTime}
                </Text>
              </View>

              <View style={styles.reminderContent}>
                <Text style={[
                  styles.reminderTitle,
                  !reminder.isActive && styles.reminderTitleInactive
                ]}>
                  {reminder.title}
                </Text>
                {reminder.prescription && (
                  <View style={styles.reminderPrescriptionRow}>
                    <Ionicons name="medical-outline" size={12} color="#6B7280" />
                    <Text style={styles.reminderPrescriptionText}>
                      {reminder.prescription.formulaName}
                    </Text>
                  </View>
                )}
                <View style={styles.reminderDaysContainer}>
                  {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                    <View
                      key={index}
                      style={[
                        styles.reminderDayChip,
                        reminder.reminderDays.includes(index) && styles.reminderDayChipActive,
                      ]}
                    >
                      <Text style={[
                        styles.reminderDayText,
                        reminder.reminderDays.includes(index) && styles.reminderDayTextActive,
                      ]}>
                        {day}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={[
                styles.reminderToggle,
                reminder.isActive ? styles.reminderToggleActive : styles.reminderToggleInactive
              ]}>
                <Text style={[
                  styles.reminderToggleText,
                  reminder.isActive ? styles.reminderToggleTextActive : styles.reminderToggleTextInactive
                ]}>
                  {reminder.isActive ? 'ON' : 'OFF'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyReminders}>
            <View style={styles.emptyRemindersIcon}>
              <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyRemindersTitle}>설정된 알림이 없습니다</Text>
            <Text style={styles.emptyRemindersSubtitle}>
              복약 알림을 설정하면 잊지 않고 약을 복용할 수 있어요
            </Text>
            <TouchableOpacity
              style={styles.emptyRemindersButton}
              onPress={() => router.push('/health/reminders')}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.emptyRemindersButtonText}>알림 추가하기</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>건강 관리</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.push('/health/report')}
        >
          <Ionicons name="analytics-outline" size={24} color="#10B981" />
        </TouchableOpacity>
      </View>

      {/* 탭 */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'today' && styles.tabActive]}
          onPress={() => setActiveTab('today')}
        >
          <Ionicons
            name="today"
            size={18}
            color={activeTab === 'today' ? '#10B981' : '#9CA3AF'}
          />
          <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>
            오늘
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'reminders' && styles.tabActive]}
          onPress={() => setActiveTab('reminders')}
        >
          <Ionicons
            name="notifications"
            size={18}
            color={activeTab === 'reminders' ? '#10B981' : '#9CA3AF'}
          />
          <Text style={[styles.tabText, activeTab === 'reminders' && styles.tabTextActive]}>
            알림
          </Text>
          {stats.activeRemindersCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{stats.activeRemindersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loaderText}>건강 정보를 불러오는 중...</Text>
        </View>
      ) : activeTab === 'today' ? (
        renderTodayTab()
      ) : (
        renderRemindersTab()
      )}

      {/* 빠른 증상 입력 모달 */}
      <QuickSymptomModal
        visible={showQuickSymptom}
        onClose={() => setShowQuickSymptom(false)}
        onSubmit={handleQuickSymptomSubmit}
      />

      {/* 한의사 공유 모달 */}
      <ShareWithDoctorModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        onShare={handleShareWithDoctor}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#10B981',
  },
  tabText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#10B981',
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tabContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    color: '#6B7280',
  },
  greetingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  greetingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingTextContainer: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginLeft: 32,
  },
  todayMoodContainer: {
    alignItems: 'center',
  },
  todayMoodEmoji: {
    fontSize: 32,
  },
  todayMoodText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  recordConditionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordConditionText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  healthStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sectionAction: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  healthMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  circularProgressCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  circularProgressUnit: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  circularProgressLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  healthNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  healthNotesText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  emptyHealthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyHealthIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emptyHealthContent: {
    flex: 1,
  },
  emptyHealthTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  emptyHealthSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  medicationSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medicationStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  medicationStatsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  completeBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 2,
  },
  medicationProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  medicationProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  medicationProgressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  medicationProgressText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
    width: 40,
    textAlign: 'right',
  },
  prescriptionsList: {
    gap: 12,
  },
  prescriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  prescriptionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  prescriptionInfo: {
    flex: 1,
  },
  prescriptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  prescriptionNameDone: {
    color: '#9CA3AF',
  },
  prescriptionDosage: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  prescriptionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  prescriptionMetaText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  takeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  takenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  takenBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  skippedBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  skippedBadgeText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyPrescriptions: {
    alignItems: 'center',
    padding: 24,
  },
  emptyPrescriptionsText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  quickMenuSection: {
    marginBottom: 16,
  },
  quickMenuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  quickMenuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickMenuItem: {
    width: (SCREEN_WIDTH - 44) / 4,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickMenuIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickMenuText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
  trendSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  weeklyTrendChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 60,
  },
  weeklyTrendBar: {
    alignItems: 'center',
    flex: 1,
  },
  weeklyTrendBarContainer: {
    width: '80%',
    height: 40,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  weeklyTrendBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  weeklyTrendLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },
  weeklyTrendLabelToday: {
    color: '#10B981',
    fontWeight: '600',
  },
  remindersSummary: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  remindersSummaryItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  remindersSummaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  remindersSummaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  remindersSummaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  remindersSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  addReminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addReminderButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginTop: 12,
  },
  reminderTimeContainer: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 12,
  },
  reminderTimeContainerInactive: {
    backgroundColor: '#F3F4F6',
  },
  reminderTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  reminderTimeInactive: {
    color: '#9CA3AF',
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  reminderTitleInactive: {
    color: '#9CA3AF',
  },
  reminderPrescriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  reminderPrescriptionText: {
    fontSize: 12,
    color: '#6B7280',
  },
  reminderDaysContainer: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  reminderDayChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderDayChipActive: {
    backgroundColor: '#D1FAE5',
  },
  reminderDayText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  reminderDayTextActive: {
    color: '#059669',
  },
  reminderToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  reminderToggleActive: {
    backgroundColor: '#D1FAE5',
  },
  reminderToggleInactive: {
    backgroundColor: '#F3F4F6',
  },
  reminderToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reminderToggleTextActive: {
    color: '#059669',
  },
  reminderToggleTextInactive: {
    color: '#9CA3AF',
  },
  emptyReminders: {
    alignItems: 'center',
    padding: 32,
  },
  emptyRemindersIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyRemindersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  emptyRemindersSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyRemindersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyRemindersButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Quick Symptom Card
  quickSymptomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  quickSymptomIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quickSymptomContent: {
    flex: 1,
  },
  quickSymptomTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  quickSymptomSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  shareWithDoctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Symptom Grid
  symptomGrid: {
    gap: 12,
  },
  symptomItemContainer: {
    marginBottom: 8,
  },
  symptomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  symptomName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  severitySlider: {
    paddingLeft: 48,
    marginTop: 8,
  },
  severityLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  severityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  severityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  noteInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Share Modal
  periodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#10B981',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#374151',
  },
});
