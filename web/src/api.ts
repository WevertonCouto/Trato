/** Chamadas à API. Erros viram exceção com a mensagem do servidor; 401/403 avisam o App para recarregar a sessão. */
export class ErroApi extends Error {
  constructor(msg: string, public status: number, public dados: any) { super(msg); }
}

export const eventos = new EventTarget();

export async function api<T = any>(caminho: string, opts: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const r = await fetch(`/api${caminho}`, {
    method: opts.method ?? (opts.body || opts.form ? 'POST' : 'GET'),
    headers: opts.form ? undefined : opts.body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    credentials: 'same-origin',
  }).catch(() => { throw new ErroApi('Sem conexão. Confira a internet e tente de novo.', 0, null); });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    if ((r.status === 401 || r.status === 403) && (dados.pin || dados.perfil || /Entre na conta/.test(dados.erro))) eventos.dispatchEvent(new Event('sessao'));
    throw new ErroApi(dados.erro ?? 'Algo deu errado.', r.status, dados);
  }
  return dados as T;
}

export type Conta = { logado: false } | { logado: true; familia: { nome: string; email: string }; adulto: boolean; perfil: string | null };
export type Perfil = { id: string; nome: string; cor: string; especie: string; pet_nome: string; tem_pin: number | boolean };
export type Tarefa = {
  id: string; titulo: string; icone: string; pontos: number; modo: 'direto' | 'aprovacao' | 'foto';
  repeticao: 'semanal' | 'mensal'; dias: string; dia_mes: number | null; hora: string | null; ativa: boolean;
};
export type TarefaDoDia = Tarefa & { data: string; situacao: import('../../src/shared/regras.ts').Situacao; motivo: string | null };
export type PetInfo = { nome: string; especie: string; xp: number; nivel: number; estagio: string; pct: number; faltam: number; completo: boolean; alimentado: boolean; banho: boolean };
