/**
 * 이 파일은 원래 없었다. package.json 에 lint 스크립트와 eslint 의존성은
 * 있었지만 설정 파일이 없어 eslint 가 exit 2 로 죽었고, CI 는 그보다 앞선
 * 설치 단계에서 이미 죽고 있어서 아무도 몰랐다.
 *
 * 규칙은 "지금 통과하는 선"에서 시작한다. 기존 코드에 이미 퍼져 있는
 * 스타일 문제를 한꺼번에 에러로 올리면 CI 가 다시 상시 빨강이 되고,
 * 그러면 설정이 없던 때와 똑같아진다. 진짜 실수(안 쓰는 변수, 잘못된
 * 참조)는 에러로, 취향과 점진적 개선 대상은 warn 으로 둔다.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: {
    node: true,
    jest: true,
    es2022: true,
  },
  ignorePatterns: [
    '.eslintrc.cjs',
    'dist',
    'node_modules',
    'coverage',
    '*.js',
  ],
  rules: {
    // 데코레이터 기반 프레임워크라 any 가 경계에서 불가피하게 나온다.
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    // 안 쓰는 변수는 진짜 실수인 경우가 많다. 다만 _ 로 시작하면 의도된 것.
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
    ],
    'no-unused-vars': 'off',
    // TypeORM 엔티티의 순환 참조 화살표 함수 때문에 필요하다.
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-empty-interface': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/no-var-requires': 'warn',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-console': 'off',
  },
};
