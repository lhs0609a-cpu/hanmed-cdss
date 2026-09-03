import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ErrorLog } from '../../database/entities/error-log.entity';

/**
 * 오류를 표에 쌓는다.
 *
 * 규칙 셋:
 *
 *  1. 서비스보다 먼저 죽지 않는다. 기록에 실패하면 조용히 포기한다 — DB 가
 *     흔들려서 난 오류를 DB 에 쓰려다 오류를 또 만드는 것이 제일 나쁘다.
 *  2. 같은 오류는 한 행에 모은다. fingerprint 로 묶어 count 를 올린다.
 *  3. 같은 오류가 초당 여러 번 나면 1초에 한 번만 쓴다. 그 사이의 건수는
 *     메모리에 모아 다음 쓰기에 더한다 — 숫자를 잃지 않으면서 쓰기 폭주를
 *     막는다.
 */
@Injectable()
export class ErrorLogService {
  private readonly logger = new Logger(ErrorLogService.name);

  /** fingerprint → 마지막으로 쓴 시각과 그동안 모인 건수 */
  private readonly pending = new Map<string, { at: number; extra: number }>();

  /** 같은 오류를 이 간격 안에서는 한 번만 쓴다. */
  private static readonly WRITE_INTERVAL_MS = 1000;

  /** 스택은 이만큼만. 원인은 맨 위 몇 줄에 있다. */
  private static readonly STACK_CHARS = 4000;

  constructor(
    @InjectRepository(ErrorLog)
    private readonly repo: Repository<ErrorLog>,
  ) {}

  static fingerprint(method: string, path: string, message: string): string {
    return crypto
      .createHash('sha1')
      .update(`${method} ${path} ${message.slice(0, 120)}`)
      .digest('hex')
      .slice(0, 32);
  }

  /**
   * 기록할 오류인가.
   *
   * 5xx 는 전부 남긴다. 4xx 는 대부분 사용자 실수(잘못된 비밀번호, 검증
   * 실패)라 남기면 잡음이 되지만, 결제·웹훅 경로는 예외다 — 거기서 나는
   * 400 은 돈이 걸린 실패이고 원장이 알아야 한다.
   */
  shouldRecord(statusCode: number, path: string): boolean {
    if (statusCode >= 500) return true;
    if (statusCode < 400) return false;
    // 401·403 은 우리 결함이 아니다. 토큰이 만료됐거나 봇이 문을 두드린
    // 것이고, 결제 경로에도 하루 수십 번 찍힌다. 넣어 두면 잡음이 진짜
    // 오류를 덮는다.
    if (statusCode === 401 || statusCode === 403) return false;
    return /(webhook|payment|subscription|billing)/i.test(path);
  }

  async record(input: {
    statusCode: number;
    method: string;
    path: string;
    message: string;
    stack?: string | null;
    userId?: string | null;
  }): Promise<void> {
    try {
      // 쿼리스트링은 지운다. 토큰·이메일이 섞여 들어오는 자리다.
      const path = (input.path || '').split('?')[0].slice(0, 500);
      const message = (input.message || '').slice(0, 2000);
      const fingerprint = ErrorLogService.fingerprint(
        input.method,
        path,
        message,
      );

      const now = Date.now();
      const seen = this.pending.get(fingerprint);
      if (seen && now - seen.at < ErrorLogService.WRITE_INTERVAL_MS) {
        seen.extra += 1;
        return;
      }
      const extra = seen?.extra ?? 0;
      this.pending.set(fingerprint, { at: now, extra: 0 });

      const at = new Date();
      const increment = 1 + extra;

      // 있으면 세고, 없으면 만든다. 한 번의 왕복으로 끝낸다.
      const result = await this.repo
        .createQueryBuilder()
        .update(ErrorLog)
        .set({
          count: () => `"count" + ${increment}`,
          lastSeenAt: at,
          statusCode: input.statusCode,
          message,
          stack: input.stack
            ? input.stack.slice(0, ErrorLogService.STACK_CHARS)
            : null,
          lastUserId: input.userId ?? null,
          // 고쳤다고 닫아 뒀는데 다시 나면 열어 준다. 닫힌 채로 쌓이면
          // 아무도 안 본다.
          resolvedAt: null,
          resolvedBy: null,
        })
        .where('fingerprint = :fingerprint', { fingerprint })
        .execute();

      if (!result.affected) {
        await this.repo.insert({
          fingerprint,
          statusCode: input.statusCode,
          method: input.method.slice(0, 10),
          path,
          message,
          stack: input.stack
            ? input.stack.slice(0, ErrorLogService.STACK_CHARS)
            : null,
          lastUserId: input.userId ?? null,
          count: increment,
          firstSeenAt: at,
          lastSeenAt: at,
        });
      }
    } catch (e) {
      // 여기서 다시 던지면 오류 응답 자체가 깨진다.
      this.logger.warn(`오류 기록 실패: ${(e as Error).message}`);
    }
  }
}
