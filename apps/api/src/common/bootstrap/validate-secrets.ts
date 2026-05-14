import { Logger } from '@nestjs/common';

/**
 * 부팅 시 시크릿/환경변수 검증.
 *
 * 의료 SaaS — 환자 데이터 AES 키, JWT 위조 방지, 결제 라이브 키 분리는 환자 안전·법적 책임 직결.
 * 누락만 보지 말고 placeholder 가 그대로 들어왔는지·길이가 충분한지·운영에 테스트 키가
 * 잘못 박혔는지까지 막는다.
 */

interface SecretRule {
  name: string;
  /** 운영(production)에서만 강제할지 */
  productionOnly?: boolean;
  /** 최소 길이 (없으면 길이 검사 안 함) */
  minLength?: number;
  /** 운영에서 절대 들어오면 안 되는 값/접두사 */
  forbiddenInProd?: string[];
}

const PLACEHOLDER_PATTERNS = [
  /^CHANGE_ME/i,
  /^your[-_]/i,
  /^test[-_]/i,
  /^sk-your/i,
  /^sk-ant-your/i,
  /your-api-key/i,
  /<your[-_]/i,
];

const RULES: SecretRule[] = [
  { name: 'DATABASE_URL', productionOnly: true },
  { name: 'JWT_SECRET', minLength: 32, productionOnly: true },
  { name: 'REFRESH_TOKEN_SECRET', minLength: 32, productionOnly: true },
  { name: 'ENCRYPTION_KEY', minLength: 64, productionOnly: true }, // 32바이트 hex = 64자
  { name: 'INTERNAL_API_KEY', minLength: 16, productionOnly: true },
  {
    name: 'TOSS_SECRET_KEY',
    productionOnly: true,
    forbiddenInProd: ['test_'],
  },
];

function looksLikePlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((p) => p.test(value));
}

/**
 * 검증 실패 시 errors 배열에 누적해서 한 번에 보고하고 부팅을 중단한다.
 * 운영(production)에서는 process.exit(1), 개발에서는 warn 만.
 */
export function validateSecrets(logger: Logger): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of RULES) {
    const value = process.env[rule.name];
    const shouldEnforce = isProduction || !rule.productionOnly;

    if (!value) {
      const msg = `${rule.name} 미설정`;
      if (shouldEnforce) {
        errors.push(msg);
      } else {
        warnings.push(msg);
      }
      continue;
    }

    if (looksLikePlaceholder(value)) {
      const msg = `${rule.name} 가 placeholder 값(${value.slice(0, 24)}…)으로 설정되어 있음 — .env 의 실제 값으로 교체 필요`;
      if (shouldEnforce) {
        errors.push(msg);
      } else {
        warnings.push(msg);
      }
      continue;
    }

    if (rule.minLength && value.length < rule.minLength) {
      const msg = `${rule.name} 길이 부족 (${value.length}자, 최소 ${rule.minLength}자 필요)`;
      if (shouldEnforce) {
        errors.push(msg);
      } else {
        warnings.push(msg);
      }
    }

    if (isProduction && rule.forbiddenInProd) {
      for (const bad of rule.forbiddenInProd) {
        if (value.startsWith(bad)) {
          errors.push(
            `${rule.name} 가 운영에서 금지된 접두사 '${bad}' 로 시작함 — 라이브 키로 교체 필요`,
          );
          break;
        }
      }
    }
  }

  for (const w of warnings) {
    logger.warn(`[secrets] ${w}`);
  }
  if (errors.length > 0) {
    logger.error('[secrets] 부팅 차단 — 다음 항목을 수정하세요:');
    for (const e of errors) logger.error(`  - ${e}`);
    process.exit(1);
  }
  logger.log('[secrets] 검증 통과');
}
