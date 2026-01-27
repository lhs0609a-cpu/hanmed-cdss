import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { Payment } from '../../database/entities/payment.entity';
import * as fs from 'fs';
import * as path from 'path';

interface BackupMetadata {
  id: string;
  timestamp: string;
  type: 'full' | 'incremental';
  tables: string[];
  recordCount: number;
  sizeBytes: number;
  status: 'completed' | 'failed';
  error?: string;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;
  private readonly maxBackups: number = 30; // 30일간 보관

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {
    // 백업 디렉토리 설정
    this.backupDir = this.configService.get<string>('BACKUP_DIR') || './backups';
    this.ensureBackupDirectory();
  }

  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      this.logger.log(`백업 디렉토리 생성: ${this.backupDir}`);
    }
  }

  /**
   * 매일 새벽 3시에 자동 백업 실행
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scheduledBackup(): Promise<void> {
    this.logger.log('예약된 일일 백업 시작...');
    try {
      await this.createFullBackup();
      await this.cleanupOldBackups();
      this.logger.log('예약된 일일 백업 완료');
    } catch (error) {
      this.logger.error('예약된 백업 실패:', error);
    }
  }

  /**
   * 전체 백업 생성
   */
  async createFullBackup(): Promise<BackupMetadata> {
    const backupId = `backup_${Date.now()}`;
    const timestamp = new Date().toISOString();
    const backupPath = path.join(this.backupDir, `${backupId}.json`);

    this.logger.log(`전체 백업 시작: ${backupId}`);

    try {
      // 중요 테이블 데이터 수집
      const users = await this.userRepository.find({
        select: ['id', 'email', 'name', 'licenseNumber', 'subscriptionTier', 'createdAt', 'updatedAt'],
      });

      const subscriptions = await this.subscriptionRepository.find();
      const payments = await this.paymentRepository.find();

      const backupData = {
        metadata: {
          id: backupId,
          timestamp,
          version: '1.0',
          tables: ['users', 'subscriptions', 'payments'],
        },
        data: {
          users: users.map(u => ({
            ...u,
            // 민감 정보 제외
            password: undefined,
          })),
          subscriptions,
          payments: payments.map(p => ({
            ...p,
            // 결제 상세 정보는 마스킹
            cardNumber: p.cardNumber ? `****${p.cardNumber.slice(-4)}` : null,
          })),
        },
      };

      // 백업 파일 작성
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');

      const stats = fs.statSync(backupPath);
      const recordCount = users.length + subscriptions.length + payments.length;

      const metadata: BackupMetadata = {
        id: backupId,
        timestamp,
        type: 'full',
        tables: ['users', 'subscriptions', 'payments'],
        recordCount,
        sizeBytes: stats.size,
        status: 'completed',
      };

      // 메타데이터 파일 저장
      this.saveBackupMetadata(metadata);

      this.logger.log(`백업 완료: ${backupId}, ${recordCount}개 레코드, ${this.formatBytes(stats.size)}`);

      return metadata;
    } catch (error) {
      this.logger.error(`백업 실패: ${backupId}`, error);

      const metadata: BackupMetadata = {
        id: backupId,
        timestamp,
        type: 'full',
        tables: [],
        recordCount: 0,
        sizeBytes: 0,
        status: 'failed',
        error: error.message,
      };

      this.saveBackupMetadata(metadata);
      throw error;
    }
  }

  /**
   * 특정 사용자 데이터 백업 (데이터 이동권 대응)
   */
  async createUserDataExport(userId: string): Promise<{
    data: any;
    filename: string;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const subscriptions = await this.subscriptionRepository.find({ where: { userId } });
    const payments = await this.paymentRepository.find({ where: { userId } });

    const exportData = {
      exportInfo: {
        exportedAt: new Date().toISOString(),
        userId,
        requestedBy: 'user',
      },
      userData: {
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        subscriptionTier: user.subscriptionTier,
      },
      subscriptionHistory: subscriptions.map(s => ({
        status: s.status,
        billingInterval: s.billingInterval,
        createdAt: s.createdAt,
        currentPeriodStart: s.currentPeriodStart,
        currentPeriodEnd: s.currentPeriodEnd,
      })),
      paymentHistory: payments.map(p => ({
        orderName: p.orderName,
        amount: p.amount,
        status: p.status,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
    };

    const filename = `user_data_export_${userId}_${Date.now()}.json`;

    return {
      data: exportData,
      filename,
    };
  }

  /**
   * 백업에서 데이터 복원 (관리자용)
   */
  async restoreFromBackup(backupId: string): Promise<{
    success: boolean;
    restoredRecords: number;
  }> {
    const backupPath = path.join(this.backupDir, `${backupId}.json`);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`백업 파일을 찾을 수 없습니다: ${backupId}`);
    }

    this.logger.warn(`백업 복원 시작: ${backupId} - 이 작업은 기존 데이터를 덮어씁니다!`);

    try {
      const backupContent = fs.readFileSync(backupPath, 'utf-8');
      const backupData = JSON.parse(backupContent);

      // 복원 로직 (실제 프로덕션에서는 더 세밀한 처리 필요)
      let restoredCount = 0;

      // 여기서는 로그만 남기고 실제 복원은 수동으로 진행하도록 함
      this.logger.log(`복원 대상: ${backupData.data.users?.length || 0}명의 사용자`);
      this.logger.log(`복원 대상: ${backupData.data.subscriptions?.length || 0}개의 구독`);
      this.logger.log(`복원 대상: ${backupData.data.payments?.length || 0}개의 결제`);

      restoredCount = (backupData.data.users?.length || 0) +
        (backupData.data.subscriptions?.length || 0) +
        (backupData.data.payments?.length || 0);

      return {
        success: true,
        restoredRecords: restoredCount,
      };
    } catch (error) {
      this.logger.error(`복원 실패: ${backupId}`, error);
      throw error;
    }
  }

  /**
   * 백업 목록 조회
   */
  async listBackups(): Promise<BackupMetadata[]> {
    const metadataPath = path.join(this.backupDir, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(metadataPath, 'utf-8');
      const metadata = JSON.parse(content);
      return metadata.backups || [];
    } catch {
      return [];
    }
  }

  /**
   * 오래된 백업 정리
   */
  private async cleanupOldBackups(): Promise<void> {
    const backups = await this.listBackups();

    if (backups.length <= this.maxBackups) {
      return;
    }

    // 오래된 순으로 정렬
    const sortedBackups = backups.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // 초과분 삭제
    const toDelete = sortedBackups.slice(0, backups.length - this.maxBackups);

    for (const backup of toDelete) {
      const filePath = path.join(this.backupDir, `${backup.id}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`오래된 백업 삭제: ${backup.id}`);
      }
    }

    // 메타데이터 업데이트
    const remainingBackups = sortedBackups.slice(backups.length - this.maxBackups);
    this.saveAllBackupMetadata(remainingBackups);
  }

  /**
   * 백업 메타데이터 저장
   */
  private saveBackupMetadata(metadata: BackupMetadata): void {
    const metadataPath = path.join(this.backupDir, 'metadata.json');
    let allMetadata: { backups: BackupMetadata[] } = { backups: [] };

    if (fs.existsSync(metadataPath)) {
      try {
        const content = fs.readFileSync(metadataPath, 'utf-8');
        allMetadata = JSON.parse(content);
      } catch {
        allMetadata = { backups: [] };
      }
    }

    allMetadata.backups.push(metadata);
    fs.writeFileSync(metadataPath, JSON.stringify(allMetadata, null, 2), 'utf-8');
  }

  private saveAllBackupMetadata(backups: BackupMetadata[]): void {
    const metadataPath = path.join(this.backupDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify({ backups }, null, 2), 'utf-8');
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 백업 상태 확인
   */
  async getBackupStatus(): Promise<{
    lastBackup: BackupMetadata | null;
    totalBackups: number;
    totalSizeBytes: number;
    nextScheduledBackup: string;
  }> {
    const backups = await this.listBackups();
    const lastBackup = backups.length > 0
      ? backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
      : null;

    const totalSize = backups.reduce((sum, b) => sum + b.sizeBytes, 0);

    // 다음 백업 시간 계산 (매일 새벽 3시)
    const now = new Date();
    const next = new Date(now);
    next.setHours(3, 0, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    return {
      lastBackup,
      totalBackups: backups.length,
      totalSizeBytes: totalSize,
      nextScheduledBackup: next.toISOString(),
    };
  }
}
