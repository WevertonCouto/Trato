/**
 * Landing: a página é HTML estático (rápido e indexável); aqui só entram as "ilhas" interativas:
 * o celular de demonstração no topo, a seção do pet e o botão de som (desligado por padrão).
 */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Pet } from './pet.tsx';
import { PetVivo, type Acao } from './petvivo.tsx';
import { Barra, Icone, Moeda } from './ui.tsx';
import { prepararSons, silenciar, tocar } from './sons.ts';
import { ESPECIES, ESTAGIOS } from '../../src/shared/regras.ts';
import './styles.css';
import './landing.css';

silenciar(true);
prepararSons();

const MISSOES = [
  { icone: '🪥', titulo: 'Escovar os dentes', pontos: 10 },
  { icone: '🛏️', titulo: 'Arrumar a cama', pontos: 10 },
  { icone: '🎒', titulo: 'Preparar a mochila', pontos: 15 },
  { icone: '📖', titulo: 'Ler um livrinho', pontos: 15 },
];

/** O celular do topo: uma versão de brinquedo da tela inicial do app. */
function CelularDemo() {
  const [feitas, setFeitas] = useState(1);
  const [moedas, setMoedas] = useState(30);
  const [acao, setAcao] = useState<Acao>(null);
  const prox = MISSOES[feitas % MISSOES.length];
  const fiz = () => {
    tocar('missao');
    setAcao({ tipo: 'festa', id: Date.now() });
    setMoedas((m) => m + prox.pontos);
    setFeitas((f) => f + 1);
  };
  const falta = MISSOES.length - (feitas % MISSOES.length);
  return (
    <div className="demo">
      <header className="ola"><h1>Oi, Lia!</h1><span className="chip-moedas"><Moeda tamanho={20} /> {moedas}</span></header>
      <div className="palco" style={{ ['--tom' as any]: '#C9F2D0' }}>
        <div className="palco-topo"><span className="selo"><Icone nome="estrela" tamanho={12} /> Nível 2</span><span className="palco-nome">Brotinho</span></div>
        <PetVivo especie="broto" nivel={2} humor="feliz" fala={`Bora ${prox.titulo.toLowerCase()}? ${falta === 1 ? 'Só falta 1!' : `Faltam ${falta}!`}`} acao={acao} tamanho={150} />
        <Barra pct={35 + ((feitas * 13) % 60)} />
      </div>
      <div className="cartao agora">
        <span className="agora-rotulo">Agora</span>
        <div className="agora-meio">
          <span className="agora-icone">{prox.icone}</span>
          <div><strong className="agora-titulo">{prox.titulo}</strong><span className="agora-pontos">+{prox.pontos} <Icone nome="estrela" tamanho={14} /></span></div>
        </div>
        <button className="btn btn-gigante" onClick={fiz}><Icone nome="check" tamanho={22} /> Fiz!</button>
      </div>
    </div>
  );
}

/** Seção do pet: escolher a espécie, ver a evolução e cuidar. */
function SecaoPet() {
  const [esp, setEsp] = useState('bolota');
  const [nivel, setNivel] = useState(3);
  const [acao, setAcao] = useState<Acao>(null);
  const e = ESPECIES.find((x) => x.id === esp)!;
  const cuidar = (tipo: 'comer' | 'banho') => setAcao({ tipo, id: Date.now() });
  return (
    <div className="pet-demo">
      <div className="pet-demo-palco palco palco-grande" style={{ ['--tom' as any]: e.barriga }}>
        <div className="palco-topo"><span className="selo">Nível {nivel}</span><span className="selo selo-claro">{ESTAGIOS[nivel - 1]}</span></div>
        <PetVivo especie={esp} nivel={nivel} humor="feliz" fala={`Oi! Eu sou ${e.nome === 'Bolota' ? 'a' : 'o'} ${e.nome}. Toca em mim!`} acao={acao} tamanho={220} />
        <div className="pet-demo-acoes">
          <button className="cartao cuidado" onClick={() => cuidar('comer')}><span className="cuidado-emoji">🍎</span><strong>Comida</strong></button>
          <button className="cartao cuidado" onClick={() => cuidar('banho')}><span className="cuidado-emoji">🛁</span><strong>Banho</strong></button>
        </div>
      </div>
      <div className="pet-demo-lado">
        <h3>Escolha o pet</h3>
        <div className="especies">
          {ESPECIES.map((x) => (
            <button key={x.id} className={`especie ${esp === x.id ? 'escolhida' : ''}`} aria-pressed={esp === x.id} aria-label={x.nome}
              onClick={() => { setEsp(x.id); tocar('boing'); }}>
              <Pet especie={x.id} tamanho={60} /><small>{x.nome}</small>
            </button>
          ))}
        </div>
        <h3>Ele cresce com a rotina</h3>
        <div className="evolucao">
          {ESTAGIOS.map((nome, i) => (
            <button key={nome} className={`evo ${i + 1 === nivel ? 'atual' : ''}`} aria-label={`Nível ${i + 1}: ${nome}`} aria-pressed={i + 1 === nivel}
              onClick={() => { setNivel(i + 1); if (i + 1 > nivel) tocar('nivel'); }}>
              <span><Pet especie={esp} nivel={i + 1} tamanho={52} /></span><small>{i + 1}</small>
            </button>
          ))}
        </div>
        <p className="pet-demo-texto">Cada missão feita dá pontos. Quando o pet chega ao nível 5, ele vai para a <strong>coleção</strong> e a criança escolhe o próximo.</p>
      </div>
    </div>
  );
}

const celular = document.getElementById('ilha-celular');
if (celular) createRoot(celular).render(<CelularDemo />);
const pet = document.getElementById('ilha-pet');
if (pet) createRoot(pet).render(<SecaoPet />);

// som: desligado até a pessoa pedir
const botao = document.getElementById('botao-som') as HTMLButtonElement | null;
botao?.addEventListener('click', () => {
  const ligar = botao.getAttribute('aria-pressed') !== 'true';
  silenciar(!ligar);
  botao.setAttribute('aria-pressed', String(ligar));
  botao.textContent = ligar ? '🔊 Som' : '🔇 Som';
  if (ligar) tocar('enviado');
});
