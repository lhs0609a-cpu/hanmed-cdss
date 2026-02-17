import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * AES-256-GCM 암호화 서비스
 * 환자 민감 데이터(PHI) 암호화를 위한 서비스
 *
 * 사용 예시:
 * - 알러지 정보
 * - 만성질환 정보
 * - 복용 약물 정보
 * - 전화번호
 */
@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16; // 128 bits
  private readonly authTagLength = 16; // 128 bits

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const keyHex = this.configService.get<string>('ENCRYPTION_KEY');

    if (!keyHex || keyHex === 'CHANGE_ME_USE_CRYPTO_RANDOM_BYTES_32_HEX') {
      const isProduction = this.configService.get('NODE_ENV') === 'production';
      if (isProduction) {
        throw new Error(
          'ENCRYPTION_KEY는 프로덕션 환경에서 반드시 설정해야 합니다. ' +
          '생성 명령어: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        );
      }
      this.logger.warn(
        '⚠️  ENCRYPTION_KEY가 설정되지 않았습니다! ' +
        '개발 환경용 임시 키를 사용합니다. 프로덕션에서는 반드시 설정하세요.'
      );
      this.encryptionKey = crypto.randomBytes(32);
    } else {
      if (keyHex.length !== 64) {
        throw new Error(
          'ENCRYPTION_KEY는 64자(32바이트 hex)여야 합니다. ' +
          '생성 명령어: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        );
      }
      this.encryptionKey = Buffer.from(keyHex, 'hex');
    }

    this.logger.log('✅ 암호화 서비스 초기화 완료');
  }

  /**
   * 문자열 데이터 암호화
   * @param plaintext 암호화할 평문
   * @returns IV:AuthTag:Ciphertext 형식의 암호화된 문자열 (base64)
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return plaintext;

    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // IV:AuthTag:Ciphertext 형식으로 결합
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }

  /**
   * 암호화된 데이터 복호화
   * @param encryptedData IV:AuthTag:Ciphertext 형식의 암호화된 문자열
   * @returns 복호화된 평문
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData) return encryptedData;

    // 암호화되지 않은 데이터 (콜론이 없음) - 마이그레이션 중 호환성
    if (!encryptedData.includes(':')) {
      return encryptedData;
    }

    try {
      const [ivBase64, authTagBase64, ciphertext] = encryptedData.split(':');

      if (!ivBase64 || !authTagBase64 || !ciphertext) {
        // 형식이 맞지 않으면 원본 반환 (마이그레이션 호환성)
        return encryptedData;
      }

      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');

      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error(`복호화 실패: ${error.message}`);
      // 복호화 실패시 원본 반환 (마이그레이션 중 호환성)
      return encryptedData;
    }
  }

  /**
   * JSON 배열 암호화 (알러지, 복용약 등)
   */
  encryptArray(arr: string[]): string {
    if (!arr || arr.length === 0) return '';
    return this.encrypt(JSON.stringify(arr));
  }

  /**
   * 암호화된 JSON 배열 복호화
   */
  decryptArray(encryptedData: string): string[] {
    if (!encryptedData) return [];

    try {
      const decrypted = this.decrypt(encryptedData);
      return JSON.parse(decrypted);
    } catch {
      // JSON 파싱 실패시 빈 배열 반환
      return [];
    }
  }

  /**
   * 전화번호 암호화 (검색용 해시와 함께)
   * @returns { encrypted: string, searchHash: string }
   */
  encryptPhone(phone: string): { encrypted: string; searchHash: string } {
    const encrypted = this.encrypt(phone);
    // 검색용 해시 (SHA-256의 처음 16자)
    const searchHash = crypto
      .createHash('sha256')
      .update(phone)
      .digest('hex')
      .substring(0, 16);

    return { encrypted, searchHash };
  }

  /**
   * 전화번호 해시로 검색용
   */
  hashPhone(phone: string): string {
    return crypto
      .createHash('sha256')
      .update(phone)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * 안전한 임시 비밀번호 생성
   */
  generateSecurePassword(length: number = 12): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz0123456789!@#$%';
    const randomBytes = crypto.randomBytes(length);
    let password = '';

    for (let i = 0; i < length; i++) {
      password += chars[randomBytes[i] % chars.length];
    }

    return password;
  }

  /**
   * 안전한 인증 코드 생성 (6자리)
   */
  generateSecureCode(length: number = 6): string {
    const randomBytes = crypto.randomBytes(length);
    let code = '';

    for (let i = 0; i < length; i++) {
      code += (randomBytes[i] % 10).toString();
    }

    return code;
  }
}
