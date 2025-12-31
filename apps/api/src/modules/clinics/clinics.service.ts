import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import {
  Clinic,
  ClinicPractitioner,
  Reservation,
  ReservationStatus,
  PatientClinicConnection,
} from '../../database/entities';
import { SearchClinicsDto, GetAvailabilityDto, CreateClinicDto, UpdateClinicDto } from './dto';

@Injectable()
export class ClinicsService {
  constructor(
    @InjectRepository(Clinic)
    private clinicRepository: Repository<Clinic>,
    @InjectRepository(ClinicPractitioner)
    private practitionerRepository: Repository<ClinicPractitioner>,
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    @InjectRepository(PatientClinicConnection)
    private connectionRepository: Repository<PatientClinicConnection>,
  ) {}

  // 한의원 검색
  async search(dto: SearchClinicsDto) {
    const {
      keyword,
      latitude,
      longitude,
      radius = 5,
      specialties,
      hanmedVerifiedOnly,
      reservationEnabledOnly,
      page = 1,
      limit = 20,
      sortBy = 'distance',
    } = dto;

    const queryBuilder = this.clinicRepository.createQueryBuilder('clinic');

    // 키워드 검색
    if (keyword) {
      queryBuilder.andWhere(
        '(clinic.name ILIKE :keyword OR clinic.addressRoad ILIKE :keyword OR clinic.addressJibun ILIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    // 위치 기반 검색 (Haversine 공식)
    if (latitude && longitude) {
      const earthRadius = 6371; // km
      queryBuilder.addSelect(
        `(${earthRadius} * acos(cos(radians(:lat)) * cos(radians(clinic.latitude)) * cos(radians(clinic.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(clinic.latitude))))`,
        'distance',
      );
      queryBuilder.setParameters({ lat: latitude, lng: longitude });

      // 반경 필터
      queryBuilder.andWhere(
        `(${earthRadius} * acos(cos(radians(:lat)) * cos(radians(clinic.latitude)) * cos(radians(clinic.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(clinic.latitude)))) <= :radius`,
        { radius },
      );
    }

    // 전문 분야 필터
    if (specialties && specialties.length > 0) {
      queryBuilder.andWhere('clinic.specialties && :specialties', {
        specialties,
      });
    }

    // HanMed 인증 필터
    if (hanmedVerifiedOnly) {
      queryBuilder.andWhere('clinic.isHanmedVerified = :verified', { verified: true });
    }

    // 예약 가능 필터
    if (reservationEnabledOnly) {
      queryBuilder.andWhere('clinic.reservationEnabled = :enabled', { enabled: true });
    }

    // 정렬
    switch (sortBy) {
      case 'distance':
        if (latitude && longitude) {
          queryBuilder.orderBy('distance', 'ASC');
        } else {
          queryBuilder.orderBy('clinic.name', 'ASC');
        }
        break;
      case 'rating':
        queryBuilder.orderBy('clinic.ratingAverage', 'DESC');
        break;
      case 'reviewCount':
        queryBuilder.orderBy('clinic.reviewCount', 'DESC');
        break;
      case 'name':
        queryBuilder.orderBy('clinic.name', 'ASC');
        break;
    }

    // 페이지네이션
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // 결과 조회
    const [clinics, total] = await queryBuilder.getManyAndCount();

    // 거리 정보 포함 (위치 기반 검색인 경우)
    let clinicsWithDistance = clinics;
    if (latitude && longitude) {
      const rawResults = await queryBuilder.getRawMany();
      clinicsWithDistance = clinics.map((clinic, index) => ({
        ...clinic,
        distance: parseFloat(rawResults[index]?.distance || '0'),
      }));
    }

    return {
      data: clinicsWithDistance,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 한의원 상세 조회
  async findById(id: string) {
    const clinic = await this.clinicRepository.findOne({
      where: { id },
    });

    if (!clinic) {
      throw new NotFoundException('한의원을 찾을 수 없습니다.');
    }

    return clinic;
  }

  // 한의원 의료진 목록
  async getPractitioners(clinicId: string) {
    const clinic = await this.findById(clinicId);

    const practitioners = await this.practitionerRepository.find({
      where: { clinicId },
      relations: ['user'],
    });

    return practitioners.map((p) => ({
      id: p.id,
      userId: p.userId,
      displayName: p.displayName || p.user?.name,
      role: p.role,
      specialties: p.specialties,
      bio: p.bio,
      profileImageUrl: p.profileImageUrl || p.user?.bio,
      isAcceptingPatients: p.isAcceptingPatients,
    }));
  }

  // 예약 가능 시간 조회
  async getAvailability(clinicId: string, dto: GetAvailabilityDto) {
    const clinic = await this.findById(clinicId);
    const { startDate, endDate, practitionerId } = dto;

    if (!clinic.reservationEnabled) {
      return { available: false, message: '이 한의원은 온라인 예약을 받지 않습니다.' };
    }

    // 기존 예약 조회
    const queryBuilder = this.reservationRepository
      .createQueryBuilder('reservation')
      .where('reservation.clinicId = :clinicId', { clinicId })
      .andWhere('reservation.reservationDate >= :startDate', { startDate })
      .andWhere('reservation.reservationDate <= :endDate', { endDate })
      .andWhere('reservation.status IN (:...statuses)', {
        statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
      });

    if (practitionerId) {
      queryBuilder.andWhere('reservation.practitionerId = :practitionerId', { practitionerId });
    }

    const existingReservations = await queryBuilder.getMany();

    // 예약 가능 시간 계산
    const availableSlots: Record<string, string[]> = {};
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d.getDay()];

      const hours = clinic.operatingHours?.[dayOfWeek];
      if (!hours || hours.closed) {
        availableSlots[dateStr] = [];
        continue;
      }

      // 운영 시간 내 슬롯 생성
      const slots: string[] = [];
      const [openHour, openMin] = hours.open.split(':').map(Number);
      const [closeHour, closeMin] = hours.close.split(':').map(Number);
      const interval = clinic.reservationInterval || 30;

      let currentTime = openHour * 60 + openMin;
      const closeTime = closeHour * 60 + closeMin;

      // 점심 시간 제외
      const breakStart = hours.break
        ? parseInt(hours.break.start.split(':')[0]) * 60 +
          parseInt(hours.break.start.split(':')[1])
        : null;
      const breakEnd = hours.break
        ? parseInt(hours.break.end.split(':')[0]) * 60 + parseInt(hours.break.end.split(':')[1])
        : null;

      while (currentTime + interval <= closeTime) {
        // 점심 시간 체크
        if (breakStart && breakEnd && currentTime >= breakStart && currentTime < breakEnd) {
          currentTime += interval;
          continue;
        }

        const hour = Math.floor(currentTime / 60);
        const min = currentTime % 60;
        const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

        // 이미 예약된 시간인지 확인
        const isBooked = existingReservations.some(
          (r) =>
            r.reservationDate.toISOString().split('T')[0] === dateStr &&
            r.reservationTime === timeStr,
        );

        if (!isBooked) {
          slots.push(timeStr);
        }

        currentTime += interval;
      }

      availableSlots[dateStr] = slots;
    }

    return {
      available: true,
      clinicId,
      operatingHours: clinic.operatingHours,
      reservationInterval: clinic.reservationInterval,
      slots: availableSlots,
    };
  }

  // 한의원 등록 (의료진용)
  async create(userId: string, dto: CreateClinicDto) {
    const clinic = this.clinicRepository.create({
      ...dto,
      ownerId: userId,
    });

    const savedClinic = await this.clinicRepository.save(clinic);

    // 등록한 의료진을 owner로 추가
    const practitioner = this.practitionerRepository.create({
      clinicId: savedClinic.id,
      userId,
      role: 'owner' as any,
    });
    await this.practitionerRepository.save(practitioner);

    return savedClinic;
  }

  // 한의원 정보 수정
  async update(userId: string, clinicId: string, dto: UpdateClinicDto) {
    const clinic = await this.findById(clinicId);

    // 권한 확인
    if (clinic.ownerId !== userId) {
      throw new ForbiddenException('한의원 정보를 수정할 권한이 없습니다.');
    }

    Object.assign(clinic, dto);
    return this.clinicRepository.save(clinic);
  }

  // 환자-한의원 연결 조회
  async getPatientConnection(patientId: string, clinicId: string) {
    return this.connectionRepository.findOne({
      where: { patientId, clinicId },
    });
  }

  // 환자-한의원 연결
  async connectPatient(patientId: string, clinicId: string) {
    await this.findById(clinicId); // 한의원 존재 확인

    let connection = await this.connectionRepository.findOne({
      where: { patientId, clinicId },
    });

    if (connection) {
      connection.status = 'active' as any;
    } else {
      connection = this.connectionRepository.create({
        patientId,
        clinicId,
      });
    }

    return this.connectionRepository.save(connection);
  }

  // 환자가 연결된 한의원 목록
  async getPatientClinics(patientId: string) {
    const connections = await this.connectionRepository.find({
      where: { patientId, status: 'active' as any },
      relations: ['clinic'],
      order: { isPrimary: 'DESC', lastVisitAt: 'DESC' },
    });

    return connections.map((c) => ({
      ...c.clinic,
      isPrimary: c.isPrimary,
      lastVisitAt: c.lastVisitAt,
      totalVisits: c.totalVisits,
      connectedAt: c.connectedAt,
    }));
  }
}
