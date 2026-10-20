/**
 * O pet que reage: tocar faz ele pular, rir ou ganhar carinho; comer, tomar banho e comemorar têm animação.
 * O balão de fala mostra o que ele "pensa" (vem do humor do dia, ver `clima`).
 */
import { useEffect, useRef, useState } from 'react';
import { Pet, type Humor } from './pet.tsx';
import { tocar } from './som.ts';
import type { PetInfo, TarefaDoDia } from './api.ts';

export type Acao = { tipo: 'comer' | 'banho' | 'festa'; id: number } | null;
type Reacao = 'pulo' | 'riso' | 'carinho' | 'comer' | 'banho' | 'festa' | null;

const FALAS_TOQUE = ['Hihi, faz cócegas!', 'Oba, carinho!', 'Te adoro!', 'De novo! De novo!', 'Boing boing!', 'Você é demais!'];

export function PetVivo({ especie, nivel, humor, fala, tamanho = 200, acao }: { especie: string; nivel: number; humor: Humor; fala?: string; tamanho?: number; acao?: Acao }) {
  const [reacao, setReacao] = useState<Reacao>(null);
  const [falaToque, setFalaToque] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const reagir = (r: Reacao, ms: number, txt?: string) => {
    clearTimeout(timer.current);
    setReacao(null);
    // um quadro sem a classe para a animação recomeçar mesmo repetindo a mesma reação
    requestAnimationFrame(() => setReacao(r));
    if (txt) setFalaToque(txt);
    timer.current = setTimeout(() => { setReacao(null); setFalaToque(null); }, ms);
  };

  useEffect(() => {
    if (!acao) return;
    if (acao.tipo === 'comer') { tocar('nhac', 40); reagir('comer', 1600, 'Nham nham! Que delícia!'); }
    if (acao.tipo === 'banho') { tocar('bolha', 40); reagir('banho', 1800, 'Que cheirinho bom!'); }
    if (acao.tipo === 'festa') { tocar('festa', 60); reagir('festa', 1800, 'Uhuuu! Missão feita!'); }
  }, [acao?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(timer.current), []);

  const tocou = () => {
    const opcoes: Reacao[] = ['pulo', 'riso', 'carinho'];
    const r = opcoes[Math.floor(Math.random() * opcoes.length)];
    tocar(r === 'riso' ? 'risada' : 'pop', 20);
    reagir(r, 1200, FALAS_TOQUE[Math.floor(Math.random() * FALAS_TOQUE.length)]);
  };

  const rosto: Humor = reacao === 'comer' ? 'comendo' : reacao ? 'rindo' : humor;
  const texto = falaToque ?? fala;

  return (
    <div className={`pet-vivo ${reacao ? `reacao-${reacao}` : ''}`} style={{ ['--t' as any]: `${tamanho}px` }}>
      {texto && <div className="balao" key={texto} role="status">{texto}</div>}
      <button className="pet-toque" onClick={tocou} aria-label="Fazer carinho no pet">
        <span className="pet-corpo"><Pet especie={especie} nivel={nivel} humor={rosto} tamanho={tamanho} /></span>
      </button>
      {reacao === 'carinho' && <Efeito simbolos={['💜', '💖', '💜', '💗', '💖']} classe="coracao" />}
      {reacao === 'festa' && <Efeito simbolos={['⭐', '✨', '🌟', '⭐', '✨', '🎉']} classe="estrela" />}
      {reacao === 'banho' && <Efeito simbolos={['○', '○', '○', '○', '○', '○', '○']} classe="bolha" />}
      {reacao === 'comer' && <span className="comida-voando" aria-hidden="true">🍎</span>}
    </div>
  );
}

function Efeito({ simbolos, classe }: { simbolos: string[]; classe: string }) {
  return (
    <span className="efeitos" aria-hidden="true">
      {simbolos.map((s, i) => <i key={i} className={classe} style={{ ['--i' as any]: i, ['--n' as any]: simbolos.length }}>{s}</i>)}
    </span>
  );
}

const PENDENTES = new Set(['disponivel', 'agora', 'atrasada', 'refazer']);
const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Próxima missão: primeiro as atrasadas e as de refazer, depois a do horário de agora, depois a ordem do dia. */
export function proximaMissao(hoje: TarefaDoDia[]) {
  const peso = (t: TarefaDoDia) => (t.situacao === 'refazer' || t.situacao === 'atrasada' ? 0 : t.situacao === 'agora' ? 1 : 2);
  return hoje.filter((t) => PENDENTES.has(t.situacao)).sort((a, b) => peso(a) - peso(b))[0] ?? null;
}

/**
 * Humor e fala do pet a partir das missões do dia. `foco: 'pet'` também fala de fome e banho;
 * no Início o assunto é sempre a missão.
 */
export function clima(pet: PetInfo, hoje: TarefaDoDia[], foco: 'inicio' | 'pet' = 'inicio'): { humor: Humor; fala: string } {
  const pendentes = hoje.filter((t) => PENDENTES.has(t.situacao));
  const aguardando = hoje.filter((t) => t.situacao === 'aguardando').length;
  const atrasada = hoje.find((t) => t.situacao === 'atrasada' || t.situacao === 'refazer');
  const hora = new Date().getHours();
  const prox = proximaMissao(hoje);

  if (!hoje.length) return { humor: 'feliz', fala: 'Hoje é dia livre! Vamos brincar?' };
  if (!pendentes.length) {
    if (hora >= 21) return { humor: 'dormindo', fala: 'Zzz… a gente fez tudo hoje!' };
    if (foco === 'pet' && !pet.alimentado) return { humor: 'fome', fala: 'Missões feitas! Agora me dá comida?' };
    return { humor: 'rindo', fala: aguardando ? 'Fez tudo! Agora é esperar o OK do responsável.' : 'Você fez tudo! Tô muito feliz!' };
  }
  if (atrasada) {
    return { humor: 'triste', fala: atrasada.situacao === 'refazer' ? `Vamos refazer "${minuscula(atrasada.titulo)}"?` : `Ih… "${minuscula(atrasada.titulo)}" atrasou. Bora?` };
  }
  if (foco === 'pet' && !pet.alimentado && hora >= 11) return { humor: 'fome', fala: 'Tô com fome! Me dá comida?' };
  const falta = pendentes.length === 1 ? 'Só falta 1 missão!' : `Faltam ${pendentes.length} missões!`;
  return { humor: 'feliz', fala: `Bora ${minuscula(prox!.titulo)}? ${falta}` };
}
