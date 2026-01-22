/**
 * Jest 테스트 설정 파일
 * 모든 테스트 전에 실행됩니다.
 */

// 테스트 환경 변수 설정
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';

// 콘솔 로그 무시 (필요 시 주석 해제)
// jest.spyOn(console, 'log').mockImplementation(() => {});
// jest.spyOn(console, 'warn').mockImplementation(() => {});

// 전역 타임아웃 설정
jest.setTimeout(30000);

// 테스트 후 정리
afterAll(async () => {
  // 데이터베이스 연결 정리 등
});
