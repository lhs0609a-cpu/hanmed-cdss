import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLog, AuditAction } from '../../../database/entities/admin-audit-log.entity';

export interface AuditLogParams {
  adminId: string;
  action: AuditAction | string;
  targetType?: string;
  targetId?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AdminAuditLog)
    private auditLogRepository: Repository<AdminAuditLog>,
  ) {}

  async log(params: AuditLogParams): Promise<AdminAuditLog> {
    const auditLog = this.auditLogRepository.create({
      adminId: params.adminId,
      action: params.action,
      targetType: params.targetType || null,
      targetId: params.targetId || null,
      oldValue: params.oldValue || null,
      newValue: params.newValue || null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    });

    return this.auditLogRepository.save(auditLog);
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    adminId?: string;
    action?: string;
    targetType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ logs: AdminAuditLog[]; total: number }> {
    const { page = 1, limit = 20, adminId, action, targetType, startDate, endDate } = options;

    const query = this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.admin', 'admin')
      .select([
        'log.id',
        'log.adminId',
        'log.action',
        'log.targetType',
        'log.targetId',
        'log.oldValue',
        'log.newValue',
        'log.ipAddress',
        'log.createdAt',
        'admin.id',
        'admin.name',
        'admin.email',
      ]);

    if (adminId) {
      query.andWhere('log.adminId = :adminId', { adminId });
    }

    if (action) {
      query.andWhere('log.action = :action', { action });
    }

    if (targetType) {
      query.andWhere('log.targetType = :targetType', { targetType });
    }

    if (startDate) {
      query.andWhere('log.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('log.createdAt <= :endDate', { endDate });
    }

    query.orderBy('log.createdAt', 'DESC');

    const [logs, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { logs, total };
  }

  async getRecentActivities(limit: number = 10): Promise<AdminAuditLog[]> {
    return this.auditLogRepository.find({
      relations: ['admin'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
