import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CasesService } from './cases.service';
import { CasesController } from './cases.controller';
import { ClinicalCase } from '../../database/entities/clinical-case.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ClinicalCase])],
  controllers: [CasesController],
  providers: [CasesService],
  exports: [CasesService],
})
export class CasesModule {}
