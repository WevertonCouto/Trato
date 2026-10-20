import 'dotenv/config';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
export const FOTOS_DIR = path.join(DATA_DIR, 'fotos');
fs.mkdirSync(FOTOS_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, 'trato.db'));
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(`
CREATE TABLE IF NOT EXISTS familias (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  pin TEXT NOT NULL,
  criado_em INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS criancas (
  id TEXT PRIMARY KEY,
  familia_id TEXT NOT NULL REFERENCES familias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL,
  pin TEXT,
  especie TEXT NOT NULL,
  pet_nome TEXT NOT NULL,
  pet_xp INTEGER NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0,
  moedas INTEGER NOT NULL DEFAULT 0,
  criado_em INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tarefas (
  id TEXT PRIMARY KEY,
  familia_id TEXT NOT NULL REFERENCES familias(id) ON DELETE CASCADE,
  crianca_id TEXT NOT NULL REFERENCES criancas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  icone TEXT NOT NULL,
  pontos INTEGER NOT NULL,
  modo TEXT NOT NULL CHECK (modo IN ('direto', 'aprovacao', 'foto')),
  repeticao TEXT NOT NULL CHECK (repeticao IN ('semanal', 'mensal')),
  dias TEXT NOT NULL DEFAULT '0123456',
  dia_mes INTEGER,
  hora TEXT,
  ativa INTEGER NOT NULL DEFAULT 1,
  excluida INTEGER NOT NULL DEFAULT 0,
  criado_em INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS entregas (
  id TEXT PRIMARY KEY,
  tarefa_id TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  crianca_id TEXT NOT NULL REFERENCES criancas(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  situacao TEXT NOT NULL CHECK (situacao IN ('pendente', 'aprovada', 'recusada')),
  foto TEXT,
  pontos INTEGER NOT NULL,
  enviado_em INTEGER NOT NULL,
  decidido_em INTEGER,
  UNIQUE (tarefa_id, data)
);
CREATE INDEX IF NOT EXISTS entregas_crianca ON entregas (crianca_id, data);
CREATE TABLE IF NOT EXISTS recompensas (
  id TEXT PRIMARY KEY,
  familia_id TEXT NOT NULL REFERENCES familias(id) ON DELETE CASCADE,
  crianca_id TEXT REFERENCES criancas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  icone TEXT NOT NULL,
  custo INTEGER NOT NULL,
  excluida INTEGER NOT NULL DEFAULT 0,
  criado_em INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS pedidos (
  id TEXT PRIMARY KEY,
  recompensa_id TEXT REFERENCES recompensas(id) ON DELETE SET NULL,
  crianca_id TEXT NOT NULL REFERENCES criancas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  icone TEXT NOT NULL,
  custo INTEGER NOT NULL,
  situacao TEXT NOT NULL CHECK (situacao IN ('pendente', 'aprovado', 'recusado')),
  pedido_em INTEGER NOT NULL,
  decidido_em INTEGER
);
CREATE TABLE IF NOT EXISTS cuidados (
  crianca_id TEXT NOT NULL REFERENCES criancas(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('alimentar', 'banho')),
  PRIMARY KEY (crianca_id, data, tipo)
);
CREATE TABLE IF NOT EXISTS colecao (
  id TEXT PRIMARY KEY,
  crianca_id TEXT NOT NULL REFERENCES criancas(id) ON DELETE CASCADE,
  especie TEXT NOT NULL,
  pet_nome TEXT NOT NULL,
  concluido_em INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS codigos (
  codigo TEXT PRIMARY KEY,
  familia_id TEXT NOT NULL REFERENCES familias(id) ON DELETE CASCADE,
  crianca_id TEXT NOT NULL REFERENCES criancas(id) ON DELETE CASCADE,
  expira_em INTEGER NOT NULL
);
`);

// colunas novas em bancos já criados (o CREATE acima só cria o que não existe)
const addColumn = (table: string, col: string, def: string) => {
  if ((db.pragma(`table_info(${table})`) as { name: string }[]).some((c) => c.name === col)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
};
addColumn('familias', 'uso', 'TEXT'); // resposta de "Como vocês vão usar?": 'um' (celular para todos) ou 'cada' (cada um com o seu)

export type Row = Record<string, any>;
export const all = <T = Row>(sql: string, ...p: unknown[]) => db.prepare(sql).all(...p) as T[];
export const get = <T = Row>(sql: string, ...p: unknown[]) => db.prepare(sql).get(...p) as T | undefined;
export const run = (sql: string, ...p: unknown[]) => db.prepare(sql).run(...p);

export const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 16);
export const now = () => Date.now();

/** Data local (fuso do TZ) no formato AAAA-MM-DD. */
export function dia(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function somarDias(data: string, n: number) {
  const d = new Date(`${data}T12:00:00`);
  d.setDate(d.getDate() + n);
  return dia(d);
}

export function hash(segredo: string) {
  const salt = crypto.randomBytes(16);
  return `scrypt:${salt.toString('hex')}:${crypto.scryptSync(segredo, salt, 32).toString('hex')}`;
}
export function confere(segredo: string, guardado?: string | null) {
  const [, salt, h] = (guardado ?? '').split(':');
  if (!salt || !h) return false;
  const got = crypto.scryptSync(segredo, Buffer.from(salt, 'hex'), 32);
  return crypto.timingSafeEqual(got, Buffer.from(h, 'hex'));
}

/** Chave das sessões: gerada uma vez e guardada na pasta de dados. */
const keyFile = path.join(DATA_DIR, 'secret.key');
if (!fs.existsSync(keyFile)) fs.writeFileSync(keyFile, crypto.randomBytes(32).toString('hex'));
export const SECRET = fs.readFileSync(keyFile, 'utf8').trim();
