import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import {
  PatientAccount,
  PhoneVerification,
  VerificationPurpose,
} from '../../database/entities';
import {
  SendVerificationDto,
  VerifyCodeDto,
  PatientRegisterDto,
  PatientLoginDto,
  UpdateProfileDto,
} from './dto';

@Injectable()
export class PatientAuthService {
  constructor(
    @InjectRepository(PatientAccount)
    private patientAccountRepository: Repository<PatientAccount>,
    @InjectRepository(PhoneVerification)
    private phoneVerificationRepository: Repository<PhoneVerification>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // SMS 인증번호 발송
  async sendVerificationCode(dto: SendVerificationDto) {
    const { phone, purpose = 'register' } = dto;

    // 회원가입 시 이미 가입된 번호인지 확인
    if (purpose === 'register') {
      const existingPatient = await this.patientAccountRepository.findOne({
        where: { phone },
      });
      if (existingPatient) {
        throw new ConflictException('이미 가입된 휴대폰 번호입니다.');
      }
    }

    // 최근 요청 확인 (1분 내 재요청 방지)
    const recentVerification = await this.phoneVerificationRepository.findOne({
      where: {
        phone,
        createdAt: MoreThan(new Date(Date.now() - 60 * 1000)),
      },
      order: { createdAt: 'DESC' },
    });

    if (recentVerification) {
      throw new BadRequestException('1분 후에 다시 시도해주세요.');
    }

    // 6자리 인증 코드 생성
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 인증 정보 저장
    const verification = this.phoneVerificationRepository.create({
      phone,
      code,
      purpose: purpose as VerificationPurpose,
      expiresAt: new Date(Date.now() + 3 * 60 * 1000), // 3분 유효
    });

    await this.phoneVerificationRepository.save(verification);

    // TODO: 실제 SMS 발송 연동 (알리고, NHN Cloud 등)
    // await this.smsService.send(phone, `[HanMed] 인증번호는 ${code}입니다.`);

    // 개발 환경에서는 코드 반환 (실제 환경에서는 제거)
    const isDevelopment = this.configService.get('NODE_ENV') === 'development';

    return {
      message: '인증번호가 발송되었습니다.',
      expiresIn: 180,
      ...(isDevelopment && { code }), // 개발용
    };
  }

  // 인증번호 확인
  async verifyCode(dto: VerifyCodeDto) {
    const { phone, code } = dto;

    const verification = await this.phoneVerificationRepository.findOne({
      where: {
        phone,
        code,
        isVerified: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (!verification) {
      throw new BadRequestException('인증번호가 올바르지 않거나 만료되었습니다.');
    }

    // 시도 횟수 체크
    if (verification.attemptCount >= 5) {
      throw new BadRequestException('인증 시도 횟수를 초과했습니다. 새로운 인증번호를 요청해주세요.');
    }

    // 시도 횟수 증가
    verification.attemptCount += 1;

    // 인증 성공
    verification.isVerified = true;
    await this.phoneVerificationRepository.save(verification);

    return {
      verified: true,
      message: '인증이 완료되었습니다.',
    };
  }

  // 환자 회원가입
  async register(dto: PatientRegisterDto) {
    const { phone, verificationCode, password, name, birthDate, gender, email } = dto;

    // 인증 확인
    const verification = await this.phoneVerificationRepository.findOne({
      where: {
        phone,
        code: verificationCode,
        purpose: VerificationPurpose.REGISTER,
        isVerified: true,
      },
      order: { createdAt: 'DESC' },
    });

    if (!verification) {
      throw new BadRequestException('휴대폰 인증을 먼저 완료해주세요.');
    }

    // 중복 확인
    const existingPatient = await this.patientAccountRepository.findOne({
      where: { phone },
    });
    if (existingPatient) {
      throw new ConflictException('이미 가입된 휴대폰 번호입니다.');
    }

    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 10);

    // 계정 생성
    const patient = this.patientAccountRepository.create({
      phone,
      passwordHash,
      name,
      birthDate: new Date(birthDate),
      gender,
      email,
      isVerified: true,
    });

    await this.patientAccountRepository.save(patient);

    // 토큰 발급
    const tokens = this.generateTokens(patient.id, patient.phone);

    return {
      patient: this.sanitizePatient(patient),
      ...tokens,
    };
  }

  // 로그인
  async login(dto: PatientLoginDto) {
    const { phone, password } = dto;

    const patient = await this.patientAccountRepository.findOne({
      where: { phone },
    });

    if (!patient) {
      throw new UnauthorizedException('휴대폰 번호 또는 비밀번호가 올바르지 않습니다.');
    }

    if (!patient.isActive) {
      throw new UnauthorizedException('비활성화된 계정입니다.');
    }

    const isPasswordValid = await bcrypt.compare(password, patient.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('휴대폰 번호 또는 비밀번호가 올바르지 않습니다.');
    }

    // 마지막 로그인 시간 업데이트
    patient.lastLoginAt = new Date();
    await this.patientAccountRepository.save(patient);

    const tokens = this.generateTokens(patient.id, patient.phone);

    return {
      patient: this.sanitizePatient(patient),
      ...tokens,
    };
  }

  // 토큰 갱신
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('REFRESH_TOKEN_SECRET'),
      });

      const patient = await this.patientAccountRepository.findOne({
        where: { id: payload.sub },
      });

      if (!patient || !patient.isActive) {
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }

      return this.generateTokens(patient.id, patient.phone);
    } catch {
      throw new UnauthorizedException('토큰 갱신에 실패했습니다.');
    }
  }

  // 프로필 조회
  async getProfile(patientId: string) {
    const patient = await this.patientAccountRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('환자 정보를 찾을 수 없습니다.');
    }

    return this.sanitizePatient(patient);
  }

  // 프로필 수정
  async updateProfile(patientId: string, dto: UpdateProfileDto) {
    const patient = await this.patientAccountRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('환자 정보를 찾을 수 없습니다.');
    }

    Object.assign(patient, dto);
    await this.patientAccountRepository.save(patient);

    return this.sanitizePatient(patient);
  }

  // FCM 토큰 업데이트
  async updateFcmToken(patientId: string, fcmToken: string) {
    await this.patientAccountRepository.update(patientId, { fcmToken });
    return { success: true };
  }

  // ID로 환자 조회
  async findById(id: string): Promise<PatientAccount | null> {
    return this.patientAccountRepository.findOne({ where: { id } });
  }

  // 토큰 생성
  private generateTokens(patientId: string, phone: string) {
    const payload = { sub: patientId, phone, type: 'patient' };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('REFRESH_TOKEN_SECRET'),
      expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRES_IN', '30d'),
    });

    return { accessToken, refreshToken };
  }

  // 민감 정보 제거
  private sanitizePatient(patient: PatientAccount) {
    const { passwordHash, ...sanitized } = patient;
    return sanitized;
  }
}
