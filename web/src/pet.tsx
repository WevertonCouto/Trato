/** Mascotes do Trato, desenhados em SVG: cada espécie tem um detalhe próprio e cresce a cada nível. */
import { useId } from 'react';
import { especie as acharEspecie, NIVEL_MAX } from '../../src/shared/regras.ts';

const INK = '#2B2340';
const ESCALA = [0.7, 0.79, 0.87, 0.94, 1];

type Props = { especie: string; nivel?: number; humor?: 'feliz' | 'triste' | 'dormindo'; tamanho?: number; bloqueado?: boolean; className?: string };

export function Pet({ especie, nivel = 1, humor = 'feliz', tamanho = 160, bloqueado, className }: Props) {
  const e = acharEspecie(especie);
  const id = useId().replace(/:/g, '');
  const n = Math.min(Math.max(nivel, 1), NIVEL_MAX);
  const s = ESCALA[n - 1];
  const gota = e.detalhe === 'gota';
  const corpo = gota
    ? 'M100 40 C112 62 162 82 162 122 C162 154 136 172 100 172 C64 172 38 154 38 122 C38 82 88 62 100 40 Z'
    : 'M100 56 C142 56 162 86 162 122 C162 154 136 172 100 172 C64 172 38 154 38 122 C38 86 58 56 100 56 Z';

  return (
    <svg viewBox="0 0 200 200" width={tamanho} height={tamanho} className={className} role="img" aria-label={`Pet ${e.nome}, nível ${n}`}
      style={bloqueado ? { filter: 'grayscale(1)', opacity: 0.35 } : undefined}>
      <defs>
        <radialGradient id={`g${id}`} cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor={e.barriga} />
          <stop offset="45%" stopColor={e.cor} />
          <stop offset="100%" stopColor={e.sombra} />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="182" rx={58 * s} ry="8" fill={INK} opacity="0.08" />
      <g transform={`translate(100 176) scale(${s}) translate(-100 -176)`}>
        <Detalhe tipo={e.detalhe} nivel={n} cor={e.cor} sombra={e.sombra} barriga={e.barriga} atras />
        {/* pezinhos e bracinhos */}
        <ellipse cx="72" cy="170" rx="17" ry="9" fill={e.sombra} />
        <ellipse cx="128" cy="170" rx="17" ry="9" fill={e.sombra} />
        <ellipse cx="40" cy="128" rx="9" ry="15" fill={e.sombra} transform="rotate(25 40 128)" />
        <ellipse cx="160" cy="128" rx="9" ry="15" fill={e.sombra} transform="rotate(-25 160 128)" />
        <path d={corpo} fill={`url(#g${id})`} stroke={e.sombra} strokeWidth="2.5" />
        <ellipse cx="100" cy="142" rx="38" ry="26" fill={e.barriga} opacity="0.9" />
        <ellipse cx="70" cy="84" rx="13" ry="7" fill="#fff" opacity="0.45" transform="rotate(-32 70 84)" />
        <Detalhe tipo={e.detalhe} nivel={n} cor={e.cor} sombra={e.sombra} barriga={e.barriga} />
        <Rosto humor={humor} />
        {n >= 4 && <Brilho x={44} y={70} r={7} />}
        {n >= 5 && <Coroa lado={e.detalhe !== 'orelhas'} />}
      </g>
    </svg>
  );
}

function Rosto({ humor }: { humor: Props['humor'] }) {
  if (humor === 'dormindo') {
    return (
      <g stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M74 110 Q81 116 88 110" />
        <path d="M112 110 Q119 116 126 110" />
        <path d="M95 130 Q100 133 105 130" />
      </g>
    );
  }
  return (
    <g>
      <ellipse cx="81" cy="108" rx="8.5" ry={humor === 'triste' ? 8 : 10.5} fill={INK} />
      <ellipse cx="119" cy="108" rx="8.5" ry={humor === 'triste' ? 8 : 10.5} fill={INK} />
      <circle cx="78" cy="104" r="3.2" fill="#fff" />
      <circle cx="116" cy="104" r="3.2" fill="#fff" />
      <ellipse cx="64" cy="126" rx="9" ry="5" fill="#FF8FA3" opacity="0.55" />
      <ellipse cx="136" cy="126" rx="9" ry="5" fill="#FF8FA3" opacity="0.55" />
      {humor === 'triste'
        ? <path d="M91 132 Q100 125 109 132" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
        : <path d="M88 124 Q100 138 112 124 Q100 130 88 124 Z" fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />}
    </g>
  );
}

function Detalhe({ tipo, nivel, cor, sombra, barriga, atras }: { tipo: string; nivel: number; cor: string; sombra: string; barriga: string; atras?: boolean }) {
  switch (tipo) {
    case 'folha':
      if (!atras) return null;
      return (
        <g>
          <path d="M100 60 C99 48 100 40 102 32" stroke="#4FA865" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M102 34 C112 18 132 20 136 26 C128 38 112 40 102 34 Z" fill="#8EDC7E" stroke="#4FA865" strokeWidth="2.5" />
          {nivel >= 2 && <path d="M100 42 C88 28 70 30 66 36 C74 47 90 48 100 42 Z" fill="#A6E890" stroke="#4FA865" strokeWidth="2.5" />}
          {nivel >= 4 && <circle cx="102" cy="28" r="6" fill="#FF8FA3" stroke="#E86B83" strokeWidth="2" />}
        </g>
      );
    case 'orelhas':
      if (!atras) return null;
      return (
        <g stroke={sombra} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M58 82 C52 58 58 44 64 40 C74 48 84 58 86 66 Z" fill={cor} />
          <path d="M142 82 C148 58 142 44 136 40 C126 48 116 58 114 66 Z" fill={cor} />
          <path d="M64 70 C62 60 64 54 66 52 C71 56 75 60 76 64 Z" fill={barriga} stroke="none" />
          <path d="M136 70 C138 60 136 54 134 52 C129 56 125 60 124 64 Z" fill={barriga} stroke="none" />
        </g>
      );
    case 'estrela':
      if (!atras) return null;
      return (
        <g>
          <path d="M100 58 C100 48 98 40 100 32" stroke={sombra} strokeWidth="4" strokeLinecap="round" fill="none" />
          <Estrela x={100} y={26} r={nivel >= 3 ? 14 : 11} />
        </g>
      );
    case 'chifres':
      if (!atras) return null;
      return (
        <g fill="#FFE7A8" stroke="#E0B65A" strokeWidth="2.5" strokeLinejoin="round">
          <path d="M74 66 C70 54 72 44 76 38 C82 46 86 56 86 62 Z" />
          <path d="M126 66 C130 54 128 44 124 38 C118 46 114 56 114 62 Z" />
          {nivel >= 3 && <path d="M100 58 C98 50 99 44 100 40 C102 44 103 50 102 58 Z" />}
        </g>
      );
    case 'gota':
      if (atras) return null;
      return <ellipse cx="88" cy="62" rx="4" ry="8" fill="#fff" opacity="0.6" transform="rotate(30 88 62)" />;
  }
  return null;
}

function Estrela({ x, y, r }: { x: number; y: number; r: number }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.48 : r;
    return `${x + rr * Math.cos(a)},${y + rr * Math.sin(a)}`;
  }).join(' ');
  return <polygon points={pts} fill="#FFC53D" stroke="#E0A92A" strokeWidth="2.5" strokeLinejoin="round" />;
}

const Brilho = ({ x, y, r }: { x: number; y: number; r: number }) => (
  <path d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`} fill="#FFC53D" />
);

/** No alto da cabeça só onde nada ocupa o topo (orelhas); nas outras espécies, inclinada no lado direito. */
const Coroa = ({ lado }: { lado: boolean }) => (
  <path d="M80 52 L84 34 L94 46 L100 30 L106 46 L116 34 L120 52 Z" fill="#FFC53D" stroke="#E0A92A" strokeWidth="2.5" strokeLinejoin="round"
    transform={lado ? 'translate(140 60) rotate(26) scale(.62) translate(-100 -42)' : 'translate(100 46) scale(.7) translate(-100 -42)'} />
);
