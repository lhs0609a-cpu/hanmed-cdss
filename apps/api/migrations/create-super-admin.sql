-- =====================================================
-- 온고지신 CDSS - SUPER_ADMIN 계정 생성
-- Supabase SQL Editor에서 실행하세요
-- =====================================================

-- 아래 값들을 수정하세요:
-- 이메일: 원하는 관리자 이메일
-- 비밀번호 해시: https://bcrypt-generator.com/ 에서 생성 (rounds: 10)
-- 이름: 관리자 이름

-- =====================================================
-- 방법 1: 기존 계정을 SUPER_ADMIN으로 승격
-- =====================================================
-- UPDATE users
-- SET role = 'super_admin', status = 'active', "updatedAt" = NOW()
-- WHERE email = 'your-email@example.com';

-- =====================================================
-- 방법 2: 새 SUPER_ADMIN 계정 생성
-- =====================================================

-- 비밀번호 'admin1234'의 bcrypt 해시 (실제 사용시 변경하세요!)
-- $2b$10$8K1p/X5r5nKDK5kJY8Q6X.Wy3Q9sW5hXqD2Fb1rN.Y6F3b5Y5Xxxx

INSERT INTO users (
  id,
  email,
  "passwordHash",
  name,
  role,
  status,
  "subscriptionTier",
  "isVerified",
  "isLicenseVerified",
  "contributionPoints",
  "postCount",
  "commentCount",
  "acceptedAnswerCount",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'admin@hanmed.kr',                    -- 이메일 (수정하세요)
  '$2b$10$rqKL5FdVYlXxGz3pKxQdYeXDv2Tn6qY8MJw7vNbHc3sK1mWpXaYZi',  -- 비밀번호 해시 (수정하세요)
  '최고관리자',                          -- 이름 (수정하세요)
  'super_admin',
  'active',
  'clinic',
  true,
  true,
  0,
  0,
  0,
  0,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  role = 'super_admin',
  status = 'active',
  "subscriptionTier" = 'clinic',
  "isVerified" = true,
  "updatedAt" = NOW();

-- =====================================================
-- 생성된 계정 확인
-- =====================================================
SELECT id, email, name, role, status, "subscriptionTier", "createdAt"
FROM users
WHERE role = 'super_admin';

-- =====================================================
-- 비밀번호 해시 생성 방법
-- =====================================================
-- 1. https://bcrypt-generator.com/ 접속
-- 2. 원하는 비밀번호 입력
-- 3. Rounds: 10 선택
-- 4. Generate 클릭
-- 5. 생성된 해시를 위 SQL의 passwordHash에 붙여넣기
-- =====================================================
