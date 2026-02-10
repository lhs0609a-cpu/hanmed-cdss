import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDataController } from './user-data.controller';
import { UserDataService } from './user-data.service';
import { UserData } from '../../database/entities/user-data.entity';
import { User } from '../../database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserData, User])],
  controllers: [UserDataController],
  providers: [UserDataService],
  exports: [UserDataService],
})
export class UserDataModule {}
