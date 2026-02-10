import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserData,
  SYNCABLE_DATA_KEYS,
  SyncableDataKey,
  CLOUD_STORAGE_LIMITS,
} from '../../database/entities/user-data.entity';
import { User, SubscriptionTier } from '../../database/entities/user.entity';

@Injectable()
export class UserDataService {
  // 클라우드 동기화 가능 플랜
  private readonly SYNC_ENABLED_TIERS: SubscriptionTier[] = [
    SubscriptionTier.PROFESSIONAL,
    SubscriptionTier.CLINIC,
    SubscriptionTier.ENTERPRISE,
  ];

  constructor(
    @InjectRepository(UserData)
    private readonly userDataRepository: Repository<UserData>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 사용자가 클라우드 동기화 가능한 플랜인지 확인
   */
  private async checkSyncPermission(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (!this.SYNC_ENABLED_TIERS.includes(user.subscriptionTier)) {
      throw new ForbiddenException(
        '클라우드 동기화는 Professional 플랜 이상에서 사용 가능합니다.',
      );
    }

    return user;
  }

  /**
   * 유효한 데이터 키인지 확인
   */
  private validateDataKey(key: string): asserts key is SyncableDataKey {
    if (!SYNCABLE_DATA_KEYS.includes(key as SyncableDataKey)) {
      throw new BadRequestException(
        `유효하지 않은 데이터 키입니다: ${key}. 허용된 키: ${SYNCABLE_DATA_KEYS.join(', ')}`,
      );
    }
  }

  /**
   * 사용자의 총 클라우드 사용량 계산
   */
  async getTotalUsage(userId: string): Promise<number> {
    const result = await this.userDataRepository
      .createQueryBuilder('userData')
      .select('SUM(userData.dataSize)', 'total')
      .where('userData.userId = :userId', { userId })
      .getRawOne();

    return parseInt(result?.total || '0', 10);
  }

  /**
   * 클라우드에서 데이터 조회
   */
  async getData(userId: string, dataKey: string): Promise<UserData | null> {
    await this.checkSyncPermission(userId);
    this.validateDataKey(dataKey);

    return this.userDataRepository.findOne({
      where: { userId, dataKey },
    });
  }

  /**
   * 클라우드에 데이터 저장
   */
  async saveData(
    userId: string,
    dataKey: string,
    data: unknown,
  ): Promise<UserData> {
    const user = await this.checkSyncPermission(userId);
    this.validateDataKey(dataKey);

    // 데이터 크기 계산
    const dataString = JSON.stringify(data);
    const dataSize = Buffer.byteLength(dataString, 'utf8');

    // 용량 제한 체크
    const currentUsage = await this.getTotalUsage(userId);
    const limit =
      CLOUD_STORAGE_LIMITS[
        user.subscriptionTier.toLowerCase() as keyof typeof CLOUD_STORAGE_LIMITS
      ] || 0;

    // 기존 데이터 조회
    const existing = await this.userDataRepository.findOne({
      where: { userId, dataKey },
    });

    const existingSize = existing?.dataSize || 0;
    const newTotalUsage = currentUsage - existingSize + dataSize;

    if (newTotalUsage > limit) {
      const limitMB = (limit / (1024 * 1024)).toFixed(0);
      const usedMB = (newTotalUsage / (1024 * 1024)).toFixed(1);
      throw new BadRequestException(
        `클라우드 저장 용량 초과: ${usedMB}MB / ${limitMB}MB 한도. 일부 데이터를 삭제하거나 플랜을 업그레이드하세요.`,
      );
    }

    if (existing) {
      // 기존 데이터 업데이트
      existing.data = data;
      existing.dataSize = dataSize;
      return this.userDataRepository.save(existing);
    }

    // 새 데이터 생성
    const newData = this.userDataRepository.create({
      userId,
      dataKey,
      data,
      dataSize,
    });

    return this.userDataRepository.save(newData);
  }

  /**
   * 클라우드 데이터 삭제
   */
  async deleteData(userId: string, dataKey: string): Promise<void> {
    await this.checkSyncPermission(userId);
    this.validateDataKey(dataKey);

    await this.userDataRepository.delete({ userId, dataKey });
  }

  /**
   * 사용자의 모든 클라우드 데이터 조회
   */
  async getAllData(userId: string): Promise<UserData[]> {
    await this.checkSyncPermission(userId);

    return this.userDataRepository.find({
      where: { userId },
      select: ['dataKey', 'data', 'updatedAt', 'dataSize'],
    });
  }

  /**
   * 클라우드 사용량 요약 조회
   */
  async getUsageSummary(userId: string): Promise<{
    totalUsed: number;
    limit: number;
    percentage: number;
    byKey: Record<string, number>;
  }> {
    const user = await this.checkSyncPermission(userId);
    const limit =
      CLOUD_STORAGE_LIMITS[
        user.subscriptionTier.toLowerCase() as keyof typeof CLOUD_STORAGE_LIMITS
      ] || 0;

    const allData = await this.userDataRepository.find({
      where: { userId },
      select: ['dataKey', 'dataSize'],
    });

    const byKey: Record<string, number> = {};
    let totalUsed = 0;

    for (const item of allData) {
      byKey[item.dataKey] = item.dataSize;
      totalUsed += item.dataSize;
    }

    return {
      totalUsed,
      limit,
      percentage: limit > 0 ? (totalUsed / limit) * 100 : 0,
      byKey,
    };
  }
}
