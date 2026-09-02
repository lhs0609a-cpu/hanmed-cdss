import { Injectable, UnauthorizedException, forwardRef, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { AuthService } from '../auth.service';
import { SubscriptionTier } from '../../../database/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string; jti?: string }) {
    if (payload.jti && (await this.authService.isTokenRevoked(payload.jti))) {
      throw new UnauthorizedException('로그아웃된 토큰입니다.');
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    // 만료된 구독은 무료로 본다.
    //
    // 강등은 매일 자정 크론이 한다. 그날 앱이 안 떠 있었거나 크론이 한 번
    // 실패하면 subscriptionTier 에 유료 등급이 그대로 남고, 기능 게이트와
    // 사용량 한도가 전부 그 값을 읽는다. 결제가 끊긴 사람이 계속 쓰는 것을
    // 하루짜리 크론 하나에 기대지 않는다.
    //
    // 여기서 거르는 이유는 이 값이 req.user.subscriptionTier 의 출처이기
    // 때문이다. 가드마다 따로 검사하면 언젠가 한 곳이 빠진다.
    //
    // 만료일이 없는 경우는 건드리지 않는다 — 값이 없다고 만료된 것은 아니다.
    const expired =
      user.subscriptionExpiresAt !== null &&
      user.subscriptionExpiresAt !== undefined &&
      new Date(user.subscriptionExpiresAt) < new Date();

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      subscriptionTier: expired ? SubscriptionTier.FREE : user.subscriptionTier,
      // 화면이 "구독이 만료됐다" 와 "원래 무료다" 를 구분해 안내할 수 있어야 한다.
      subscriptionExpired: expired,
      isVerified: user.isVerified,
      role: user.role,
      status: user.status,
    };
  }
}
