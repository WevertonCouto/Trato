/**
 * Regras usadas pelo servidor e pela tela: níveis do pet, espécies, conquistas e recorrência das tarefas.
 * Os pontos de cada tarefa contam duas vezes: viram XP (fazem o pet crescer) e moedinhas (trocadas por recompensas).
 */

/** XP do pet para chegar a cada nível; o último valor fecha o pet (vai para a coleção). */
export const NIVEIS = [0, 250, 600, 1100, 1800, 2500];
export const ESTAGIOS = ['Filhote', 'Pequeno', 'Crescido', 'Adulto', 'Lendário'];
export const NIVEL_MAX = ESTAGIOS.length;
/** Moedas ganhas por cuidado do pet (cada um vale uma vez por dia). */
export const MOEDAS_CUIDADO = 2;

export function nivelDe(xp: number) {
  let nivel = 1;
  while (nivel < NIVEL_MAX && xp >= NIVEIS[nivel]) nivel++;
  const de = NIVEIS[nivel - 1];
  const ate = NIVEIS[nivel];
  const completo = xp >= NIVEIS[NIVEL_MAX];
  return {
    nivel,
    estagio: ESTAGIOS[nivel - 1],
    pct: completo ? 100 : Math.floor(((xp - de) / (ate - de)) * 100),
    faltam: Math.max(0, ate - xp),
    completo,
  };
}

export type Especie = { id: string; nome: string; cor: string; sombra: string; barriga: string; detalhe: 'folha' | 'gota' | 'orelhas' | 'estrela' | 'chifres' };

export const ESPECIES: Especie[] = [
  { id: 'broto', nome: 'Broto', cor: '#7BD389', sombra: '#4FA865', barriga: '#C9F2D0', detalhe: 'folha' },
  { id: 'pingo', nome: 'Pingo', cor: '#6EC6F5', sombra: '#3D97CC', barriga: '#D3EEFC', detalhe: 'gota' },
  { id: 'bolota', nome: 'Bolota', cor: '#FFA96B', sombra: '#E07B38', barriga: '#FFE0C7', detalhe: 'orelhas' },
  { id: 'lumi', nome: 'Lumi', cor: '#FFD45C', sombra: '#E0A92A', barriga: '#FFF1C2', detalhe: 'estrela' },
  { id: 'tico', nome: 'Tico', cor: '#B49CF2', sombra: '#8167D1', barriga: '#E6DDFC', detalhe: 'chifres' },
];
export const especie = (id: string) => ESPECIES.find((e) => e.id === id) ?? ESPECIES[0];

export const CORES_PERFIL = ['#7C5CFC', '#FF7A59', '#22B573', '#2D9CDB', '#F2994A', '#EB5A9C'];

export type Conquista = { id: string; titulo: string; texto: string; icone: string };
export const CONQUISTAS: Conquista[] = [
  { id: 'primeira', titulo: 'Primeiro trato', texto: 'Concluiu a primeira missão', icone: '🌱' },
  { id: 'dez', titulo: 'Pegando o jeito', texto: '10 missões concluídas', icone: '✋' },
  { id: 'cinquenta', titulo: 'Craque da rotina', texto: '50 missões concluídas', icone: '🏅' },
  { id: 'cem', titulo: 'Cem tratos', texto: '100 missões concluídas', icone: '💯' },
  { id: 'seq3', titulo: 'Três seguidos', texto: '3 dias seguidos fazendo missões', icone: '🔥' },
  { id: 'seq7', titulo: 'Semana inteira', texto: '7 dias seguidos fazendo missões', icone: '📅' },
  { id: 'cuidador', titulo: 'Bom cuidador', texto: 'Cuidou do pet 10 vezes', icone: '💚' },
  { id: 'nivel3', titulo: 'Crescendo junto', texto: 'O pet chegou ao nível 3', icone: '🌟' },
  { id: 'recompensa', titulo: 'Merecido', texto: 'Ganhou a primeira recompensa', icone: '🎁' },
  { id: 'colecao', titulo: 'Colecionador', texto: 'Criou um pet até o fim', icone: '🏆' },
];

export type Modo = 'direto' | 'aprovacao' | 'foto';
export const MODOS: Record<Modo, string> = {
  direto: 'Concluída direto',
  aprovacao: 'Precisa de aprovação',
  foto: 'Comprovar com foto',
};

/** dias: string com os dias da semana (0 = domingo … 6 = sábado), ex.: "12345". */
export type Recorrencia = { repeticao: 'semanal' | 'mensal'; dias: string; dia_mes: number | null };

export function venceEm(t: Recorrencia, data: string) {
  const d = new Date(`${data}T12:00:00`);
  if (t.repeticao === 'mensal') {
    const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return d.getDate() === Math.min(t.dia_mes ?? 1, ultimo);
  }
  return t.dias.includes(String(d.getDay()));
}

export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function descreverRecorrencia(t: Recorrencia) {
  if (t.repeticao === 'mensal') return `Todo dia ${t.dia_mes ?? 1} do mês`;
  if (t.dias.length === 7) return 'Todos os dias';
  if (t.dias === '12345') return 'Dias de semana';
  if (t.dias === '06') return 'Fins de semana';
  return [...t.dias].sort().map((d) => DIAS_CURTOS[Number(d)]).join(', ');
}

/** Situação de uma tarefa num dia, para a tela. */
export type Situacao = 'disponivel' | 'agora' | 'atrasada' | 'aguardando' | 'refazer' | 'concluida' | 'perdida' | 'futura';
export const SITUACOES: Record<Situacao, string> = {
  disponivel: 'Disponível',
  agora: 'Em andamento',
  atrasada: 'Atrasada',
  aguardando: 'Aguardando aprovação',
  refazer: 'Refazer',
  concluida: 'Concluída',
  perdida: 'Não feita',
  futura: 'Em breve',
};
