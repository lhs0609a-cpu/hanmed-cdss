import api, { saveTokens, clearTokens } from './api';
import type { PatientAccount, AuthResponse } from '../types';

// 인증번호 발송
export const sendVerificationCode = async (
  phone: string,
  purpose: 'register' | 'login' | 'password_reset' = 'register',
) => {
  const response = await api.post('/patient/auth/send-verification', {
    phone,
    purpose,
  });
  return response.data;
};

// 인증번호 확인
export const verifyCode = async (phone: string, code: string) => {
  const response = await api.post('/patient/auth/verify-code', {
    phone,
    code,
  });
  return response.data;
};

// 회원가입
export const register = async (data: {
  phone: string;
  verificationCode: string;
  password: string;
  name: string;
  birthDate: string;
  gender?: 'male' | 'female';
  email?: string;
}): Promise<AuthResponse> => {
  const response = await api.post('/patient/auth/register', data);
  const authData = response.data;

  // 토큰 저장
  await saveTokens(authData.accessToken, authData.refreshToken);

  return authData;
};

// 로그인
export const login = async (phone: string, password: string): Promise<AuthResponse> => {
  const response = await api.post('/patient/auth/login', {
    phone,
    password,
  });
  const authData = response.data;

  // 토큰 저장
  await saveTokens(authData.accessToken, authData.refreshToken);

  return authData;
};

// 로그아웃
export const logout = async () => {
  await clearTokens();
};

// 프로필 조회
export const getProfile = async (): Promise<PatientAccount> => {
  const response = await api.get('/patient/auth/profile');
  return response.data;
};

// 프로필 수정
export const updateProfile = async (
  data: Partial<PatientAccount>,
): Promise<PatientAccount> => {
  const response = await api.patch('/patient/auth/profile', data);
  return response.data;
};

// FCM 토큰 업데이트
export const updateFcmToken = async (fcmToken: string) => {
  const response = await api.patch('/patient/auth/fcm-token', { fcmToken });
  return response.data;
};
