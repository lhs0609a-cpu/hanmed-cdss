import api from './api';

export type NotificationType =
  | 'reservation'
  | 'medication'
  | 'record'
  | 'prescription'
  | 'health_tip'
  | 'promotion'
  | 'system';

export interface PatientNotification {
  id: string;
  patientId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: {
    recordId?: string;
    prescriptionId?: string;
    reservationId?: string;
    clinicId?: string;
    actionUrl?: string;
  };
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationListResponse {
  data: PatientNotification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface NotificationSettings {
  reservationEnabled: boolean;
  medicationEnabled: boolean;
  recordEnabled: boolean;
  healthTipEnabled: boolean;
  promotionEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

// 알림 목록 조회
export const getNotifications = async (params?: {
  type?: NotificationType;
  isRead?: boolean;
  page?: number;
  limit?: number;
}): Promise<NotificationListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.type) queryParams.append('type', params.type);
  if (params?.isRead !== undefined) queryParams.append('isRead', params.isRead.toString());
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const response = await api.get(`/patient-notifications?${queryParams.toString()}`);
  return response.data;
};

// 읽지 않은 알림 수
export const getUnreadCount = async (): Promise<{ unreadCount: number }> => {
  const response = await api.get('/patient-notifications/unread-count');
  return response.data;
};

// 알림 읽음 처리
export const markAsRead = async (notificationIds: string[]): Promise<void> => {
  await api.post('/patient-notifications/mark-read', { notificationIds });
};

// 모든 알림 읽음 처리
export const markAllAsRead = async (): Promise<void> => {
  await api.post('/patient-notifications/mark-all-read');
};

// 알림 삭제
export const deleteNotification = async (notificationId: string): Promise<void> => {
  await api.delete(`/patient-notifications/${notificationId}`);
};

// 푸시 토큰 등록
export const registerPushToken = async (data: {
  pushToken: string;
  deviceType?: 'ios' | 'android' | 'web';
  deviceName?: string;
}): Promise<void> => {
  await api.post('/patient-notifications/push-token', data);
};

// 푸시 토큰 해제
export const unregisterPushToken = async (token: string): Promise<void> => {
  await api.delete(`/patient-notifications/push-token/${encodeURIComponent(token)}`);
};

// 알림 설정 조회
export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  const response = await api.get('/patient-notifications/settings');
  return response.data;
};

// 알림 설정 업데이트
export const updateNotificationSettings = async (
  settings: Partial<NotificationSettings>
): Promise<NotificationSettings> => {
  const response = await api.post('/patient-notifications/settings', settings);
  return response.data;
};

// 통합 서비스 객체
export const notificationService = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  registerPushToken,
  unregisterPushToken,
  getNotificationSettings,
  updateNotificationSettings,
};
