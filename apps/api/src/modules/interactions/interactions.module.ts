import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InteractionsService } from './interactions.service';
import { InteractionsController } from './interactions.controller';
import { DrugHerbInteraction } from '../../database/entities/drug-herb-interaction.entity';
import { Herb } from '../../database/entities/herb.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DrugHerbInteraction, Herb])],
  controllers: [InteractionsController],
  providers: [InteractionsService],
  exports: [InteractionsService],
})
export class InteractionsModule {}
