import { useCallback, useEffect, useState } from 'react';
import { api, eventos, type Conta } from './api.ts';
import { Avisos, Icone, Logo, PinPad } from './ui.tsx';
import { Entrada } from './views/Entrada.tsx';
import { QuemUsa } from './views/Perfis.tsx';
import { AppCrianca } from './views/Crianca.tsx';
import { AreaResponsavel } from './views/Responsavel.tsx';

/**
 * Quem está usando o aparelho decide a tela:
 * sem conta → entrada; responsável com PIN → área dele; perfil escolhido → app da criança;
 * celular do responsável → PIN direto; senão → "Quem vai usar?".
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
  else if (conta.perfil) tela = <AppCrianca key={conta.perfil} aparelho={conta.aparelho} mudou={carregar} />;
  else if (conta.aparelho === 'responsavel') tela = <PinDoResponsavel mudou={carregar} />;
  else tela = <QuemUsa mudou={carregar} />;

  return <div className="app">{tela}<Avisos /></div>;
}

/** Celular do responsável: sem "Quem vai usar?", direto no PIN. */
function PinDoResponsavel({ mudou }: { mudou: () => void }) {
  const [erro, setErro] = useState<string>();
  return (
    <div className="pagina centro">
      <Logo />
      <span className="cadeado-grande"><Icone nome="cadeado" tamanho={40} /></span>
      <PinPad titulo="Olá de novo!" texto="Digite o seu PIN" erro={erro}
        concluir={async (c) => { try { await api('/conta/adulto', { body: { pin: c } }); mudou(); } catch (e: any) { setErro(e.message); } }} />
      <button className="btn-link" onClick={async () => { if (confirm('Sair da conta neste celular?')) { await api('/conta/sair', { method: 'POST' }); mudou(); } }}>Sair da conta</button>
    </div>
  );
}
