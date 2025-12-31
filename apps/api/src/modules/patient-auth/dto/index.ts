import { IsString, IsNotEmpty, Length, IsOptional, IsEnum, IsDateString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PatientGender } from '../../../database/entities';

export class SendVerificationDto {
  @ApiProperty({ description: '휴대폰 번호', example: '01012345678' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^01[0-9]{8,9}$/, { message: '올바른 휴대폰 번호 형식이 아닙니다.' })
  phone: string;

  @ApiPropertyOptional({ description: '인증 목적', example: 'register' })
  @IsOptional()
  @IsString()
  purpose?: 'register' | 'login' | 'password_reset';
}

export class VerifyCodeDto {
  @ApiProperty({ description: '휴대폰 번호', example: '01012345678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: '인증 코드', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}

export class PatientRegisterDto {
  @ApiProperty({ description: '휴대폰 번호', example: '01012345678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: '인증 코드', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  verificationCode: string;

  @ApiProperty({ description: '비밀번호', example: 'password123!' })
  @IsString()
  @IsNotEmpty()
  @Length(8, 50)
  password: string;

  @ApiProperty({ description: '이름', example: '홍길동' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  name: string;

  @ApiProperty({ description: '생년월일', example: '1990-01-15' })
  @IsDateString()
  birthDate: string;

  @ApiPropertyOptional({ description: '성별', enum: PatientGender })
  @IsOptional()
  @IsEnum(PatientGender)
  gender?: PatientGender;

  @ApiPropertyOptional({ description: '이메일', example: 'user@example.com' })
  @IsOptional()
  @IsString()
  email?: string;
}

export class PatientLoginDto {
  @ApiProperty({ description: '휴대폰 번호', example: '01012345678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: '비밀번호', example: 'password123!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: '리프레시 토큰' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: '이름' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '이메일' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: '프로필 이미지 URL' })
  @IsOptional()
  @IsString()
  profileImageUrl?: string;

  @ApiPropertyOptional({ description: '알러지 목록' })
  @IsOptional()
  allergies?: string[];

  @ApiPropertyOptional({ description: '만성질환 목록' })
  @IsOptional()
  chronicConditions?: string[];

  @ApiPropertyOptional({ description: '현재 복용 중인 약' })
  @IsOptional()
  currentMedications?: string[];

  @ApiPropertyOptional({ description: '푸시 알림 활성화' })
  @IsOptional()
  pushEnabled?: boolean;
}

export class UpdateFcmTokenDto {
  @ApiProperty({ description: 'FCM 토큰' })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;
}
