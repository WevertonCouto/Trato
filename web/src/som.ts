/** Sonzinhos curtos gerados na hora (sem arquivos de áudio) e vibração leve no Android. */

const CHAVE = 'trato.som';
export function somLigado() {
  try { return localStorage.getItem(CHAVE) !== 'nao'; } catch { return true; }
}
export function ligarSom(ligado: boolean) {
  try { localStorage.setItem(CHAVE, ligado ? 'sim' : 'nao'); } catch { /* sem armazenamento: fica ligado */ }
}

let ctx: AudioContext | null = null;
function nota(freq: number, inicio: number, dur: number, tipo: OscillatorType = 'sine', vol = 0.12) {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const t = ctx.currentTime + inicio;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur);
}

const SONS = {
  pop: () => { nota(660, 0, 0.08, 'triangle'); nota(990, 0.06, 0.1, 'triangle'); },
  risada: () => [0, 0.09, 0.18].forEach((d, i) => nota(880 - i * 60, d, 0.08, 'square', 0.05)),
  nhac: () => { nota(220, 0, 0.07, 'square', 0.06); nota(260, 0.16, 0.07, 'square', 0.06); nota(240, 0.32, 0.07, 'square', 0.06); },
  bolha: () => [0, 0.1, 0.2, 0.3].forEach((d) => nota(500 + Math.random() * 500, d, 0.06, 'sine', 0.08)),
  festa: () => [523, 659, 784, 1047].forEach((f, i) => nota(f, i * 0.09, 0.18, 'triangle')),
  enviado: () => { nota(587, 0, 0.12, 'triangle'); nota(784, 0.1, 0.16, 'triangle'); },
};

export function tocar(som: keyof typeof SONS, vibrarMs = 0) {
  if (vibrarMs && 'vibrate' in navigator) navigator.vibrate(vibrarMs);
  if (!somLigado()) return;
  try { SONS[som](); } catch { /* aparelho sem áudio */ }
}
