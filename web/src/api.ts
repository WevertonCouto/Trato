/** Chamadas à API. Erros viram exceção com a mensagem do servidor; 401/403 avisam o App para recarregar a sessão. */
import { API_BASE, cabecalhosSessao, guardarSessao, nativo } from './plataforma.ts';

export class ErroApi extends Error {
  constructor(msg: string, public status: number, public dados: any) { super(msg); }
}

export const eventos = new EventTarget();

export async function api<T = any>(caminho: string, opts: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const headers: Record<string, string> = await cabecalhosSessao();
  if (!opts.form && opts.body !== undefined) headers['content-type'] = 'application/json';
  const r = await fetch(`${API_BASE}/api${caminho}`, {
    method: opts.method ?? (opts.body || opts.form ? 'POST' : 'GET'),
    headers,
    body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    credentials: nativo ? 'omit' : 'same-origin',
  }).catch(() => { throw new ErroApi('Sem conexão. Confira a internet e tente de novo.', 0, null); });
  await guardarSessao(r);
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    if ((r.status === 401 || r.status === 403) && (dados.pin || dados.perfil || /Entre na conta/.test(dados.erro))) eventos.dispatchEvent(new Event('sessao'));
    throw new ErroApi(dados.erro ?? 'Algo deu errado.', r.status, dados);
  }
  return dados as T;
}

export type Aparelho = 'compartilhado' | 'responsavel' | 'crianca';
export type Conta = { logado: false } | {
  logado: true; familia: { nome: string; email: string; uso: 'um' | 'cada' | null };
  adulto: boolean; perfil: string | null; aparelho: Aparelho;
};
export type Perfil = { id: string; nome: string; cor: string; especie: string; pet_nome: string; tem_pin: number | boolean };
export type Tarefa = {
  id: string; titulo: string; icone: string; pontos: number; modo: 'direto' | 'aprovacao' | 'foto';
  repeticao: 'semanal' | 'mensal'; dias: string; dia_mes: number | null; hora: string | null; ativa: boolean;
};
export type TarefaDoDia = Tarefa & { data: string; situacao: import('../../src/shared/regras.ts').Situacao; motivo: string | null };
export type PetInfo = { nome: string; especie: string; xp: number; nivel: number; estagio: string; pct: number; faltam: number; completo: boolean; alimentado: boolean; banho: boolean };

/** Imagem que precisa da sessão (fotos de comprovação): no app nativo o <img> não manda o token, então baixa como blob. */
export async function urlAutenticada(caminho: string) {
  if (!nativo) return `/api${caminho}`;
  const r = await fetch(`${API_BASE}/api${caminho}`, { headers: await cabecalhosSessao(), credentials: 'omit' });
  return r.ok ? URL.createObjectURL(await r.blob()) : '';
}
