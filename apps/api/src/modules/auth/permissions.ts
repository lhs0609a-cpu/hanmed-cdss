import { PractitionerRole } from '../../database/entities/clinic-practitioner.entity';

/**
 * 한의원 직원 권한 매트릭스.
 *
 * 2,000명 동시 사용 환경에서 직역별 책임 분리가 필요하다.
 * - OWNER: 원장 — 모든 권한 (직원 관리, 청구 결재 포함)
 * - PRACTITIONER: 한의사 — 진료/처방/AI 추천 가능, 청구 결재만 X
 * - RECEPTIONIST: 접수/데스크 — 환자 등록·예약, 진료 기록 읽기만
 * - BILLING: 청구 담당 — 청구 작성·제출 전담, 진료 X
 * - NURSE: 간호조무사 — 환자 등록·생체신호 입력, 처방 X
 * - VIEWER: 읽기 전용 — 모든 쓰기 차단
 */
export enum Permission {
  // 환자
  PATIENT_READ = 'patient:read',
  PATIENT_CREATE = 'patient:create',
  PATIENT_UPDATE = 'patient:update',
  PATIENT_DELETE = 'patient:delete',

  // 예약
  RESERVATION_READ = 'reservation:read',
  RESERVATION_CREATE = 'reservation:create',
  RESERVATION_UPDATE = 'reservation:update',

  // 진료 기록 / 차트
  CHART_READ = 'chart:read',
  CHART_WRITE = 'chart:write',

  // 처방
  PRESCRIPTION_READ = 'prescription:read',
  PRESCRIPTION_WRITE = 'prescription:write',

  // AI 추천 사용
  AI_USE = 'ai:use',

  // 생체신호/바이탈
  VITALS_READ = 'vitals:read',
  VITALS_WRITE = 'vitals:write',

  // 청구
  BILLING_READ = 'billing:read',
  BILLING_WRITE = 'billing:write',     // 청구 작성
  BILLING_SUBMIT = 'billing:submit',   // 외부 제출
  BILLING_APPROVE = 'billing:approve', // 결재 — OWNER 만

  // 직원/감사
  STAFF_MANAGE = 'staff:manage',       // 직원 추가/역할 변경 — OWNER 만
  AUDIT_READ = 'audit:read',           // 한의원 감사 로그 조회 — OWNER 만
}

const READ_ONLY: Permission[] = [
  Permission.PATIENT_READ,
  Permission.RESERVATION_READ,
  Permission.CHART_READ,
  Permission.PRESCRIPTION_READ,
  Permission.VITALS_READ,
  Permission.BILLING_READ,
];

const ALL_PERMISSIONS: Permission[] = Object.values(Permission);

export const ROLE_PERMISSIONS: Record<PractitionerRole, Permission[]> = {
  [PractitionerRole.OWNER]: ALL_PERMISSIONS,

  [PractitionerRole.PRACTITIONER]: [
    Permission.PATIENT_READ,
    Permission.PATIENT_CREATE,
    Permission.PATIENT_UPDATE,
    Permission.RESERVATION_READ,
    Permission.RESERVATION_CREATE,
    Permission.RESERVATION_UPDATE,
    Permission.CHART_READ,
    Permission.CHART_WRITE,
    Permission.PRESCRIPTION_READ,
    Permission.PRESCRIPTION_WRITE,
    Permission.AI_USE,
    Permission.VITALS_READ,
    Permission.VITALS_WRITE,
    Permission.BILLING_READ,
    // 청구 결재(BILLING_APPROVE) 제외 — OWNER 전용
  ],

  [PractitionerRole.RECEPTIONIST]: [
    Permission.PATIENT_READ,
    Permission.PATIENT_CREATE,
    Permission.PATIENT_UPDATE,
    Permission.RESERVATION_READ,
    Permission.RESERVATION_CREATE,
    Permission.RESERVATION_UPDATE,
    Permission.CHART_READ, // 진료 기록 읽기만
    // 처방·진료 쓰기 차단
  ],

  [PractitionerRole.BILLING]: [
    Permission.PATIENT_READ,
    Permission.CHART_READ, // 진단명 조회 (청구코드 매핑용)
    Permission.PRESCRIPTION_READ,
    Permission.BILLING_READ,
    Permission.BILLING_WRITE,
    Permission.BILLING_SUBMIT,
  ],

  [PractitionerRole.NURSE]: [
    Permission.PATIENT_READ,
    Permission.PATIENT_CREATE,
    Permission.PATIENT_UPDATE,
    Permission.RESERVATION_READ,
    Permission.CHART_READ,
    Permission.VITALS_READ,
    Permission.VITALS_WRITE,
    // 처방 쓰기 차단
  ],

  [PractitionerRole.VIEWER]: READ_ONLY,
};

export function hasPermission(role: PractitionerRole, permission: Permission): boolean {
  const granted = ROLE_PERMISSIONS[role];
  if (!granted) return false;
  return granted.includes(permission);
}

export function hasAnyPermission(role: PractitionerRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: PractitionerRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}
