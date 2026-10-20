import fs from 'node:fs';
import path from 'node:path';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import './db.ts';
import { authRoutes, sessao, type Env } from './auth.ts';
import { criancaRoutes } from './crianca.ts';
import { responsavelRoutes } from './responsavel.ts';

const app = new Hono<Env>();

app.use('/api/*', sessao);
app.route('/api', authRoutes);
app.route('/api/eu', criancaRoutes);
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
  app.use('/*', serveStatic({ root: path.relative(process.cwd(), dist) }));
  // lido a cada pedido: um build novo (com outros nomes de arquivo) vale sem reiniciar o servidor
  app.get('*', (c) => c.html(fs.readFileSync(path.join(dist, 'index.html'), 'utf8')));
}

const port = Number(process.env.API_PORT || 4410);
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, () => console.log(`🤝 Trato rodando em http://localhost:${port}`));
