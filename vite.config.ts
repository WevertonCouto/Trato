import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import 'dotenv/config';

const api = `http://127.0.0.1:${process.env.API_PORT || 4410}`;

export default defineConfig({
  root: 'web',
  plugins: [react()],
  server: {
    port: Number(process.env.WEB_PORT || 5180),
    host: true,
    proxy: { '/api': { target: api, changeOrigin: true } },
    // no Windows o watcher nativo às vezes perde gravações seguidas: varre os arquivos
    watch: { usePolling: true, interval: 300 },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
