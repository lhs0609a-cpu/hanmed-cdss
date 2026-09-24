import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicalCase } from '../../database/entities/clinical-case.entity';
import { Formula } from '../../database/entities/formula.entity';
import { Herb } from '../../database/entities/herb.entity';
import { Reference } from '../../database/entities/reference.entity';
import { PublicContentController } from './public-content.controller';
import { PublicContentService } from './public-content.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClinicalCase, Formula, Herb, Reference])],
  controllers: [PublicContentController],
  providers: [PublicContentService],
})
export class PublicContentModule {}
