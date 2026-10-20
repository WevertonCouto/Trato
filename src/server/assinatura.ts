/**
 * Plano da família (assinatura pelas lojas, via RevenueCat).
 * O app nativo compra com o SDK do RevenueCat (appUserID = id da família); o RevenueCat avisa aqui pelo webhook
 * e, por segurança, o estado é sempre confirmado na API REST dele antes de gravar.
 * Sem plano ativo a família continua vendo tudo, mas criar acima do plano grátis fica bloqueado.
 */
import crypto from 'node:crypto';
import { Hono } from 'hono';
import { exigeAdulto, type Env } from './auth.ts';
import { db, get, now, run } from './db.ts';

type Limites = { criancas: number; missoes: number | null }; // missoes: null = ilimitadas
/** Plano grátis: mude aqui (missões ilimitadas por decisão do Weverton; para limitar, troque null por um número). */
export const PLANO_GRATIS: Limites = { criancas: 1, missoes: null };
/** Plano Família (o limite de 6 crianças já é o do app). */
export const PLANO_FAMILIA: Limites = { criancas: 6, missoes: null };

const cfg = () => ({
  apiKey: process.env.REVENUECAT_API_KEY ?? '',
  webhookSecret: process.env.REVENUECAT_WEBHOOK_SECRET ?? '',
  entitlement: process.env.REVENUECAT_ENTITLEMENT || 'familia',
});

db.exec(`
CREATE TABLE IF NOT EXISTS assinaturas (
  familia_id TEXT PRIMARY KEY REFERENCES familias(id) ON DELETE CASCADE,
  entitlement TEXT NOT NULL,
  produto TEXT,
  loja TEXT,
  expira_em INTEGER,
  situacao TEXT NOT NULL,
  atualizado_em INTEGER NOT NULL
);
`);

export type Situacao = 'ativa' | 'teste' | 'cancelada' | 'problema_pagamento' | 'expirada';

export function planoDa(familia: string) {
  const a = get('SELECT * FROM assinaturas WHERE familia_id = ?', familia);
  // "cancelada" e "problema_pagamento" continuam valendo até expirar (a loja ainda tenta cobrar / o período foi pago)
  const ativo = !!a && a.situacao !== 'expirada' && (!a.expira_em || a.expira_em > now());
  return {
    ativo,
    situacao: (a?.situacao ?? null) as Situacao | null,
    produto: (a?.produto ?? null) as string | null,
    loja: (a?.loja ?? null) as string | null,
    expira_em: (a?.expira_em ?? null) as number | null,
  };
}

export const limitesDa = (familia: string) => (planoDa(familia).ativo ? PLANO_FAMILIA : PLANO_GRATIS);

export const mensagemLimite = (o: 'criancas' | 'missoes') =>
  o === 'criancas'
    ? `No plano grátis dá para ter ${PLANO_GRATIS.criancas} criança. Com o Plano Família, até ${PLANO_FAMILIA.criancas}.`
    : `No plano grátis cada criança tem até ${PLANO_GRATIS.missoes} missões ativas. Com o Plano Família, sem limite.`;

/** Consulta o RevenueCat (GET /subscribers/{id}) e grava o estado do entitlement. */
export async function sincronizar(familia: string) {
  const { apiKey, entitlement } = cfg();
  if (!apiKey) throw new Error('REVENUECAT_API_KEY não configurada.');
  const r = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(familia)}`, {
    headers: { authorization: `Bearer ${apiKey}`, accept: 'application/json' },
  });
  if (!r.ok) throw new Error(`RevenueCat respondeu ${r.status}`);
  const sub = (await r.json()).subscriber ?? {};
  const ent = sub.entitlements?.[entitlement];
  if (!ent) {
    gravar(familia, { entitlement, produto: null, loja: null, expira_em: null, situacao: 'expirada' });
    return planoDa(familia);
  }
  const produto: string = ent.product_identifier;
  const s = sub.subscriptions?.[produto] ?? {};
  const expira = ent.expires_date ? Date.parse(ent.expires_date) : null; // null = vitalício
  let situacao: Situacao = 'ativa';
  if (expira !== null && expira <= now()) situacao = 'expirada';
  else if (s.billing_issues_detected_at) situacao = 'problema_pagamento';
  else if (s.unsubscribe_detected_at) situacao = 'cancelada';
  else if (s.period_type === 'trial') situacao = 'teste';
  gravar(familia, { entitlement, produto, loja: s.store ?? null, expira_em: expira, situacao });
  return planoDa(familia);
}

function gravar(familia: string, a: { entitlement: string; produto: string | null; loja: string | null; expira_em: number | null; situacao: Situacao }) {
  run(
    `INSERT INTO assinaturas (familia_id, entitlement, produto, loja, expira_em, situacao, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (familia_id) DO UPDATE SET entitlement = excluded.entitlement, produto = excluded.produto, loja = excluded.loja,
       expira_em = excluded.expira_em, situacao = excluded.situacao, atualizado_em = excluded.atualizado_em`,
    familia, a.entitlement, a.produto, a.loja, a.expira_em, a.situacao, now(),
  );
}

const EVENTOS = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'CANCELLATION', 'UNCANCELLATION', 'EXPIRATION', 'BILLING_ISSUE', 'PRODUCT_CHANGE']);

function segredoConfere(recebido: string) {
  const { webhookSecret } = cfg();
  if (!webhookSecret) return false;
  // o RevenueCat manda exatamente o valor configurado no painel; aceita com ou sem "Bearer "
  const v = recebido.replace(/^Bearer\s+/i, '');
  const a = Buffer.from(v);
  const b = Buffer.from(webhookSecret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const webhookRoutes = new Hono<Env>();

webhookRoutes.post('/revenuecat/webhook', async (c) => {
  if (!segredoConfere(c.req.header('authorization') ?? '')) return c.json({ erro: 'Não autorizado.' }, 401);
  const corpo = await c.req.json().catch(() => null);
  const ev = corpo?.event;
  if (!ev?.type) return c.json({ erro: 'Evento inválido.' }, 400);
  if (!EVENTOS.has(ev.type)) return c.json({ ok: true, ignorado: ev.type });
  // o app configura o RevenueCat com appUserID = id da família; nas transferências o id pode vir nos aliases
  const ids: string[] = [ev.app_user_id, ev.original_app_user_id, ...(ev.aliases ?? []), ...(ev.transferred_to ?? [])].filter(Boolean);
  const familia = ids.find((id) => get('SELECT 1 FROM familias WHERE id = ?', id));
  if (!familia) return c.json({ ok: true, ignorado: 'família desconhecida' });
  try {
    await sincronizar(familia);
  } catch (e: any) {
    // sem a API REST, usa o próprio evento (melhor que perder a renovação); o próximo evento ou o "sincronizar" corrige
    console.warn(`RevenueCat: não confirmei na API (${e.message}); gravando pelo evento ${ev.type}`);
    const expira = ev.expiration_at_ms ? Number(ev.expiration_at_ms) : null;
    const situacao: Situacao = ev.type === 'EXPIRATION' ? 'expirada' : ev.type === 'CANCELLATION' ? 'cancelada'
      : ev.type === 'BILLING_ISSUE' ? 'problema_pagamento' : ev.period_type === 'TRIAL' ? 'teste' : 'ativa';
    gravar(familia, { entitlement: cfg().entitlement, produto: ev.new_product_id ?? ev.product_id ?? null, loja: ev.store ?? null, expira_em: expira, situacao });
  }
  return c.json({ ok: true });
});

export const assinaturaRoutes = new Hono<Env>();
assinaturaRoutes.use('*', exigeAdulto);

assinaturaRoutes.get('/', (c) => {
  const f = c.get('familia');
  const uso = get<{ criancas: number; missoes: number }>(
    `SELECT (SELECT COUNT(*) FROM criancas WHERE familia_id = ?) criancas,
            (SELECT COALESCE(MAX(n), 0) FROM (SELECT COUNT(*) n FROM tarefas WHERE familia_id = ? AND ativa = 1 AND excluida = 0 GROUP BY crianca_id)) missoes`, f, f)!;
  return c.json({
    familia_id: f, // appUserID do RevenueCat
    entitlement: cfg().entitlement,
    plano: planoDa(f),
    limites: limitesDa(f),
    gratis: PLANO_GRATIS,
    familia: PLANO_FAMILIA,
    uso,
  });
});

/** Depois de comprar ou restaurar no app: busca o estado na hora, sem esperar o webhook. */
assinaturaRoutes.post('/sincronizar', async (c) => {
  try { return c.json({ plano: await sincronizar(c.get('familia')) }); } catch (e: any) {
    console.warn(`RevenueCat: ${e.message}`);
    return c.json({ erro: 'Não consegui confirmar a assinatura agora. Tente "Restaurar compras" daqui a pouco.' }, 502);
  }
});
