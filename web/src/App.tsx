import { useCallback, useEffect, useState } from 'react';
import { api, eventos, type Conta } from './api.ts';
import { Avisos, Logo } from './ui.tsx';
import { Entrada } from './views/Entrada.tsx';
import { QuemUsa } from './views/Perfis.tsx';
import { AppCrianca } from './views/Crianca.tsx';
import { AreaResponsavel } from './views/Responsavel.tsx';

/**
 * Quem está usando o aparelho decide a tela:
 * sem conta → entrada; responsável com PIN → área dele; perfil escolhido → app da criança; senão → "Quem vai usar?".
 */
export function App() {
  const [conta, setConta] = useState<Conta | null>(null);
  const [erro, setErro] = useState('');
  const carregar = useCallback(async () => {
    try { setConta(await api<Conta>('/conta')); setErro(''); } catch (e: any) { setErro(e.message); }
  }, []);
  useEffect(() => {
    carregar();
    const f = () => carregar();
    eventos.addEventListener('sessao', f);
    return () => eventos.removeEventListener('sessao', f);
  }, [carregar]);

  let tela;
  if (!conta) {
    tela = (
      <div className="centro">
        <Logo grande />
        {erro && <><p className="erro">{erro}</p><button className="btn" onClick={carregar}>Tentar de novo</button></>}
      </div>
    );
  } else if (!conta.logado) tela = <Entrada pronto={carregar} />;
  else if (conta.adulto) tela = <AreaResponsavel conta={conta} mudou={carregar} />;
  else if (conta.perfil) tela = <AppCrianca key={conta.perfil} mudou={carregar} />;
  else tela = <QuemUsa mudou={carregar} />;

  return <div className="app">{tela}<Avisos /></div>;
}
