import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

export interface SystemNotice {
  id: string;
  level: 'info' | 'warning' | 'critical';
  title: string;
  body?: string;
  audience?: 'app' | 'patient' | 'all';
  startsAt?: string;
  endsAt?: string;
}

/**
 * 시스템 공지 — 점검·장애 안내를 앱 상단에 띄우기 위한 읽기 전용 엔드포인트.
 *
 * 프론트(SystemNoticeContext)가 진입할 때마다 호출하고 있었는데 엔드포인트가 없어
 * 모든 화면에서 404 가 쌓였다. 진짜 오류를 찾을 때 방해가 된다.
 *
 * 스키마를 새로 만들지 않고 SYSTEM_NOTICES 환경변수(JSON 배열)로 운영한다 —
 * 점검 공지는 1년에 몇 번 쓰는 기능이라 테이블·어드민 화면을 만들 이유가 없고,
 * Fly secret 한 줄로 즉시 띄우고 지울 수 있는 편이 장애 상황에서 빠르다.
 *
 * 예) fly secrets set SYSTEM_NOTICES='[{"id":"m-2026-08","level":"warning",
 *      "title":"8/20 02:00~04:00 정기 점검","audience":"app"}]'
 */
@ApiTags('notices')
@Controller('notices')
export class NoticesController {
  private readonly logger = new Logger(NoticesController.name);

  constructor(private readonly configService: ConfigService) {}

  @Get()
  @ApiOperation({ summary: '활성 시스템 공지 조회' })
  list(@Query('audience') audience?: string): SystemNotice[] {
    const raw = this.configService.get<string>('SYSTEM_NOTICES');
    if (!raw) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // 잘못 넣은 JSON 때문에 앱 전체가 500 을 보면 안 된다. 조용히 빈 목록.
      this.logger.warn('SYSTEM_NOTICES 파싱 실패 — 공지를 표시하지 않습니다.');
      return [];
    }
    if (!Array.isArray(parsed)) return [];

    const now = Date.now();
    return (parsed as SystemNotice[]).filter((n) => {
      if (!n || !n.id || !n.title) return false;
      if (audience && n.audience && n.audience !== 'all' && n.audience !== audience) {
        return false;
      }
      if (n.startsAt && Date.parse(n.startsAt) > now) return false;
      if (n.endsAt && Date.parse(n.endsAt) < now) return false;
      return true;
    });
  }
}
