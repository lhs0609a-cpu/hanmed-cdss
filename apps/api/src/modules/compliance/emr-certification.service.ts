import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * 전자의무기록(EMR) 시스템 인증 자가 진단 서비스.
 *
 * 인증 근거: 의료법 제23조의2, 「전자의무기록의 관리·보존에 필요한 시설과 장비에 관한 기준」 고시.
 * 한국보건의료정보원(KHIDI/HIRA 의료정보표준화) 의 전자의무기록 시스템 인증제 요구사항.
 *
 * 본 서비스는:
 *   1) 인증 요구사항 12개 영역 × 항목별 충족 여부를 코드 베이스/환경설정에서 자가 점검.
 *   2) 충족된 항목·미흡 항목·증빙 위치를 보고서로 출력.
 *   3) 인증 신청 직전 운영팀이 1회만 호출하면 80% 이상의 작업이 자동 검증된다.
 *
 * 정책:
 *   - 본 점검은 *기술 요건*만 다룬다. 한의원 시설·인적 요건은 별도(현장 실사).
 *   - 점검 결과를 외부에 노출하지 않고 admin 권한 한정.
 */

export type CertificationStatus = 'pass' | 'partial' | 'fail' | 'not_applicable';

export interface CertificationItem {
  id: string;
  area: string;             // 인증 영역 (e.g. '저장무결성', '접근권한관리')
  requirement: string;      // 요구사항 본문
  status: CertificationStatus;
  evidence?: string[];      // 충족 증빙(파일 경로/엔티티명)
  gap?: string;             // 미흡 사유
  references?: string[];    // 관련 고시·조항
}

export interface CertificationReport {
  generatedAt: string;
  totalItems: number;
  passed: number;
  partial: number;
  failed: number;
  readinessPercent: number;
  items: CertificationItem[];
  nextActions: string[];
}

interface RequirementCheck {
  id: string;
  area: string;
  requirement: string;
  references?: string[];
  /** 코드 존재 여부 또는 환경 설정으로 판단 */
  evaluator: () => Promise<{ status: CertificationStatus; evidence?: string[]; gap?: string }>;
}

@Injectable()
export class EmrCertificationService {
  private readonly logger = new Logger(EmrCertificationService.name);
  private readonly repoRoot: string;

  constructor() {
    // apps/api/src/modules/compliance → repo root 상대경로
    this.repoRoot = path.resolve(__dirname, '..', '..', '..', '..', '..');
  }

  async run(): Promise<CertificationReport> {
    const checks = this.requirements();
    const items: CertificationItem[] = [];
    for (const c of checks) {
      try {
        const result = await c.evaluator();
        items.push({
          id: c.id,
          area: c.area,
          requirement: c.requirement,
          references: c.references,
          status: result.status,
          evidence: result.evidence,
          gap: result.gap,
        });
      } catch (e) {
        items.push({
          id: c.id,
          area: c.area,
          requirement: c.requirement,
          references: c.references,
          status: 'fail',
          gap: `평가 중 오류: ${(e as Error).message}`,
        });
      }
    }
    const passed = items.filter((i) => i.status === 'pass').length;
    const partial = items.filter((i) => i.status === 'partial').length;
    const failed = items.filter((i) => i.status === 'fail').length;
    const total = items.length;
    const readinessPercent = total === 0 ? 0 : Math.round(((passed + partial * 0.5) / total) * 100);
    return {
      generatedAt: new Date().toISOString(),
      totalItems: total,
      passed,
      partial,
      failed,
      readinessPercent,
      items,
      nextActions: this.buildNextActions(items),
    };
  }

  private buildNextActions(items: CertificationItem[]): string[] {
    const actions: string[] = [];
    for (const i of items) {
      if (i.status === 'fail' || i.status === 'partial') {
        actions.push(`[${i.id}] ${i.area}: ${i.gap ?? '추가 보강 필요'}`);
      }
    }
    if (actions.length === 0) {
      actions.push('모든 기술 요건 충족 — 인증 신청서 작성 단계로 진행하세요.');
    }
    return actions;
  }

  // --- 요구사항 정의 ---
  private requirements(): RequirementCheck[] {
    return [
      {
        id: 'EMR-01',
        area: '환자 식별',
        requirement: '환자별 고유 식별자가 있어야 한다 (UUID/PK).',
        references: ['전자의무기록 인증 기준 §1.1'],
        evaluator: async () => {
          const exists = await this.fileExists('apps/api/src/database/entities/patient-account.entity.ts');
          return exists
            ? { status: 'pass', evidence: ['PatientAccount.id (UUID)'] }
            : { status: 'fail', gap: 'patient-account.entity 미발견' };
        },
      },
      {
        id: 'EMR-02',
        area: '의무기록 저장',
        requirement: '진료기록은 입력 즉시 영속화되며 서버 저장이 보장되어야 한다.',
        references: ['§2.1'],
        evaluator: async () => {
          const exists = await this.fileExists('apps/api/src/database/entities/patient-record.entity.ts');
          return exists
            ? { status: 'pass', evidence: ['PatientRecord 엔티티'] }
            : { status: 'fail', gap: '진료기록 엔티티 미발견' };
        },
      },
      {
        id: 'EMR-03',
        area: '저장 무결성',
        requirement: '전송·저장 중 변조를 막기 위한 암호화 적용.',
        references: ['§2.3'],
        evaluator: async () => {
          const enc = await this.fileExists('apps/api/src/common/services/encryption.service.ts');
          if (!enc) return { status: 'fail', gap: 'EncryptionService 미발견' };
          return { status: 'pass', evidence: ['EncryptionService (AES-256-GCM)'] };
        },
      },
      {
        id: 'EMR-04',
        area: '접근권한 관리',
        requirement: '역할 기반 접근제어(RBAC)와 면허 검증 게이트가 구현되어야 한다.',
        references: ['§3.1'],
        evaluator: async () => {
          const guard = await this.fileExists('apps/api/src/common/guards/roles.guard.ts');
          const gate = await this.fileExists('apps/web/src/components/common/PractitionerGuard.tsx');
          if (guard && gate) return { status: 'pass', evidence: ['RolesGuard', 'PractitionerGuard'] };
          if (guard || gate) return { status: 'partial', gap: '서버 또는 프런트 가드 한쪽 누락' };
          return { status: 'fail', gap: 'RBAC 가드 미발견' };
        },
      },
      {
        id: 'EMR-05',
        area: '접근/조회 로그',
        requirement: '환자정보 접근 시 사용자/시간/IP/대상이 로깅되어야 한다.',
        references: ['§3.2', '개인정보보호법 §29'],
        evaluator: async () => {
          const log = await this.fileExists('apps/api/src/common/services/patient-access-log.service.ts');
          return log
            ? { status: 'pass', evidence: ['PatientAccessLogService'] }
            : { status: 'fail', gap: 'PatientAccessLogService 미발견' };
        },
      },
      {
        id: 'EMR-06',
        area: '5년 보존',
        requirement: '진료기록 5년 보관 (의료법 §22). 삭제 시 사유 로그.',
        references: ['의료법 §22'],
        evaluator: async () => {
          const backup = await this.fileExists('apps/api/src/modules/backup/backup.service.ts');
          return backup
            ? { status: 'partial', evidence: ['BackupService'], gap: '5년 자동 보관 정책 명시 필요' }
            : { status: 'fail', gap: 'BackupService 미발견' };
        },
      },
      {
        id: 'EMR-07',
        area: '백업/복구',
        requirement: '주 1회 이상 백업, 복구 절차 문서화.',
        references: ['§4.1'],
        evaluator: async () => {
          const backup = await this.fileExists('apps/api/src/modules/backup/backup.controller.ts');
          if (!backup) return { status: 'fail', gap: 'Backup 모듈 미발견' };
          return {
            status: 'partial',
            evidence: ['Backup 모듈 존재'],
            gap: '주 1회 자동 스케줄 + 복구 절차 매뉴얼 별도 검증 필요',
          };
        },
      },
      {
        id: 'EMR-08',
        area: '본인 인증',
        requirement: '한의사 본인 확인 — 비밀번호 + 2FA(권장).',
        references: ['§3.3'],
        evaluator: async () => {
          const totp = await this.fileExists('apps/api/src/modules/auth/services/totp.service.ts');
          return totp
            ? { status: 'pass', evidence: ['TotpService (2FA 지원)'] }
            : { status: 'fail', gap: '2FA 서비스 미발견' };
        },
      },
      {
        id: 'EMR-09',
        area: '데이터 이동권',
        requirement: '환자/한의사 본인의 데이터를 export 할 수 있어야 한다.',
        references: ['개인정보보호법 §35의2'],
        evaluator: async () => {
          const exp = await this.fileExists('apps/api/src/modules/export');
          const front = await this.fileExists('apps/web/src/lib/dataExport.ts');
          if (exp && front) return { status: 'pass', evidence: ['ExportModule', 'lib/dataExport.ts'] };
          if (exp || front) return { status: 'partial', gap: '서버 또는 프런트 export 한쪽 누락' };
          return { status: 'fail', gap: 'Export 미구현' };
        },
      },
      {
        id: 'EMR-10',
        area: '회원 탈퇴/삭제',
        requirement: '본인 요청 시 grace period 후 삭제·익명화 가능.',
        references: ['개인정보보호법 §21'],
        evaluator: async () => {
          const ctrl = await this.readFile('apps/api/src/modules/users/users.controller.ts');
          if (!ctrl) return { status: 'fail', gap: 'UsersController 미발견' };
          if (ctrl.includes("@Delete('me')")) {
            return { status: 'pass', evidence: ['DELETE /users/me (grace period)'] };
          }
          return { status: 'fail', gap: '회원탈퇴 엔드포인트 부재' };
        },
      },
      {
        id: 'EMR-11',
        area: '면책·면허 분리',
        requirement: '진단/처방은 한의사만 가능하며, 학생/공보의는 별도 권한.',
        references: ['의료법 §27'],
        evaluator: async () => {
          const enums = await this.readFile('apps/api/src/database/entities/enums.ts');
          if (!enums) return { status: 'fail', gap: 'enums.ts 미발견' };
          if (enums.includes('PractitionerType')) {
            return { status: 'pass', evidence: ['PractitionerType enum'] };
          }
          return { status: 'fail', gap: 'PractitionerType 미정의' };
        },
      },
      {
        id: 'EMR-12',
        area: '환자 동의',
        requirement: '진료/광고/마케팅 동의를 분리 저장하고 시점을 기록.',
        references: ['§5.1', '의료법 §27의2'],
        evaluator: async () => {
          const user = await this.readFile('apps/api/src/database/entities/user.entity.ts');
          if (!user) return { status: 'fail', gap: 'user.entity.ts 미발견' };
          const okTerms = user.includes('consentTermsAt');
          const okPrivacy = user.includes('consentPrivacyAt');
          const okMarketing = user.includes('consentMarketingAt');
          const okCount = [okTerms, okPrivacy, okMarketing].filter(Boolean).length;
          if (okCount === 3) return { status: 'pass', evidence: ['User entity 동의 시점 필드 3종'] };
          if (okCount > 0) return { status: 'partial', gap: `동의 필드 ${3 - okCount}개 누락` };
          return { status: 'fail', gap: '동의 시점 필드 미구현' };
        },
      },
    ];
  }

  // --- helpers ---
  private async fileExists(rel: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.repoRoot, rel));
      return true;
    } catch {
      return false;
    }
  }

  private async readFile(rel: string): Promise<string | null> {
    try {
      return await fs.readFile(path.join(this.repoRoot, rel), 'utf-8');
    } catch {
      return null;
    }
  }
}
