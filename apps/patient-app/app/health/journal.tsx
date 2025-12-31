import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  getJournalByDate,
  createJournal,
  updateJournal,
  CreateJournalDto,
} from '../../src/services/healthService';

export default function JournalScreen() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const queryClient = useQueryClient();

  const { data: existingJournal, isLoading } = useQuery({
    queryKey: ['journal', today],
    queryFn: () => getJournalByDate(today),
  });

  const [formData, setFormData] = useState<CreateJournalDto>({
    recordedDate: today,
    overallCondition: undefined,
    energyLevel: undefined,
    sleepQuality: undefined,
    sleepHours: undefined,
    stressLevel: undefined,
    medicationTaken: undefined,
    exerciseDone: undefined,
    notes: '',
  });

  useEffect(() => {
    if (existingJournal) {
      setFormData({
        recordedDate: today,
        overallCondition: existingJournal.overallCondition,
        energyLevel: existingJournal.energyLevel,
        sleepQuality: existingJournal.sleepQuality,
        sleepHours: existingJournal.sleepHours,
        stressLevel: existingJournal.stressLevel,
        medicationTaken: existingJournal.medicationTaken,
        exerciseDone: existingJournal.exerciseDone,
        notes: existingJournal.notes || '',
      });
    }
  }, [existingJournal]);

  const createMutation = useMutation({
    mutationFn: createJournal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal'] });
      queryClient.invalidateQueries({ queryKey: ['todayJournal'] });
      Alert.alert('저장 완료', '오늘의 건강 일지가 저장되었습니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    },
    onError: () => {
      Alert.alert('오류', '저장 중 오류가 발생했습니다.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateJournalDto> }) =>
      updateJournal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal'] });
      queryClient.invalidateQueries({ queryKey: ['todayJournal'] });
      Alert.alert('수정 완료', '건강 일지가 수정되었습니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    },
    onError: () => {
      Alert.alert('오류', '수정 중 오류가 발생했습니다.');
    },
  });

  const handleSave = () => {
    if (existingJournal) {
      updateMutation.mutate({ id: existingJournal.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const renderScaleSelector = (
    label: string,
    value: number | undefined,
    onChange: (val: number) => void,
    max: number = 10
  ) => (
    <View style={styles.scaleSection}>
      <Text style={styles.scaleLabel}>{label}</Text>
      <View style={styles.scaleButtons}>
        {Array.from({ length: max }, (_, i) => i + 1).map((num) => (
          <TouchableOpacity
            key={num}
            style={[
              styles.scaleButton,
              value === num && styles.scaleButtonActive,
            ]}
            onPress={() => onChange(num)}
          >
            <Text
              style={[
                styles.scaleButtonText,
                value === num && styles.scaleButtonTextActive,
              ]}
            >
              {num}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderBooleanSelector = (
    label: string,
    value: boolean | undefined,
    onChange: (val: boolean) => void
  ) => (
    <View style={styles.booleanSection}>
      <Text style={styles.booleanLabel}>{label}</Text>
      <View style={styles.booleanButtons}>
        <TouchableOpacity
          style={[
            styles.booleanButton,
            value === true && styles.booleanButtonActive,
          ]}
          onPress={() => onChange(true)}
        >
          <Text
            style={[
              styles.booleanButtonText,
              value === true && styles.booleanButtonTextActive,
            ]}
          >
            예
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.booleanButton,
            value === false && styles.booleanButtonActive,
          ]}
          onPress={() => onChange(false)}
        >
          <Text
            style={[
              styles.booleanButtonText,
              value === false && styles.booleanButtonTextActive,
            ]}
          >
            아니오
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backArrow}>← 뒤로</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>오늘의 건강 일지</Text>
          <Text style={styles.headerDate}>
            {format(new Date(), 'M월 d일 EEEE', { locale: ko })}
          </Text>
        </View>

        {/* 전반적 컨디션 */}
        {renderScaleSelector(
          '오늘의 전반적인 컨디션은 어떤가요?',
          formData.overallCondition,
          (val) => setFormData({ ...formData, overallCondition: val })
        )}

        {/* 에너지 수준 */}
        {renderScaleSelector(
          '에너지 수준은 어떤가요?',
          formData.energyLevel,
          (val) => setFormData({ ...formData, energyLevel: val })
        )}

        {/* 수면 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>수면</Text>
          <View style={styles.sleepRow}>
            <View style={styles.sleepInput}>
              <Text style={styles.inputLabel}>수면 시간</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                placeholder="7"
                value={formData.sleepHours?.toString() || ''}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    sleepHours: text ? parseFloat(text) : undefined,
                  })
                }
              />
              <Text style={styles.inputSuffix}>시간</Text>
            </View>
          </View>
          {renderScaleSelector(
            '수면 품질은 어땠나요?',
            formData.sleepQuality,
            (val) => setFormData({ ...formData, sleepQuality: val })
          )}
        </View>

        {/* 스트레스 */}
        {renderScaleSelector(
          '스트레스 수준은 어떤가요?',
          formData.stressLevel,
          (val) => setFormData({ ...formData, stressLevel: val })
        )}

        {/* 복약 여부 */}
        {renderBooleanSelector(
          '오늘 약을 복용하셨나요?',
          formData.medicationTaken,
          (val) => setFormData({ ...formData, medicationTaken: val })
        )}

        {/* 운동 여부 */}
        {renderBooleanSelector(
          '오늘 운동을 하셨나요?',
          formData.exerciseDone,
          (val) => setFormData({ ...formData, exerciseDone: val })
        )}

        {/* 메모 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘의 메모</Text>
          <TextInput
            style={styles.notesInput}
            multiline
            numberOfLines={4}
            placeholder="특이사항이나 기록하고 싶은 내용을 적어주세요..."
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
          />
        </View>

        {/* 저장 버튼 */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? '저장 중...' : existingJournal ? '수정하기' : '저장하기'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  backArrow: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '500',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerDate: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  scaleSection: {
    marginBottom: 24,
  },
  scaleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  scaleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scaleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  scaleButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  scaleButtonTextActive: {
    color: '#fff',
  },
  booleanSection: {
    marginBottom: 24,
  },
  booleanLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  booleanButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  booleanButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    alignItems: 'center',
  },
  booleanButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  booleanButtonText: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  booleanButtonTextActive: {
    color: '#fff',
  },
  sleepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sleepInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 12,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    width: 80,
    textAlign: 'center',
  },
  inputSuffix: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    height: 120,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
