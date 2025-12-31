import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getClinicById,
  getClinicAvailability,
  getClinicPractitioners,
} from '../../src/services/clinicService';
import { createReservation } from '../../src/services/reservationService';
import { useReservationStore } from '../../src/stores/reservationStore';
import { format, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getErrorMessage } from '../../src/services/api';

export default function NewReservationScreen() {
  const { newReservation, updateNewReservation, resetNewReservation, addReservation } =
    useReservationStore();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedPractitioner, setSelectedPractitioner] = useState<string | null>(null);
  const [visitType, setVisitType] = useState<'initial' | 'follow_up'>('initial');
  const [visitReason, setVisitReason] = useState('');
  const [symptomsNote, setSymptomsNote] = useState('');

  const clinicId = newReservation.clinicId;

  // 한의원 정보
  const { data: clinic } = useQuery({
    queryKey: ['clinic', clinicId],
    queryFn: () => getClinicById(clinicId!),
    enabled: !!clinicId,
  });

  // 의료진 목록
  const { data: practitioners } = useQuery({
    queryKey: ['practitioners', clinicId],
    queryFn: () => getClinicPractitioners(clinicId!),
    enabled: !!clinicId,
  });

  // 예약 가능 시간
  const startDate = format(new Date(), 'yyyy-MM-dd');
  const endDate = format(addDays(new Date(), 14), 'yyyy-MM-dd');

  const { data: availability, isLoading: availabilityLoading } = useQuery({
    queryKey: ['availability', clinicId, startDate, endDate, selectedPractitioner],
    queryFn: () =>
      getClinicAvailability(
        clinicId!,
        startDate,
        endDate,
        selectedPractitioner || undefined,
      ),
    enabled: !!clinicId,
  });

  // 예약 생성
  const createMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: (data) => {
      addReservation(data);
      resetNewReservation();
      Alert.alert('예약 완료', '예약이 접수되었습니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      Alert.alert('예약 실패', getErrorMessage(error));
    },
  });

  // 날짜 목록 생성
  const dates = [];
  for (let i = 0; i < 14; i++) {
    const date = addDays(new Date(), i);
    dates.push({
      value: format(date, 'yyyy-MM-dd'),
      display: format(date, 'M/d'),
      weekday: format(date, 'EEE', { locale: ko }),
    });
  }

  const handleSubmit = () => {
    if (!clinicId || !selectedDate || !selectedTime) {
      Alert.alert('알림', '날짜와 시간을 선택해주세요.');
      return;
    }

    createMutation.mutate({
      clinicId,
      practitionerId: selectedPractitioner || undefined,
      reservationDate: selectedDate,
      reservationTime: selectedTime,
      visitType,
      visitReason: visitReason || undefined,
      symptomsNote: symptomsNote || undefined,
    });
  };

  if (!clinicId) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>한의원을 먼저 선택해주세요.</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => router.push('/(tabs)/search')}
        >
          <Text style={styles.errorButtonText}>한의원 찾기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* 한의원 정보 */}
      <View style={styles.clinicInfo}>
        <Text style={styles.clinicName}>{clinic?.name || '한의원'}</Text>
        {clinic?.addressRoad && (
          <Text style={styles.clinicAddress}>{clinic.addressRoad}</Text>
        )}
      </View>

      {/* 의료진 선택 */}
      {practitioners && practitioners.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>의료진 선택 (선택사항)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.practitionerChip,
                !selectedPractitioner && styles.practitionerChipActive,
              ]}
              onPress={() => setSelectedPractitioner(null)}
            >
              <Text
                style={[
                  styles.practitionerChipText,
                  !selectedPractitioner && styles.practitionerChipTextActive,
                ]}
              >
                무관
              </Text>
            </TouchableOpacity>
            {practitioners.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.practitionerChip,
                  selectedPractitioner === p.userId && styles.practitionerChipActive,
                ]}
                onPress={() => setSelectedPractitioner(p.userId)}
              >
                <Text
                  style={[
                    styles.practitionerChipText,
                    selectedPractitioner === p.userId &&
                      styles.practitionerChipTextActive,
                  ]}
                >
                  {p.displayName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 날짜 선택 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>날짜 선택</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {dates.map((date) => {
            const hasSlots =
              availability?.slots?.[date.value]?.length > 0;
            return (
              <TouchableOpacity
                key={date.value}
                style={[
                  styles.dateChip,
                  selectedDate === date.value && styles.dateChipActive,
                  !hasSlots && styles.dateChipDisabled,
                ]}
                onPress={() => {
                  if (hasSlots) {
                    setSelectedDate(date.value);
                    setSelectedTime(null);
                  }
                }}
                disabled={!hasSlots}
              >
                <Text
                  style={[
                    styles.dateWeekday,
                    selectedDate === date.value && styles.dateTextActive,
                    !hasSlots && styles.dateTextDisabled,
                  ]}
                >
                  {date.weekday}
                </Text>
                <Text
                  style={[
                    styles.dateDisplay,
                    selectedDate === date.value && styles.dateTextActive,
                    !hasSlots && styles.dateTextDisabled,
                  ]}
                >
                  {date.display}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 시간 선택 */}
      {selectedDate && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>시간 선택</Text>
          {availabilityLoading ? (
            <ActivityIndicator color="#10b981" />
          ) : (
            <View style={styles.timeGrid}>
              {availability?.slots?.[selectedDate]?.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeChip,
                    selectedTime === time && styles.timeChipActive,
                  ]}
                  onPress={() => setSelectedTime(time)}
                >
                  <Text
                    style={[
                      styles.timeText,
                      selectedTime === time && styles.timeTextActive,
                    ]}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* 방문 유형 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>방문 유형</Text>
        <View style={styles.visitTypeContainer}>
          <TouchableOpacity
            style={[
              styles.visitTypeButton,
              visitType === 'initial' && styles.visitTypeActive,
            ]}
            onPress={() => setVisitType('initial')}
          >
            <Text
              style={[
                styles.visitTypeText,
                visitType === 'initial' && styles.visitTypeTextActive,
              ]}
            >
              초진
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.visitTypeButton,
              visitType === 'follow_up' && styles.visitTypeActive,
            ]}
            onPress={() => setVisitType('follow_up')}
          >
            <Text
              style={[
                styles.visitTypeText,
                visitType === 'follow_up' && styles.visitTypeTextActive,
              ]}
            >
              재진
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 방문 사유 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>방문 사유</Text>
        <TextInput
          style={styles.textInput}
          placeholder="방문 사유를 입력해주세요"
          value={visitReason}
          onChangeText={setVisitReason}
          multiline
        />
      </View>

      {/* 증상 메모 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>증상 메모 (선택사항)</Text>
        <TextInput
          style={[styles.textInput, styles.textInputLarge]}
          placeholder="현재 겪고 계신 증상을 자세히 적어주시면 진료에 도움이 됩니다."
          value={symptomsNote}
          onChangeText={setSymptomsNote}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* 예약 버튼 */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedDate || !selectedTime || createMutation.isPending) &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedDate || !selectedTime || createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>예약하기</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  errorButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  clinicInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  clinicName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  clinicAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  practitionerChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  practitionerChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  practitionerChipText: {
    fontSize: 14,
    color: '#6b7280',
  },
  practitionerChipTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  dateChip: {
    width: 64,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
    alignItems: 'center',
  },
  dateChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  dateChipDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#f3f4f6',
  },
  dateWeekday: {
    fontSize: 12,
    color: '#6b7280',
  },
  dateDisplay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 4,
  },
  dateTextActive: {
    color: '#fff',
  },
  dateTextDisabled: {
    color: '#d1d5db',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timeChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  timeText: {
    fontSize: 14,
    color: '#374151',
  },
  timeTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  visitTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  visitTypeButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  visitTypeActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  visitTypeText: {
    fontSize: 15,
    color: '#6b7280',
  },
  visitTypeTextActive: {
    color: '#10b981',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
  textInputLarge: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actions: {
    padding: 16,
  },
  submitButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
});
