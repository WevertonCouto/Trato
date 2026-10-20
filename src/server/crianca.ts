/** Rotas do perfil da criança (/api/eu/*): o que ela vê e faz no aparelho. */
import fs from 'node:fs';
import path from 'node:path';
import { Hono } from 'hono';
import sharp from 'sharp';
import { FOTOS_DIR, all, db, dia, get, now, run, somarDias, uid } from './db.ts';
import { exigeCrianca, type Env } from './auth.ts';
import { aprovarEntrega, conquistas, doDia, petDe, publica, sequencia, tarefasDaCrianca } from './rotina.ts';
import { ESPECIES, MOEDAS_CUIDADO, venceEm } from '../shared/regras.ts';

export const criancaRoutes = new Hono<Env>();
criancaRoutes.use('*', exigeCrianca);

const crianca = (id: string) => get('SELECT * FROM criancas WHERE id = ?', id)!;

criancaRoutes.get('/', (c) => {
  const k = crianca(c.get('crianca'));
  return c.json({
    crianca: { id: k.id, nome: k.nome, cor: k.cor, moedas: k.moedas, xp: k.xp },
    pet: petDe(k),
    hoje: doDia(k.id, dia()),
    // a tela comemora quando aparece uma recompensa aprovada nova (o responsável pode aprovar de outro celular)
    ultimoPremio: get("SELECT id, titulo, icone FROM pedidos WHERE crianca_id = ? AND situacao = 'aprovado' ORDER BY decidido_em DESC LIMIT 1", k.id) ?? null,
  });
});

criancaRoutes.get('/tarefas', (c) => {
  const id = c.get('crianca');
  const aba = c.req.query('aba') ?? 'hoje';
  if (aba === 'todas') return c.json({ todas: tarefasDaCrianca(id).map(publica) });
  if (aba === 'semana') {
    const hoje = dia();
    const segunda = somarDias(hoje, -((new Date(`${hoje}T12:00:00`).getDay() + 6) % 7));
    return c.json({ semana: Array.from({ length: 7 }, (_, i) => somarDias(segunda, i)).map((d) => ({ data: d, tarefas: doDia(id, d) })) });
  }
  return c.json({ hoje: doDia(id, dia()) });
});

const MAX_FOTO = 15 * 1024 * 1024;

criancaRoutes.post('/tarefas/:id/concluir', async (c) => {
  const kid = c.get('crianca');
  const t = get('SELECT * FROM tarefas WHERE id = ? AND crianca_id = ? AND excluida = 0 AND ativa = 1', c.req.param('id'), kid);
  const hoje = dia();
  if (!t || !venceEm(t as any, hoje)) return c.json({ erro: 'Essa missão não é para hoje.' }, 404);
  const antes = get('SELECT * FROM entregas WHERE tarefa_id = ? AND data = ?', t.id, hoje);
  if (antes && antes.situacao !== 'recusada') return c.json({ erro: 'Essa missão já foi enviada.' }, 409);

  let foto: string | null = null;
  if (t.modo === 'foto') {
    const body = await c.req.parseBody().catch(() => ({}) as Record<string, unknown>);
    const f = body.foto;
    if (!(f instanceof File) || !f.size) return c.json({ erro: 'Tire uma foto para mostrar a missão feita.' }, 400);
    if (f.size > MAX_FOTO) return c.json({ erro: 'A foto ficou grande demais.' }, 413);
    foto = `${uid()}.jpg`;
    try {
      await sharp(Buffer.from(await f.arrayBuffer())).rotate().resize(1280, 1280, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(path.join(FOTOS_DIR, foto));
    } catch {
      return c.json({ erro: 'Não consegui ler essa foto.' }, 400);
    }
  }
  if (antes?.foto) fs.rmSync(path.join(FOTOS_DIR, antes.foto), { force: true });

  const id = antes?.id ?? uid();
  run(
    `INSERT INTO entregas (id, tarefa_id, crianca_id, data, situacao, foto, pontos, enviado_em) VALUES (?, ?, ?, ?, 'pendente', ?, ?, ?)
     ON CONFLICT (tarefa_id, data) DO UPDATE SET situacao = 'pendente', foto = excluded.foto, pontos = excluded.pontos, enviado_em = excluded.enviado_em, decidido_em = NULL`,
    id, t.id, kid, hoje, foto, t.pontos, now(),
  );
  if (t.modo === 'direto') aprovarEntrega(id);
  return c.json({ ok: true, aprovada: t.modo === 'direto', pontos: t.pontos });
});

// só os dois cuidados: sem o filtro, esta rota engoliria o /pet/novo logo abaixo
criancaRoutes.post('/pet/:tipo{alimentar|banho}', (c) => {
  const kid = c.get('crianca');
  const tipo = c.req.param('tipo');
  const r = run('INSERT OR IGNORE INTO cuidados (crianca_id, data, tipo) VALUES (?, ?, ?)', kid, dia(), tipo);
  if (!r.changes) return c.json({ erro: tipo === 'alimentar' ? 'O pet já comeu hoje.' : 'O pet já tomou banho hoje.' }, 409);
  run('UPDATE criancas SET moedas = moedas + ? WHERE id = ?', MOEDAS_CUIDADO, kid);
  return c.json({ ok: true, moedas: MOEDAS_CUIDADO });
});

/** Pet completo vai para a coleção e a criança escolhe o próximo. */
criancaRoutes.post('/pet/novo', async (c) => {
  const k = crianca(c.get('crianca'));
  if (!petDe(k).completo) return c.json({ erro: 'O pet ainda está crescendo.' }, 409);
  const b = await c.req.json().catch(() => ({}));
  const esp = ESPECIES.find((e) => e.id === b.especie);
  const nome = String(b.nome ?? '').trim().slice(0, 20);
  if (!esp || !nome) return c.json({ erro: 'Escolha o pet e dê um nome.' }, 400);
  db.transaction(() => {
    run('INSERT INTO colecao (id, crianca_id, especie, pet_nome, concluido_em) VALUES (?, ?, ?, ?, ?)', uid(), k.id, k.especie, k.pet_nome, now());
    run('UPDATE criancas SET especie = ?, pet_nome = ?, pet_xp = 0 WHERE id = ?', esp.id, nome, k.id);
  })();
  return c.json({ ok: true });
});

criancaRoutes.get('/colecao', (c) => c.json(all('SELECT especie, pet_nome, concluido_em FROM colecao WHERE crianca_id = ? ORDER BY concluido_em', c.get('crianca'))));

criancaRoutes.get('/recompensas', (c) => {
  const k = crianca(c.get('crianca'));
  return c.json({
    moedas: k.moedas,
    recompensas: all('SELECT id, titulo, icone, custo FROM recompensas WHERE familia_id = ? AND excluida = 0 AND (crianca_id IS NULL OR crianca_id = ?) ORDER BY custo', k.familia_id, k.id),
    pedidos: all('SELECT id, titulo, icone, custo, situacao, pedido_em, decidido_em FROM pedidos WHERE crianca_id = ? ORDER BY pedido_em DESC LIMIT 20', k.id),
  });
});

criancaRoutes.post('/recompensas/:id/pedir', (c) => {
  const k = crianca(c.get('crianca'));
  const r = get('SELECT * FROM recompensas WHERE id = ? AND familia_id = ? AND excluida = 0 AND (crianca_id IS NULL OR crianca_id = ?)', c.req.param('id'), k.familia_id, k.id);
  if (!r) return c.json({ erro: 'Recompensa não encontrada.' }, 404);
  // as moedinhas ficam reservadas: voltam se o responsável recusar
  const ok = db.transaction(() => {
    const upd = run('UPDATE criancas SET moedas = moedas - ? WHERE id = ? AND moedas >= ?', r.custo, k.id, r.custo);
    if (!upd.changes) return false;
    run("INSERT INTO pedidos (id, recompensa_id, crianca_id, titulo, icone, custo, situacao, pedido_em) VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?)", uid(), r.id, k.id, r.titulo, r.icone, r.custo, now());
    return true;
  })();
  if (!ok) return c.json({ erro: 'Ainda faltam moedinhas para essa recompensa.' }, 409);
  return c.json({ ok: true });
});

criancaRoutes.get('/progresso', (c) => {
  const id = c.get('crianca');
  const hoje = dia();
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(hoje, i - 6));
  const porDia = new Map(all<{ data: string; n: number; pts: number }>(
    "SELECT data, COUNT(*) n, SUM(pontos) pts FROM entregas WHERE crianca_id = ? AND situacao = 'aprovada' AND data >= ? GROUP BY data", id, dias[0],
  ).map((r) => [r.data, r]));
  const k = crianca(id);
  const cq = conquistas(id);
  return c.json({
    xp: k.xp,
    feitas: cq.feitas,
    sequencia: sequencia(id),
    semana: dias.map((d) => ({ data: d, feitas: porDia.get(d)?.n ?? 0, pontos: porDia.get(d)?.pts ?? 0 })),
    conquistas: cq.lista,
  });
});
