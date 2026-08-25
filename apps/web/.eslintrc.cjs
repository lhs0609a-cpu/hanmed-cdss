/**
 * API 쪽과 같은 사정이다 — lint 스크립트와 eslint 의존성은 있었는데
 * 설정 파일이 없어서 `eslint .` 가 exit 2 로 죽고 있었다.
 *
 * 규칙은 지금 통과하는 선에서 시작한다. 자세한 이유는 apps/api/.eslintrc.cjs
 * 주석 참고.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  ignorePatterns: [
    '.eslintrc.cjs',
    'dist',
    'node_modules',
    'coverage',
    'playwright-report',
    'test-results',
    'public',
    'scripts',
    'vite.config.js',
    'vite.config.d.ts',
    '*.timestamp-*.mjs',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
    ],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-empty-interface': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',
    // 훅 규칙은 실제 렌더 버그로 이어지므로 에러로 둔다.
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    // HMR 경계 문제는 개발 편의 사안이라 경고로 충분하다.
    'react-refresh/only-export-components': 'off',
    'no-empty': ['error', { allowEmptyCatch: true }],
  },
};
