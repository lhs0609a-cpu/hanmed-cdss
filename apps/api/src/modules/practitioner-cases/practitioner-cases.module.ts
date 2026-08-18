import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PractitionerCasesService } from './practitioner-cases.service';
import { PractitionerCasesController } from './practitioner-cases.controller';
import { PractitionerCase } from '../../database/entities/practitioner-case.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PractitionerCase])],
  controllers: [PractitionerCasesController],
  providers: [PractitionerCasesService],
  exports: [PractitionerCasesService],
})
export class PractitionerCasesModule {}
