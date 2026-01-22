const { Client } = require('pg');

async function createAdmin() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hanmed_cdss'
  });

  const email = 'lhs0609c@naver.com';
  // 미리 생성된 bcrypt 해시 (비밀번호: lhs0609c@naver.com)
  const passwordHash = '$2b$10$nJaGdo5CxCODfy9AGoyUYuXqVsRTzvRmBcK9ct2IVUpOe59mW5npW';
  const name = '최고관리자';

  try {
    await client.connect();

    // 기존 계정 확인
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);

    if (existing.rows.length > 0) {
      await client.query(
        'UPDATE users SET role = $1, status = $2, "passwordHash" = $3, "updatedAt" = NOW() WHERE email = $4',
        ['super_admin', 'active', passwordHash, email]
      );
      console.log('기존 계정을 SUPER_ADMIN으로 업데이트했습니다.');
    } else {
      await client.query(
        'INSERT INTO users (email, "passwordHash", name, role, status, "subscriptionTier", "isVerified", "isLicenseVerified", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())',
        [email, passwordHash, name, 'super_admin', 'active', 'clinic', true, true]
      );
      console.log('SUPER_ADMIN 계정이 생성되었습니다!');
    }

    console.log('');
    console.log('===== 관리자 계정 정보 =====');
    console.log('이메일:', email);
    console.log('비밀번호: lhs0609c@naver.com');
    console.log('역할: SUPER_ADMIN');
    console.log('============================');

  } catch (err) {
    console.error('오류:', err.message);
  } finally {
    await client.end();
  }
}

createAdmin();
