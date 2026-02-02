import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';

interface CreateUserDto {
  email: string;
  passwordHash: string;
  name: string;
  licenseNumber?: string;
  clinicName?: string;
  consentTerms?: boolean;
  consentPrivacy?: boolean;
  consentMarketing?: boolean;
  consentTermsAt?: Date | null;
  consentPrivacyAt?: Date | null;
  consentMarketingAt?: Date | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async updateSubscription(
    userId: string,
    tier: string,
    expiresAt: Date,
  ): Promise<User> {
    await this.usersRepository.update(userId, {
      subscriptionTier: tier as any,
      subscriptionExpiresAt: expiresAt,
    });
    return this.findById(userId) as Promise<User>;
  }

  async addContributionPoints(userId: string, points: number): Promise<User> {
    const user = await this.findById(userId);
    if (user) {
      await this.usersRepository.update(userId, {
        contributionPoints: user.contributionPoints + points,
      });
    }
    return this.findById(userId) as Promise<User>;
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.usersRepository.update(userId, { passwordHash });
  }
}
