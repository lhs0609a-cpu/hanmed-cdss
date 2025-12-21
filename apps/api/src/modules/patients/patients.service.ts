import { Injectable } from '@nestjs/common';

// 현재는 환자 정보를 세션에서만 관리 (DB 저장 X)
// 추후 환자 관리 기능 확장 시 엔티티 추가

@Injectable()
export class PatientsService {
  // 임시 메모리 저장소 (개발용)
  private patients: Map<string, any> = new Map();

  createSession(patientData: any) {
    const sessionId = `session_${Date.now()}`;
    this.patients.set(sessionId, {
      ...patientData,
      createdAt: new Date(),
    });
    return { sessionId, ...patientData };
  }

  getSession(sessionId: string) {
    return this.patients.get(sessionId);
  }

  updateSession(sessionId: string, data: any) {
    const existing = this.patients.get(sessionId);
    if (existing) {
      this.patients.set(sessionId, { ...existing, ...data });
    }
    return this.patients.get(sessionId);
  }

  deleteSession(sessionId: string) {
    return this.patients.delete(sessionId);
  }
}
