import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import 'dotenv/config';

const api = `http://127.0.0.1:${process.env.API_PORT || 4410}`;

/** No app nativo (npm run android:sync) não existe landing: o app vira a página inicial do pacote. */
const appComoInicio = (): Plugin => ({
  name: 'trato-app-como-inicio',
  apply: 'build',
  closeBundle() {
    const dist = path.resolve('web/dist');
    fs.copyFileSync(path.join(dist, 'app/index.html'), path.join(dist, 'index.html'));
  },
});

/** robots.txt e sitemap.xml com a URL pública do site (VITE_SITE_URL). */
const seo = (site: string): Plugin => ({
  name: 'trato-seo',
  apply: 'build',
  generateBundle() {
    const base = site.replace(/\/$/, '');
    const paginas = ['/', '/privacidade', '/termos', '/cancelamento', '/excluir-conta'];
    this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\nDisallow: /app/\nDisallow: /api/\n\nSitemap: ${base}/sitemap.xml\n` });
    this.emitFile({
      type: 'asset', fileName: 'sitemap.xml',
      source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paginas.map((p) => `  <url><loc>${base}${p}</loc></url>`).join('\n')}\n</urlset>\n`,
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    root: 'web',
    envDir: process.cwd(),
    plugins: [react(), seo(env.VITE_SITE_URL || 'https://SEU-DOMINIO'), ...(mode === 'android' ? [appComoInicio()] : [])],
    server: {
      port: Number(process.env.WEB_PORT || 5180),
      host: true,
      proxy: { '/api': { target: api, changeOrigin: true } },
      // no Windows o watcher nativo às vezes perde gravações seguidas: varre os arquivos
      watch: { usePolling: true, interval: 300 },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      // duas páginas: a landing (/) e o app web (/app/)
      rollupOptions: { input: { landing: path.resolve('web/index.html'), app: path.resolve('web/app/index.html') } },
    },
  };
});
