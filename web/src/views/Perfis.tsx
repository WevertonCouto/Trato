import { useState } from 'react';
import { api, type Perfil } from '../api.ts';
import { Icone, Logo, PinPad, useCarregar } from '../ui.tsx';
import { Pet } from '../pet.tsx';

/** Tela "Quem vai usar?": a criança toca no próprio perfil; o responsável entra com o PIN. */
export function QuemUsa({ mudou }: { mudou: () => void }) {
  const { dados: perfis, erro } = useCarregar(() => api<Perfil[]>('/conta/perfis'));
  const [pin, setPin] = useState<{ perfil?: Perfil } | null>(null);
  const [erroPin, setErroPin] = useState<string>();

  const entrar = async (p: Perfil, codigo?: string) => {
    try { await api('/conta/perfil', { body: { id: p.id, pin: codigo } }); mudou(); } catch (e: any) { setErroPin(e.message); }
  };
  const adulto = async (codigo: string) => {
    try { await api('/conta/adulto', { body: { pin: codigo } }); mudou(); } catch (e: any) { setErroPin(e.message); }
  };

  if (pin) {
    const p = pin.perfil;
    return (
      <div className="pagina centro">
        {p ? <Pet especie={p.especie} tamanho={110} /> : <span className="cadeado-grande"><Icone nome="cadeado" tamanho={40} /></span>}
        <PinPad
          titulo={p ? `Oi, ${p.nome}!` : 'Área do responsável'}
          texto={p ? 'Digite o seu PIN' : 'Digite o PIN do responsável'}
          erro={erroPin}
          cancelar={() => { setPin(null); setErroPin(undefined); }}
          concluir={(c) => (p ? entrar(p, c) : adulto(c))}
        />
      </div>
    );
  }

  return (
    <div className="pagina quem-usa">
      <Logo />
      <h1>Quem vai usar agora?</h1>
      {erro && <p className="erro">{erro}</p>}
      <div className="perfis">
        {perfis?.map((p) => (
          <button key={p.id} className="perfil" style={{ ['--cor' as any]: p.cor }} onClick={() => (p.tem_pin ? setPin({ perfil: p }) : entrar(p))}>
            <span className="perfil-pet"><Pet especie={p.especie} tamanho={92} /></span>
            <strong>{p.nome}</strong>
            {!!p.tem_pin && <small><Icone nome="cadeado" tamanho={13} /> PIN</small>}
          </button>
        ))}
      </div>
      {perfis && perfis.length === 0 && <p className="suave centro-texto">Ainda não há perfis. Entre na área do responsável para criar o primeiro.</p>}
      <button className="btn btn-claro btn-grande" onClick={() => setPin({})}><Icone nome="cadeado" /> Sou o responsável</button>
    </div>
  );
}
