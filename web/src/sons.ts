/**
 * Efeitos sonoros do Trato, sintetizados na hora com a Web Audio API (osciladores, ruído e envelopes):
 * identidade própria, sem arquivo de áudio de terceiros, leve e funcionando offline.
 *
 * - Desbloqueio: navegadores e WebView só deixam tocar depois do primeiro toque; `prepararSons()` cuida disso.
 * - Sem sobreposição: uma voz por vez; um som novo apaga o anterior com um fade curtinho.
 * - Volume baixo (ganho mestre + compressor) e, com "movimento reduzido", nada de fanfarra longa.
 * - Junto vem uma vibração leve (Haptics no app nativo, navigator.vibrate na web).
 * - Liga/desliga por aparelho (localStorage), ligado por padrão; vale para som e vibração.
 */
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { nativo } from './plataforma.ts';

const CHAVE = 'trato.som';
export function somLigado() {
  try { return localStorage.getItem(CHAVE) !== 'nao'; } catch { return true; }
}
export function ligarSom(ligado: boolean) {
  try { localStorage.setItem(CHAVE, ligado ? 'sim' : 'nao'); } catch { /* sem armazenamento: fica ligado */ }
}
const movimentoReduzido = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- motor ----------

let ctx: AudioContext | null = null;
let mestre: GainNode | null = null;
let ruidoBuf: AudioBuffer | null = null;

function contexto() {
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 6;
  mestre = ctx.createGain();
  mestre.gain.value = 0.22; // volume baixo
  mestre.connect(comp).connect(ctx.destination);
  return ctx;
}

/** Destrava o áudio no primeiro toque (exigência dos navegadores e do WebView). */
export function prepararSons() {
  const destravar = () => {
    const c = contexto();
    if (!c) return;
    c.resume().catch(() => {});
    const b = c.createBuffer(1, 1, 22050);
    const s = c.createBufferSource();
    s.buffer = b;
    s.connect(c.destination);
    s.start(0);
    window.removeEventListener('pointerdown', destravar, true);
    window.removeEventListener('keydown', destravar, true);
  };
  window.addEventListener('pointerdown', destravar, true);
  window.addEventListener('keydown', destravar, true);
}

type Tom = { tipo?: OscillatorType; vol?: number; ataque?: number; ate?: number; vibrato?: number };
/** Uma nota com envelope (ataque curto, queda exponencial); `ate` faz o tom deslizar até outra frequência. */
function tom(saida: AudioNode, t: number, freq: number, dur: number, o: Tom = {}) {
  const c = ctx!;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.tipo ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (o.ate) osc.frequency.exponentialRampToValueAtTime(o.ate, t + dur * 0.8);
  if (o.vibrato) {
    const lfo = c.createOscillator();
    const prof = c.createGain();
    lfo.frequency.value = 9;
    prof.gain.value = o.vibrato;
    lfo.connect(prof).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + dur);
  }
  const v = o.vol ?? 1;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + (o.ataque ?? 0.006));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(saida);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Sino: fundamental + parcial inarmônico baixinho (o "brilho" de sininho). */
function sino(saida: AudioNode, t: number, freq: number, dur = 0.4, vol = 0.8) {
  tom(saida, t, freq, dur, { tipo: 'triangle', vol });
  tom(saida, t, freq * 2.76, dur * 0.5, { tipo: 'sine', vol: vol * 0.25 });
}

function ruido(saida: AudioNode, t: number, dur: number, filtro: number, vol = 0.6, q = 1) {
  const c = ctx!;
  if (!ruidoBuf) {
    ruidoBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d = ruidoBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource();
  s.buffer = ruidoBuf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = filtro;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(saida);
  s.start(t);
  s.stop(t + dur + 0.02);
}

const moedinha = (s: AudioNode, t: number) => {
  [2349, 3136, 2794].forEach((f, i) => tom(s, t + i * 0.055, f, 0.14, { tipo: 'sine', vol: 0.45 }));
  tom(s, t, 4699, 0.05, { tipo: 'square', vol: 0.05 });
};

// ---------- os sons (cada um devolve a duração em segundos) ----------

const SONS = {
  /** Missão concluída: sininho subindo, com tilintar de moedinha no fim. */
  missao: (s: AudioNode, t: number) => {
    [1319, 1568, 2093].forEach((f, i) => sino(s, t + i * 0.08, f, 0.42, 0.7));
    moedinha(s, t + 0.3);
    return 0.75;
  },
  /** Moedinhas ganhas (cuidar do pet). */
  moedas: (s: AudioNode, t: number) => { moedinha(s, t); return 0.3; },
  /** Missão enviada para aprovação: pop suave. */
  enviado: (s: AudioNode, t: number) => {
    tom(s, t, 520, 0.12, { ate: 1040, vol: 0.6 });
    tom(s, t + 0.08, 1400, 0.1, { vol: 0.25 });
    return 0.22;
  },
  /** Toque no pet. */
  boing: (s: AudioNode, t: number) => {
    tom(s, t, 170, 0.42, { ate: 430, vol: 0.7, vibrato: 25 });
    return 0.45;
  },
  risadinha: (s: AudioNode, t: number) => {
    [920, 1020, 960, 1080].forEach((f, i) => tom(s, t + i * 0.085, f, 0.075, { tipo: 'triangle', ate: f * 0.8, vol: 0.45 }));
    return 0.4;
  },
  /** Comendo: três mordidas crocantes. */
  crunch: (s: AudioNode, t: number) => {
    [0, 0.2, 0.4].forEach((d) => { ruido(s, t + d, 0.07, 2600, 0.7, 0.9); tom(s, t + d, 140, 0.06, { vol: 0.5 }); });
    return 0.5;
  },
  /** Banho: bolhas subindo. */
  bolhas: (s: AudioNode, t: number) => {
    for (let i = 0; i < 7; i++) {
      const f = 380 + Math.random() * 520;
      tom(s, t + i * 0.08 + Math.random() * 0.03, f, 0.07, { ate: f * 2.2, vol: 0.4 });
    }
    return 0.65;
  },
  /** Subiu de nível: fanfarrinha (curta com movimento reduzido). */
  nivel: (s: AudioNode, t: number) => {
    if (movimentoReduzido()) { sino(s, t, 1047, 0.3); sino(s, t + 0.1, 1568, 0.35); return 0.45; }
    [523, 659, 784].forEach((f, i) => { tom(s, t + i * 0.11, f, 0.2, { tipo: 'triangle', vol: 0.6 }); tom(s, t + i * 0.11, f * 2, 0.12, { tipo: 'square', vol: 0.06 }); });
    [1047, 1319, 1568].forEach((f) => tom(s, t + 0.36, f, 0.7, { tipo: 'triangle', vol: 0.35, vibrato: 6 }));
    moedinha(s, t + 0.5);
    return 1.1;
  },
  /** Pedido de recompensa enviado: "fiu" para cima. */
  pedido: (s: AudioNode, t: number) => {
    ruido(s, t, 0.18, 1800, 0.25, 2);
    tom(s, t + 0.04, 660, 0.2, { ate: 1320, vol: 0.5 });
    return 0.28;
  },
  /** Recompensa aprovada pelo responsável. */
  premio: (s: AudioNode, t: number) => {
    if (movimentoReduzido()) { sino(s, t, 1568, 0.4); return 0.4; }
    [784, 1047, 1319, 1568].forEach((f, i) => sino(s, t + i * 0.07, f, 0.45, 0.55));
    moedinha(s, t + 0.35);
    return 0.8;
  },
  /** Tecla do PIN: clique leve. */
  tecla: (s: AudioNode, t: number) => { tom(s, t, 1250, 0.035, { vol: 0.3, ataque: 0.002 }); return 0.04; },
  /** Erro ou PIN errado: "nhé" curto e gentil (duas notinhas descendo, nada de buzina). */
  erro: (s: AudioNode, t: number) => {
    tom(s, t, 466, 0.13, { tipo: 'triangle', ate: 415, vol: 0.45 });
    tom(s, t + 0.13, 392, 0.18, { tipo: 'triangle', ate: 330, vol: 0.4 });
    return 0.32;
  },
  /** Confirmação do responsável ao aprovar. */
  aprovar: (s: AudioNode, t: number) => { tom(s, t, 784, 0.12, { vol: 0.45 }); tom(s, t + 0.09, 1175, 0.18, { vol: 0.4 }); return 0.28; },
} satisfies Record<string, (s: AudioNode, t: number) => number>;

export type Som = keyof typeof SONS;

type Vibracao = 'leve' | 'medio' | 'sucesso' | 'erro';
const VIBRACAO: Record<Som, Vibracao | null> = {
  missao: 'sucesso', moedas: 'leve', enviado: 'leve', boing: 'leve', risadinha: 'leve', crunch: 'leve', bolhas: 'leve',
  nivel: 'sucesso', pedido: 'medio', premio: 'sucesso', tecla: 'leve', erro: 'erro', aprovar: 'leve',
};

export function vibrar(v: Vibracao) {
  if (!somLigado()) return;
  if (nativo) {
    const p = v === 'sucesso' ? Haptics.notification({ type: NotificationType.Success })
      : v === 'erro' ? Haptics.notification({ type: NotificationType.Warning })
      : Haptics.impact({ style: v === 'medio' ? ImpactStyle.Medium : ImpactStyle.Light });
    p.catch(() => {});
  } else if ('vibrate' in navigator) {
    navigator.vibrate(v === 'sucesso' ? [15, 50, 25] : v === 'erro' ? [25, 60, 25] : v === 'medio' ? 20 : 8);
  }
}

let atual: { saida: GainNode; fim: number; som: Som; inicio: number } | null = null;

/** Toca um efeito (uma voz por vez) e vibra junto. */
export function tocar(som: Som) {
  if (!somLigado()) return;
  const v = VIBRACAO[som];
  if (v) vibrar(v);
  const c = contexto();
  if (!c || !mestre) return;
  // no primeiro toque o áudio ainda está acordando: toca assim que ele voltar (antes de qualquer toque, o resume não acontece)
  if (c.state !== 'running') {
    const pedido = Date.now();
    // só se acordar logo: um som pedido antes de qualquer toque não deve sair atrasado lá no primeiro toque
    c.resume().then(() => c.state === 'running' && Date.now() - pedido < 800 && soar(c, som)).catch(() => {});
    return;
  }
  soar(c, som);
}

function soar(c: AudioContext, som: Som) {
  const t = c.currentTime;
  // toques seguidos no mesmo som: ignora o que chega colado (evita metralhadora de boing)
  if (atual && atual.som === som && som !== 'tecla' && t - atual.inicio < 0.12) return;
  if (atual && atual.fim > t) {
    const anterior = atual.saida;
    anterior.gain.setValueAtTime(anterior.gain.value, t);
    anterior.gain.linearRampToValueAtTime(0, t + 0.03);
    setTimeout(() => anterior.disconnect(), 80);
  }
  const saida = c.createGain();
  saida.connect(mestre!);
  try {
    const dur = SONS[som](saida, t + 0.01);
    atual = { saida, fim: t + dur, som, inicio: t };
  } catch { /* aparelho sem áudio */ }
}
