import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { PasswordResetToken } from '../../database/entities/password-reset-token.entity';

// Mock bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let emailService: jest.Mocked<EmailService>;
  let passwordResetTokenRepository: jest.Mocked<Repository<PasswordResetToken>>;

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: '테스트 사용자',
    passwordHash: 'hashed-password',
    subscriptionTier: 'free',
    isVerified: true,
  } as any;

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updatePassword: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockEmailService = {
      sendPasswordResetEmail: jest.fn(),
    };

    const mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: getRepositoryToken(PasswordResetToken), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    emailService = module.get(EmailService);
    passwordResetTokenRepository = module.get(getRepositoryToken(PasswordResetToken));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'Password123!',
      name: '새 사용자',
      licenseNumber: '12345',
      clinicName: '테스트 한의원',
    };

    it('새 사용자를 성공적으로 등록해야 함', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      usersService.create.mockResolvedValue({ ...mockUser, ...registerDto });
      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerDto.email,
          name: registerDto.name,
        }),
      );
    });

    it('중복 이메일로 등록 시 ConflictException을 던져야 함', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow('이미 등록된 이메일입니다.');
    });

    it('비밀번호가 해시되어 저장되어야 함', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('secure-hashed-password');
      usersService.create.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('token');

      await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: 'secure-hashed-password',
        }),
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('올바른 자격 증명으로 로그인 성공해야 함', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(mockUser.email);
      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
    });

    it('존재하지 않는 이메일로 로그인 시 UnauthorizedException을 던져야 함', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    });

    it('잘못된 비밀번호로 로그인 시 UnauthorizedException을 던져야 함', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('동일한 에러 메시지로 이메일/비밀번호 오류를 숨겨야 함 (보안)', async () => {
      // 존재하지 않는 이메일
      usersService.findByEmail.mockResolvedValue(null);
      try {
        await service.login(loginDto);
      } catch (e) {
        expect(e.message).toBe('이메일 또는 비밀번호가 올바르지 않습니다.');
      }

      // 잘못된 비밀번호
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      try {
        await service.login(loginDto);
      } catch (e) {
        expect(e.message).toBe('이메일 또는 비밀번호가 올바르지 않습니다.');
      }
    });
  });

  describe('refreshToken', () => {
    it('유효한 리프레시 토큰으로 새 토큰을 발급해야 함', async () => {
      jwtService.verify.mockReturnValue({ sub: mockUser.id });
      usersService.findById.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValueOnce('new-access-token').mockReturnValueOnce('new-refresh-token');

      const result = await service.refreshToken('valid-refresh-token');

      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(result).toHaveProperty('refreshToken', 'new-refresh-token');
    });

    it('유효하지 않은 리프레시 토큰으로 UnauthorizedException을 던져야 함', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('존재하지 않는 사용자의 토큰으로 UnauthorizedException을 던져야 함', async () => {
      jwtService.verify.mockReturnValue({ sub: 'non-existent-user-id' });
      usersService.findById.mockResolvedValue(null);

      await expect(service.refreshToken('valid-token-but-deleted-user')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto = { email: 'test@example.com' };

    it('존재하는 사용자에게 비밀번호 재설정 이메일을 전송해야 함', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      passwordResetTokenRepository.create.mockReturnValue({} as PasswordResetToken);
      passwordResetTokenRepository.save.mockResolvedValue({} as PasswordResetToken);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        forgotPasswordDto.email,
        expect.any(String),
      );
      expect(result.message).toBe('해당 이메일로 비밀번호 재설정 안내를 전송했습니다.');
    });

    it('존재하지 않는 이메일에도 같은 응답을 반환해야 함 (보안)', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result.message).toBe('해당 이메일로 비밀번호 재설정 안내를 전송했습니다.');
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('기존 토큰을 무효화해야 함', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      passwordResetTokenRepository.create.mockReturnValue({} as PasswordResetToken);
      passwordResetTokenRepository.save.mockResolvedValue({} as PasswordResetToken);

      await service.forgotPassword(forgotPasswordDto);

      expect(passwordResetTokenRepository.update).toHaveBeenCalledWith(
        { userId: mockUser.id, used: false },
        { used: true },
      );
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto = {
      token: 'valid-reset-token',
      newPassword: 'NewPassword123!',
    };

    it('유효한 토큰으로 비밀번호를 재설정해야 함', async () => {
      const mockToken = {
        token: resetPasswordDto.token,
        userId: mockUser.id,
        used: false,
        expiresAt: new Date(Date.now() + 3600000), // 1시간 후
        user: mockUser,
      };
      passwordResetTokenRepository.findOne.mockResolvedValue(mockToken as PasswordResetToken);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      passwordResetTokenRepository.save.mockResolvedValue(mockToken as PasswordResetToken);

      const result = await service.resetPassword(resetPasswordDto);

      expect(usersService.updatePassword).toHaveBeenCalledWith(mockUser.id, 'new-hashed-password');
      expect(result.message).toBe('비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요.');
    });

    it('유효하지 않은 토큰으로 BadRequestException을 던져야 함', async () => {
      passwordResetTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        '유효하지 않거나 만료된 토큰입니다.',
      );
    });

    it('토큰을 사용 처리해야 함', async () => {
      const mockToken = {
        token: resetPasswordDto.token,
        userId: mockUser.id,
        used: false,
        expiresAt: new Date(Date.now() + 3600000),
        user: mockUser,
      };
      passwordResetTokenRepository.findOne.mockResolvedValue(mockToken as PasswordResetToken);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      await service.resetPassword(resetPasswordDto);

      expect(passwordResetTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ used: true }),
      );
    });
  });
});
