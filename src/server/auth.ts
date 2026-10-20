/**
 * Sessão do aparelho: um token assinado com tudo o que o aparelho sabe.
 * - c: família logada (e-mail e senha do responsável, ou código de conexão);
 * - a: até quando vale a área do responsável (PIN digitado; renova a cada uso);
 * - p: perfil da criança escolhido (ela usa o app sem login próprio);
 * - d: modo do aparelho: 'r' = celular do responsável, 'c' = celular de uma criança (preso em `p`), ausente = compartilhado.
 *
 * Na web o token vai num cookie httpOnly. No app nativo (Capacitor) cookie de outro domínio não é confiável:
 * o app manda `Authorization: Bearer <token>` e recebe o token novo no header `X-Trato-Sessao` quando ele muda.
 */
import crypto from 'node:crypto';
import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { SECRET, all, confere, get, hash, now, run, uid } from './db.ts';

export type Sessao = { c?: string; ce?: number; a?: number; p?: string; d?: 'r' | 'c' };
export type Env = { Variables: { familia: string; crianca: string; sessao: Sessao; sessaoMudou: boolean; nativo: boolean } };

const DIA = 864e5;
const PRAZO_CONTA = 180 * DIA;
/** Área do responsável: poucos minutos num aparelho compartilhado; meio dia no celular dele. */
const PRAZO_ADULTO = { compartilhado: 15 * 60e3, responsavel: 12 * 3600e3 };
const COOKIE = 'trato_sessao';
export const HEADER_SESSAO = 'X-Trato-Sessao';

const assinar = (v: string) => crypto.createHmac('sha256', SECRET).update(v).digest('base64url');
function codificar(s: Sessao) {
  const v = Buffer.from(JSON.stringify(s)).toString('base64url');
  return `${v}.${assinar(v)}`;
}
function decodificar(token?: string | null): Sessao {
  const [v, mac] = (token ?? '').split('.');
  if (!v || !mac) return {};
  const a = Buffer.from(assinar(v));
  const b = Buffer.from(mac);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return {};
  try {
    const s = JSON.parse(Buffer.from(v, 'base64url').toString()) as Sessao;
    return s.ce && s.ce > now() ? s : {};
  } catch { return {}; }
}

/** Lê a sessão no começo do pedido e grava (cookie ou header) no fim, só se mudou. */
export const sessao: MiddlewareHandler<Env> = async (c, next) => {
  const bearer = c.req.header('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  c.set('nativo', !!bearer || c.req.header('x-trato-nativo') === '1');
  c.set('sessao', decodificar(bearer ?? getCookie(c, COOKIE)));
  c.set('sessaoMudou', false);
  await next();
  if (!c.get('sessaoMudou')) return;
  const s = c.get('sessao');
  const token = s.c ? codificar(s) : '';
  if (c.get('nativo')) c.header(HEADER_SESSAO, token);
  else if (token) {
    setCookie(c, COOKIE, token, {
      httpOnly: true, sameSite: 'Lax', path: '/', maxAge: Math.floor(PRAZO_CONTA / 1000),
      secure: c.req.header('x-forwarded-proto') === 'https' || new URL(c.req.url).protocol === 'https:',
    });
  } else deleteCookie(c, COOKIE, { path: '/' });
};

function mudar(c: Context<Env>, s: Sessao) {
  c.set('sessao', s);
  c.set('sessaoMudou', true);
}
export const limparSessao = (c: Context<Env>) => mudar(c, {});

/** Entra na conta (zera perfil, adulto e modo do aparelho, a não ser que venham em `extra`). */
function entrar(c: Context<Env>, familia: string, extra: Sessao = {}) {
  mudar(c, { c: familia, ce: now() + PRAZO_CONTA, ...extra });
}

const familiaDe = (c: Context<Env>) => {
  const s = c.get('sessao');
  return s.c && get('SELECT 1 FROM familias WHERE id = ?', s.c) ? s.c : null;
};
const prazoAdulto = (s: Sessao) => (s.d === 'r' ? PRAZO_ADULTO.responsavel : PRAZO_ADULTO.compartilhado);

/** Família logada e com a área do responsável aberta (renova o prazo a cada uso). */
function adultoDe(c: Context<Env>) {
  const familia = familiaDe(c);
  const s = c.get('sessao');
  if (!familia || !s.a || s.a < now()) return null;
  mudar(c, { ...s, a: now() + prazoAdulto(s) });
  return familia;
}

export const exigeConta: MiddlewareHandler<Env> = async (c, next) => {
  const familia = familiaDe(c);
  if (!familia) return c.json({ erro: 'Entre na conta da família.' }, 401);
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
  const familia = familiaDe(c);
  const crianca = c.get('sessao').p;
  if (!familia || !crianca || !get('SELECT 1 FROM criancas WHERE id = ? AND familia_id = ?', crianca, familia)) {
    return c.json({ erro: 'Escolha o perfil.', perfil: true }, 401);
  }
  c.set('familia', familia);
  c.set('crianca', crianca);
  await next();
};

/** Tentativas erradas por chave (e-mail, PIN, código de conexão): trava por alguns minutos. */
const falhas = new Map<string, { n: number; ate: number }>();
function travado(chave: string, limite = 5) {
  const f = falhas.get(chave);
  return f && f.n >= limite && f.ate > now() ? Math.ceil((f.ate - now()) / 60e3) : 0;
}
function errou(chave: string) {
  const f = falhas.get(chave);
  const n = f && f.ate > now() ? f.n + 1 : 1;
  falhas.set(chave, { n, ate: now() + 10 * 60e3 });
}
const acertou = (chave: string) => falhas.delete(chave);
const espere = (min: number) => `Muitas tentativas. Tente de novo em ${min} min.`;
const ipDe = (c: Context) => (c.req.header('x-forwarded-for') ?? '').split(',')[0].trim() || 'local';

const pinValido = (p: unknown): p is string => typeof p === 'string' && /^\d{4}$/.test(p);
const emailValido = (e: unknown): e is string => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export const authRoutes = new Hono<Env>();

authRoutes.get('/conta', (c) => {
  const s = c.get('sessao');
  const f = s.c ? get('SELECT id, nome, email, uso FROM familias WHERE id = ?', s.c) : undefined;
  if (!f) return c.json({ logado: false });
  const perfil = s.p && get('SELECT 1 FROM criancas WHERE id = ? AND familia_id = ?', s.p, f.id) ? s.p : null;
  return c.json({
    logado: true,
    familia: { nome: f.nome, email: f.email, uso: f.uso as 'um' | 'cada' | null },
    adulto: !!s.a && s.a > now(),
    perfil,
    aparelho: s.d === 'r' ? 'responsavel' : s.d === 'c' && perfil ? 'crianca' : 'compartilhado',
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
  entrar(c, id, { a: now() + PRAZO_ADULTO.compartilhado });
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
  entrar(c, f.id);
  return c.json({ ok: true });
});

authRoutes.post('/conta/sair', (c) => {
  limparSessao(c);
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
  const s = c.get('sessao');
  mudar(c, { ...s, a: now() + prazoAdulto(s) });
  return c.json({ ok: true });
});

authRoutes.post('/conta/adulto/sair', (c) => {
  const { a: _, ...s } = c.get('sessao');
  mudar(c, s);
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
  const adulto = !!adultoDe(c);
  const s = c.get('sessao');
  // celular de uma criança: só o responsável troca o perfil
  if (s.d === 'c' && s.p !== k.id && !adulto) return c.json({ erro: 'Este celular é de outra criança. Peça ao responsável.' }, 403);
  // o responsável na área dele entra no perfil sem o PIN da criança
  if (k.pin && !adulto) {
    const chave = `pin-crianca:${k.id}`;
    const min = travado(chave);
    if (min) return c.json({ erro: espere(min) }, 429);
    if (!confere(String(b.pin ?? ''), k.pin)) {
      errou(chave);
      return c.json({ erro: 'PIN incorreto.' }, 401);
    }
    acertou(chave);
  }
  const { a: _, ...resto } = c.get('sessao');
  mudar(c, { ...resto, p: k.id });
  return c.json({ ok: true });
});

authRoutes.post('/conta/perfil/sair', (c) => {
  const s = c.get('sessao');
  if (s.d === 'c') return c.json({ erro: 'Este é o celular da criança. Só o responsável troca o perfil.' }, 403);
  const { p: _, ...resto } = s;
  mudar(c, resto);
  return c.json({ ok: true });
});

/**
 * Modo deste aparelho (só o responsável muda):
 * compartilhado = como sempre; responsavel = cai direto na área dele; crianca = preso no perfil de uma criança.
 */
authRoutes.post('/conta/aparelho', exigeAdulto, async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const s = c.get('sessao');
  if (b.modo === 'responsavel') mudar(c, { ...s, d: 'r', p: undefined, a: now() + PRAZO_ADULTO.responsavel });
  else if (b.modo === 'compartilhado') mudar(c, { ...s, d: undefined, a: now() + PRAZO_ADULTO.compartilhado });
  else if (b.modo === 'crianca') {
    const k = get('SELECT id FROM criancas WHERE id = ? AND familia_id = ?', String(b.crianca_id ?? ''), c.get('familia'));
    if (!k) return c.json({ erro: 'Perfil não encontrado.' }, 404);
    mudar(c, { c: s.c, ce: s.ce, d: 'c', p: k.id });
  } else return c.json({ erro: 'Modo desconhecido.' }, 400);
  return c.json({ ok: true });
});

// ---------- código de conexão (celular da criança sem digitar a senha) ----------

const VALIDADE_CODIGO = 10 * 60e3;

authRoutes.post('/conta/codigo/novo', exigeAdulto, async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const k = get('SELECT id, nome FROM criancas WHERE id = ? AND familia_id = ?', String(b.crianca_id ?? ''), c.get('familia'));
  if (!k) return c.json({ erro: 'Perfil não encontrado.' }, 404);
  run('DELETE FROM codigos WHERE expira_em < ? OR crianca_id = ?', now(), k.id);
  let codigo = '';
  do codigo = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
  while (get('SELECT 1 FROM codigos WHERE codigo = ?', codigo));
  const expira = now() + VALIDADE_CODIGO;
  run('INSERT INTO codigos (codigo, familia_id, crianca_id, expira_em) VALUES (?, ?, ?, ?)', codigo, c.get('familia'), k.id, expira);
  return c.json({ codigo, expira_em: expira, crianca: k.nome });
});

/** No celular da criança: o código cria a sessão da conta já presa no perfil dela. */
authRoutes.post('/conta/codigo', async (c) => {
  const chave = `codigo:${ipDe(c)}`;
  const min = travado(chave, 8);
  if (min) return c.json({ erro: espere(min) }, 429);
  const b = await c.req.json().catch(() => ({}));
  const codigo = String(b.codigo ?? '').replace(/\D/g, '');
  const r = get('SELECT * FROM codigos WHERE codigo = ? AND expira_em > ?', codigo, now());
  if (!r) {
    errou(chave);
    return c.json({ erro: 'Código inválido ou vencido. Peça um novo ao responsável.' }, 401);
  }
  acertou(chave);
  run('DELETE FROM codigos WHERE codigo = ?', codigo);
  entrar(c, r.familia_id, { d: 'c', p: r.crianca_id });
  return c.json({ ok: true });
});
