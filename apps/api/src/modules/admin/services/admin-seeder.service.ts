import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../../../database/entities/user.entity';
import { UserRole, UserStatus } from '../../../database/entities/enums';

@Injectable()
export class AdminSeederService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeederService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedSuperAdmin();
  }

  private async seedSuperAdmin() {
    try {
      // 환경 변수에서 관리자 정보 가져오기 (기본값 설정)
      const adminEmail = this.configService.get<string>('SUPER_ADMIN_EMAIL') || 'lhs0609c@naver.com';
      const adminPassword = this.configService.get<string>('SUPER_ADMIN_PASSWORD') || 'lhs0609c@naver.com';

      // 이미 SUPER_ADMIN이 있는지 확인
      const existingSuperAdmin = await this.userRepository.findOne({
        where: { role: UserRole.SUPER_ADMIN },
      });

      if (existingSuperAdmin) {
        // SUPER_ADMIN이 이미 있고 같은 이메일이면 비밀번호만 업데이트
        if (existingSuperAdmin.email === adminEmail) {
          const hashedPassword = await bcrypt.hash(adminPassword, 10);
          existingSuperAdmin.passwordHash = hashedPassword;
          existingSuperAdmin.status = UserStatus.ACTIVE;
          await this.userRepository.save(existingSuperAdmin);
          this.logger.log(`SUPER_ADMIN 비밀번호 업데이트 완료: ${adminEmail}`);
        } else {
          this.logger.log(`SUPER_ADMIN이 이미 존재합니다: ${existingSuperAdmin.email}`);
        }
        return;
      }

      // 해당 이메일로 계정이 있는지 확인
      const existingUser = await this.userRepository.findOne({
        where: { email: adminEmail },
      });

      if (existingUser) {
        // 기존 계정을 SUPER_ADMIN으로 승격 + 비밀번호 업데이트
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        existingUser.passwordHash = hashedPassword;
        existingUser.role = UserRole.SUPER_ADMIN;
        existingUser.status = UserStatus.ACTIVE;
        existingUser.isVerified = true;
        existingUser.isLicenseVerified = true;
        await this.userRepository.save(existingUser);
        this.logger.log(`기존 계정을 SUPER_ADMIN으로 승격 및 비밀번호 업데이트: ${adminEmail}`);
      } else {
        // 새 SUPER_ADMIN 계정 생성
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        const superAdmin = this.userRepository.create({
          email: adminEmail,
          passwordHash: hashedPassword,
          name: '최고관리자',
          role: UserRole.SUPER_ADMIN,
          status: UserStatus.ACTIVE,
          subscriptionTier: 'clinic',
          isVerified: true,
          isLicenseVerified: true,
          contributionPoints: 0,
          postCount: 0,
          commentCount: 0,
          acceptedAnswerCount: 0,
        });

        await this.userRepository.save(superAdmin);
        this.logger.log(`새 SUPER_ADMIN 계정 생성 완료: ${adminEmail}`);
      }
    } catch (error) {
      this.logger.error('SUPER_ADMIN 시드 실패:', error.message);
    }
  }
}
