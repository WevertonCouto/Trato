/** Contas da rotina: situação das tarefas, pontos, sequência de dias, conquistas e pet. */
import { all, db, dia, get, now, run, somarDias, type Row } from './db.ts';
import { CONQUISTAS, NIVEIS, NIVEL_MAX, nivelDe, venceEm, type Situacao } from '../shared/regras.ts';

export const tarefasDaCrianca = (crianca: string) =>
  all('SELECT * FROM tarefas WHERE crianca_id = ? AND excluida = 0 AND ativa = 1 ORDER BY hora IS NULL, hora, criado_em', crianca);

const minutos = (hora: string) => { const [h, m] = hora.split(':').map(Number); return h * 60 + m; };

export function situacao(t: Row, data: string, entrega: Row | undefined, hoje = dia()): Situacao {
  if (entrega?.situacao === 'aprovada') return 'concluida';
  if (entrega?.situacao === 'pendente') return 'aguardando';
  if (entrega?.situacao === 'recusada') return 'refazer';
  if (data > hoje) return 'futura';
  if (data < hoje) return 'perdida';
  if (!t.hora) return 'disponivel';
  const agora = new Date().getHours() * 60 + new Date().getMinutes();
  const m = minutos(t.hora);
  if (agora < m - 30) return 'disponivel';
  if (agora <= m + 60) return 'agora';
  return 'atrasada';
}

/** Tarefas que vencem num dia, com a entrega (se houver) e a situação. */
export function doDia(crianca: string, data: string) {
  const entregas = new Map(all('SELECT * FROM entregas WHERE crianca_id = ? AND data = ?', crianca, data).map((e) => [e.tarefa_id, e]));
  return tarefasDaCrianca(crianca)
    // dias anteriores à criação da tarefa não contam (senão a semana mostra "Não feita" do que nem existia)
    .filter((t) => venceEm(t as any, data) && (entregas.has(t.id) || dia(new Date(t.criado_em)) <= data))
    .map((t) => {
      const e = entregas.get(t.id);
      return { ...publica(t), data, situacao: situacao(t, data, e), motivo: e?.situacao === 'recusada' ? 'O responsável pediu para refazer' : null };
    });
}

export const publica = (t: Row) => ({
  id: t.id, titulo: t.titulo, icone: t.icone, pontos: t.pontos, modo: t.modo,
  repeticao: t.repeticao, dias: t.dias, dia_mes: t.dia_mes, hora: t.hora, ativa: !!t.ativa,
});

/** Credita pontos: XP total, XP do pet e moedinhas. */
export function creditar(crianca: string, pontos: number) {
  run('UPDATE criancas SET xp = xp + ?, pet_xp = MIN(pet_xp + ?, ?), moedas = moedas + ? WHERE id = ?', pontos, pontos, NIVEIS[NIVEL_MAX], pontos, crianca);
}

export const aprovarEntrega = db.transaction((id: string) => {
  const e = get("SELECT * FROM entregas WHERE id = ? AND situacao = 'pendente'", id);
  if (!e) return false;
  run("UPDATE entregas SET situacao = 'aprovada', decidido_em = ? WHERE id = ?", now(), id);
  creditar(e.crianca_id, e.pontos);
  return true;
});

/** Dias seguidos com pelo menos uma missão concluída (conta até ontem se hoje ainda não teve). */
export function sequencia(crianca: string) {
  const datas = new Set(all<{ data: string }>("SELECT DISTINCT data FROM entregas WHERE crianca_id = ? AND situacao = 'aprovada'", crianca).map((r) => r.data));
  let d = dia();
  if (!datas.has(d)) d = somarDias(d, -1);
  let atual = 0;
  while (datas.has(d)) { atual++; d = somarDias(d, -1); }
  // melhor sequência da história
  let melhor = 0;
  let corrida = 0;
  let anterior = '';
  for (const x of [...datas].sort()) {
    corrida = anterior && somarDias(anterior, 1) === x ? corrida + 1 : 1;
    melhor = Math.max(melhor, corrida);
    anterior = x;
  }
  return { atual, melhor };
}

export function conquistas(crianca: string) {
  const k = get('SELECT pet_xp FROM criancas WHERE id = ?', crianca)!;
  const feitas = get<{ n: number }>("SELECT COUNT(*) n FROM entregas WHERE crianca_id = ? AND situacao = 'aprovada'", crianca)!.n;
  const cuidados = get<{ n: number }>('SELECT COUNT(*) n FROM cuidados WHERE crianca_id = ?', crianca)!.n;
  const ganhos = get<{ n: number }>("SELECT COUNT(*) n FROM pedidos WHERE crianca_id = ? AND situacao = 'aprovado'", crianca)!.n;
  const pets = get<{ n: number }>('SELECT COUNT(*) n FROM colecao WHERE crianca_id = ?', crianca)!.n;
  const seq = sequencia(crianca).melhor;
  const ok: Record<string, boolean> = {
    primeira: feitas >= 1, dez: feitas >= 10, cinquenta: feitas >= 50, cem: feitas >= 100,
    seq3: seq >= 3, seq7: seq >= 7, cuidador: cuidados >= 10,
    nivel3: pets > 0 || nivelDe(k.pet_xp).nivel >= 3, recompensa: ganhos >= 1, colecao: pets >= 1,
  };
  return { feitas, lista: CONQUISTAS.map((c) => ({ ...c, ganhou: !!ok[c.id] })) };
}

export function petDe(k: Row) {
  const hoje = dia();
  const cuidou = new Set(all<{ tipo: string }>('SELECT tipo FROM cuidados WHERE crianca_id = ? AND data = ?', k.id, hoje).map((r) => r.tipo));
  return {
    nome: k.pet_nome, especie: k.especie, xp: k.pet_xp, ...nivelDe(k.pet_xp),
    alimentado: cuidou.has('alimentar'), banho: cuidou.has('banho'),
  };
}
