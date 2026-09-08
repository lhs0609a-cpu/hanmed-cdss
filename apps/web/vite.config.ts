import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'

// 버전은 한 곳에서만 읽는다.
// 설치 파일의 버전은 apps/desktop/package.json 이 유일한 출처다 —
// electron-builder 가 거기서 읽어 파일 이름과 업데이트 메타데이터를 만든다.
// 웹이 그 숫자를 따로 적어두면 릴리스마다 두 곳이 어긋나고,
// 다운로드 페이지가 없는 파일을 가리키게 된다.
const readVersion = (relPath: string): string =>
  JSON.parse(readFileSync(path.resolve(__dirname, relPath), 'utf-8')).version

const WEB_VERSION = readVersion('./package.json')
const DESKTOP_VERSION = readVersion('../desktop/package.json')

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(WEB_VERSION),
    __DESKTOP_VERSION__: JSON.stringify(DESKTOP_VERSION),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // 자주 쓰이지만 거의 변하지 않는 vendor 모듈을 별도 청크로 분리.
        // 임상의가 처음 진입할 때 첫 페인트는 react-vendor만 받고, 나머지는 lazy 로드된 페이지에서 필요할 때 받는다.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query', 'zustand'],
          'ui-vendor': ['lucide-react', 'sonner', 'class-variance-authority', 'clsx', 'tailwind-merge'],
          'chart-vendor': ['recharts'],
          'form-vendor': ['react-hook-form', 'zod', '@hookform/resolvers'],
        },
      },
    },
  },
})
