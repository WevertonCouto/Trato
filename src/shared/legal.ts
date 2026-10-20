/** Versão dos Termos de Uso e da Política de Privacidade aceita no cadastro (mude junto com as páginas em web/public). */
export const VERSAO_TERMOS = '1.0';

/** Páginas públicas, servidas sem login em /privacidade, /termos, /cancelamento e /excluir-conta. */
export const PAGINAS_LEGAIS = ['privacidade', 'termos', 'cancelamento', 'excluir-conta'] as const;

export const LINKS_LEGAIS: { pagina: (typeof PAGINAS_LEGAIS)[number]; nome: string }[] = [
  { pagina: 'privacidade', nome: 'Privacidade' },
  { pagina: 'termos', nome: 'Termos de uso' },
  { pagina: 'cancelamento', nome: 'Cancelamento' },
  { pagina: 'excluir-conta', nome: 'Excluir conta' },
];
