import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * RFC 6238 TOTP (Time-based One-Time Password) 구현.
 * 외부 라이브러리 의존성을 줄이기 위해 Node 표준 crypto 모듈만 사용한다.
 *
 * 호환: Google Authenticator, Authy, 1Password, Microsoft Authenticator 등
 * 모든 표준 인증 앱.
 */
@Injectable()
export class TotpService {
  private readonly digits = 6;
  private readonly periodSeconds = 30;
  private readonly algorithm = 'sha1' as const;

  // RFC 4648 base32 알파벳
  private readonly base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  /** 새 시크릿 생성 (160bit 권장 = base32 32자) */
  generateSecret(): string {
    const bytes = crypto.randomBytes(20);
    return this.encodeBase32(bytes);
  }

  /**
   * 인증 앱(Google Authenticator 등)에 추가할 수 있는 otpauth URI 생성.
   * QR 코드로 변환하여 사용자에게 노출한다.
   */
  buildOtpAuthUrl(label: string, secretBase32: string, issuer = '온고지신 AI'): string {
    const params = new URLSearchParams({
      secret: secretBase32,
      issuer,
      algorithm: 'SHA1',
      digits: String(this.digits),
      period: String(this.periodSeconds),
    });
    const encodedLabel = encodeURIComponent(`${issuer}:${label}`);
    return `otpauth://totp/${encodedLabel}?${params.toString()}`;
  }

  /**
   * 사용자가 입력한 코드를 검증한다. 시계 차이를 고려해
   * window=±1 (총 3개 시간 슬롯)을 허용한다.
   */
  verify(code: string, secretBase32: string, window = 1): boolean {
    if (!/^\d{6}$/.test(code)) return false;
    const now = Math.floor(Date.now() / 1000 / this.periodSeconds);
    const target = code.padStart(this.digits, '0');

    for (let offset = -window; offset <= window; offset++) {
      const generated = this.generateCode(secretBase32, now + offset);
      // 타이밍 공격 방지: 상수 시간 비교
      if (this.constantTimeEquals(generated, target)) {
        return true;
      }
    }
    return false;
  }

  private generateCode(secretBase32: string, counter: number): string {
    const key = this.decodeBase32(secretBase32);
    const counterBuf = Buffer.alloc(8);
    // 8바이트 빅엔디안 카운터
    counterBuf.writeBigUInt64BE(BigInt(counter));

    const hmac = crypto.createHmac(this.algorithm, key).update(counterBuf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const code = binary % 10 ** this.digits;
    return code.toString().padStart(this.digits, '0');
  }

  private encodeBase32(buf: Buffer): string {
    let bits = 0;
    let value = 0;
    let output = '';
    for (const byte of buf) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        output += this.base32Alphabet[(value >>> (bits - 5)) & 0x1f];
        bits -= 5;
      }
    }
    if (bits > 0) {
      output += this.base32Alphabet[(value << (5 - bits)) & 0x1f];
    }
    return output;
  }

  private decodeBase32(input: string): Buffer {
    const cleaned = input.replace(/=+$/g, '').toUpperCase();
    let bits = 0;
    let value = 0;
    const out: number[] = [];
    for (const ch of cleaned) {
      const idx = this.base32Alphabet.indexOf(ch);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        out.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    return Buffer.from(out);
  }

  private constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }
}
