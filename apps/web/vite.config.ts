import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
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
