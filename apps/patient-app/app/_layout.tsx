import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../src/stores/authStore';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { medicationReminderService } from '../src/services/medicationReminderService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 2,
    },
  },
});

// 딥링크 URL 파싱 및 라우팅
const handleDeepLink = (url: string) => {
  const parsed = Linking.parse(url);
  const { path, queryParams } = parsed;

  if (!path) return;

  // 진료 기록 링크
  if (path.startsWith('record/')) {
    const recordId = path.replace('record/', '');
    router.push(`/record/${recordId}`);
  }
  // 처방 링크
  else if (path.startsWith('prescription/')) {
    const prescriptionId = path.replace('prescription/', '');
    router.push(`/prescription/${prescriptionId}`);
  }
  // 다운로드 링크 (앱 설치 후 진입)
  else if (path === 'download' && queryParams?.redirect) {
    const redirectPath = queryParams.redirect as string;
    router.push(redirectPath);
  }
};

export default function RootLayout() {
  const loadStoredAuth = useAuthStore((state) => state.loadStoredAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // 푸시 알림 초기화 (인증 상태에 따라 자동 등록)
  const { expoPushToken, notification, error: pushError } = usePushNotifications();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  // 푸시 토큰 디버그 로깅
  useEffect(() => {
    if (expoPushToken) {
      console.log('Expo Push Token:', expoPushToken);
    }
    if (pushError) {
      console.warn('Push Error:', pushError);
    }
  }, [expoPushToken, pushError]);

  // 복약 알림 동기화 (인증 후)
  useEffect(() => {
    if (isAuthenticated) {
      medicationReminderService.syncReminders().catch(console.error);
    }
  }, [isAuthenticated]);

  // 딥링크 처리
  useEffect(() => {
    // 앱이 이미 실행 중일 때 링크 처리
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // 앱이 링크로 시작됐을 때 처리
    Linking.getInitialURL().then((url) => {
      if (url) {
        // 인증 상태 확인 후 딥링크 처리
        setTimeout(() => {
          if (isAuthenticated) {
            handleDeepLink(url);
          } else {
            // 로그인 필요 시 URL 저장 후 로그인 화면으로
            // TODO: 로그인 후 리다이렉트 구현
          }
        }, 500);
      }
    });

    return () => subscription.remove();
  }, [isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="clinic/[id]"
          options={{
            headerShown: true,
            headerTitle: '한의원 상세',
            headerBackTitle: '뒤로',
          }}
        />
        <Stack.Screen
          name="reservation/new"
          options={{
            headerShown: true,
            headerTitle: '예약하기',
            headerBackTitle: '뒤로',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="reservation/[id]"
          options={{
            headerShown: true,
            headerTitle: '예약 상세',
            headerBackTitle: '뒤로',
          }}
        />
        <Stack.Screen
          name="record/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="prescription/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="health/journal"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="settings/notifications"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="health/reminders"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="health/report"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
