import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Partner } from '../../database/entities/partner.entity';
import { PartnerImpression } from '../../database/entities/partner-impression.entity';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';

@Module({
  imports: [TypeOrmModule.forFeature([Partner, PartnerImpression])],
  controllers: [PartnersController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
