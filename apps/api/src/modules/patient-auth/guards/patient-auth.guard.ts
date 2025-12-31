import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PatientAuthService } from '../patient-auth.service';

@Injectable()
export class PatientAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private patientAuthService: PatientAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('인증 토큰이 필요합니다.');
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      // 환자 타입 토큰인지 확인
      if (payload.type !== 'patient') {
        throw new UnauthorizedException('잘못된 인증 토큰입니다.');
      }

      // 환자 정보 조회
      const patient = await this.patientAuthService.findById(payload.sub);
      if (!patient || !patient.isActive) {
        throw new UnauthorizedException('유효하지 않은 계정입니다.');
      }

      request.user = patient;
      return true;
    } catch {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
