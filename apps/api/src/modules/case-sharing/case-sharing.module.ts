import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SharedCase,
  CaseComment,
  CaseVote,
  CaseBookmark,
  CaseMentorship,
  ExpertProfile,
} from '../../database/entities/shared-case.entity';
import { User } from '../../database/entities/user.entity';
import { CaseSharingService } from './case-sharing.service';
import { CaseSharingController } from './case-sharing.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SharedCase,
      CaseComment,
      CaseVote,
      CaseBookmark,
      CaseMentorship,
      ExpertProfile,
      User,
    ]),
  ],
  controllers: [CaseSharingController],
  providers: [CaseSharingService],
  exports: [CaseSharingService],
})
export class CaseSharingModule {}
