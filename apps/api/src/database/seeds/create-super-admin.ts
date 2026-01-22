import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';

// 대화형 입력 헬퍼
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// 비밀번호 입력 (숨김 처리는 터미널에 따라 다름)
function promptPassword(question: string): Promise<string> {
  return prompt(question);
}

async function createSuperAdmin() {
  console.log('\n========================================');
  console.log('   온고지신 CDSS - SUPER_ADMIN 생성');
  console.log('========================================\n');

  // 환경변수 또는 대화형 입력
  let email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;
  let name = process.env.ADMIN_NAME;

  if (!email) {
    email = await prompt('관리자 이메일: ');
  }

  if (!password) {
    password = await promptPassword('관리자 비밀번호: ');
    const confirmPassword = await promptPassword('비밀번호 확인: ');

    if (password !== confirmPassword) {
      console.error('\n❌ 비밀번호가 일치하지 않습니다.');
      process.exit(1);
    }
  }

  if (!name) {
    name = await prompt('관리자 이름 (기본값: 최고관리자): ');
    if (!name) name = '최고관리자';
  }

  // 유효성 검사
  if (!email || !email.includes('@')) {
    console.error('\n❌ 유효한 이메일을 입력해주세요.');
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error('\n❌ 비밀번호는 8자 이상이어야 합니다.');
    process.exit(1);
  }

  console.log('\n생성할 계정 정보:');
  console.log(`  이메일: ${email}`);
  console.log(`  이름: ${name}`);
  console.log(`  역할: SUPER_ADMIN\n`);

  const confirm = await prompt('계정을 생성하시겠습니까? (y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('\n취소되었습니다.');
    process.exit(0);
  }

  // 데이터베이스 연결
  const dataSource = new DataSource(dataSourceOptions);

  try {
    await dataSource.initialize();
    console.log('\n✓ 데이터베이스 연결 성공');

    // 비밀번호 해싱
    const passwordHash = await bcrypt.hash(password, 10);

    // 기존 계정 확인
    const existing = await dataSource.query(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );

    if (existing.length > 0) {
      // 기존 계정이 있으면 역할만 업데이트
      console.log('\n⚠ 이미 존재하는 계정입니다. 역할을 SUPER_ADMIN으로 업데이트합니다.');

      await dataSource.query(
        `UPDATE users
         SET role = 'super_admin', status = 'active', "updatedAt" = NOW()
         WHERE email = $1`,
        [email]
      );

      console.log('✓ 역할이 SUPER_ADMIN으로 업데이트되었습니다.');
    } else {
      // 새 계정 생성
      await dataSource.query(
        `INSERT INTO users (
          email,
          "passwordHash",
          name,
          role,
          status,
          "subscriptionTier",
          "isVerified",
          "isLicenseVerified",
          "createdAt",
          "updatedAt"
        ) VALUES ($1, $2, $3, 'super_admin', 'active', 'clinic', true, true, NOW(), NOW())`,
        [email, passwordHash, name]
      );

      console.log('\n✓ SUPER_ADMIN 계정이 생성되었습니다!');
    }

    console.log('\n========================================');
    console.log('   계정 생성 완료');
    console.log('========================================');
    console.log(`\n  이메일: ${email}`);
    console.log(`  역할: SUPER_ADMIN`);
    console.log(`  구독: clinic (무제한)`);
    console.log('\n  로그인 URL: http://localhost:3000/login');
    console.log('  관리자 URL: http://localhost:3000/admin\n');

  } catch (error) {
    console.error('\n❌ 오류가 발생했습니다:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

// 실행
createSuperAdmin();
