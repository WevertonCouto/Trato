/** Rotas da área do responsável (/api/adulto/*): exigem a conta e o PIN. */
import fs from 'node:fs';
import path from 'node:path';
import { Hono, type Context } from 'hono';
import { FOTOS_DIR, all, confere, db, dia, get, hash, now, run, uid, type Row } from './db.ts';
import { exigeAdulto, limparSessao, type Env } from './auth.ts';
import { aprovarEntrega, doDia, publica, sequencia } from './rotina.ts';
import { limitesDa, mensagemLimite, PLANO_FAMILIA } from './assinatura.ts';
import { CORES_PERFIL, ESPECIES, MODOS } from '../shared/regras.ts';

export const responsavelRoutes = new Hono<Env>();
responsavelRoutes.use('*', exigeAdulto);

const corpo = (c: Context) => c.req.json().catch(() => ({}) as Row);
const texto = (v: unknown, max = 80) => String(v ?? '').trim().slice(0, max);
const minhaCrianca = (c: Context<Env>, id: unknown) => get('SELECT * FROM criancas WHERE id = ? AND familia_id = ?', String(id ?? ''), c.get('familia'));

// ---------- perfis das crianças ----------

responsavelRoutes.get('/criancas', (c) => {
  const hoje = dia();
  return c.json(all('SELECT * FROM criancas WHERE familia_id = ? ORDER BY criado_em', c.get('familia')).map((k) => {
    const tarefas = doDia(k.id, hoje);
    return {
      id: k.id, nome: k.nome, cor: k.cor, especie: k.especie, pet_nome: k.pet_nome, tem_pin: !!k.pin,
      moedas: k.moedas, xp: k.xp, sequencia: sequencia(k.id).atual,
      hoje: { total: tarefas.length, feitas: tarefas.filter((t) => t.situacao === 'concluida').length },
    };
  }));
});

function validarPin(p: unknown) {
  return p === null || p === '' || p === undefined ? null : /^\d{4}$/.test(String(p)) ? String(p) : false;
}

responsavelRoutes.post('/criancas', async (c) => {
  const b = await corpo(c);
  const nome = texto(b.nome, 30);
  const pet = texto(b.pet_nome, 20);
  const esp = ESPECIES.find((e) => e.id === b.especie)?.id ?? ESPECIES[0].id;
  const pin = validarPin(b.pin);
  if (!nome) return c.json({ erro: 'Diga o nome da criança.' }, 400);
  if (!pet) return c.json({ erro: 'Dê um nome para o pet.' }, 400);
  if (pin === false) return c.json({ erro: 'O PIN da criança precisa ter 4 números.' }, 400);
  const nCriancas = get<{ n: number }>('SELECT COUNT(*) n FROM criancas WHERE familia_id = ?', c.get('familia'))!.n;
  if (nCriancas >= PLANO_FAMILIA.criancas) return c.json({ erro: `Dá para cadastrar até ${PLANO_FAMILIA.criancas} crianças.` }, 409);
  if (nCriancas >= limitesDa(c.get('familia')).criancas) return c.json({ erro: mensagemLimite('criancas'), plano: true }, 402);
  const id = uid();
  const cor = CORES_PERFIL.includes(b.cor) ? b.cor : CORES_PERFIL[0];
  run('INSERT INTO criancas (id, familia_id, nome, cor, pin, especie, pet_nome, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', id, c.get('familia'), nome, cor, pin ? hash(pin) : null, esp, pet, now());
  return c.json({ id });
});

responsavelRoutes.patch('/criancas/:id', async (c) => {
  const k = minhaCrianca(c, c.req.param('id'));
  if (!k) return c.json({ erro: 'Perfil não encontrado.' }, 404);
  const b = await corpo(c);
  if (b.nome !== undefined) { if (!texto(b.nome)) return c.json({ erro: 'Diga o nome da criança.' }, 400); run('UPDATE criancas SET nome = ? WHERE id = ?', texto(b.nome, 30), k.id); }
  if (b.pet_nome !== undefined && texto(b.pet_nome)) run('UPDATE criancas SET pet_nome = ? WHERE id = ?', texto(b.pet_nome, 20), k.id);
  if (CORES_PERFIL.includes(b.cor)) run('UPDATE criancas SET cor = ? WHERE id = ?', b.cor, k.id);
  if (b.pin !== undefined) {
    const pin = validarPin(b.pin);
    if (pin === false) return c.json({ erro: 'O PIN da criança precisa ter 4 números.' }, 400);
    run('UPDATE criancas SET pin = ? WHERE id = ?', pin ? hash(pin) : null, k.id);
  }
  return c.json({ ok: true });
});

responsavelRoutes.delete('/criancas/:id', (c) => {
  const k = minhaCrianca(c, c.req.param('id'));
  if (!k) return c.json({ erro: 'Perfil não encontrado.' }, 404);
  apagarFotos(all('SELECT foto FROM entregas WHERE crianca_id = ? AND foto IS NOT NULL', k.id));
  run('DELETE FROM criancas WHERE id = ?', k.id);
  return c.json({ ok: true });
});

// ---------- tarefas ----------

function lerTarefa(b: Row): Row | string {
  const titulo = texto(b.titulo, 80);
  if (!titulo) return 'Diga qual é a missão.';
  const pontos = Math.round(Number(b.pontos));
  if (!(pontos >= 1 && pontos <= 500)) return 'Os pontos vão de 1 a 500.';
  if (!(b.modo in MODOS)) return 'Escolha como a missão é concluída.';
  const repeticao = b.repeticao === 'mensal' ? 'mensal' : 'semanal';
  const dias = [...new Set(String(b.dias ?? '').replace(/[^0-6]/g, ''))].sort().join('');
  if (repeticao === 'semanal' && !dias) return 'Escolha pelo menos um dia da semana.';
  const dia_mes = repeticao === 'mensal' ? Math.round(Number(b.dia_mes)) : null;
  if (repeticao === 'mensal' && !(dia_mes! >= 1 && dia_mes! <= 31)) return 'Escolha o dia do mês.';
  const hora = b.hora && /^([01]\d|2[0-3]):[0-5]\d$/.test(b.hora) ? b.hora : null;
  return { titulo, icone: texto(b.icone, 8) || '⭐', pontos, modo: b.modo, repeticao, dias: dias || '0123456', dia_mes, hora };
}

responsavelRoutes.get('/tarefas', (c) => {
  const k = minhaCrianca(c, c.req.query('crianca'));
  if (!k) return c.json({ erro: 'Perfil não encontrado.' }, 404);
  return c.json(all('SELECT * FROM tarefas WHERE crianca_id = ? AND excluida = 0 ORDER BY ativa DESC, hora IS NULL, hora, criado_em', k.id).map(publica));
});

responsavelRoutes.post('/tarefas', async (c) => {
  const b = await corpo(c);
  const k = minhaCrianca(c, b.crianca_id);
  if (!k) return c.json({ erro: 'Perfil não encontrado.' }, 404);
  const t = lerTarefa(b);
  if (typeof t === 'string') return c.json({ erro: t }, 400);
  if (cheioDeMissoes(c, k.id)) return c.json({ erro: mensagemLimite('missoes'), plano: true }, 402);
  const id = uid();
  run(
    'INSERT INTO tarefas (id, familia_id, crianca_id, titulo, icone, pontos, modo, repeticao, dias, dia_mes, hora, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    id, c.get('familia'), k.id, t.titulo, t.icone, t.pontos, t.modo, t.repeticao, t.dias, t.dia_mes, t.hora, now(),
  );
  return c.json({ id });
});

/** Plano grátis com limite de missões (hoje desligado: null): no máximo N missões ativas por criança (as que já existem nunca são desligadas sozinhas). */
function cheioDeMissoes(c: Context<Env>, crianca: string) {
  const limite = limitesDa(c.get('familia')).missoes;
  return limite !== null && get<{ n: number }>('SELECT COUNT(*) n FROM tarefas WHERE crianca_id = ? AND ativa = 1 AND excluida = 0', crianca)!.n >= limite;
}

const minhaTarefa = (c: Context<Env>) => get('SELECT * FROM tarefas WHERE id = ? AND familia_id = ? AND excluida = 0', c.req.param('id'), c.get('familia'));

responsavelRoutes.patch('/tarefas/:id', async (c) => {
  const atual = minhaTarefa(c);
  if (!atual) return c.json({ erro: 'Missão não encontrada.' }, 404);
  const b = await corpo(c);
  if (Object.keys(b).length === 1 && 'ativa' in b) {
    if (b.ativa && !atual.ativa && cheioDeMissoes(c, atual.crianca_id)) return c.json({ erro: mensagemLimite('missoes'), plano: true }, 402);
    run('UPDATE tarefas SET ativa = ? WHERE id = ?', b.ativa ? 1 : 0, atual.id);
    return c.json({ ok: true });
  }
  const t = lerTarefa({ ...atual, ...b });
  if (typeof t === 'string') return c.json({ erro: t }, 400);
  run('UPDATE tarefas SET titulo = ?, icone = ?, pontos = ?, modo = ?, repeticao = ?, dias = ?, dia_mes = ?, hora = ? WHERE id = ?',
    t.titulo, t.icone, t.pontos, t.modo, t.repeticao, t.dias, t.dia_mes, t.hora, atual.id);
  return c.json({ ok: true });
});

// o histórico (pontos já ganhos, sequência) continua valendo: a tarefa só some da rotina
responsavelRoutes.delete('/tarefas/:id', (c) => {
  const t = minhaTarefa(c);
  if (!t) return c.json({ erro: 'Missão não encontrada.' }, 404);
  run('UPDATE tarefas SET excluida = 1 WHERE id = ?', t.id);
  return c.json({ ok: true });
});

// ---------- recompensas ----------

responsavelRoutes.get('/recompensas', (c) =>
  c.json(all('SELECT id, crianca_id, titulo, icone, custo FROM recompensas WHERE familia_id = ? AND excluida = 0 ORDER BY custo', c.get('familia'))));

function lerRecompensa(c: Context<Env>, b: Row): Row | string {
  const titulo = texto(b.titulo, 60);
  if (!titulo) return 'Diga qual é a recompensa.';
  const custo = Math.round(Number(b.custo));
  if (!(custo >= 1 && custo <= 100000)) return 'Defina quantas moedinhas ela custa.';
  const crianca_id = b.crianca_id ? minhaCrianca(c, b.crianca_id)?.id : null;
  if (b.crianca_id && !crianca_id) return 'Perfil não encontrado.';
  return { titulo, custo, icone: texto(b.icone, 8) || '🎁', crianca_id };
}

responsavelRoutes.post('/recompensas', async (c) => {
  const r = lerRecompensa(c, await corpo(c));
  if (typeof r === 'string') return c.json({ erro: r }, 400);
  const id = uid();
  run('INSERT INTO recompensas (id, familia_id, crianca_id, titulo, icone, custo, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?)', id, c.get('familia'), r.crianca_id, r.titulo, r.icone, r.custo, now());
  return c.json({ id });
});

responsavelRoutes.patch('/recompensas/:id', async (c) => {
  const atual = get('SELECT * FROM recompensas WHERE id = ? AND familia_id = ? AND excluida = 0', c.req.param('id'), c.get('familia'));
  if (!atual) return c.json({ erro: 'Recompensa não encontrada.' }, 404);
  const r = lerRecompensa(c, { ...atual, ...(await corpo(c)) });
  if (typeof r === 'string') return c.json({ erro: r }, 400);
  run('UPDATE recompensas SET titulo = ?, icone = ?, custo = ?, crianca_id = ? WHERE id = ?', r.titulo, r.icone, r.custo, r.crianca_id, atual.id);
  return c.json({ ok: true });
});

responsavelRoutes.delete('/recompensas/:id', (c) => {
  const r = run('UPDATE recompensas SET excluida = 1 WHERE id = ? AND familia_id = ?', c.req.param('id'), c.get('familia'));
  return r.changes ? c.json({ ok: true }) : c.json({ erro: 'Recompensa não encontrada.' }, 404);
});

// ---------- aprovações ----------

responsavelRoutes.get('/aprovacoes', (c) => {
  const f = c.get('familia');
  return c.json({
    entregas: all(
      `SELECT e.id, e.data, e.foto, e.pontos, e.enviado_em, t.titulo, t.icone, t.modo, k.id crianca_id, k.nome crianca, k.cor
       FROM entregas e JOIN tarefas t ON t.id = e.tarefa_id JOIN criancas k ON k.id = e.crianca_id
       WHERE k.familia_id = ? AND e.situacao = 'pendente' ORDER BY e.enviado_em`, f),
    pedidos: all(
      `SELECT p.id, p.titulo, p.icone, p.custo, p.pedido_em, k.id crianca_id, k.nome crianca, k.cor
       FROM pedidos p JOIN criancas k ON k.id = p.crianca_id
       WHERE k.familia_id = ? AND p.situacao = 'pendente' ORDER BY p.pedido_em`, f),
  });
});

responsavelRoutes.post('/aprovacoes/entregas/:id', async (c) => {
  const e = get(`SELECT e.* FROM entregas e JOIN criancas k ON k.id = e.crianca_id WHERE e.id = ? AND k.familia_id = ? AND e.situacao = 'pendente'`, c.req.param('id'), c.get('familia'));
  if (!e) return c.json({ erro: 'Essa missão já foi decidida.' }, 404);
  const { aprovar } = await corpo(c);
  if (aprovar) aprovarEntrega(e.id);
  else run("UPDATE entregas SET situacao = 'recusada', decidido_em = ? WHERE id = ?", now(), e.id);
  return c.json({ ok: true });
});

responsavelRoutes.post('/aprovacoes/pedidos/:id', async (c) => {
  const p = get(`SELECT p.* FROM pedidos p JOIN criancas k ON k.id = p.crianca_id WHERE p.id = ? AND k.familia_id = ? AND p.situacao = 'pendente'`, c.req.param('id'), c.get('familia'));
  if (!p) return c.json({ erro: 'Esse pedido já foi decidido.' }, 404);
  const { aprovar } = await corpo(c);
  db.transaction(() => {
    run('UPDATE pedidos SET situacao = ?, decidido_em = ? WHERE id = ?', aprovar ? 'aprovado' : 'recusado', now(), p.id);
    if (!aprovar) run('UPDATE criancas SET moedas = moedas + ? WHERE id = ?', p.custo, p.crianca_id);
  })();
  return c.json({ ok: true });
});

/** Fotos de comprovação: só o responsável da família vê. */
responsavelRoutes.get('/fotos/:arquivo', (c) => {
  const arquivo = c.req.param('arquivo');
  const e = /^[a-f0-9]{16}\.jpg$/.test(arquivo)
    ? get('SELECT 1 FROM entregas e JOIN criancas k ON k.id = e.crianca_id WHERE e.foto = ? AND k.familia_id = ?', arquivo, c.get('familia'))
    : undefined;
  const caminho = path.join(FOTOS_DIR, arquivo);
  if (!e || !fs.existsSync(caminho)) return c.json({ erro: 'Foto não encontrada.' }, 404);
  return c.body(fs.readFileSync(caminho), 200, { 'content-type': 'image/jpeg', 'cache-control': 'private, max-age=86400' });
});

// ---------- conta ----------

responsavelRoutes.patch('/conta', async (c) => {
  const f = get('SELECT * FROM familias WHERE id = ?', c.get('familia'))!;
  const b = await corpo(c);
  if (b.nome !== undefined && texto(b.nome)) run('UPDATE familias SET nome = ? WHERE id = ?', texto(b.nome, 60), f.id);
  if (b.uso === 'um' || b.uso === 'cada') run('UPDATE familias SET uso = ? WHERE id = ?', b.uso, f.id);
  if (b.pin !== undefined) {
    if (!/^\d{4}$/.test(String(b.pin))) return c.json({ erro: 'O PIN precisa ter 4 números.' }, 400);
    run('UPDATE familias SET pin = ? WHERE id = ?', hash(String(b.pin)), f.id);
  }
  if (b.nova_senha !== undefined) {
    if (!confere(String(b.senha_atual ?? ''), f.senha)) return c.json({ erro: 'A senha atual não confere.' }, 401);
    if (String(b.nova_senha).length < 8) return c.json({ erro: 'A senha nova precisa ter pelo menos 8 caracteres.' }, 400);
    run('UPDATE familias SET senha = ? WHERE id = ?', hash(String(b.nova_senha)), f.id);
  }
  return c.json({ ok: true });
});

function apagarFotos(rows: Row[]) {
  for (const r of rows) fs.rmSync(path.join(FOTOS_DIR, r.foto), { force: true });
}

/** Exclusão da conta e de todos os dados da família (perfis, histórico e fotos). */
responsavelRoutes.delete('/conta', async (c) => {
  const f = get('SELECT * FROM familias WHERE id = ?', c.get('familia'))!;
  const b = await corpo(c);
  if (!confere(String(b.senha ?? ''), f.senha)) return c.json({ erro: 'A senha não confere.' }, 401);
  apagarFotos(all('SELECT e.foto FROM entregas e JOIN criancas k ON k.id = e.crianca_id WHERE k.familia_id = ? AND e.foto IS NOT NULL', f.id));
  run('DELETE FROM familias WHERE id = ?', f.id);
  limparSessao(c);
  return c.json({ ok: true });
});
