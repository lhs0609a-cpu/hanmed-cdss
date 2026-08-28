import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CasesService } from './cases.service';
import { CasesController } from './cases.controller';
import { CaseAccessService } from './case-access.service';
import { ClinicalCase } from '../../database/entities/clinical-case.entity';
import { CaseAccessLog } from '../../database/entities/case-access-log.entity';
import { User } from '../../database/entities/user.entity';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClinicalCase, CaseAccessLog, User]),
    ConfigModule,
    CacheModule,
  ],
  controllers: [CasesController],
  providers: [CasesService, CaseAccessService],
  exports: [CasesService, CaseAccessService],
})
export class CasesModule {}
