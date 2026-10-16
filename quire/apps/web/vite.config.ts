import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { offlinePlugin } from './src/platforms/offline/plugin.ts';

const target = process.env.QUIRE_DEV_SERVER ?? 'http://127.0.0.1:8787';

export default defineConfig({
  plugins: [react(), offlinePlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target, changeOrigin: true },
      '/live': { target, ws: true, changeOrigin: true },
    },
  },
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 2000 },
});
