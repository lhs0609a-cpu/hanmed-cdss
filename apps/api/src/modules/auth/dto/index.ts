import { IsEmail, IsString, MinLength, IsOptional, IsBoolean, Matches, ValidateIf, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PractitionerType } from '../../../database/entities/enums';

export class RegisterDto {
  @ApiProperty({ example: 'doctor@hanmed.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다.' })
  password: string;

  @ApiProperty({ example: '김한의' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'practitioner',
    enum: PractitionerType,
    description: '가입 유형: 한의사 / 공보의 / 학생',
    required: false,
  })
  @IsOptional()
  @IsEnum(PractitionerType)
  role?: PractitionerType;

  @ApiProperty({
    example: '12345',
    required: false,
    description: '한의사 면허번호. role=practitioner 일 때 5~8자리 숫자 필수.',
  })
  @ValidateIf((o) => !o.role || o.role === PractitionerType.PRACTITIONER)
  @IsString()
  @Matches(/^\d{5,8}$/, { message: '한의사 면허번호는 5~8자리 숫자만 가능합니다.' })
  licenseNumber?: string;

  @ApiProperty({ example: '온고지신 한의원', required: false })
  @IsOptional()
  @IsString()
  clinicName?: string;

  @ApiProperty({ description: '이용약관 동의 (필수)', example: true })
  @IsBoolean()
  consentTerms: boolean;

  @ApiProperty({ description: '개인정보처리방침 동의 (필수)', example: true })
  @IsBoolean()
  consentPrivacy: boolean;

  @ApiProperty({ description: '마케팅 정보 수신 동의 (선택)', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  consentMarketing?: boolean;
}

/** 회원탈퇴 요청 — 30일 grace period 후 hard-delete. */
export class DeleteAccountDto {
  @ApiProperty({ example: 'currentPassword', description: '본인 확인용 현재 비밀번호' })
  @IsString()
  password: string;

  @ApiProperty({ example: '서비스가 진료에 적합하지 않아서', required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ description: '데이터 삭제 동의 (개인정보보호법 고지)', example: true })
  @IsBoolean()
  acknowledgeDeletion: boolean;
}

export class LoginDto {
  @ApiProperty({ example: 'doctor@hanmed.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'doctor@hanmed.com', description: '가입한 이메일 주소' })
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: '비밀번호 재설정 토큰' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'newPassword123', minLength: 8, description: '새 비밀번호' })
  @IsString()
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다.' })
  newPassword: string;
}
