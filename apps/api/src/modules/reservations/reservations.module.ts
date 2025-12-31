import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { PatientAuthModule } from '../patient-auth/patient-auth.module';
import {
  Reservation,
  Clinic,
  PatientClinicConnection,
} from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reservation,
      Clinic,
      PatientClinicConnection,
    ]),
    PatientAuthModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
