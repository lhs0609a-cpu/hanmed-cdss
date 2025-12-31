import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  medicationReminderService,
  MedicationReminder,
  DAY_LABELS,
} from '../../src/services/medicationReminderService';

export default function MedicationRemindersScreen() {
  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState<MedicationReminder | null>(null);
  const [saving, setSaving] = useState(false);

  // 폼 상태
  const [title, setTitle] = useState('');
  const [reminderTime, setReminderTime] = useState(new Date());
  const [reminderDays, setReminderDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [notes, setNotes] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const data = await medicationReminderService.getReminders();
      setReminders(data);
    } catch (error) {
      console.error('알림 로드 실패:', error);
      Alert.alert('오류', '알림 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReminders();
    setRefreshing(false);
  }, []);

  const handleToggle = async (reminder: MedicationReminder) => {
    try {
      const updated = await medicationReminderService.toggleReminder(
        reminder.id,
        !reminder.isActive,
      );
      setReminders((prev) =>
        prev.map((r) => (r.id === reminder.id ? updated : r)),
      );
    } catch (error) {
      console.error('토글 실패:', error);
      Alert.alert('오류', '알림 상태 변경에 실패했습니다.');
    }
  };

  const handleDelete = (reminder: MedicationReminder) => {
    Alert.alert(
      '알림 삭제',
      '이 복약 알림을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await medicationReminderService.deleteReminder(reminder.id);
              setReminders((prev) => prev.filter((r) => r.id !== reminder.id));
            } catch (error) {
              console.error('삭제 실패:', error);
              Alert.alert('오류', '알림 삭제에 실패했습니다.');
            }
          },
        },
      ],
    );
  };

  const openModal = (reminder?: MedicationReminder) => {
    if (reminder) {
      setEditingReminder(reminder);
      setTitle(reminder.title);
      const [hours, minutes] = reminder.reminderTime.split(':').map(Number);
      const time = new Date();
      time.setHours(hours, minutes, 0, 0);
      setReminderTime(time);
      setReminderDays(reminder.reminderDays);
      setNotes(reminder.notes || '');
    } else {
      setEditingReminder(null);
      setTitle('');
      setReminderTime(new Date());
      setReminderDays([0, 1, 2, 3, 4, 5, 6]);
      setNotes('');
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingReminder(null);
    setShowTimePicker(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('알림', '알림 이름을 입력해주세요.');
      return;
    }

    if (reminderDays.length === 0) {
      Alert.alert('알림', '최소 하나의 요일을 선택해주세요.');
      return;
    }

    setSaving(true);
    try {
      const timeString = `${String(reminderTime.getHours()).padStart(2, '0')}:${String(reminderTime.getMinutes()).padStart(2, '0')}`;

      if (editingReminder) {
        const updated = await medicationReminderService.updateReminder(editingReminder.id, {
          title: title.trim(),
          reminderTime: timeString,
          reminderDays,
          notes: notes.trim() || undefined,
        });
        setReminders((prev) =>
          prev.map((r) => (r.id === editingReminder.id ? updated : r)),
        );
      } else {
        const created = await medicationReminderService.createReminder({
          title: title.trim(),
          reminderTime: timeString,
          reminderDays,
          notes: notes.trim() || undefined,
        });
        setReminders((prev) => [...prev, created]);
      }

      closeModal();
    } catch (error) {
      console.error('저장 실패:', error);
      Alert.alert('오류', '알림 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    setReminderDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours < 12 ? '오전' : '오후';
    const displayHours = hours % 12 || 12;
    return `${period} ${displayHours}:${String(minutes).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>복약 알림</Text>
        <TouchableOpacity onPress={() => openModal()} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#10B981" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {reminders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="alarm-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>등록된 알림이 없습니다</Text>
            <Text style={styles.emptyDescription}>
              복약 알림을 추가하여{'\n'}약 복용 시간을 놓치지 마세요
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => openModal()}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>알림 추가</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.reminderList}>
            {reminders.map((reminder) => (
              <View key={reminder.id} style={styles.reminderCard}>
                <TouchableOpacity
                  style={styles.reminderContent}
                  onPress={() => openModal(reminder)}
                >
                  <View style={styles.reminderMain}>
                    <Text style={[
                      styles.reminderTime,
                      !reminder.isActive && styles.disabledText,
                    ]}>
                      {formatTime(
                        (() => {
                          const [h, m] = reminder.reminderTime.split(':').map(Number);
                          const d = new Date();
                          d.setHours(h, m);
                          return d;
                        })(),
                      )}
                    </Text>
                    <Text style={[
                      styles.reminderTitle,
                      !reminder.isActive && styles.disabledText,
                    ]}>
                      {reminder.title}
                    </Text>
                    <Text style={styles.reminderDays}>
                      {medicationReminderService.formatDays(reminder.reminderDays)}
                    </Text>
                    {reminder.prescription && (
                      <View style={styles.prescriptionBadge}>
                        <Ionicons name="medical" size={12} color="#10B981" />
                        <Text style={styles.prescriptionName}>
                          {reminder.prescription.formulaName}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.reminderActions}>
                    <Switch
                      value={reminder.isActive}
                      onValueChange={() => handleToggle(reminder)}
                      trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
                      thumbColor={reminder.isActive ? '#10B981' : '#9CA3AF'}
                    />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(reminder)}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* 알림 추가/수정 모달 */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.modalCancel}>취소</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingReminder ? '알림 수정' : '새 알림'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <Text style={styles.modalSave}>저장</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* 시간 선택 */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>알림 시간</Text>
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={24} color="#10B981" />
                <Text style={styles.timeText}>{formatTime(reminderTime)}</Text>
              </TouchableOpacity>
              {(showTimePicker || Platform.OS === 'ios') && (
                <DateTimePicker
                  value={reminderTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowTimePicker(Platform.OS === 'ios');
                    if (date) setReminderTime(date);
                  }}
                  locale="ko"
                />
              )}
            </View>

            {/* 요일 선택 */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>반복 요일</Text>
              <View style={styles.daysContainer}>
                {DAY_LABELS.map((label, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayButton,
                      reminderDays.includes(index) && styles.dayButtonActive,
                    ]}
                    onPress={() => toggleDay(index)}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        reminderDays.includes(index) && styles.dayButtonTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.quickDays}>
                <TouchableOpacity
                  style={styles.quickDayButton}
                  onPress={() => setReminderDays([0, 1, 2, 3, 4, 5, 6])}
                >
                  <Text style={styles.quickDayText}>매일</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDayButton}
                  onPress={() => setReminderDays([1, 2, 3, 4, 5])}
                >
                  <Text style={styles.quickDayText}>평일</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDayButton}
                  onPress={() => setReminderDays([0, 6])}
                >
                  <Text style={styles.quickDayText}>주말</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 알림 이름 */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>알림 이름</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="예: 아침 복약"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* 메모 */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>메모 (선택)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="복용 관련 메모를 입력하세요"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  addButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reminderList: {
    padding: 16,
    gap: 12,
  },
  reminderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reminderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderMain: {
    flex: 1,
  },
  reminderTime: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginTop: 4,
  },
  reminderDays: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  prescriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  prescriptionName: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  reminderActions: {
    marginLeft: 12,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  disabledText: {
    color: '#9CA3AF',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalCancel: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  timeText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: '#10B981',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  dayButtonTextActive: {
    color: '#FFFFFF',
  },
  quickDays: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  quickDayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  quickDayText: {
    fontSize: 13,
    color: '#6B7280',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
});
