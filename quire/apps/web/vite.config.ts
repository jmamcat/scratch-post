import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { offlinePlugin } from './src/platforms/offline/plugin.ts';

// Our own TypeScript has no import-time effects (CSS imports still count as effects), so a
// barrel that re-exports a heavy module only pulls it in when something uses it. Without this,
// `vault/index.ts` drags CodeMirror into the first-load bundle (R-PLT-07).
const ownSource = /\/(apps\/web\/src|packages\/[^/]+\/src)\/.*\.tsx?$/;

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
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: { treeshake: { moduleSideEffects: (id) => !ownSource.test(id) } },
  },
});
