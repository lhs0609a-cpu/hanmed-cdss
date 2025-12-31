import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import {
  Reservation,
  ReservationStatus,
  Clinic,
  PatientClinicConnection,
} from '../../database/entities';
import {
  CreateReservationDto,
  UpdateReservationDto,
  CancelReservationDto,
  ClinicUpdateReservationDto,
  GetReservationsDto,
} from './dto';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    @InjectRepository(Clinic)
    private clinicRepository: Repository<Clinic>,
    @InjectRepository(PatientClinicConnection)
    private connectionRepository: Repository<PatientClinicConnection>,
  ) {}

  // 예약 생성 (환자)
  async create(patientId: string, dto: CreateReservationDto) {
    const { clinicId, practitionerId, reservationDate, reservationTime, visitType, visitReason, symptomsNote } = dto;

    // 한의원 확인
    const clinic = await this.clinicRepository.findOne({ where: { id: clinicId } });
    if (!clinic) {
      throw new NotFoundException('한의원을 찾을 수 없습니다.');
    }

    if (!clinic.reservationEnabled) {
      throw new BadRequestException('이 한의원은 온라인 예약을 받지 않습니다.');
    }

    // 중복 예약 확인
    const existingReservation = await this.reservationRepository.findOne({
      where: {
        clinicId,
        reservationDate: new Date(reservationDate),
        reservationTime,
        status: In([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]),
        ...(practitionerId && { practitionerId }),
      },
    });

    if (existingReservation) {
      throw new BadRequestException('해당 시간에 이미 예약이 있습니다.');
    }

    // 환자의 동일 날짜 중복 예약 확인
    const patientExisting = await this.reservationRepository.findOne({
      where: {
        patientId,
        clinicId,
        reservationDate: new Date(reservationDate),
        status: In([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]),
      },
    });

    if (patientExisting) {
      throw new BadRequestException('같은 날짜에 이미 예약이 있습니다.');
    }

    // 예약 생성
    const reservation = this.reservationRepository.create({
      patientId,
      clinicId,
      practitionerId,
      reservationDate: new Date(reservationDate),
      reservationTime,
      durationMinutes: clinic.reservationInterval || 30,
      visitType,
      visitReason,
      symptomsNote,
      status: ReservationStatus.PENDING,
    });

    const savedReservation = await this.reservationRepository.save(reservation);

    // 환자-한의원 연결 (없으면 생성)
    let connection = await this.connectionRepository.findOne({
      where: { patientId, clinicId },
    });

    if (!connection) {
      connection = this.connectionRepository.create({
        patientId,
        clinicId,
      });
      await this.connectionRepository.save(connection);
    }

    return this.findById(savedReservation.id, patientId);
  }

  // 예약 목록 조회 (환자)
  async findByPatient(patientId: string, dto: GetReservationsDto) {
    const { status, startDate, endDate, clinicId } = dto;

    const queryBuilder = this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.clinic', 'clinic')
      .leftJoinAndSelect('reservation.practitioner', 'practitioner')
      .where('reservation.patientId = :patientId', { patientId });

    if (status) {
      queryBuilder.andWhere('reservation.status = :status', { status });
    }

    if (startDate) {
      queryBuilder.andWhere('reservation.reservationDate >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('reservation.reservationDate <= :endDate', { endDate });
    }

    if (clinicId) {
      queryBuilder.andWhere('reservation.clinicId = :clinicId', { clinicId });
    }

    queryBuilder.orderBy('reservation.reservationDate', 'DESC');
    queryBuilder.addOrderBy('reservation.reservationTime', 'DESC');

    const reservations = await queryBuilder.getMany();

    return reservations.map((r) => this.formatReservation(r));
  }

  // 예약 상세 조회
  async findById(id: string, patientId?: string, clinicId?: string) {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: ['clinic', 'practitioner', 'patient'],
    });

    if (!reservation) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }

    // 권한 확인
    if (patientId && reservation.patientId !== patientId) {
      throw new ForbiddenException('예약 정보에 접근할 권한이 없습니다.');
    }

    if (clinicId && reservation.clinicId !== clinicId) {
      throw new ForbiddenException('예약 정보에 접근할 권한이 없습니다.');
    }

    return this.formatReservation(reservation);
  }

  // 예약 변경 (환자)
  async update(id: string, patientId: string, dto: UpdateReservationDto) {
    const reservation = await this.reservationRepository.findOne({
      where: { id, patientId },
    });

    if (!reservation) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }

    // 변경 가능한 상태인지 확인
    if (reservation.status !== ReservationStatus.PENDING &&
        reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException('변경할 수 없는 예약 상태입니다.');
    }

    // 날짜/시간 변경 시 중복 확인
    if (dto.reservationDate || dto.reservationTime) {
      const newDate = dto.reservationDate ? new Date(dto.reservationDate) : reservation.reservationDate;
      const newTime = dto.reservationTime || reservation.reservationTime;

      const existingReservation = await this.reservationRepository.findOne({
        where: {
          clinicId: reservation.clinicId,
          reservationDate: newDate,
          reservationTime: newTime,
          status: In([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]),
        },
      });

      if (existingReservation && existingReservation.id !== id) {
        throw new BadRequestException('해당 시간에 이미 예약이 있습니다.');
      }
    }

    Object.assign(reservation, {
      ...dto,
      reservationDate: dto.reservationDate ? new Date(dto.reservationDate) : reservation.reservationDate,
    });

    await this.reservationRepository.save(reservation);
    return this.findById(id, patientId);
  }

  // 예약 취소 (환자)
  async cancel(id: string, patientId: string, dto: CancelReservationDto) {
    const reservation = await this.reservationRepository.findOne({
      where: { id, patientId },
    });

    if (!reservation) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('이미 취소된 예약입니다.');
    }

    if (reservation.status === ReservationStatus.COMPLETED) {
      throw new BadRequestException('완료된 예약은 취소할 수 없습니다.');
    }

    reservation.status = ReservationStatus.CANCELLED;
    reservation.cancelledAt = new Date();
    reservation.cancellationReason = dto.cancellationReason;

    await this.reservationRepository.save(reservation);
    return this.findById(id, patientId);
  }

  // 예약 목록 조회 (한의원)
  async findByClinic(clinicId: string, dto: GetReservationsDto) {
    const { status, startDate, endDate } = dto;

    const queryBuilder = this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.patient', 'patient')
      .leftJoinAndSelect('reservation.practitioner', 'practitioner')
      .where('reservation.clinicId = :clinicId', { clinicId });

    if (status) {
      queryBuilder.andWhere('reservation.status = :status', { status });
    }

    if (startDate) {
      queryBuilder.andWhere('reservation.reservationDate >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('reservation.reservationDate <= :endDate', { endDate });
    }

    queryBuilder.orderBy('reservation.reservationDate', 'ASC');
    queryBuilder.addOrderBy('reservation.reservationTime', 'ASC');

    const reservations = await queryBuilder.getMany();

    return reservations.map((r) => ({
      ...this.formatReservation(r),
      patient: r.patient ? {
        id: r.patient.id,
        name: r.patient.name,
        phone: r.patient.phone,
      } : null,
    }));
  }

  // 예약 상태 업데이트 (한의원)
  async clinicUpdate(id: string, clinicId: string, dto: ClinicUpdateReservationDto) {
    const reservation = await this.reservationRepository.findOne({
      where: { id, clinicId },
    });

    if (!reservation) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }

    if (dto.status === ReservationStatus.CONFIRMED) {
      reservation.confirmedAt = new Date();
    }

    Object.assign(reservation, dto);
    await this.reservationRepository.save(reservation);

    // 진료 완료 시 연결 정보 업데이트
    if (dto.status === ReservationStatus.COMPLETED) {
      await this.connectionRepository.increment(
        { patientId: reservation.patientId, clinicId: reservation.clinicId },
        'totalVisits',
        1,
      );
      await this.connectionRepository.update(
        { patientId: reservation.patientId, clinicId: reservation.clinicId },
        { lastVisitAt: new Date() },
      );
    }

    return this.findById(id, undefined, clinicId);
  }

  // 다가오는 예약 조회 (환자)
  async getUpcoming(patientId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reservations = await this.reservationRepository.find({
      where: {
        patientId,
        reservationDate: MoreThanOrEqual(today),
        status: In([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]),
      },
      relations: ['clinic', 'practitioner'],
      order: { reservationDate: 'ASC', reservationTime: 'ASC' },
      take: 5,
    });

    return reservations.map((r) => this.formatReservation(r));
  }

  // 예약 포맷팅
  private formatReservation(reservation: Reservation) {
    return {
      id: reservation.id,
      clinicId: reservation.clinicId,
      clinic: reservation.clinic ? {
        id: reservation.clinic.id,
        name: reservation.clinic.name,
        phone: reservation.clinic.phone,
        address: reservation.clinic.addressRoad,
      } : null,
      practitionerId: reservation.practitionerId,
      practitioner: reservation.practitioner ? {
        id: reservation.practitioner.id,
        name: reservation.practitioner.name,
      } : null,
      reservationDate: reservation.reservationDate,
      reservationTime: reservation.reservationTime,
      durationMinutes: reservation.durationMinutes,
      visitType: reservation.visitType,
      visitReason: reservation.visitReason,
      symptomsNote: reservation.symptomsNote,
      status: reservation.status,
      confirmedAt: reservation.confirmedAt,
      cancelledAt: reservation.cancelledAt,
      cancellationReason: reservation.cancellationReason,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
    };
  }
}
