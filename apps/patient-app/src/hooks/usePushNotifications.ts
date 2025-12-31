import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { notificationService } from '../services/notificationService';

// 알림 표시 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  error: string | null;
}

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<string | null>(null);

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const appState = useRef(AppState.currentState);

  const { isAuthenticated, token } = useAuthStore();

  // 알림 채널 설정 (Android)
  const setupNotificationChannels = useCallback(async () => {
    if (Platform.OS === 'android') {
      // 기본 채널
      await Notifications.setNotificationChannelAsync('default', {
        name: '기본 알림',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
      });

      // 예약 알림 채널
      await Notifications.setNotificationChannelAsync('reservation', {
        name: '예약 알림',
        description: '예약 확인 및 리마인더',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
      });

      // 복약 알림 채널
      await Notifications.setNotificationChannelAsync('medication', {
        name: '복약 알림',
        description: '복약 시간 알림',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#2196F3',
        sound: 'default',
      });

      // 진료기록 채널
      await Notifications.setNotificationChannelAsync('record', {
        name: '진료기록 알림',
        description: '진료기록 공유 알림',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#9C27B0',
      });

      // 처방 채널
      await Notifications.setNotificationChannelAsync('prescription', {
        name: '처방 알림',
        description: '처방전 공유 알림',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#FF9800',
      });

      // 건강 팁 채널
      await Notifications.setNotificationChannelAsync('health_tip', {
        name: '건강 팁',
        description: '건강 관리 팁',
        importance: Notifications.AndroidImportance.LOW,
        lightColor: '#00BCD4',
      });

      // 시스템 채널
      await Notifications.setNotificationChannelAsync('system', {
        name: '시스템 알림',
        description: '시스템 공지사항',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#607D8B',
      });
    }
  }, []);

  // 푸시 토큰 등록
  const registerForPushNotifications = useCallback(async () => {
    if (!Device.isDevice) {
      setError('푸시 알림은 실제 기기에서만 작동합니다.');
      return null;
    }

    try {
      // 기존 권한 확인
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // 권한이 없으면 요청
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        setError('푸시 알림 권한이 거부되었습니다.');
        return null;
      }

      // 알림 채널 설정
      await setupNotificationChannels();

      // Expo 푸시 토큰 가져오기
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });

      const pushToken = tokenData.data;
      setExpoPushToken(pushToken);
      setError(null);

      return pushToken;
    } catch (err: any) {
      setError(err.message || '푸시 토큰 등록 실패');
      return null;
    }
  }, [setupNotificationChannels]);

  // 서버에 토큰 등록
  const registerTokenToServer = useCallback(async (pushToken: string) => {
    if (!isAuthenticated || !token) return;

    try {
      await notificationService.registerPushToken({
        pushToken,
        deviceType: Platform.OS as 'ios' | 'android',
        deviceName: Device.deviceName || undefined,
      });
      console.log('푸시 토큰 서버 등록 완료');
    } catch (err) {
      console.error('푸시 토큰 서버 등록 실패:', err);
    }
  }, [isAuthenticated, token]);

  // 알림 클릭 시 화면 이동
  const handleNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;

    if (!data) return;

    const { type, recordId, prescriptionId, reservationId, notificationId } = data as any;

    // 알림 읽음 처리
    if (notificationId) {
      notificationService.markAsRead([notificationId]).catch(console.error);
    }

    // 화면 이동
    switch (type) {
      case 'record':
        if (recordId) router.push(`/record/${recordId}`);
        break;
      case 'prescription':
        if (prescriptionId) router.push(`/prescription/${prescriptionId}`);
        break;
      case 'reservation':
      case 'reservation_reminder':
        router.push('/(tabs)/reservations');
        break;
      case 'medication':
        router.push('/(tabs)/health');
        break;
      case 'health_tip':
        router.push('/(tabs)/health');
        break;
      default:
        router.push('/(tabs)/');
    }
  }, []);

  // 초기화
  useEffect(() => {
    const initPush = async () => {
      const pushToken = await registerForPushNotifications();
      if (pushToken) {
        await registerTokenToServer(pushToken);
      }
    };

    if (isAuthenticated) {
      initPush();
    }

    // 알림 수신 리스너
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    // 알림 클릭 리스너
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    // 앱 상태 변경 리스너 (백그라운드 -> 포그라운드)
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // 앱이 포그라운드로 돌아올 때 뱃지 초기화
        await Notifications.setBadgeCountAsync(0);
      }
      appState.current = nextAppState;
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      subscription.remove();
    };
  }, [isAuthenticated, registerForPushNotifications, registerTokenToServer, handleNotificationResponse]);

  // 로그아웃 시 토큰 해제
  const unregisterPushToken = useCallback(async () => {
    if (expoPushToken) {
      try {
        await notificationService.unregisterPushToken(expoPushToken);
        setExpoPushToken(null);
      } catch (err) {
        console.error('푸시 토큰 해제 실패:', err);
      }
    }
  }, [expoPushToken]);

  return {
    expoPushToken,
    notification,
    error,
    registerForPushNotifications,
    unregisterPushToken,
  };
}

// 로컬 알림 스케줄링 (복약 알림 등)
export async function scheduleLocalNotification(
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput,
  data?: Record<string, any>,
  channelId: string = 'default',
) {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger,
    });
    return id;
  } catch (error) {
    console.error('로컬 알림 스케줄링 실패:', error);
    return null;
  }
}

// 특정 알림 취소
export async function cancelScheduledNotification(notificationId: string) {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

// 모든 예정된 알림 취소
export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// 복약 알림 스케줄링
export async function scheduleMedicationReminder(
  reminderId: string,
  formulaName: string,
  hour: number,
  minute: number,
  repeatDaily: boolean = true,
) {
  const trigger: Notifications.NotificationTriggerInput = repeatDaily
    ? {
        hour,
        minute,
        repeats: true,
      }
    : {
        date: new Date(
          new Date().setHours(hour, minute, 0, 0)
        ),
      };

  return scheduleLocalNotification(
    '복약 시간입니다',
    `${formulaName}을(를) 복용해주세요.`,
    trigger,
    { type: 'medication', reminderId },
    'medication',
  );
}
