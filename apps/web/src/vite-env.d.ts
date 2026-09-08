/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// vite.config.ts 의 define 으로 빌드 시점에 박히는 상수.
// @/config/version 을 거쳐서만 쓴다.
declare const __APP_VERSION__: string
declare const __DESKTOP_VERSION__: string
declare const __BUILD_DATE__: string
