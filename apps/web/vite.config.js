import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    return ({
        // A separate, explicit preview mode keeps local development credentials/settings intact.
        // Browsers call their own origin; Vite forwards only /api to the fixed HTTPS API host.
        define: mode === 'connected'
            ? { 'import.meta.env.VITE_API_URL': JSON.stringify('/api/v1') }
            : undefined,
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
        preview: mode === 'connected' ? {
            host: '127.0.0.1',
            port: 4176,
            strictPort: true,
            proxy: {
                '/api': {
                    target: 'https://api.ongojisin.co.kr',
                    changeOrigin: true,
                },
            },
        } : undefined,
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
    });
});
