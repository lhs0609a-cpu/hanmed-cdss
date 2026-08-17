import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '../../database/entities/user.entity';
import { PractitionerPatientsModule } from '../practitioner-patients/practitioner-patients.module';

@Module({
  // 데이터 내보내기(/users/me/export)가 환자·진료 기록을 함께 담아야 해서 가져온다.
  imports: [TypeOrmModule.forFeature([User]), PractitionerPatientsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
