import fs from 'node:fs';
import path from 'node:path';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import './db.ts';
import { HEADER_SESSAO, authRoutes, sessao, type Env } from './auth.ts';
import { assinaturaRoutes, webhookRoutes } from './assinatura.ts';
import { PAGINAS_LEGAIS } from '../shared/legal.ts';
import { criancaRoutes } from './crianca.ts';
import { responsavelRoutes } from './responsavel.ts';

const app = new Hono<Env>();

// o app nativo (Capacitor) roda em https://localhost (Android) ou capacitor://localhost (iPhone) e chama a API pública
const origens = (process.env.CORS_ORIGINS || 'https://localhost,capacitor://localhost,http://localhost').split(',').map((o) => o.trim());
app.use('/api/*', cors({
  origin: (o) => (origens.includes(o) ? o : null),
  allowHeaders: ['Content-Type', 'Authorization', 'X-Trato-Nativo'],
  exposeHeaders: [HEADER_SESSAO],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  maxAge: 86400,
}));
app.route('/api', webhookRoutes);
app.use('/api/*', sessao);
app.route('/api', authRoutes);
app.route('/api/eu', criancaRoutes);
app.route('/api/adulto/assinatura', assinaturaRoutes);
app.route('/api/adulto', responsavelRoutes);
app.all('/api/*', (c) => c.json({ erro: 'Rota não encontrada.' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ erro: 'Algo deu errado. Tente de novo.' }, 500);
});

// em produção a API também serve a tela (web/dist); no dev quem serve é o Vite
const dist = path.resolve('web/dist');
if (fs.existsSync(dist)) {
  app.use('/sw.js', async (c, next) => { await next(); c.header('cache-control', 'no-cache'); });
  // páginas públicas (a loja exige links abertos, sem login): /privacidade, /termos, /cancelamento, /excluir-conta
  for (const p of PAGINAS_LEGAIS) app.get(`/${p}`, (c) => c.html(fs.readFileSync(path.join(dist, `${p}.html`), 'utf8')));
  // /app sem barra: o app usa caminhos relativos ao /app/
  app.get('/app', (c) => c.redirect('/app/', 301));
  app.use('/*', serveStatic({ root: path.relative(process.cwd(), dist) }));
  // lido a cada pedido: um build novo (com outros nomes de arquivo) vale sem reiniciar o servidor
  app.get('/app/*', (c) => c.html(fs.readFileSync(path.join(dist, 'app/index.html'), 'utf8')));
  // o resto é a landing (raiz do site)
  app.get('*', (c) => c.html(fs.readFileSync(path.join(dist, 'index.html'), 'utf8')));
}

const port = Number(process.env.API_PORT || 4410);
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, () => console.log(`🤝 Trato rodando em http://localhost:${port}`));
