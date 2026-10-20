import { useState, type FormEvent } from 'react';
import { api } from '../api.ts';
import { Icone, Logo } from '../ui.tsx';
import { Pet } from '../pet.tsx';

type Passo = 'abertura' | 'boas-vindas' | 'entrar' | 'cadastro' | 'codigo';

export function Entrada({ pronto }: { pronto: () => void }) {
  const [passo, setPasso] = useState<Passo>(() => { try { return localStorage.getItem('trato.viu') ? 'boas-vindas' : 'abertura'; } catch { return 'abertura'; } });
  const ir = (p: Passo) => { try { localStorage.setItem('trato.viu', '1'); } catch { /* sem armazenamento: mostra a abertura de novo */ } setPasso(p); };

  if (passo === 'abertura') {
    return (
      <div className="abertura">
        <div className="bolha bolha-1" /><div className="bolha bolha-2" /><div className="bolha bolha-3" />
        <div className="abertura-meio">
          <Logo grande />
          <p className="abertura-frase">Pequenos tratos, grandes conquistas.</p>
          <Pet especie="tico" nivel={3} tamanho={220} className="flutuar" />
        </div>
        <button className="btn btn-grande" onClick={() => ir('boas-vindas')}>Vamos lá</button>
      </div>
    );
  }

  if (passo === 'boas-vindas') {
    return (
      <div className="pagina boas-vindas">
        <div className="boas-topo">
          <Logo grande />
          <Pet especie="broto" nivel={2} tamanho={150} className="flutuar" />
          <p className="suave">A rotina da criança virou um trato.</p>
        </div>
        <div className="lista">
          <Destaque icone="missoes" titulo="Tarefas viram missões" texto="A criança vê o que tem para hoje, faz e marca. Cada missão dá pontos." />
          <Destaque icone="pata" titulo="Um pet para chamar de seu" texto="Os pontos fazem o pet crescer, mudar de forma e entrar na coleção." />
          <Destaque icone="presente" titulo="Moedinhas viram prêmios" texto="Vocês combinam as recompensas e a criança junta moedinhas para pedir." />
        </div>
        <div className="botoes">
          <button className="btn btn-grande" onClick={() => setPasso('entrar')}>Já tenho uma conta</button>
          <button className="btn btn-claro btn-grande" onClick={() => setPasso('cadastro')}>Criar minha conta</button>
          <button className="btn-link" onClick={() => setPasso('codigo')}><Icone nome="celular" tamanho={18} /> Entrar com código (celular da criança)</button>
        </div>
      </div>
    );
  }

  if (passo === 'codigo') return <EntrarComCodigo voltar={() => setPasso('boas-vindas')} pronto={pronto} />;
  return passo === 'entrar'
    ? <Entrar voltar={() => setPasso('boas-vindas')} cadastro={() => setPasso('cadastro')} pronto={pronto} />
    : <Cadastro voltar={() => setPasso('boas-vindas')} entrar={() => setPasso('entrar')} pronto={pronto} />;
}

function Destaque({ icone, titulo, texto }: { icone: string; titulo: string; texto: string }) {
  return (
    <div className="cartao destaque">
      <span className="destaque-icone"><Icone nome={icone} /></span>
      <div><strong>{titulo}</strong><p>{texto}</p></div>
    </div>
  );
}

function Entrar({ voltar, cadastro, pronto }: { voltar: () => void; cadastro: () => void; pronto: () => void }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setOcupado(true);
    try { await api('/conta/entrar', { body: { email, senha } }); pronto(); } catch (err: any) { setErro(err.message); } finally { setOcupado(false); }
  };
  return (
    <form className="pagina formulario" onSubmit={enviar}>
      <button type="button" className="icone-btn" onClick={voltar} aria-label="Voltar"><Icone nome="voltar" /></button>
      <Logo />
      <h1>Entrar</h1>
      <p className="suave">Use o e-mail e a senha do responsável.</p>
      <label>E-mail<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label>Senha<input type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required /></label>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <button className="btn btn-grande" disabled={ocupado}>{ocupado ? 'Entrando…' : 'Entrar'}</button>
      <button type="button" className="btn-link" onClick={cadastro}>Ainda não tenho conta</button>
    </form>
  );
}

function Cadastro({ voltar, entrar, pronto }: { voltar: () => void; entrar: () => void; pronto: () => void }) {
  const [f, setF] = useState({ nome: '', email: '', senha: '', pin: '', pin2: '' });
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const campo = (k: keyof typeof f) => ({ value: f[k], onChange: (e: any) => setF({ ...f, [k]: e.target.value }) });
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (f.pin !== f.pin2) return setErro('Os dois PINs não são iguais.');
    setOcupado(true);
    try { await api('/conta/cadastro', { body: f }); pronto(); } catch (err: any) { setErro(err.message); } finally { setOcupado(false); }
  };
  return (
    <form className="pagina formulario" onSubmit={enviar}>
      <button type="button" className="icone-btn" onClick={voltar} aria-label="Voltar"><Icone nome="voltar" /></button>
      <Logo />
      <h1>Criar conta</h1>
      <p className="suave">A conta é do responsável. As crianças entram pelo perfil, sem e-mail nem senha.</p>
      <label>Seu nome<input autoComplete="name" {...campo('nome')} required /></label>
      <label>E-mail<input type="email" autoComplete="email" {...campo('email')} required /></label>
      <label>Senha<input type="password" autoComplete="new-password" minLength={8} {...campo('senha')} required /><small>Pelo menos 8 caracteres.</small></label>
      <div className="duas">
        <label>PIN do responsável<input inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="off" {...campo('pin')} required /></label>
        <label>Repita o PIN<input inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="off" {...campo('pin2')} required /></label>
      </div>
      <small className="suave">O PIN tem 4 números e protege a sua área (tarefas, aprovações e conta) no aparelho que a criança usa.</small>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <button className="btn btn-grande" disabled={ocupado}>{ocupado ? 'Criando…' : 'Criar conta'}</button>
      <button type="button" className="btn-link" onClick={entrar}>Já tenho conta</button>
    </form>
  );
}

/** Celular da criança: o responsável gera o código na área dele; aqui ele vira a sessão presa no perfil. */
function EntrarComCodigo({ voltar, pronto }: { voltar: () => void; pronto: () => void }) {
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const enviar = async (e?: FormEvent) => {
    e?.preventDefault();
    if (codigo.length !== 6) return;
    setOcupado(true);
    try { await api('/conta/codigo', { body: { codigo } }); pronto(); } catch (err: any) { setErro(err.message); } finally { setOcupado(false); }
  };
  return (
    <form className="pagina formulario codigo-tela" onSubmit={enviar}>
      <button type="button" className="icone-btn" onClick={voltar} aria-label="Voltar"><Icone nome="voltar" /></button>
      <Logo />
      <h1>Entrar com código</h1>
      <p className="suave">No celular do responsável: Área do responsável → Celulares → Conectar o celular da criança.</p>
      <input className="codigo-campo" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={codigo} aria-label="Código de 6 números"
        onChange={(e) => { setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6)); setErro(''); }} autoFocus />
      {erro && <p className="erro" role="alert">{erro}</p>}
      <button className="btn btn-grande" disabled={ocupado || codigo.length !== 6}>{ocupado ? 'Conectando…' : 'Conectar'}</button>
    </form>
  );
}
