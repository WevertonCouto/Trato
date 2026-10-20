import { useEffect, useRef, useState, type ReactNode } from 'react';

// ---------- ícones (traço, 24×24) ----------

const P: Record<string, ReactNode> = {
  casa: <><path d="M4 11.5 12 5l8 6.5" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></>,
  missoes: <><rect x="5" y="4" width="14" height="17" rx="3" /><path d="M9 4.5V3h6v1.5" /><path d="m8.5 11 1.5 1.5 3-3" /><path d="M8.5 16.5h7" /></>,
  pata: <><ellipse cx="12" cy="16" rx="4.5" ry="3.6" /><circle cx="6.5" cy="10.5" r="1.9" /><circle cx="17.5" cy="10.5" r="1.9" /><circle cx="9.5" cy="6.5" r="1.9" /><circle cx="14.5" cy="6.5" r="1.9" /></>,
  presente: <><rect x="4" y="9" width="16" height="11" rx="2" /><path d="M3.5 9h17v3.5h-17z" /><path d="M12 9v11" /><path d="M12 9c-1.5-3-5-4-5.5-2S9 9 12 9c3 0 5.5-.5 5.5-2s-4-1-5.5 2Z" /></>,
  menu: <><path d="M5 7h14" /><path d="M5 12h14" /><path d="M5 17h14" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  camera: <><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" /><circle cx="12" cy="12.5" r="3.5" /></>,
  relogio: <><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></>,
  estrela: <path d="m12 4 2.4 5 5.4.7-4 3.7 1 5.4L12 16.2 7.2 18.8l1-5.4-4-3.7 5.4-.7Z" />,
  chama: <path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.6 3-5.4 3.5-9.4 2.6 1.4 3.4 3.6 3.2 5.4 1-.6 1.8-1.8 2-3 1.8 1.8 3.3 4 3.3 7 0 3.2-2.4 5.6-6 5.6Z" />,
  voltar: <path d="M15 5 8 12l7 7" />,
  seta: <path d="m9 5 7 7-7 7" />,
  mais: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  lixo: <><path d="M5 7h14" /><path d="M10 7V5h4v2" /><path d="M7 7l1 12h8l1-12" /></>,
  lapis: <><path d="M5 19l1-4L16 5l3 3L9 18z" /><path d="m14 7 3 3" /></>,
  cadeado: <><rect x="5" y="10.5" width="14" height="9.5" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  sair: <><path d="M14 5h3.5A1.5 1.5 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5H14" /><path d="M10 8l-4 4 4 4" /><path d="M6 12h9" /></>,
  escudo: <><path d="M12 3.5 19 6v5.5c0 4.2-3 7.4-7 9-4-1.6-7-4.8-7-9V6z" /><path d="m9 12 2 2 4-4" /></>,
  pessoas: <><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19c.5-3.2 2.7-5 5.5-5s5 1.8 5.5 5" /><circle cx="16.5" cy="9.5" r="2.4" /><path d="M15.5 14.2c2.6-.3 4.6 1.3 5 4.3" /></>,
  sino: <><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  grafico: <><path d="M4 17l5-5 3.5 3.5L20 8" /><path d="M15 8h5v5" /></>,
  comida: <><path d="M5 11h14a7 7 0 0 1-14 0Z" /><path d="M9 7c0-1.5 1-2 1-3.5M13 7c0-1.5 1-2 1-3.5" /></>,
  banho: <><path d="M12 4c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2-5 5-9Z" /><path d="M10 14a2 2 0 0 0 2 2" /></>,
  troca: <><path d="M5 9h13l-3-3" /><path d="M19 15H6l3 3" /></>,
  x: <><path d="M6 6l12 12" /><path d="M18 6 6 18" /></>,
};

export function Icone({ nome, tamanho = 22, className }: { nome: keyof typeof P | string; tamanho?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {P[nome]}
    </svg>
  );
}

/** Moedinha do Trato: amarela com um coração. */
export function Moeda({ tamanho = 20 }: { tamanho?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} aria-hidden="true" className="moeda">
      <circle cx="12" cy="12" r="10.5" fill="#FFC53D" stroke="#E0A92A" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="#FFE08A" strokeWidth="1.4" />
      <path d="M12 16.2s-4-2.4-4-5.1A2.1 2.1 0 0 1 12 10a2.1 2.1 0 0 1 4 1.1c0 2.7-4 5.1-4 5.1Z" fill="#E08A1E" />
    </svg>
  );
}

export function Logo({ grande }: { grande?: boolean }) {
  return (
    <div className={`logo ${grande ? 'logo-grande' : ''}`} aria-label="Trato">
      <span className="logo-a">tra</span><span className="logo-b">to</span>
      <svg viewBox="0 0 24 24" className="logo-coracao" aria-hidden="true">
        <path d="M12 20s-7-4.3-7-9.2A3.8 3.8 0 0 1 12 8.6a3.8 3.8 0 0 1 7 2.2C19 15.7 12 20 12 20Z" fill="#FF7A59" />
      </svg>
    </div>
  );
}

// ---------- peças ----------

export function Barra({ pct, cor }: { pct: number; cor?: string }) {
  return (
    <div className="barra" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${Math.max(3, pct)}%`, background: cor }} />
    </div>
  );
}

export function Topo({ titulo, voltar, direita }: { titulo: string; voltar?: () => void; direita?: ReactNode }) {
  return (
    <header className="topo">
      {voltar && <button className="icone-btn" onClick={voltar} aria-label="Voltar"><Icone nome="voltar" /></button>}
      <h1>{titulo}</h1>
      <div className="topo-dir">{direita}</div>
    </header>
  );
}

export function Modal({ aberto, fechar, titulo, children }: { aberto: boolean; fechar: () => void; titulo: string; children: ReactNode }) {
  useEffect(() => {
    if (!aberto) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && fechar();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [aberto, fechar]);
  if (!aberto) return null;
  return (
    <div className="modal-fundo" onClick={fechar}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <div className="modal-topo">
          <h2>{titulo}</h2>
          <button className="icone-btn" onClick={fechar} aria-label="Fechar"><Icone nome="x" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Teclado numérico de PIN (4 dígitos): chama `concluir` ao completar. */
export function PinPad({ titulo, texto, concluir, erro, cancelar }: { titulo: string; texto?: string; concluir: (pin: string) => Promise<unknown> | void; erro?: string; cancelar?: () => void }) {
  const [pin, setPin] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [tremer, setTremer] = useState(false);
  const ref = useRef(erro);
  useEffect(() => {
    if (erro && erro !== ref.current) { setTremer(true); setTimeout(() => setTremer(false), 400); }
    ref.current = erro;
  }, [erro]);
  // toques rápidos chegam antes de o React redesenhar: o PIN digitado fica numa ref, não no estado da renderização
  const atual = useRef('');
  const tecla = async (d: string) => {
    if (ocupado || (d !== '<' && atual.current.length >= 4)) return;
    const novo = d === '<' ? atual.current.slice(0, -1) : atual.current + d;
    atual.current = novo;
    setPin(novo);
    if (novo.length === 4) {
      setOcupado(true);
      try { await concluir(novo); } finally { setOcupado(false); atual.current = ''; setPin(''); }
    }
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (/^\d$/.test(e.key)) tecla(e.key); else if (e.key === 'Backspace') tecla('<'); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });
  return (
    <div className="pinpad">
      <h2>{titulo}</h2>
      {texto && <p className="suave">{texto}</p>}
      <div className={`pin-bolinhas ${tremer ? 'tremer' : ''}`}>
        {[0, 1, 2, 3].map((i) => <span key={i} className={i < pin.length ? 'cheia' : ''} />)}
      </div>
      <p className="erro" role="alert">{erro ?? ' '}</p>
      <div className="pin-teclas">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => <button key={d} onClick={() => tecla(d)}>{d}</button>)}
        {cancelar ? <button className="pin-texto" onClick={cancelar}>Cancelar</button> : <span />}
        <button onClick={() => tecla('0')}>0</button>
        <button className="pin-texto" onClick={() => tecla('<')} aria-label="Apagar">⌫</button>
      </div>
    </div>
  );
}

// ---------- aviso rápido ----------

const avisos = new EventTarget();
export const avisar = (texto: string, tipo: 'ok' | 'erro' = 'ok') => avisos.dispatchEvent(new CustomEvent('aviso', { detail: { texto, tipo } }));

export function Avisos() {
  const [a, setA] = useState<{ texto: string; tipo: string; id: number } | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const f = (e: Event) => {
      const d = (e as CustomEvent).detail;
      setA({ ...d, id: Date.now() });
      clearTimeout(t);
      t = setTimeout(() => setA(null), 2800);
    };
    avisos.addEventListener('aviso', f);
    return () => avisos.removeEventListener('aviso', f);
  }, []);
  return a ? <div key={a.id} className={`aviso aviso-${a.tipo}`} role="status">{a.texto}</div> : null;
}

/** Comemoração rápida quando a criança ganha pontos. */
export function Festa({ texto, fim }: { texto: string; fim: () => void }) {
  useEffect(() => { const t = setTimeout(fim, 1800); return () => clearTimeout(t); }, [fim]);
  return (
    <div className="festa" onClick={fim}>
      {Array.from({ length: 18 }, (_, i) => <i key={i} style={{ ['--i' as any]: i }} />)}
      <div className="festa-texto">{texto}</div>
    </div>
  );
}

export const useCarregar = <T,>(fn: () => Promise<T>, deps: unknown[] = []) => {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState('');
  const recarregar = async () => {
    try { setDados(await fn()); setErro(''); } catch (e: any) { setErro(e.message); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { recarregar(); }, deps);
  return { dados, erro, recarregar };
};
