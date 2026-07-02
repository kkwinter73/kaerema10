import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 開発時はViteのdevサーバー(5173)から /api を devサーバー(3001)へプロキシ
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 同一LAN内の他端末からアクセス可能に
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
