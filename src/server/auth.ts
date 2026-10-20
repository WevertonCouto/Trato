/**
 * Três cookies assinados:
 * - conta: o aparelho entrou na conta da família (e-mail e senha do responsável);
 * - adulto: o responsável digitou o PIN e está na área dele (expira em poucos minutos sem uso);
 * - perfil: a criança escolhida no aparelho (ela usa o app sem login próprio).
 */
import crypto from 'node:crypto';
import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { SECRET, all, confere, get, hash, now, run, uid } from './db.ts';

export type Env = { Variables: { familia: string; crianca: string } };

const DIA = 864e5;
const PRAZO = { conta: 180 * DIA, adulto: 15 * 60e3, perfil: 180 * DIA };
type Tipo = keyof typeof PRAZO;
const nome = (t: Tipo) => `trato_${t}`;

const assinar = (v: string) => crypto.createHmac('sha256', SECRET).update(v).digest('base64url');
function emitir(c: Context, tipo: Tipo, valor: string) {
  const exp = now() + PRAZO[tipo];
  const v = `${tipo}.${valor}.${exp}`;
  setCookie(c, nome(tipo), `${v}.${assinar(v)}`, {
    httpOnly: true, sameSite: 'Lax', path: '/', maxAge: Math.floor(PRAZO[tipo] / 1000),
    secure: c.req.header('x-forwarded-proto') === 'https' || new URL(c.req.url).protocol === 'https:',
  });
}
function ler(c: Context, tipo: Tipo) {
  const bruto = getCookie(c, nome(tipo)) ?? '';
  const i = bruto.lastIndexOf('.');
  const v = bruto.slice(0, i);
  const mac = bruto.slice(i + 1);
  if (i < 0 || !mac) return null;
  const a = Buffer.from(assinar(v));
  const b = Buffer.from(mac);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const [t, valor, exp] = v.split('.');
  if (t !== tipo || Number(exp) < now()) return null;
  return valor;
}
const apagar = (c: Context, tipo: Tipo) => deleteCookie(c, nome(tipo), { path: '/' });

/** Família logada e com sessão adulta válida (renova a cada uso). */
function adultoDe(c: Context) {
  const familia = ler(c, 'conta');
  if (!familia || ler(c, 'adulto') !== familia) return null;
  emitir(c, 'adulto', familia);
  return familia;
}

export const exigeConta: MiddlewareHandler<Env> = async (c, next) => {
  const familia = ler(c, 'conta');
  if (!familia || !get('SELECT 1 FROM familias WHERE id = ?', familia)) return c.json({ erro: 'Entre na conta da família.' }, 401);
  c.set('familia', familia);
  await next();
};
export const exigeAdulto: MiddlewareHandler<Env> = async (c, next) => {
  const familia = adultoDe(c);
  if (!familia) return c.json({ erro: 'Digite o PIN do responsável.', pin: true }, 403);
  c.set('familia', familia);
  await next();
};
export const exigeCrianca: MiddlewareHandler<Env> = async (c, next) => {
  const familia = ler(c, 'conta');
  const crianca = ler(c, 'perfil');
  if (!familia || !crianca || !get('SELECT 1 FROM criancas WHERE id = ? AND familia_id = ?', crianca, familia)) {
    return c.json({ erro: 'Escolha o perfil.', perfil: true }, 401);
  }
  c.set('familia', familia);
  c.set('crianca', crianca);
  await next();
};

/** Tentativas erradas por chave (e-mail, PIN da família ou da criança): trava por alguns minutos. */
const falhas = new Map<string, { n: number; ate: number }>();
function travado(chave: string) {
  const f = falhas.get(chave);
  return f && f.n >= 5 && f.ate > now() ? Math.ceil((f.ate - now()) / 60e3) : 0;
}
function errou(chave: string) {
  const f = falhas.get(chave);
  const n = f && f.ate > now() ? f.n + 1 : 1;
  falhas.set(chave, { n, ate: now() + 10 * 60e3 });
}
const acertou = (chave: string) => falhas.delete(chave);
const espere = (min: number) => `Muitas tentativas. Tente de novo em ${min} min.`;

const pinValido = (p: unknown): p is string => typeof p === 'string' && /^\d{4}$/.test(p);
const emailValido = (e: unknown): e is string => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export const authRoutes = new Hono<Env>();

authRoutes.get('/conta', (c) => {
  const id = ler(c, 'conta');
  const f = id ? get('SELECT id, nome, email FROM familias WHERE id = ?', id) : undefined;
  if (!f) return c.json({ logado: false });
  const perfil = ler(c, 'perfil');
  return c.json({
    logado: true,
    familia: { nome: f.nome, email: f.email },
    adulto: ler(c, 'adulto') === f.id,
    perfil: perfil && get('SELECT 1 FROM criancas WHERE id = ? AND familia_id = ?', perfil, f.id) ? perfil : null,
  });
});

authRoutes.post('/conta/cadastro', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const nomeFamilia = String(b.nome ?? '').trim();
  const email = String(b.email ?? '').trim().toLowerCase();
  if (!nomeFamilia) return c.json({ erro: 'Diga seu nome.' }, 400);
  if (!emailValido(email)) return c.json({ erro: 'E-mail inválido.' }, 400);
  if (typeof b.senha !== 'string' || b.senha.length < 8) return c.json({ erro: 'A senha precisa ter pelo menos 8 caracteres.' }, 400);
  if (!pinValido(b.pin)) return c.json({ erro: 'O PIN precisa ter 4 números.' }, 400);
  if (get('SELECT 1 FROM familias WHERE email = ?', email)) return c.json({ erro: 'Já existe uma conta com esse e-mail.' }, 409);
  const id = uid();
  run('INSERT INTO familias (id, nome, email, senha, pin, criado_em) VALUES (?, ?, ?, ?, ?, ?)', id, nomeFamilia, email, hash(b.senha), hash(b.pin), now());
  emitir(c, 'conta', id);
  emitir(c, 'adulto', id);
  return c.json({ ok: true });
});

authRoutes.post('/conta/entrar', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const email = String(b.email ?? '').trim().toLowerCase();
  const chave = `email:${email}`;
  const min = travado(chave);
  if (min) return c.json({ erro: espere(min) }, 429);
  const f = get('SELECT id, senha FROM familias WHERE email = ?', email);
  if (!f || !confere(String(b.senha ?? ''), f.senha)) {
    errou(chave);
    return c.json({ erro: 'E-mail ou senha incorretos.' }, 401);
  }
  acertou(chave);
  emitir(c, 'conta', f.id);
  apagar(c, 'perfil');
  apagar(c, 'adulto');
  return c.json({ ok: true });
});

authRoutes.post('/conta/sair', (c) => {
  for (const t of ['conta', 'adulto', 'perfil'] as Tipo[]) apagar(c, t);
  return c.json({ ok: true });
});

authRoutes.post('/conta/adulto', exigeConta, async (c) => {
  const familia = c.get('familia');
  const chave = `pin:${familia}`;
  const min = travado(chave);
  if (min) return c.json({ erro: espere(min) }, 429);
  const b = await c.req.json().catch(() => ({}));
  const f = get('SELECT pin FROM familias WHERE id = ?', familia);
  if (!f || !confere(String(b.pin ?? ''), f.pin)) {
    errou(chave);
    return c.json({ erro: 'PIN incorreto.' }, 401);
  }
  acertou(chave);
  emitir(c, 'adulto', familia);
  return c.json({ ok: true });
});

authRoutes.post('/conta/adulto/sair', (c) => {
  apagar(c, 'adulto');
  return c.json({ ok: true });
});

/** Perfis que aparecem na tela "Quem vai usar?" (sem dados além do que a criança vê). */
authRoutes.get('/conta/perfis', exigeConta, (c) => {
  const familia = c.get('familia');
  return c.json(all('SELECT id, nome, cor, especie, pet_nome, pin IS NOT NULL AS tem_pin FROM criancas WHERE familia_id = ? ORDER BY criado_em', familia));
});

authRoutes.post('/conta/perfil', exigeConta, async (c) => {
  const familia = c.get('familia');
  const b = await c.req.json().catch(() => ({}));
  const k = get('SELECT id, pin FROM criancas WHERE id = ? AND familia_id = ?', String(b.id ?? ''), familia);
  if (!k) return c.json({ erro: 'Perfil não encontrado.' }, 404);
  // o responsável na área dele entra no perfil sem o PIN da criança
  if (k.pin && !adultoDe(c)) {
    const chave = `pin-crianca:${k.id}`;
    const min = travado(chave);
    if (min) return c.json({ erro: espere(min) }, 429);
    if (!confere(String(b.pin ?? ''), k.pin)) {
      errou(chave);
      return c.json({ erro: 'PIN incorreto.' }, 401);
    }
    acertou(chave);
  }
  emitir(c, 'perfil', k.id);
  apagar(c, 'adulto');
  return c.json({ ok: true });
});

authRoutes.post('/conta/perfil/sair', (c) => {
  apagar(c, 'perfil');
  return c.json({ ok: true });
});
