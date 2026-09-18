-- ============================================================
-- SEMPRE ON CELULARES — Estrutura do banco (PostgreSQL / Neon)
--
-- Pode rodar no SQL Editor do Neon quantas vezes quiser:
-- todos os comandos usam IF NOT EXISTS.
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telefone TEXT,
  senha_salt TEXT NOT NULL,
  senha_hash TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'cliente',
  desde TEXT
);

CREATE TABLE IF NOT EXISTS sessoes (
  token TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS ordens (
  id SERIAL PRIMARY KEY,
  numero TEXT UNIQUE NOT NULL,
  cliente_id INTEGER REFERENCES usuarios(id),
  aparelho TEXT,
  servico TEXT,
  status TEXT DEFAULT 'recebido',
  valor TEXT DEFAULT 'Sob consulta',
  descricao TEXT,
  garantia TEXT,
  data_entrada TEXT
);

CREATE TABLE IF NOT EXISTS orcamentos (
  id SERIAL PRIMARY KEY,
  protocolo TEXT UNIQUE,
  nome TEXT, telefone TEXT, modelo TEXT, servico TEXT,
  descricao TEXT, contato TEXT, criado_em TIMESTAMPTZ DEFAULT NOW(),
  fotos TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS servicos_override (
  slug TEXT PRIMARY KEY,
  dados TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_ordens_cliente ON ordens (cliente_id);
CREATE INDEX IF NOT EXISTS ix_sessoes_usuario ON sessoes (usuario_id);