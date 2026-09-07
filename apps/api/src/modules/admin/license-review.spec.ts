import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { AdminUsersService } from './services/admin-users.service';
import { AuditLogService } from './services/audit-log.service';
import { UsersService } from '../users/users.service';
import { LicenseDocumentService } from '../users/license-document.service';
import { User } from '../../database/entities/user.entity';
import { LicenseVerificationStatus } from '../../database/entities/enums';

/**
 * 면허 검수 승인/반려 흐름.
 *
 * 이 경로가 끊기면 사용자는 "검증 중"에 영원히 갇히고 처방 화면을 못 쓴다.
 * 화면이 아니라 여기가 실제 게이트이므로 테스트로 묶어 둔다.
 */
describe('면허 검수', () => {
  const ADMIN_ID = 'admin-uuid';

  describe('AdminUsersService', () => {
    let service: AdminUsersService;
    let saved: Partial<User> | null;
    let logged: any;
    let stored: Partial<User>;

    const buildModule = async (user: Partial<User>): Promise<TestingModule> => {
      stored = user;
      saved = null;
      logged = null;

      return Test.createTestingModule({
        providers: [
          AdminUsersService,
          {
            provide: getRepositoryToken(User),
            useValue: {
              findOne: jest.fn().mockImplementation(async () => stored),
              save: jest.fn().mockImplementation(async (u: Partial<User>) => {
                saved = u;
                return u;
              }),
              createQueryBuilder: jest.fn(),
            },
          },
          {
            provide: AuditLogService,
            useValue: {
              log: jest.fn().mockImplementation(async (p: any) => {
                logged = p;
              }),
            },
          },
          {
            provide: LicenseDocumentService,
            useValue: { createSignedUrl: jest.fn(), remove: jest.fn(), upload: jest.fn() },
          },
        ],
      }).compile();
    };

    it('승인하면 verified + 검수자·시각이 남고 반려 사유가 지워진다', async () => {
      const module = await buildModule({
        id: 'user-uuid',
        licenseNumber: '12345',
        licenseVerificationStatus: LicenseVerificationStatus.PENDING,
        licenseRejectionReason: '사진이 흐립니다',
        isLicenseVerified: false,
      });
      service = module.get(AdminUsersService);

      await service.approveLicense(ADMIN_ID, 'user-uuid');

      expect(saved).toMatchObject({
        isLicenseVerified: true,
        licenseVerificationStatus: LicenseVerificationStatus.VERIFIED,
        licenseVerifiedById: ADMIN_ID,
        licenseRejectionReason: null,
      });
      expect(saved!.licenseVerifiedAt).toBeInstanceOf(Date);
      expect(logged.action).toBe('user:license_approve');
    });

    it('면허번호가 없으면 승인을 거부한다', async () => {
      const module = await buildModule({
        id: 'user-uuid',
        licenseNumber: '   ',
        licenseVerificationStatus: LicenseVerificationStatus.PENDING,
      });
      service = module.get(AdminUsersService);

      await expect(service.approveLicense(ADMIN_ID, 'user-uuid')).rejects.toThrow(
        BadRequestException,
      );
      expect(saved).toBeNull();
    });

    it('반려하면 사유가 남고 인증은 풀린다', async () => {
      const module = await buildModule({
        id: 'user-uuid',
        licenseNumber: '12345',
        licenseVerificationStatus: LicenseVerificationStatus.PENDING,
        isLicenseVerified: false,
      });
      service = module.get(AdminUsersService);

      await service.rejectLicense(ADMIN_ID, 'user-uuid', '  면허번호가 조회되지 않습니다  ');

      expect(saved).toMatchObject({
        isLicenseVerified: false,
        licenseVerificationStatus: LicenseVerificationStatus.REJECTED,
        licenseRejectionReason: '면허번호가 조회되지 않습니다',
        licenseVerifiedAt: null,
      });
      expect(logged.action).toBe('user:license_reject');
    });

    it('사유 없는 반려는 거부한다', async () => {
      const module = await buildModule({
        id: 'user-uuid',
        licenseNumber: '12345',
        licenseVerificationStatus: LicenseVerificationStatus.PENDING,
      });
      service = module.get(AdminUsersService);

      await expect(service.rejectLicense(ADMIN_ID, 'user-uuid', '   ')).rejects.toThrow(
        BadRequestException,
      );
      expect(saved).toBeNull();
    });
  });

  describe('UsersService.updateProfile — 재제출', () => {
    let service: UsersService;
    let updated: Partial<User> | null;
    let stored: Partial<User>;

    const buildModule = async (user: Partial<User>) => {
      stored = user;
      updated = null;

      const module = await Test.createTestingModule({
        providers: [
          UsersService,
          {
            provide: getRepositoryToken(User),
            useValue: {
              findOne: jest.fn().mockImplementation(async () => stored),
              update: jest.fn().mockImplementation(async (_id: string, patch: Partial<User>) => {
                updated = patch;
              }),
            },
          },
        ],
      }).compile();

      service = module.get(UsersService);
    };

    it('반려당한 사용자가 번호를 고치면 다시 검수 대기로 돌아간다', async () => {
      await buildModule({
        id: 'user-uuid',
        licenseNumber: '11111',
        licenseVerificationStatus: LicenseVerificationStatus.REJECTED,
        licenseRejectionReason: '조회되지 않음',
        isLicenseVerified: false,
      });

      await service.updateProfile('user-uuid', { licenseNumber: '22222' });

      expect(updated).toMatchObject({
        licenseNumber: '22222',
        licenseVerificationStatus: LicenseVerificationStatus.PENDING,
        isLicenseVerified: false,
        licenseRejectionReason: null,
      });
    });

    it('가입 후 처음 번호를 넣어도 검수 대기가 된다', async () => {
      await buildModule({
        id: 'user-uuid',
        licenseNumber: null,
        licenseVerificationStatus: LicenseVerificationStatus.UNSUBMITTED,
      });

      await service.updateProfile('user-uuid', { licenseNumber: '33333' });

      expect(updated).toMatchObject({
        licenseVerificationStatus: LicenseVerificationStatus.PENDING,
      });
    });

    it('번호가 그대로면 인증 상태를 건드리지 않는다', async () => {
      await buildModule({
        id: 'user-uuid',
        licenseNumber: '44444',
        licenseVerificationStatus: LicenseVerificationStatus.VERIFIED,
        isLicenseVerified: true,
      });

      await service.updateProfile('user-uuid', { licenseNumber: '44444', name: '홍길동' });

      expect(updated).toEqual({ licenseNumber: '44444', name: '홍길동' });
    });

    it('면허증 사본을 새로 내면 검수 대기로 돌아가고 옛 파일 경로를 돌려준다', async () => {
      await buildModule({
        id: 'user-uuid',
        licenseFilePath: 'user-uuid/old.jpg',
        licenseVerificationStatus: LicenseVerificationStatus.REJECTED,
        licenseRejectionReason: '사진이 흐립니다',
        isLicenseVerified: false,
      });

      const { previousPath } = await service.attachLicenseDocument('user-uuid', {
        path: 'user-uuid/new.jpg',
      });

      expect(previousPath).toBe('user-uuid/old.jpg');
      expect(updated).toMatchObject({
        licenseFilePath: 'user-uuid/new.jpg',
        licenseVerificationStatus: LicenseVerificationStatus.PENDING,
        isLicenseVerified: false,
        licenseRejectionReason: null,
      });
    });

    it('첫 제출이면 지울 옛 파일이 없다', async () => {
      await buildModule({
        id: 'user-uuid',
        licenseFilePath: null,
        licenseVerificationStatus: LicenseVerificationStatus.UNSUBMITTED,
      });

      const { previousPath } = await service.attachLicenseDocument('user-uuid', {
        path: 'user-uuid/first.pdf',
      });

      expect(previousPath).toBeNull();
    });

    it('번호를 지우면 미제출로 내려간다', async () => {
      await buildModule({
        id: 'user-uuid',
        licenseNumber: '55555',
        licenseVerificationStatus: LicenseVerificationStatus.VERIFIED,
        isLicenseVerified: true,
      });

      await service.updateProfile('user-uuid', { licenseNumber: '' });

      expect(updated).toMatchObject({
        licenseVerificationStatus: LicenseVerificationStatus.UNSUBMITTED,
        isLicenseVerified: false,
      });
    });
  });
});
