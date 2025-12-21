import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionsController } from './prescriptions.controller';
import { CasesModule } from '../cases/cases.module';

@Module({
  imports: [HttpModule, CasesModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
