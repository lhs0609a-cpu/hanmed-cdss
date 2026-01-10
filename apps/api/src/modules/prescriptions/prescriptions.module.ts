import { Module } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionsController } from './prescriptions.controller';
import { CasesModule } from '../cases/cases.module';
import { AiModule } from '../ai/ai.module';
import { InteractionsModule } from '../interactions/interactions.module';

@Module({
  imports: [CasesModule, AiModule, InteractionsModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
