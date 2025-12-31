import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const REMINDER_STORAGE_KEY = '@medication_reminders';
const SCHEDULED_NOTIFICATIONS_KEY = '@scheduled_notifications';

export interface MedicationReminder {
  id: string;
  patientId: string;
  prescriptionId?: string;
  title: string;
  reminderTime: string; // HH:mm
  reminderDays: number[]; // 0=일, 1=월, ... 6=토
  isActive: boolean;
  notes?: string;
  prescription?: {
    id: string;
    formulaName: string;
  };
}

export interface TodaySchedule {
  id: string;
  title: string;
  time: string;
  timeKorean: string;
  prescriptionId?: string;
  prescriptionName?: string;
  status: 'pending' | 'taken' | 'skipped' | 'missed';
  logId?: string;
}

interface ScheduledNotification {
  reminderId: string;
  notificationId: string;
  dayOfWeek: number;
}

// 알림 목록 조회
export const getReminders = async (): Promise<MedicationReminder[]> => {
  const response = await api.get('/patient-health/reminders');
  return response.data;
};

// 활성 알림 조회
export const getActiveReminders = async (): Promise<MedicationReminder[]> => {
  const response = await api.get('/patient-health/reminders/active');
  return response.data;
};

// 오늘의 복약 일정 조회
export const getTodaySchedule = async (): Promise<TodaySchedule[]> => {
  const response = await api.get('/patient-health/reminders/today');
  return response.data;
};

// 알림 생성
export const createReminder = async (data: {
  title: string;
  reminderTime: string;
  reminderDays?: number[];
  prescriptionId?: string;
  notes?: string;
}): Promise<MedicationReminder> => {
  const response = await api.post('/patient-health/reminders', data);
  const reminder = response.data;

  // 로컬 알림 스케줄링
  if (reminder.isActive) {
    await scheduleLocalNotifications(reminder);
  }

  return reminder;
};

// 알림 수정
export const updateReminder = async (
  id: string,
  data: Partial<{
    title: string;
    reminderTime: string;
    reminderDays: number[];
    isActive: boolean;
    notes: string;
  }>,
): Promise<MedicationReminder> => {
  const response = await api.patch(`/patient-health/reminders/${id}`, data);
  const reminder = response.data;

  // 기존 로컬 알림 취소 후 재스케줄링
  await cancelLocalNotifications(id);
  if (reminder.isActive) {
    await scheduleLocalNotifications(reminder);
  }

  return reminder;
};

// 알림 삭제
export const deleteReminder = async (id: string): Promise<void> => {
  await api.delete(`/patient-health/reminders/${id}`);
  await cancelLocalNotifications(id);
};

// 알림 토글
export const toggleReminder = async (id: string, isActive: boolean): Promise<MedicationReminder> => {
  return updateReminder(id, { isActive });
};

// 로컬 알림 스케줄링
export const scheduleLocalNotifications = async (reminder: MedicationReminder): Promise<void> => {
  const { id, title, reminderTime, reminderDays, prescription } = reminder;

  const [hours, minutes] = reminderTime.split(':').map(Number);
  const scheduledIds: ScheduledNotification[] = [];

  // 각 요일별로 알림 스케줄링
  for (const dayOfWeek of reminderDays) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: formatTimeKorean(reminderTime) + ' 복약 시간입니다',
          body: prescription ? `${prescription.formulaName}을(를) 복용해주세요.` : title,
          data: {
            type: 'medication',
            reminderId: id,
            prescriptionId: prescription?.id,
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          weekday: dayOfWeek === 0 ? 1 : dayOfWeek + 1, // expo는 1=일, 2=월, ...
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });

      scheduledIds.push({
        reminderId: id,
        notificationId,
        dayOfWeek,
      });
    } catch (error) {
      console.error(`알림 스케줄링 실패 (요일 ${dayOfWeek}):`, error);
    }
  }

  // 스케줄링된 알림 ID 저장
  await saveScheduledNotifications(id, scheduledIds);
};

// 로컬 알림 취소
export const cancelLocalNotifications = async (reminderId: string): Promise<void> => {
  const scheduled = await getScheduledNotifications(reminderId);

  for (const item of scheduled) {
    try {
      await Notifications.cancelScheduledNotificationAsync(item.notificationId);
    } catch (error) {
      console.error('알림 취소 실패:', error);
    }
  }

  await removeScheduledNotifications(reminderId);
};

// 모든 로컬 알림 취소
export const cancelAllLocalNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem(SCHEDULED_NOTIFICATIONS_KEY);
};

// 활성 알림 동기화 (앱 시작 시 호출)
export const syncReminders = async (): Promise<void> => {
  try {
    // 기존 스케줄된 알림 모두 취소
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(SCHEDULED_NOTIFICATIONS_KEY);

    // 서버에서 활성 알림 가져오기
    const reminders = await getActiveReminders();

    // 각 알림 재스케줄링
    for (const reminder of reminders) {
      await scheduleLocalNotifications(reminder);
    }

    console.log(`복약 알림 동기화 완료: ${reminders.length}건`);
  } catch (error) {
    console.error('복약 알림 동기화 실패:', error);
  }
};

// 스케줄된 알림 저장
const saveScheduledNotifications = async (
  reminderId: string,
  notifications: ScheduledNotification[],
): Promise<void> => {
  try {
    const stored = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
    const allNotifications: ScheduledNotification[] = stored ? JSON.parse(stored) : [];

    // 기존 항목 제거 후 새로 추가
    const filtered = allNotifications.filter((n) => n.reminderId !== reminderId);
    const updated = [...filtered, ...notifications];

    await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('알림 저장 실패:', error);
  }
};

// 스케줄된 알림 조회
const getScheduledNotifications = async (
  reminderId: string,
): Promise<ScheduledNotification[]> => {
  try {
    const stored = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
    if (!stored) return [];

    const all: ScheduledNotification[] = JSON.parse(stored);
    return all.filter((n) => n.reminderId === reminderId);
  } catch (error) {
    console.error('알림 조회 실패:', error);
    return [];
  }
};

// 스케줄된 알림 제거
const removeScheduledNotifications = async (reminderId: string): Promise<void> => {
  try {
    const stored = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
    if (!stored) return;

    const all: ScheduledNotification[] = JSON.parse(stored);
    const filtered = all.filter((n) => n.reminderId !== reminderId);

    await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('알림 제거 실패:', error);
  }
};

// 한국어 시간 포맷
const formatTimeKorean = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours < 12 ? '오전' : '오후';
  const displayHours = hours % 12 || 12;
  return `${period} ${displayHours}시${minutes > 0 ? ` ${minutes}분` : ''}`;
};

// 요일 레이블
export const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// 요일 포맷
export const formatDays = (days: number[]): string => {
  if (days.length === 7) return '매일';
  if (
    days.length === 5 &&
    days.includes(1) &&
    days.includes(2) &&
    days.includes(3) &&
    days.includes(4) &&
    days.includes(5)
  ) {
    return '평일';
  }
  if (days.length === 2 && days.includes(0) && days.includes(6)) {
    return '주말';
  }
  return days.map((d) => DAY_LABELS[d]).join(', ');
};

// 서비스 객체
export const medicationReminderService = {
  getReminders,
  getActiveReminders,
  getTodaySchedule,
  createReminder,
  updateReminder,
  deleteReminder,
  toggleReminder,
  scheduleLocalNotifications,
  cancelLocalNotifications,
  cancelAllLocalNotifications,
  syncReminders,
  formatDays,
  DAY_LABELS,
};
