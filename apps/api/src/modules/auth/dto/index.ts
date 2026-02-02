import { IsEmail, IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ example: '12345', required: false })
  @IsOptional()
  @IsString()
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
