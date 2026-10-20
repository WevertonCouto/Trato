import { useEffect, useState, type FormEvent } from 'react';
import { api, urlAutenticada, type Conta, type Tarefa } from '../api.ts';
import { Icone, Logo, Modal, Moeda, Topo, avisar, useAoVoltar, useCarregar } from '../ui.tsx';
import { Pet } from '../pet.tsx';
import { CORES_PERFIL, DIAS_CURTOS, ESPECIES, MODOS, descreverRecorrencia, type Modo } from '../../../src/shared/regras.ts';
import { ICONES_RECOMPENSA, ICONES_TAREFA, MODELOS_RECOMPENSA, MODELOS_TAREFA } from '../modelos.ts';
import { comprar, comprasDisponiveis, pacotes, restaurar, type Pacote } from '../compras.ts';
import { API_BASE, LINK_LOJA } from '../plataforma.ts';

type Crianca = { id: string; nome: string; cor: string; especie: string; pet_nome: string; tem_pin: boolean; moedas: number; xp: number; sequencia: number; hoje: { total: number; feitas: number } };
type Tela = 'painel' | 'missoes' | 'recompensas' | 'perfis' | 'aprovacoes' | 'conta' | 'celulares' | 'plano';
type Aprovacoes = {
  entregas: { id: string; data: string; foto: string | null; pontos: number; titulo: string; icone: string; modo: Modo; crianca: string; cor: string }[];
  pedidos: { id: string; titulo: string; icone: string; custo: number; crianca: string; cor: string }[];
};

export function AreaResponsavel({ conta, mudou }: { conta: Extract<Conta, { logado: true }>; mudou: () => void }) {
  const [tela, setTela] = useState<Tela>('painel');
  const criancas = useCarregar(() => api<Crianca[]>('/adulto/criancas'));
  const aprov = useCarregar(() => api<Aprovacoes>('/adulto/aprovacoes'));
  const [sel, setSel] = useState<string>(() => { try { return localStorage.getItem('trato.sel') ?? ''; } catch { return ''; } });
  const lista = criancas.dados ?? [];
  const atual = lista.find((k) => k.id === sel) ?? lista[0];
  useEffect(() => { if (atual) try { localStorage.setItem('trato.sel', atual.id); } catch { /* só conveniência */ } }, [atual]);

  // a criança pode estar em outro celular: fotos, pedidos e saldo chegam sem precisar recarregar
  useAoVoltar(() => { criancas.recarregar(); aprov.recarregar(); }, 15_000);

  const ir = (t: Tela) => { setTela(t); window.scrollTo(0, 0); if (t === 'painel') { criancas.recarregar(); aprov.recarregar(); } };
  const pendentes = (aprov.dados?.entregas.length ?? 0) + (aprov.dados?.pedidos.length ?? 0);
  const sair = async () => { await api('/conta/adulto/sair', { method: 'POST' }); mudou(); };

  if (criancas.dados && !lista.length && tela !== 'conta') {
    return <PrimeiroPerfil nome={conta.familia.nome} pronto={criancas.recarregar} conta={() => ir('conta')} />;
  }

  if (tela === 'missoes' && atual) return <Missoes crianca={atual} voltar={() => ir('painel')} />;
  if (tela === 'recompensas') return <Recompensas criancas={lista} voltar={() => ir('painel')} />;
  if (tela === 'perfis') return <Perfis criancas={lista} mudou={criancas.recarregar} entrou={mudou} voltar={() => ir('painel')} />;
  if (tela === 'aprovacoes') return <TelaAprovacoes dados={aprov.dados} mudou={aprov.recarregar} voltar={() => ir('painel')} />;
  if (tela === 'conta') return <TelaConta conta={conta} mudou={mudou} voltar={() => ir('painel')} />;
  if (tela === 'plano') return <TelaPlano voltar={() => ir('painel')} conta={() => ir('conta')} />;
  if (tela === 'celulares') return <Celulares conta={conta} criancas={lista} mudou={mudou} voltar={() => ir('painel')} />;

  return (
    <div className="pagina painel">
      <header className="painel-topo">
        <Logo />
        <p className="suave">Área do responsável</p>
      </header>
      <div className="cartao conectado"><small>Conectado como</small><strong>{conta.familia.email}</strong></div>
      {!conta.familia.uso && <PerguntaUso criancas={lista} mudou={mudou} />}
      <FaixaPlano abrir={() => ir('plano')} />

      <div className="seletor" role="tablist" aria-label="Criança">
        {lista.map((k) => (
          <button key={k.id} role="tab" aria-selected={k.id === atual?.id} className={k.id === atual?.id ? 'ativa' : ''} style={{ ['--cor' as any]: k.cor }} onClick={() => setSel(k.id)}>
            <Pet especie={k.especie} tamanho={26} /> {k.nome}
          </button>
        ))}
      </div>

      {atual && (
        <div className="cartao resumo-crianca" style={{ ['--cor' as any]: atual.cor }}>
          <div><small>Hoje</small><strong>{atual.hoje.feitas}/{atual.hoje.total}</strong><small>missões</small></div>
          <div><small>Seguidos</small><strong>{atual.sequencia}</strong><small>{atual.sequencia === 1 ? 'dia' : 'dias'}</small></div>
          <div><small>Saldo</small><strong><Moeda tamanho={18} /> {atual.moedas}</strong><small>moedinhas</small></div>
        </div>
      )}

      <div className="lista">
        <button className="cartao opcao" onClick={() => ir('aprovacoes')}>
          <Icone nome="escudo" /><span><strong>Aprovações {pendentes > 0 && <em className="bolinha">{pendentes}</em>}</strong><small>Fotos e pedidos esperando você</small></span><Icone nome="seta" />
        </button>
        <button className="cartao opcao" onClick={() => ir('missoes')}>
          <Icone nome="missoes" /><span><strong>Missões de {atual?.nome}</strong><small>Criar, programar e pausar</small></span><Icone nome="seta" />
        </button>
        <button className="cartao opcao" onClick={() => ir('recompensas')}>
          <Icone nome="presente" /><span><strong>Recompensas</strong><small>O que as moedinhas compram</small></span><Icone nome="seta" />
        </button>
        <button className="cartao opcao" onClick={() => ir('perfis')}>
          <Icone nome="pessoas" /><span><strong>Perfis das crianças</strong><small>Adicionar, editar, PIN ou entrar no perfil</small></span><Icone nome="seta" />
        </button>
        <button className="cartao opcao" onClick={() => ir('celulares')}>
          <Icone nome="celular" /><span><strong>Celulares</strong><small>{conta.aparelho === 'responsavel' ? 'Este é o seu celular' : 'Um para todos ou cada um com o seu'}</small></span><Icone nome="seta" />
        </button>
        <button className="cartao opcao" onClick={() => ir('plano')}>
          <Icone nome="coroa" /><span><strong>Plano da família</strong><small>Assinatura, restaurar compras</small></span><Icone nome="seta" />
        </button>
        <button className="cartao opcao" onClick={() => ir('conta')}>
          <Icone nome="cadeado" /><span><strong>Conta</strong><small>PIN, senha e dados</small></span><Icone nome="seta" />
        </button>
      </div>
      <div className="botoes">
        {atual && <button className="btn btn-grande" onClick={async () => { await api('/conta/perfil', { body: { id: atual.id } }); mudou(); }}>Entrar no perfil de {atual.nome}</button>}
        <button className="btn btn-claro btn-grande" onClick={sair}><Icone nome="sair" /> Sair da área do responsável</button>
      </div>
    </div>
  );
}

// ---------- primeiro perfil ----------

function PrimeiroPerfil({ nome, pronto, conta }: { nome: string; pronto: () => void; conta: () => void }) {
  return (
    <div className="pagina">
      <header className="painel-topo"><Logo /></header>
      <div className="cartao cartao-roxo boas-vindas-pais">
        <h1>Olá, {nome.split(' ')[0]}!</h1>
        <p>Vamos criar o perfil da criança. Ela vai escolher um pet para cuidar enquanto faz as missões.</p>
      </div>
      <FormPerfil salvo={pronto} />
      <button className="btn-link" onClick={conta}>Configurações da conta</button>
    </div>
  );
}

function FormPerfil({ crianca, salvo }: { crianca?: Crianca; salvo: () => void }) {
  const [f, setF] = useState({ nome: crianca?.nome ?? '', cor: crianca?.cor ?? CORES_PERFIL[0], especie: crianca?.especie ?? ESPECIES[0].id, pet_nome: crianca?.pet_nome ?? '', pin: '' });
  const [mudarPin, setMudarPin] = useState(!crianca);
  const [erro, setErro] = useState('');
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = { nome: f.nome, cor: f.cor, pet_nome: f.pet_nome };
    if (!crianca) body.especie = f.especie;
    if (mudarPin) body.pin = f.pin || null;
    try {
      await api(crianca ? `/adulto/criancas/${crianca.id}` : '/adulto/criancas', { method: crianca ? 'PATCH' : 'POST', body });
      avisar(crianca ? 'Perfil atualizado.' : 'Perfil criado!');
      salvo();
    } catch (err: any) { setErro(err.message); }
  };
  return (
    <form className="formulario" onSubmit={enviar}>
      <label>Nome da criança<input value={f.nome} maxLength={30} onChange={(e) => setF({ ...f, nome: e.target.value })} required /></label>
      <fieldset>
        <legend>Cor do perfil</legend>
        <div className="cores">{CORES_PERFIL.map((c, i) => <button type="button" key={c} aria-pressed={f.cor === c} className={f.cor === c ? 'escolhida' : ''} style={{ background: c }} onClick={() => setF({ ...f, cor: c })} aria-label={`Cor ${i + 1}`} />)}</div>
      </fieldset>
      {!crianca && (
        <fieldset>
          <legend>Pet</legend>
          <div className="especies">
            {ESPECIES.map((e) => (
              <button type="button" key={e.id} className={`especie ${f.especie === e.id ? 'escolhida' : ''}`} aria-label={e.nome} aria-pressed={f.especie === e.id} onClick={() => setF({ ...f, especie: e.id })}>
                <Pet especie={e.id} tamanho={60} /><small>{e.nome}</small>
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <label>Nome do pet<input value={f.pet_nome} maxLength={20} placeholder={ESPECIES.find((e) => e.id === f.especie)?.nome} onChange={(e) => setF({ ...f, pet_nome: e.target.value })} required /></label>
      {crianca && !mudarPin
        ? <button type="button" className="btn btn-claro" onClick={() => setMudarPin(true)}><Icone nome="cadeado" /> {crianca.tem_pin ? 'Mudar ou tirar o PIN' : 'Colocar um PIN'}</button>
        : <label>PIN da criança (opcional)<input inputMode="numeric" pattern="\d{4}" maxLength={4} value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, '') })} />
            <small>4 números. Deixe vazio para a criança entrar só tocando no perfil.</small></label>}
      {erro && <p className="erro" role="alert">{erro}</p>}
      <button className="btn btn-grande">{crianca ? 'Salvar' : 'Criar perfil'}</button>
    </form>
  );
}

function Perfis({ criancas, mudou, entrou, voltar }: { criancas: Crianca[]; mudou: () => void; entrou: () => void; voltar: () => void }) {
  const [editar, setEditar] = useState<Crianca | 'novo' | null>(null);
  const excluir = async (k: Crianca) => {
    if (!confirm(`Excluir o perfil de ${k.nome}? As missões, o pet e o histórico dele somem.`)) return;
    try { await api(`/adulto/criancas/${k.id}`, { method: 'DELETE' }); setEditar(null); mudou(); } catch (e: any) { avisar(e.message, 'erro'); }
  };
  return (
    <div className="pagina">
      <Topo titulo="Perfis das crianças" voltar={voltar} />
      <div className="lista">
        {criancas.map((k) => (
          <div key={k.id} className="cartao perfil-linha" style={{ ['--cor' as any]: k.cor }}>
            <span className="perfil-pet pequeno"><Pet especie={k.especie} tamanho={48} /></span>
            <div className="missao-texto"><strong>{k.nome}</strong><small>Pet: {k.pet_nome}{k.tem_pin ? ' · com PIN' : ''}</small></div>
            <button className="icone-btn" onClick={() => setEditar(k)} aria-label={`Editar ${k.nome}`}><Icone nome="lapis" /></button>
            <button className="btn btn-pequeno" onClick={async () => { await api('/conta/perfil', { body: { id: k.id } }); entrou(); }}>Entrar</button>
          </div>
        ))}
      </div>
      {criancas.length < 6 && <button className="btn btn-claro btn-grande" onClick={() => setEditar('novo')}><Icone nome="mais" /> Adicionar criança</button>}
      <Modal aberto={!!editar} fechar={() => setEditar(null)} titulo={editar === 'novo' ? 'Nova criança' : 'Editar perfil'}>
        {editar && <FormPerfil key={editar === 'novo' ? 'novo' : editar.id} crianca={editar === 'novo' ? undefined : editar} salvo={() => { setEditar(null); mudou(); }} />}
        {editar && editar !== 'novo' && <button className="btn-link perigo" onClick={() => excluir(editar)}>Excluir perfil</button>}
      </Modal>
    </div>
  );
}

// ---------- missões ----------

const VAZIA = { titulo: '', icone: '⭐', pontos: 10, modo: 'direto' as Modo, repeticao: 'semanal' as 'semanal' | 'mensal', dias: '0123456', dia_mes: 1, hora: '' };

function Missoes({ crianca, voltar }: { crianca: Crianca; voltar: () => void }) {
  const d = useCarregar(() => api<Tarefa[]>(`/adulto/tarefas?crianca=${crianca.id}`), [crianca.id]);
  const [editar, setEditar] = useState<Partial<Tarefa> | null>(null);
  const alternar = async (t: Tarefa) => { await api(`/adulto/tarefas/${t.id}`, { method: 'PATCH', body: { ativa: !t.ativa } }).catch((e) => avisar(e.message, 'erro')); d.recarregar(); };
  return (
    <div className="pagina">
      <Topo titulo={`Missões de ${crianca.nome}`} voltar={voltar} />
      <button className="btn btn-grande" onClick={() => setEditar({})}><Icone nome="mais" /> Nova missão</button>
      {d.dados && !d.dados.length && <div className="vazio"><p>Nenhuma missão ainda. Comece por uma sugestão pronta!</p></div>}
      <div className="lista">
        {d.dados?.map((t) => (
          <div key={t.id} className={`cartao missao ${t.ativa ? '' : 'pausada'}`}>
            <span className="missao-icone">{t.icone}</span>
            <button className="missao-texto texto-btn" onClick={() => setEditar(t)}>
              <strong>{t.titulo}</strong>
              <small>{descreverRecorrencia(t)}{t.hora ? ` · ${t.hora}` : ''} · +{t.pontos} pts · {MODOS[t.modo]}</small>
            </button>
            <label className="interruptor" title={t.ativa ? 'Pausar' : 'Ativar'}>
              <input type="checkbox" checked={t.ativa} onChange={() => alternar(t)} aria-label={t.ativa ? `Pausar ${t.titulo}` : `Ativar ${t.titulo}`} /><span />
            </label>
          </div>
        ))}
      </div>
      <Modal aberto={!!editar} fechar={() => setEditar(null)} titulo={editar?.id ? 'Editar missão' : 'Nova missão'}>
        {editar && <FormMissao key={editar.id ?? 'nova'} crianca={crianca} tarefa={editar} salvo={() => { setEditar(null); d.recarregar(); }} />}
      </Modal>
    </div>
  );
}

function FormMissao({ crianca, tarefa, salvo }: { crianca: Crianca; tarefa: Partial<Tarefa>; salvo: () => void }) {
  const [f, setF] = useState({ ...VAZIA, ...tarefa, hora: tarefa.hora ?? '', dia_mes: tarefa.dia_mes ?? 1 });
  const [erro, setErro] = useState('');
  const [icones, setIcones] = useState(false);
  const novo = !tarefa.id;
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });
  const dia = (d: number) => set({ dias: f.dias.includes(String(d)) ? f.dias.replace(String(d), '') : f.dias + d });

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api(novo ? '/adulto/tarefas' : `/adulto/tarefas/${tarefa.id}`, { method: novo ? 'POST' : 'PATCH', body: { ...f, crianca_id: crianca.id, hora: f.hora || null } });
      avisar(novo ? 'Missão criada!' : 'Missão salva.');
      salvo();
    } catch (err: any) { setErro(err.message); }
  };
  const excluir = async () => {
    if (!confirm('Excluir esta missão? Os pontos que a criança já ganhou continuam.')) return;
    await api(`/adulto/tarefas/${tarefa.id}`, { method: 'DELETE' });
    salvo();
  };

  return (
    <form className="formulario" onSubmit={enviar}>
      {novo && (
        <div className="sugestoes">
          <small className="suave">Sugestões prontas</small>
          <div className="chips">
            {MODELOS_TAREFA.map((m) => (
              <button type="button" key={m.titulo} className="chip" onClick={() => set({ ...m, hora: m.hora ?? '' })}>{m.icone} {m.titulo}</button>
            ))}
          </div>
        </div>
      )}
      <div className="titulo-icone">
        <button type="button" className="icone-escolha" onClick={() => setIcones(!icones)} aria-label="Escolher ícone">{f.icone}</button>
        <label>Missão<input value={f.titulo} maxLength={80} onChange={(e) => set({ titulo: e.target.value })} placeholder="Ex.: Arrumar a cama" required /></label>
      </div>
      {icones && <div className="grade-icones">{ICONES_TAREFA.map((i) => <button type="button" key={i} onClick={() => { set({ icone: i }); setIcones(false); }}>{i}</button>)}</div>}

      <fieldset>
        <legend>Pontos</legend>
        <div className="chips">{[5, 10, 15, 20, 30, 50].map((p) => <button type="button" key={p} className={`chip ${f.pontos === p ? 'escolhido' : ''}`} onClick={() => set({ pontos: p })}>+{p}</button>)}</div>
      </fieldset>

      <fieldset>
        <legend>Como a missão é concluída</legend>
        <div className="modos">
          {(Object.keys(MODOS) as Modo[]).map((m) => (
            <button type="button" key={m} className={`modo ${f.modo === m ? 'escolhido' : ''}`} onClick={() => set({ modo: m })}>
              <Icone nome={m === 'direto' ? 'check' : m === 'aprovacao' ? 'escudo' : 'camera'} />
              <strong>{m === 'direto' ? 'Direto' : m === 'aprovacao' ? 'Aprovação' : 'Foto'}</strong>
              <small>{m === 'direto' ? 'A criança marca e ganha na hora' : m === 'aprovacao' ? 'Você confirma antes dos pontos' : 'A criança manda uma foto'}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Quando</legend>
        <div className="abas pequenas">
          <button type="button" className={f.repeticao === 'semanal' ? 'ativa' : ''} onClick={() => set({ repeticao: 'semanal' })}>Na semana</button>
          <button type="button" className={f.repeticao === 'mensal' ? 'ativa' : ''} onClick={() => set({ repeticao: 'mensal' })}>Uma vez por mês</button>
        </div>
        {f.repeticao === 'semanal'
          ? <div className="dias">{DIAS_CURTOS.map((n, i) => <button type="button" key={n} className={f.dias.includes(String(i)) ? 'escolhido' : ''} onClick={() => dia(i)}>{n}</button>)}</div>
          : <label>Dia do mês<input type="number" min={1} max={31} value={f.dia_mes} onChange={(e) => set({ dia_mes: Number(e.target.value) })} /></label>}
      </fieldset>
      <label>Horário (opcional)<input type="time" value={f.hora} onChange={(e) => set({ hora: e.target.value })} /><small>Depois de uma hora do horário, a missão aparece como atrasada.</small></label>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <button className="btn btn-grande">{novo ? 'Criar missão' : 'Salvar'}</button>
      {!novo && <button type="button" className="btn-link perigo" onClick={excluir}>Excluir missão</button>}
    </form>
  );
}

// ---------- recompensas ----------

type Recompensa = { id: string; crianca_id: string | null; titulo: string; icone: string; custo: number };

function Recompensas({ criancas, voltar }: { criancas: Crianca[]; voltar: () => void }) {
  const d = useCarregar(() => api<Recompensa[]>('/adulto/recompensas'));
  const [editar, setEditar] = useState<Partial<Recompensa> | null>(null);
  const nome = (id: string | null) => (id ? criancas.find((k) => k.id === id)?.nome : null) ?? 'Todas as crianças';
  return (
    <div className="pagina">
      <Topo titulo="Recompensas" voltar={voltar} />
      <button className="btn btn-grande" onClick={() => setEditar({})}><Icone nome="mais" /> Nova recompensa</button>
      {d.dados && !d.dados.length && <div className="vazio"><p>Combine com a criança o que as moedinhas compram.</p></div>}
      <div className="lista">
        {d.dados?.map((r) => (
          <button key={r.id} className="cartao premio texto-btn" onClick={() => setEditar(r)}>
            <span className="missao-icone">{r.icone}</span>
            <div className="missao-texto"><strong>{r.titulo}</strong><small>{nome(r.crianca_id)}</small></div>
            <span className="custo"><Moeda tamanho={16} /> {r.custo}</span>
          </button>
        ))}
      </div>
      <Modal aberto={!!editar} fechar={() => setEditar(null)} titulo={editar?.id ? 'Editar recompensa' : 'Nova recompensa'}>
        {editar && <FormRecompensa key={editar.id ?? 'nova'} r={editar} criancas={criancas} salvo={() => { setEditar(null); d.recarregar(); }} />}
      </Modal>
    </div>
  );
}

function FormRecompensa({ r, criancas, salvo }: { r: Partial<Recompensa>; criancas: Crianca[]; salvo: () => void }) {
  const [f, setF] = useState({ titulo: r.titulo ?? '', icone: r.icone ?? '🎁', custo: r.custo ?? 100, crianca_id: r.crianca_id ?? '' });
  const [erro, setErro] = useState('');
  const novo = !r.id;
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api(novo ? '/adulto/recompensas' : `/adulto/recompensas/${r.id}`, { method: novo ? 'POST' : 'PATCH', body: { ...f, crianca_id: f.crianca_id || null } });
      avisar(novo ? 'Recompensa criada!' : 'Recompensa salva.');
      salvo();
    } catch (err: any) { setErro(err.message); }
  };
  const excluir = async () => {
    if (!confirm('Excluir esta recompensa?')) return;
    await api(`/adulto/recompensas/${r.id}`, { method: 'DELETE' });
    salvo();
  };
  return (
    <form className="formulario" onSubmit={enviar}>
      {novo && (
        <div className="sugestoes">
          <small className="suave">Sugestões</small>
          <div className="chips">{MODELOS_RECOMPENSA.map((m) => <button type="button" key={m.titulo} className="chip" onClick={() => setF({ ...f, ...m })}>{m.icone} {m.titulo}</button>)}</div>
        </div>
      )}
      <label>Recompensa<input value={f.titulo} maxLength={60} onChange={(e) => setF({ ...f, titulo: e.target.value })} required /></label>
      <div className="grade-icones">{ICONES_RECOMPENSA.map((i) => <button type="button" key={i} className={f.icone === i ? 'escolhido' : ''} onClick={() => setF({ ...f, icone: i })}>{i}</button>)}</div>
      <label>Custo em moedinhas<input type="number" min={1} value={f.custo} onChange={(e) => setF({ ...f, custo: Number(e.target.value) })} required /></label>
      <label>Para quem
        <select value={f.crianca_id} onChange={(e) => setF({ ...f, crianca_id: e.target.value })}>
          <option value="">Todas as crianças</option>
          {criancas.map((k) => <option key={k.id} value={k.id}>{k.nome}</option>)}
        </select>
      </label>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <button className="btn btn-grande">{novo ? 'Criar recompensa' : 'Salvar'}</button>
      {!novo && <button type="button" className="btn-link perigo" onClick={excluir}>Excluir recompensa</button>}
    </form>
  );
}

// ---------- aprovações ----------

function TelaAprovacoes({ dados, mudou, voltar }: { dados: Aprovacoes | null; mudou: () => void; voltar: () => void }) {
  const [foto, setFoto] = useState<string | null>(null);
  const decidir = async (tipo: 'entregas' | 'pedidos', id: string, aprovar: boolean) => {
    try { await api(`/adulto/aprovacoes/${tipo}/${id}`, { body: { aprovar } }); avisar(aprovar ? 'Aprovado!' : tipo === 'entregas' ? 'Pedimos para refazer.' : 'Pedido recusado. As moedinhas voltaram.'); mudou(); } catch (e: any) { avisar(e.message, 'erro'); }
  };
  const vazio = dados && !dados.entregas.length && !dados.pedidos.length;
  return (
    <div className="pagina">
      <Topo titulo="Aprovações" voltar={voltar} />
      {vazio && <div className="vazio"><p>Tudo em dia! Nada esperando por você.</p></div>}
      {!!dados?.entregas.length && <h2 className="secao">Missões</h2>}
      <div className="lista">
        {dados?.entregas.map((e) => (
          <div key={e.id} className="cartao aprovacao">
            <div className="aprovacao-topo">
              <span className="missao-icone">{e.icone}</span>
              <div className="missao-texto"><strong>{e.titulo}</strong><small><b style={{ color: e.cor }}>{e.crianca}</b> · +{e.pontos} pts · {new Date(`${e.data}T12:00:00`).toLocaleDateString('pt-BR')}</small></div>
            </div>
            {e.foto && <button className="foto-prova" onClick={() => setFoto(e.foto)}><Foto arquivo={e.foto} alt={`Foto de ${e.titulo}`} /></button>}
            <div className="duas">
              <button className="btn btn-claro" onClick={() => decidir('entregas', e.id, false)}>Pedir para refazer</button>
              <button className="btn" onClick={() => decidir('entregas', e.id, true)}><Icone nome="check" /> Aprovar</button>
            </div>
          </div>
        ))}
      </div>
      {!!dados?.pedidos.length && <h2 className="secao">Pedidos de recompensa</h2>}
      <div className="lista">
        {dados?.pedidos.map((p) => (
          <div key={p.id} className="cartao aprovacao">
            <div className="aprovacao-topo">
              <span className="missao-icone">{p.icone}</span>
              <div className="missao-texto"><strong>{p.titulo}</strong><small><b style={{ color: p.cor }}>{p.crianca}</b> · <Moeda tamanho={13} /> {p.custo}</small></div>
            </div>
            <div className="duas">
              <button className="btn btn-claro" onClick={() => decidir('pedidos', p.id, false)}>Recusar</button>
              <button className="btn" onClick={() => decidir('pedidos', p.id, true)}><Icone nome="presente" /> Combinado!</button>
            </div>
          </div>
        ))}
      </div>
      <Modal aberto={!!foto} fechar={() => setFoto(null)} titulo="Foto da missão">
        {foto && <Foto arquivo={foto} alt="Foto enviada pela criança" className="foto-grande" />}
      </Modal>
    </div>
  );
}

// ---------- conta ----------

function TelaConta({ conta, mudou, voltar }: { conta: Extract<Conta, { logado: true }>; mudou: () => void; voltar: () => void }) {
  const [pin, setPin] = useState('');
  const [senha, setSenha] = useState({ atual: '', nova: '' });
  const [excluir, setExcluir] = useState(false);
  const [senhaExcluir, setSenhaExcluir] = useState('');
  const salvar = async (body: object, ok: string) => {
    try { await api('/adulto/conta', { method: 'PATCH', body }); avisar(ok); return true; } catch (e: any) { avisar(e.message, 'erro'); return false; }
  };
  return (
    <div className="pagina">
      <Topo titulo="Conta" voltar={voltar} />
      <div className="cartao conectado"><small>{conta.familia.nome}</small><strong>{conta.familia.email}</strong></div>
      <form className="cartao formulario" onSubmit={async (e) => { e.preventDefault(); if (await salvar({ pin }, 'PIN trocado.')) setPin(''); }}>
        <h2 className="secao-cartao">Trocar o PIN do responsável</h2>
        <label>Novo PIN<input inputMode="numeric" pattern="\d{4}" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} required /></label>
        <button className="btn">Salvar PIN</button>
      </form>
      <form className="cartao formulario" onSubmit={async (e) => { e.preventDefault(); if (await salvar({ senha_atual: senha.atual, nova_senha: senha.nova }, 'Senha trocada.')) setSenha({ atual: '', nova: '' }); }}>
        <h2 className="secao-cartao">Trocar a senha</h2>
        <label>Senha atual<input type="password" autoComplete="current-password" value={senha.atual} onChange={(e) => setSenha({ ...senha, atual: e.target.value })} required /></label>
        <label>Senha nova<input type="password" autoComplete="new-password" minLength={8} value={senha.nova} onChange={(e) => setSenha({ ...senha, nova: e.target.value })} required /></label>
        <button className="btn">Salvar senha</button>
      </form>
      <div className="botoes">
        <button className="btn btn-claro btn-grande" onClick={async () => { await api('/conta/sair', { method: 'POST' }); mudou(); }}><Icone nome="sair" /> Sair da conta neste aparelho</button>
        <button className="btn-link perigo" onClick={() => setExcluir(true)}>Excluir conta e dados</button>
      </div>
      <Modal aberto={excluir} fechar={() => setExcluir(false)} titulo="Excluir conta">
        <form className="formulario" onSubmit={async (e) => {
          e.preventDefault();
          try { await api('/adulto/conta', { method: 'DELETE', body: { senha: senhaExcluir } }); mudou(); } catch (err: any) { avisar(err.message, 'erro'); }
        }}>
          <p>Isso apaga a conta, os perfis, as missões, o histórico e as fotos. Não dá para desfazer.</p>
          <label>Digite sua senha para confirmar<input type="password" value={senhaExcluir} onChange={(e) => setSenhaExcluir(e.target.value)} required /></label>
          <button className="btn btn-perigo btn-grande">Excluir tudo</button>
        </form>
      </Modal>
    </div>
  );
}

// ---------- celulares (um para todos ou cada um com o seu) ----------

/** Pergunta do primeiro uso: nada é obrigatório, "um celular para todos" continua como sempre. */
function PerguntaUso({ criancas, mudou }: { criancas: Crianca[]; mudou: () => void }) {
  const [conectar, setConectar] = useState<Crianca | null>(null);
  const responder = async (uso: 'um' | 'cada') => {
    try {
      if (uso === 'cada') {
        await api('/conta/aparelho', { body: { modo: 'responsavel' } });
        if (criancas[0]) return setConectar(criancas[0]);
      }
      await api('/adulto/conta', { method: 'PATCH', body: { uso } });
      mudou();
    } catch (e: any) { avisar(e.message, 'erro'); }
  };
  return (
    <div className="cartao pergunta-uso">
      <h2>Como vocês vão usar o Trato?</h2>
      <div className="duas">
        <button className="opcao-uso" onClick={() => responder('um')}>
          <span className="opcao-uso-icone"><Icone nome="celular" tamanho={34} /></span>
          <strong>Um celular para todos</strong>
          <small>Você e a criança no mesmo aparelho</small>
        </button>
        <button className="opcao-uso" onClick={() => responder('cada')}>
          <span className="opcao-uso-icone"><Icone nome="celular" tamanho={30} /><Icone nome="celular" tamanho={30} /></span>
          <strong>Cada um com o seu</strong>
          <small>A criança no dela, você aprova do seu</small>
        </button>
      </div>
      <Modal aberto={!!conectar} titulo={`Conectar o celular de ${conectar?.nome ?? ''}`}
        fechar={async () => { setConectar(null); await api('/adulto/conta', { method: 'PATCH', body: { uso: 'cada' } }).catch(() => {}); mudou(); }}>
        {conectar && <CodigoConexao crianca={conectar} />}
      </Modal>
    </div>
  );
}

function Celulares({ conta, criancas, mudou, voltar }: { conta: Extract<Conta, { logado: true }>; criancas: Crianca[]; mudou: () => void; voltar: () => void }) {
  const [conectar, setConectar] = useState<Crianca | null>(null);
  const modo = async (body: object, pergunta?: string) => {
    if (pergunta && !confirm(pergunta)) return;
    try { await api('/conta/aparelho', { body }); mudou(); avisar('Pronto!'); } catch (e: any) { avisar(e.message, 'erro'); }
  };
  const atual = conta.aparelho;
  return (
    <div className="pagina">
      <Topo titulo="Celulares" voltar={voltar} />
      <h2 className="secao">Este celular é…</h2>
      <div className="lista">
        <button className={`cartao opcao modo-aparelho ${atual === 'compartilhado' ? 'escolhido' : ''}`} onClick={() => modo({ modo: 'compartilhado' })}>
          <Icone nome="pessoas" /><span><strong>De todos</strong><small>Abre em "Quem vai usar?"</small></span>{atual === 'compartilhado' && <Icone nome="check" />}
        </button>
        <button className={`cartao opcao modo-aparelho ${atual === 'responsavel' ? 'escolhido' : ''}`} onClick={() => modo({ modo: 'responsavel' })}>
          <Icone nome="cadeado" /><span><strong>Meu</strong><small>Abre direto na sua área, com o seu PIN</small></span>{atual === 'responsavel' && <Icone nome="check" />}
        </button>
        {criancas.map((k) => (
          <button key={k.id} className="cartao opcao modo-aparelho" style={{ ['--cor' as any]: k.cor }}
            onClick={() => modo({ modo: 'crianca', crianca_id: k.id }, `Este celular vai ficar no perfil de ${k.nome}. Para sair, só com o seu PIN. Continuar?`)}>
            <Pet especie={k.especie} tamanho={30} /><span><strong>De {k.nome}</strong><small>Fica no perfil. Só sai com o seu PIN</small></span><Icone nome="seta" />
          </button>
        ))}
      </div>
      <h2 className="secao">Conectar outro celular</h2>
      <p className="suave">A criança entra no celular dela sem saber a sua senha: é só um código que vale por 10 minutos.</p>
      <div className="lista">
        {criancas.map((k) => (
          <button key={k.id} className="cartao opcao" onClick={() => setConectar(k)}>
            <Icone nome="qr" /><span><strong>Conectar o celular de {k.nome}</strong><small>Gerar um código de 6 números</small></span><Icone nome="seta" />
          </button>
        ))}
      </div>
      <p className="suave centro-texto">Fotos, pedidos e moedinhas aparecem aqui sozinhos, mesmo vindos de outro celular.</p>
      <Modal aberto={!!conectar} fechar={() => setConectar(null)} titulo={`Conectar o celular de ${conectar?.nome ?? ''}`}>
        {conectar && <CodigoConexao crianca={conectar} />}
      </Modal>
    </div>
  );
}

function CodigoConexao({ crianca }: { crianca: Crianca }) {
  const [c, setC] = useState<{ codigo: string; expira_em: number } | null>(null);
  const [erro, setErro] = useState('');
  const [agora, setAgora] = useState(Date.now());
  const gerar = async () => {
    try { setC(await api('/conta/codigo/novo', { body: { crianca_id: crianca.id } })); setErro(''); } catch (e: any) { setErro(e.message); }
  };
  useEffect(() => { gerar(); }, [crianca.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 1000); return () => clearInterval(t); }, []);
  const resta = c ? Math.max(0, Math.round((c.expira_em - agora) / 1000)) : 0;
  return (
    <div className="codigo-conexao">
      <ol className="passos">
        <li>No celular de {crianca.nome}, abra o Trato.</li>
        <li>Toque em <strong>Entrar com código</strong>.</li>
        <li>Digite:</li>
      </ol>
      {erro && <p className="erro">{erro}</p>}
      {c && (resta > 0
        ? <>
            <div className="codigo-grande" aria-label={`Código ${c.codigo.split('').join(' ')}`}>{c.codigo.slice(0, 3)}<span /> {c.codigo.slice(3)}</div>
            <p className="suave centro-texto">Vale por mais {Math.floor(resta / 60)}:{String(resta % 60).padStart(2, '0')}</p>
          </>
        : <p className="suave centro-texto">O código venceu.</p>)}
      <button className="btn btn-claro" onClick={gerar}>Gerar outro código</button>
    </div>
  );
}

/** Foto de comprovação (só o responsável vê; no app nativo vem com o token da sessão). */
function Foto({ arquivo, alt, className }: { arquivo: string; alt: string; className?: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let url = '';
    urlAutenticada(`/adulto/fotos/${arquivo}`).then((u) => { url = u; setSrc(u); });
    return () => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); };
  }, [arquivo]);
  return src ? <img className={className} src={src} alt={alt} loading="lazy" /> : <div className="foto-carregando" />;
}

// ---------- plano da família (assinatura) ----------

type InfoPlano = {
  familia_id: string;
  plano: { ativo: boolean; situacao: 'ativa' | 'teste' | 'cancelada' | 'problema_pagamento' | 'expirada' | null; produto: string | null; expira_em: number | null };
  gratis: { criancas: number; missoes: number };
  familia: { criancas: number; missoes: number };
  uso: { criancas: number; missoes: number };
};

const data = (ms: number) => new Date(ms).toLocaleDateString('pt-BR');

function statusPlano(p: InfoPlano['plano']) {
  if (!p.ativo) return { titulo: 'Plano grátis', texto: '' };
  const ate = p.expira_em ? data(p.expira_em) : null;
  switch (p.situacao) {
    case 'teste': return { titulo: 'Teste grátis', texto: ate ? `Até ${ate}. Depois, a assinatura começa sozinha.` : '' };
    case 'cancelada': return { titulo: 'Plano Família', texto: ate ? `Cancelado: vale até ${ate}.` : 'Cancelado.' };
    case 'problema_pagamento': return { titulo: 'Plano Família', texto: 'A loja não conseguiu cobrar. Confira a forma de pagamento na Google Play.' };
    default: return { titulo: 'Plano Família', texto: ate ? `Renova em ${ate}.` : 'Ativo.' };
  }
}

/** Faixa no painel: só aparece no plano grátis. */
function FaixaPlano({ abrir }: { abrir: () => void }) {
  const { dados } = useCarregar(() => api<InfoPlano>('/adulto/assinatura'));
  if (!dados || dados.plano.ativo) return null;
  return (
    <button className="cartao faixa-plano" onClick={abrir}>
      <Icone nome="coroa" />
      <span><strong>Plano grátis</strong><small>{dados.gratis.criancas} criança e {dados.gratis.missoes} missões. Conheça o Plano Família</small></span>
      <Icone nome="seta" />
    </button>
  );
}

function TelaPlano({ voltar, conta }: { voltar: () => void; conta: () => void }) {
  const info = useCarregar(() => api<InfoPlano>('/adulto/assinatura'));
  const [lista, setLista] = useState<Pacote[] | null>(null);
  const [escolhido, setEscolhido] = useState<string>('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const familia = info.dados?.familia_id;

  useEffect(() => {
    if (!familia || !comprasDisponiveis) return;
    pacotes(familia).then((ps) => {
      setLista(ps);
      setEscolhido((ps.find((p) => p.tipo === 'anual') ?? ps[0])?.id ?? '');
    }).catch((e) => setErro(e.message || 'Não consegui falar com a loja.'));
  }, [familia]);

  const sincronizar = async () => {
    await api('/adulto/assinatura/sincronizar', { method: 'POST' }).catch((e) => avisar(e.message, 'erro'));
    info.recarregar();
  };
  const assinar = async () => {
    const p = lista?.find((x) => x.id === escolhido);
    if (!p || !familia) return;
    setOcupado(true);
    try {
      if (await comprar(familia, p)) { avisar('Plano Família ativado! Obrigado.'); await sincronizar(); }
    } catch (e: any) { avisar(e.message || 'A compra não foi concluída.', 'erro'); } finally { setOcupado(false); }
  };
  const restaurarCompras = async () => {
    if (!familia) return;
    setOcupado(true);
    try { await restaurar(familia); await sincronizar(); avisar('Compras restauradas.'); } catch (e: any) { avisar(e.message, 'erro'); } finally { setOcupado(false); }
  };

  const d = info.dados;
  const st = d ? statusPlano(d.plano) : null;
  return (
    <div className="pagina">
      <Topo titulo="Plano da família" voltar={voltar} />
      {d && st && (
        <div className={`cartao plano-status ${d.plano.ativo ? 'ativo' : ''}`}>
          <Icone nome="coroa" tamanho={28} />
          <div><strong>{st.titulo}</strong>{st.texto && <small>{st.texto}</small>}</div>
        </div>
      )}
      {d && (
        <div className="cartao plano-compara">
          <div><small>Grátis</small><strong>{d.gratis.criancas} criança</strong><strong>{d.gratis.missoes} missões cada</strong></div>
          <div className="destaque-plano"><small>Plano Família</small><strong>até {d.familia.criancas} crianças</strong><strong>missões sem limite</strong></div>
        </div>
      )}
      {d && !d.plano.ativo && (d.uso.criancas > d.gratis.criancas || d.uso.missoes > d.gratis.missoes) && (
        <p className="suave">Nada do que vocês já criaram some: as crianças continuam com as missões de hoje. Só não dá para criar além do plano grátis.</p>
      )}

      {!d?.plano.ativo && (comprasDisponiveis ? (
        <>
          {erro && <p className="erro">{erro}</p>}
          {lista && !lista.length && <p className="suave">Os planos ainda não estão disponíveis na loja.</p>}
          <div className="pacotes">
            {lista?.map((p) => (
              <button key={p.id} className={`cartao pacote ${escolhido === p.id ? 'escolhido' : ''}`} onClick={() => setEscolhido(p.id)} aria-pressed={escolhido === p.id}>
                {p.economia !== null && p.economia > 0 && <span className="selo-economia">economize {p.economia}%</span>}
                <strong className="pacote-nome">{p.tipo === 'anual' ? 'Anual' : p.tipo === 'mensal' ? 'Mensal' : p.original.product.title}</strong>
                {p.porMes
                  ? <><span className="pacote-preco">{p.porMes}<small>/mês</small></span><small>{p.preco} cobrados por ano</small></>
                  : <span className="pacote-preco">{p.preco}<small>{p.tipo === 'mensal' ? '/mês' : ''}</small></span>}
                {p.gratis && <small className="pacote-gratis">7 dias grátis para começar</small>}
              </button>
            ))}
          </div>
          {lista && lista.length > 0 && <button className="btn btn-gigante" onClick={assinar} disabled={ocupado || !escolhido}>{ocupado ? 'Abrindo a loja…' : 'Assinar'}</button>}
          <button className="btn-link" onClick={restaurarCompras} disabled={ocupado}>Restaurar compras</button>
          <p className="suave letra-miuda">A assinatura renova sozinha e pode ser cancelada quando quiser em Google Play → Pagamentos e assinaturas.</p>
        </>
      ) : (
        <div className="cartao loja">
          <strong>Assine pelo app do Trato na Google Play</strong>
          <p className="suave">Aqui no site não há pagamento. Baixe o app no celular, entre com a mesma conta e assine na área do responsável.</p>
          <a className="btn btn-claro" href={LINK_LOJA} target="_blank" rel="noreferrer">Abrir na Google Play</a>
        </div>
      ))}

      <div className="links-legais">
        <a href={`${API_BASE}/privacidade.html`} target="_blank" rel="noreferrer">Política de privacidade</a>
        <a href={`${API_BASE}/termos.html`} target="_blank" rel="noreferrer">Termos de uso</a>
        <button className="btn-link" onClick={conta}>Excluir conta e dados</button>
      </div>
    </div>
  );
}
