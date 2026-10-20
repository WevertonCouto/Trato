import { useEffect, useRef, useState } from 'react';
import { api, type Aparelho, type PetInfo, type Tarefa, type TarefaDoDia } from '../api.ts';
import { Barra, Festa, Icone, Logo, Modal, Moeda, PinPad, Topo, avisar, useAoVoltar, useCarregar } from '../ui.tsx';
import { Pet } from '../pet.tsx';
import { PetVivo, clima, proximaMissao, type Acao } from '../petvivo.tsx';
import { ligarSom, somLigado, tocar } from '../sons.ts';
import { DIAS_CURTOS, ESPECIES, ESTAGIOS, MOEDAS_CUIDADO, NIVEL_MAX, SITUACOES, descreverRecorrencia, especie } from '../../../src/shared/regras.ts';

type Aba = 'inicio' | 'missoes' | 'pet' | 'premios' | 'mais' | 'progresso';
type Eu = {
  crianca: { id: string; nome: string; cor: string; moedas: number; xp: number }; pet: PetInfo; hoje: TarefaDoDia[];
  ultimoPremio: { id: string; titulo: string; icone: string } | null;
};

const ABAS: { id: Aba; nome: string; icone: string }[] = [
  { id: 'inicio', nome: 'Início', icone: 'casa' },
  { id: 'missoes', nome: 'Missões', icone: 'missoes' },
  { id: 'pet', nome: 'Pet', icone: 'pata' },
  { id: 'premios', nome: 'Prêmios', icone: 'presente' },
  { id: 'mais', nome: 'Mais', icone: 'menu' },
];

export function AppCrianca({ aparelho, mudou }: { aparelho: Aparelho; mudou: () => void }) {
  const [aba, setAba] = useState<Aba>('inicio');
  const eu = useCarregar(() => api<Eu>('/eu'));
  const [festa, setFesta] = useState('');
  const [acao, setAcao] = useState<Acao>(null);

  const ir = (a: Aba) => setAba(a);
  // rola depois de a aba nova desenhar (antes, a página ainda tinha a altura da anterior)
  useEffect(() => { window.scrollTo(0, 0); }, [aba]);
  // com dois aparelhos, o responsável aprova de longe: atualiza ao voltar para o app e de tempos em tempos
  useAoVoltar(eu.recarregar, 30_000);
  useNovidades(eu.dados, (txt) => { setFesta(txt); setAcao({ tipo: 'festa', id: Date.now() }); });

  if (!eu.dados) return <div className="centro">{eu.erro ? <p className="erro">{eu.erro}</p> : <div className="carregando" />}</div>;
  const { crianca, pet, hoje } = eu.dados;

  const comemorar = (txt: string) => { tocar('missao'); setFesta(txt); setAcao({ tipo: 'festa', id: Date.now() }); eu.recarregar(); };
  let tela;
  switch (aba) {
    case 'inicio': {
      const c = clima(pet, hoje);
      const prox = proximaMissao(hoje);
      const resto = hoje.filter((t) => t.id !== prox?.id).sort((a, b) => Number(FEITAS.has(a.situacao)) - Number(FEITAS.has(b.situacao)));
      tela = (
        <div className="pagina inicio">
          <div className="inicio-topo">
          <header className="ola">
            <h1>Oi, {crianca.nome}!</h1>
            <ChipMoedas valor={crianca.moedas} />
          </header>
          <div className="palco" style={{ ['--tom' as any]: especie(pet.especie).barriga }}>
            <div className="palco-topo">
              <span className="selo"><Icone nome="estrela" tamanho={14} /> Nível {pet.nivel}</span>
              <button className="palco-nome" onClick={() => ir('pet')}>{pet.nome} <Icone nome="seta" tamanho={16} /></button>
            </div>
            <PetVivo especie={pet.especie} nivel={pet.nivel} humor={c.humor} fala={c.fala} acao={acao} tamanho={200} />
            <Barra pct={pet.pct} />
          </div>
          {prox ? <Agora key={prox.id} t={prox} mudou={eu.recarregar} comemorar={comemorar} />
            : hoje.length ? <div className="cartao tudo-feito"><span>🎉</span><strong>Tudo feito hoje!</strong></div> : null}
          <ProgressoDia hoje={hoje} />
          </div>
          {resto.length > 0 && <h2 className="secao">Outras missões</h2>}
          <ListaMissoes tarefas={resto} mudou={eu.recarregar} comemorar={comemorar} vazio="" />
        </div>
      );
      break;
    }
    case 'missoes':
      tela = <Missoes mudou={eu.recarregar} comemorar={comemorar} />;
      break;
    case 'pet':
      tela = <TelaPet pet={pet} hoje={hoje} mudou={eu.recarregar} />;
      break;
    case 'premios':
      tela = <Premios mudou={eu.recarregar} />;
      break;
    case 'progresso':
      tela = <Progresso voltar={() => ir('mais')} />;
      break;
    case 'mais':
      tela = <Mais nome={crianca.nome} doCelular={aparelho === 'crianca'} mudou={mudou} progresso={() => ir('progresso')} />;
      break;
  }

  return (
    <>
      <main className="com-menu">{tela}</main>
      <nav className="menu">
        {ABAS.map((a) => (
          <button key={a.id} className={aba === a.id || (a.id === 'mais' && aba === 'progresso') ? 'ativo' : ''} onClick={() => ir(a.id)}>
            <Icone nome={a.icone} tamanho={26} /><span>{a.nome}</span>
          </button>
        ))}
      </nav>
      {festa && <Festa texto={festa} fim={() => setFesta('')}>{<Pet especie={pet.especie} nivel={pet.nivel} humor="rindo" tamanho={140} className="pulando" />}</Festa>}
    </>
  );
}

const falta = (p: PetInfo) => (p.nivel === NIVEL_MAX ? `Faltam ${p.faltam} pts para completar o ${p.nome}` : `Faltam ${p.faltam} pts para o próximo nível`);

const ChipMoedas = ({ valor }: { valor: number }) => <span className="chip-moedas" aria-label={`${valor} moedinhas`}><Moeda tamanho={24} /> {valor}</span>;

/** Uma bolinha por missão do dia: a criança vê de longe quanto falta. */
function ProgressoDia({ hoje }: { hoje: TarefaDoDia[] }) {
  if (!hoje.length) return null;
  const feitas = hoje.filter((t) => FEITAS.has(t.situacao)).length;
  return (
    <div className="cartao dia" aria-label={`${feitas} de ${hoje.length} missões feitas`}>
      <div className="dia-topo"><strong>Hoje</strong><span className="dia-conta">{feitas}<small>/{hoje.length}</small></span></div>
      <div className="dia-bolinhas">
        {hoje.map((t) => (
          <span key={t.id} className={`bolinha-missao bm-${t.situacao}`} title={t.titulo}>
            {t.icone}{t.situacao === 'concluida' && <i>✓</i>}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- missões ----------

/** Concluir uma missão: direto, pedindo OK ou com foto (abre a câmera). */
function useConcluir(t: TarefaDoDia, mudou: () => void, comemorar: (t: string) => void) {
  const foto = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const podeFazer = ['disponivel', 'agora', 'atrasada', 'refazer'].includes(t.situacao);
  const enviar = async (arquivo?: File) => {
    setOcupado(true);
    try {
      let form: FormData | undefined;
      if (arquivo) { form = new FormData(); form.append('foto', arquivo); }
      const r = await api<{ aprovada: boolean; pontos: number }>(`/eu/tarefas/${t.id}/concluir`, form ? { form } : { method: 'POST' });
      if (r.aprovada) comemorar(`+${r.pontos} pontos!`);
      else { tocar('enviado'); avisar('Enviado! Agora é esperar o OK.'); mudou(); }
    } catch (e: any) { tocar('erro'); avisar(e.message, 'erro'); } finally { setOcupado(false); }
  };
  const fazer = () => {
    if (!podeFazer || ocupado) return;
    if (t.modo === 'foto') foto.current?.click();
    else enviar();
  };
  const input = <input ref={foto} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) enviar(f); }} />;
  return { fazer, ocupado, podeFazer, input };
}

/** A missão da vez, grande, com um botão só. */
function Agora({ t, mudou, comemorar }: { t: TarefaDoDia; mudou: () => void; comemorar: (t: string) => void }) {
  const { fazer, ocupado, input } = useConcluir(t, mudou, comemorar);
  const rotulo = t.situacao === 'atrasada' ? 'Atrasada!' : t.situacao === 'refazer' ? 'Refazer' : 'Agora';
  return (
    <div className={`cartao agora agora-${t.situacao}`}>
      <span className="agora-rotulo">{rotulo}</span>
      <div className="agora-meio">
        <span className="agora-icone">{t.icone}</span>
        <div>
          <strong className="agora-titulo">{t.titulo}</strong>
          <span className="agora-pontos">+{t.pontos} <Icone nome="estrela" tamanho={16} />{t.hora ? ` · ${t.hora}` : ''}</span>
        </div>
      </div>
      <button className="btn btn-gigante" onClick={fazer} disabled={ocupado}>
        {t.modo === 'foto' ? <><Icone nome="camera" tamanho={26} /> Tirar foto</> : <><Icone nome="check" tamanho={26} /> {t.modo === 'aprovacao' ? 'Fiz! Pedir OK' : 'Fiz!'}</>}
      </button>
      {input}
    </div>
  );
}

function ListaMissoes({ tarefas, mudou, comemorar, vazio, soVer }: { tarefas: TarefaDoDia[]; mudou: () => void; comemorar: (t: string) => void; vazio: string; soVer?: boolean }) {
  if (!tarefas.length) return vazio ? <div className="vazio"><p>{vazio}</p></div> : null;
  return <div className="lista">{tarefas.map((t) => <ItemMissao key={t.id + t.data} t={t} mudou={mudou} comemorar={comemorar} soVer={soVer} />)}</div>;
}

const FEITAS = new Set(['concluida', 'aguardando']);

function ItemMissao({ t, mudou, comemorar, soVer }: { t: TarefaDoDia; mudou: () => void; comemorar: (t: string) => void; soVer?: boolean }) {
  const { fazer, ocupado, podeFazer, input } = useConcluir(t, mudou, comemorar);
  const ativo = !soVer && podeFazer;
  const meta = [t.hora, `+${t.pontos} pts`, t.situacao !== 'disponivel' ? SITUACOES[t.situacao] : null].filter(Boolean).join(' · ');
  return (
    <div className={`cartao missao missao-${t.situacao}`}>
      <span className="missao-icone">{t.icone}</span>
      <div className="missao-texto">
        <strong>{t.titulo}</strong>
        <small>{meta}</small>
      </div>
      {!soVer && (
        <button className={`marcar ${FEITAS.has(t.situacao) ? 'marcada' : ''}`} onClick={fazer} disabled={!ativo || ocupado}
          aria-label={ativo ? `Concluir ${t.titulo}` : SITUACOES[t.situacao]}>
          {t.situacao === 'concluida' ? <Icone nome="check" tamanho={26} /> : t.situacao === 'aguardando' ? <Icone nome="relogio" tamanho={22} /> : t.modo === 'foto' ? <Icone nome="camera" tamanho={22} /> : null}
        </button>
      )}
      {input}
    </div>
  );
}

function Missoes({ mudou, comemorar }: { mudou: () => void; comemorar: (t: string) => void }) {
  const [aba, setAba] = useState<'hoje' | 'semana' | 'todas'>('hoje');
  const d = useCarregar(() => api<{ hoje?: TarefaDoDia[]; semana?: { data: string; tarefas: TarefaDoDia[] }[]; todas?: Tarefa[] }>(`/eu/tarefas?aba=${aba}`), [aba]);
  const atualizar = () => { d.recarregar(); mudou(); };
  const hoje = d.dados?.hoje;
  const feitas = hoje?.filter((t) => t.situacao === 'concluida').length ?? 0;

  return (
    <div className="pagina">
      <Topo titulo="Minhas missões" />
      <div className="abas" role="tablist">
        {(['hoje', 'semana', 'todas'] as const).map((a) => (
          <button key={a} role="tab" aria-selected={aba === a} className={aba === a ? 'ativa' : ''} onClick={() => setAba(a)}>
            {a === 'hoje' ? 'Hoje' : a === 'semana' ? 'Semana' : 'Todas'}
          </button>
        ))}
      </div>
      {d.erro && <p className="erro">{d.erro}</p>}
      {hoje && (
        <>
          <div className="cartao resumo-dia">
            <strong>{feitas} de {hoje.length} missões feitas</strong>
            <Barra pct={hoje.length ? (feitas / hoje.length) * 100 : 0} />
          </div>
          <ListaMissoes tarefas={hoje} mudou={atualizar} comemorar={(t) => { comemorar(t); d.recarregar(); }} vazio="Nenhuma missão para hoje." />
          {hoje.length > 0 && feitas < hoje.length && (
            <div className="cartao cartao-roxo incentivo"><span>Faça as missões e ganhe pontos para o seu pet!</span></div>
          )}
        </>
      )}
      {d.dados?.semana?.map((dia) => (
        <section key={dia.data} className="dia-semana">
          <h2 className="secao">{rotuloDia(dia.data)}</h2>
          <ListaMissoes tarefas={dia.tarefas} mudou={atualizar} comemorar={comemorar} vazio="Sem missões." soVer />
        </section>
      ))}
      {d.dados?.todas && (
        d.dados.todas.length
          ? <div className="lista">{d.dados.todas.map((t) => (
              <div key={t.id} className="cartao missao">
                <span className="missao-icone">{t.icone}</span>
                <div className="missao-texto"><strong>{t.titulo}</strong><small>{descreverRecorrencia(t)}{t.hora ? ` · ${t.hora}` : ''} · +{t.pontos} pts</small></div>
              </div>
            ))}</div>
          : <div className="vazio"><p>O responsável ainda não criou missões.</p></div>
      )}
    </div>
  );
}

function rotuloDia(data: string) {
  const d = new Date(`${data}T12:00:00`);
  const hoje = new Date();
  const mesmo = d.toDateString() === hoje.toDateString();
  return `${mesmo ? 'Hoje' : DIAS_CURTOS[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`;
}

// ---------- pet ----------

function TelaPet({ pet, hoje, mudou }: { pet: PetInfo; hoje: TarefaDoDia[]; mudou: () => void }) {
  const colecao = useCarregar(() => api<{ especie: string; pet_nome: string; concluido_em: number }[]>('/eu/colecao'));
  const [novo, setNovo] = useState(false);
  const [acao, setAcao] = useState<Acao>(null);
  const cuidar = async (tipo: 'alimentar' | 'banho') => {
    try {
      await api(`/eu/pet/${tipo}`, { method: 'POST' });
      setAcao({ tipo: tipo === 'alimentar' ? 'comer' : 'banho', id: Date.now() });
      avisar(`+${MOEDAS_CUIDADO} moedinhas!`);
      // espera a animação antes de recarregar (o botão vira "já comeu")
      setTimeout(() => tocar('moedas'), 950);
      setTimeout(mudou, 1700);
    } catch (e: any) { tocar('erro'); avisar(e.message, 'erro'); }
  };
  const c = clima(pet, hoje, 'pet');
  return (
    <div className="pagina">
      <div className="pet-topo">
      <div className="palco palco-grande" style={{ ['--tom' as any]: especie(pet.especie).barriga }}>
        <div className="palco-topo">
          <span className="selo"><Icone nome="estrela" tamanho={14} /> Nível {pet.nivel}</span>
          <span className="selo selo-claro">{pet.estagio}</span>
        </div>
        <PetVivo especie={pet.especie} nivel={pet.nivel} humor={c.humor} fala={c.fala} acao={acao} tamanho={220} />
        <h2>{pet.nome}</h2>
        <div className="linha-barra"><Barra pct={pet.pct} /><strong>{pet.pct}%</strong></div>
        <p className="suave">{pet.completo ? 'Cresceu todo! Ele pode ir para a coleção.' : falta(pet)}</p>
      </div>
      {pet.completo && (
        <button className="cartao cartao-roxo atalho" onClick={() => setNovo(true)}>
          <span className="atalho-icone"><Icone nome="troca" /></span>
          <span><strong>Guardar na coleção</strong><small>E escolher um novo pet para criar</small></span>
          <Icone nome="seta" />
        </button>
      )}
      <div className="duas">
        <button className="cartao cuidado" onClick={() => cuidar('alimentar')} disabled={pet.alimentado}>
          <span className="cuidado-emoji">🍎</span>
          <strong>Comida</strong>
          <small>{pet.alimentado ? 'Já comeu ✓' : <>+{MOEDAS_CUIDADO} <Moeda tamanho={16} /></>}</small>
        </button>
        <button className="cartao cuidado" onClick={() => cuidar('banho')} disabled={pet.banho}>
          <span className="cuidado-emoji">🛁</span>
          <strong>Banho</strong>
          <small>{pet.banho ? 'Tá limpinho ✓' : <>+{MOEDAS_CUIDADO} <Moeda tamanho={16} /></>}</small>
        </button>
      </div>
      </div>
      <h2 className="secao">Evolução</h2>
      <div className="evolucao">
        {ESTAGIOS.map((nome, i) => (
          <div key={nome} className={`evo ${i + 1 === pet.nivel ? 'atual' : ''}`}>
            <span><Pet especie={pet.especie} nivel={i + 1} tamanho={52} bloqueado={i + 1 > pet.nivel} /></span>
            <small>{i + 1}</small>
          </div>
        ))}
      </div>
      <h2 className="secao secao-linha">Minha coleção <small>{colecao.dados?.length ?? 0} criados</small></h2>
      {colecao.dados?.length
        ? <div className="colecao">{colecao.dados.map((c) => (
            <div key={c.concluido_em} className="cartao item-colecao"><Pet especie={c.especie} nivel={NIVEL_MAX} tamanho={64} /><small>{c.pet_nome}</small></div>
          ))}</div>
        : <div className="vazio"><p>Quando o {pet.nome} crescer todo, ele vem morar aqui.</p></div>}
      <NovoPet aberto={novo} fechar={() => setNovo(false)} pronto={() => { setNovo(false); colecao.recarregar(); mudou(); }} />
    </div>
  );
}

function NovoPet({ aberto, fechar, pronto }: { aberto: boolean; fechar: () => void; pronto: () => void }) {
  const [esp, setEsp] = useState(ESPECIES[1].id);
  const [nome, setNome] = useState('');
  const enviar = async () => {
    try { await api('/eu/pet/novo', { body: { especie: esp, nome } }); tocar('nivel'); avisar('Bem-vindo, novo amigo!'); pronto(); } catch (e: any) { tocar('erro'); avisar(e.message, 'erro'); }
  };
  return (
    <Modal aberto={aberto} fechar={fechar} titulo="Escolha o novo pet">
      <div className="especies">
        {ESPECIES.map((e) => (
          <button key={e.id} className={`especie ${esp === e.id ? 'escolhida' : ''}`} aria-label={e.nome} aria-pressed={esp === e.id} onClick={() => setEsp(e.id)}>
            <Pet especie={e.id} tamanho={64} /><small>{e.nome}</small>
          </button>
        ))}
      </div>
      <label>Nome do pet<input value={nome} maxLength={20} onChange={(e) => setNome(e.target.value)} /></label>
      <button className="btn btn-grande" onClick={enviar} disabled={!nome.trim()}>Começar a cuidar</button>
    </Modal>
  );
}

// ---------- prêmios ----------

type Premio = { id: string; titulo: string; icone: string; custo: number };
type Pedido = Premio & { situacao: 'pendente' | 'aprovado' | 'recusado'; pedido_em: number };

function Premios({ mudou }: { mudou: () => void }) {
  const d = useCarregar(() => api<{ moedas: number; recompensas: Premio[]; pedidos: Pedido[] }>('/eu/recompensas'));
  const [confirmar, setConfirmar] = useState<Premio | null>(null);
  const pedir = async (r: Premio) => {
    try { await api(`/eu/recompensas/${r.id}/pedir`, { method: 'POST' }); tocar('pedido'); avisar('Pedido enviado para o responsável!'); setConfirmar(null); d.recarregar(); mudou(); } catch (e: any) { tocar('erro'); avisar(e.message, 'erro'); }
  };
  const moedas = d.dados?.moedas ?? 0;
  return (
    <div className="pagina">
      <Topo titulo="Prêmios" />
      {d.erro && <p className="erro">{d.erro}</p>}
      {d.dados && <Cofrinho moedas={moedas} premios={d.dados.recompensas} />}
      {d.dados && !d.dados.recompensas.length && <div className="vazio"><p>Ainda não há prêmios. Peça para o responsável cadastrar!</p></div>}
      <div className="lista">
        {d.dados?.recompensas.map((r) => {
          const falta = r.custo - moedas;
          return (
            <div key={r.id} className="cartao premio">
              <span className="missao-icone">{r.icone}</span>
              <div className="missao-texto"><strong>{r.titulo}</strong><small className="custo"><Moeda tamanho={15} /> {r.custo}</small></div>
              <button className="btn btn-pequeno" disabled={falta > 0} onClick={() => setConfirmar(r)}>{falta > 0 ? `Faltam ${falta}` : 'Pedir'}</button>
            </div>
          );
        })}
      </div>
      {!!d.dados?.pedidos.length && (
        <>
          <h2 className="secao">Meus pedidos</h2>
          <div className="lista">
            {d.dados.pedidos.map((p) => (
              <div key={p.id} className="cartao pedido">
                <span className="missao-icone">{p.icone}</span>
                <div className="missao-texto"><strong>{p.titulo}</strong><small>{new Date(p.pedido_em).toLocaleDateString('pt-BR')}</small></div>
                <span className={`etiqueta etiqueta-${p.situacao}`}>{p.situacao === 'pendente' ? 'Esperando' : p.situacao === 'aprovado' ? 'Ganhou!' : 'Não dessa vez'}</span>
              </div>
            ))}
          </div>
        </>
      )}
      <Modal aberto={!!confirmar} fechar={() => setConfirmar(null)} titulo="Pedir prêmio">
        {confirmar && (
          <div className="confirmar">
            <span className="confirmar-icone">{confirmar.icone}</span>
            <p>Trocar <strong><Moeda tamanho={15} /> {confirmar.custo}</strong> por <strong>{confirmar.titulo}</strong>?</p>
            <p className="suave">Se o responsável não aprovar, as moedinhas voltam.</p>
            <button className="btn btn-grande" onClick={() => pedir(confirmar)}>Pedir</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ---------- progresso e mais ----------

type Prog = {
  xp: number; feitas: number; sequencia: { atual: number; melhor: number };
  semana: { data: string; feitas: number; pontos: number }[];
  conquistas: { id: string; titulo: string; texto: string; icone: string; ganhou: boolean }[];
};

function Progresso({ voltar }: { voltar: () => void }) {
  const { dados: p, erro } = useCarregar(() => api<Prog>('/eu/progresso'));
  const max = Math.max(1, ...(p?.semana.map((s) => s.feitas) ?? [1]));
  return (
    <div className="pagina">
      <Topo titulo="Meu progresso" voltar={voltar} />
      {erro && <p className="erro">{erro}</p>}
      {p && (
        <>
          <div className="numeros">
            <div className="cartao numero"><Icone nome="chama" /><strong>{p.sequencia.atual}</strong><small>dias seguidos</small></div>
            <div className="cartao numero"><Icone nome="check" /><strong>{p.feitas}</strong><small>missões feitas</small></div>
            <div className="cartao numero"><Icone nome="estrela" /><strong>{p.xp}</strong><small>pontos no total</small></div>
          </div>
          <div className="cartao">
            <h2 className="secao-cartao">Últimos 7 dias</h2>
            <div className="grafico-semana">
              {p.semana.map((s) => (
                <div key={s.data} className="coluna">
                  <span className="coluna-valor">{s.feitas || ''}</span>
                  <div className="coluna-barra" style={{ height: `${(s.feitas / max) * 100}%` }} />
                  <small>{DIAS_CURTOS[new Date(`${s.data}T12:00:00`).getDay()]}</small>
                </div>
              ))}
            </div>
            <p className="suave">Melhor sequência: {p.sequencia.melhor} {p.sequencia.melhor === 1 ? 'dia' : 'dias'}</p>
          </div>
          <h2 className="secao secao-linha">Conquistas <small>{p.conquistas.filter((c) => c.ganhou).length} de {p.conquistas.length}</small></h2>
          <div className="conquistas">
            {p.conquistas.map((c) => (
              <div key={c.id} className={`cartao conquista ${c.ganhou ? 'ganhou' : ''}`}>
                <span>{c.icone}</span><strong>{c.titulo}</strong><small>{c.texto}</small>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Mais({ nome, doCelular, mudou, progresso }: { nome: string; doCelular: boolean; mudou: () => void; progresso: () => void }) {
  const [pin, setPin] = useState(false);
  const [erro, setErro] = useState<string>();
  const [som, setSom] = useState(somLigado);
  if (pin) {
    return (
      <div className="pagina centro">
        <span className="cadeado-grande"><Icone nome="cadeado" tamanho={40} /></span>
        <PinPad titulo="Área do responsável" texto="Digite o PIN do responsável" erro={erro} cancelar={() => setPin(false)}
          concluir={async (c) => { try { await api('/conta/adulto', { body: { pin: c } }); mudou(); } catch (e: any) { setErro(e.message); } }} />
      </div>
    );
  }
  return (
    <div className="pagina">
      <Topo titulo="Mais" />
      {doCelular && <p className="aviso-celular"><Icone nome="celular" /> Este é o celular de {nome}</p>}
      <div className="mais-grade">
        <button className="cartao bloco bloco-roxo" onClick={progresso}><Icone nome="grafico" tamanho={40} /><strong>Meu progresso</strong></button>
        <button className="cartao bloco" aria-pressed={som} onClick={() => { ligarSom(!som); setSom(!som); if (!som) tocar('enviado'); }}>
          <Icone nome="som" tamanho={40} /><strong>Sons</strong><small>{som ? 'Ligados' : 'Desligados'}</small>
        </button>
        {!doCelular && (
          <button className="cartao bloco" onClick={async () => { await api('/conta/perfil/sair', { method: 'POST' }); mudou(); }}>
            <Icone nome="pessoas" tamanho={40} /><strong>Trocar de perfil</strong>
          </button>
        )}
        <button className="cartao bloco" onClick={() => setPin(true)}><Icone nome="cadeado" tamanho={40} /><strong>Responsável</strong><small>Precisa do PIN</small></button>
      </div>
      <div className="rodape"><Logo /><small>Pequenos tratos, grandes conquistas.</small></div>
    </div>
  );
}

/** Saldo grande e quanto falta para o prêmio mais barato que ainda não dá para pedir. */
function Cofrinho({ moedas, premios }: { moedas: number; premios: { titulo: string; icone: string; custo: number }[] }) {
  const proximo = premios.filter((p) => p.custo > moedas).sort((a, b) => a.custo - b.custo)[0];
  return (
    <div className="cartao cofrinho" aria-label={`${moedas} moedinhas`}>
      <span className="cofrinho-valor"><Moeda tamanho={52} /> {moedas}</span>
      <small>moedinhas</small>
      {proximo
        ? <><Barra pct={(moedas / proximo.custo) * 100} cor="var(--sol)" /><small>Faltam {proximo.custo - moedas} para {proximo.icone} {proximo.titulo}</small></>
        : premios.length ? <small>Dá para pedir qualquer prêmio!</small> : null}
    </div>
  );
}

/**
 * O que mudou desde a última atualização e merece festa: o pet subiu de nível, uma missão foi aprovada
 * (o responsável pode estar em outro celular) ou chegou uma recompensa aprovada.
 */
function useNovidades(dados: Eu | null, festejar: (txt: string) => void) {
  const antes = useRef<{ especie: string; nivel: number; situacoes: Map<string, string> } | null>(null);
  useEffect(() => {
    if (!dados) return;
    const { pet, hoje, ultimoPremio, crianca } = dados;
    const a = antes.current;
    if (a) {
      const aprovadas = hoje.filter((t) => t.situacao === 'concluida' && a.situacoes.get(t.id) === 'aguardando');
      if (pet.especie === a.especie && pet.nivel > a.nivel) { tocar('nivel'); festejar(`Nível ${pet.nivel}!`); }
      else if (aprovadas.length) { tocar('missao'); festejar(`+${aprovadas.reduce((n, t) => n + t.pontos, 0)} pontos!`); }
    }
    antes.current = { especie: pet.especie, nivel: pet.nivel, situacoes: new Map(hoje.map((t) => [t.id, t.situacao])) };
    // recompensa: guarda a última vista no aparelho, para não festejar de novo ao reabrir o app
    if (ultimoPremio) {
      const chave = `trato.premio.${crianca.id}`;
      let visto: string | null = null;
      try { visto = localStorage.getItem(chave); localStorage.setItem(chave, ultimoPremio.id); } catch { /* sem armazenamento */ }
      if (visto && visto !== ultimoPremio.id) { tocar('premio'); festejar(`Ganhou: ${ultimoPremio.icone} ${ultimoPremio.titulo}!`); }
    }
  }, [dados]); // eslint-disable-line react-hooks/exhaustive-deps
}
