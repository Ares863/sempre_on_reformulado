// ============================================================
// MIGRAR: data/sempreon.db (SQLite) -> PostgreSQL (Neon)
//
//   npm install        (uma vez)
//   node scripts/migrar-sqlite.js
//
// Cria as tabelas (migrações) no Postgres e copia os dados
// existentes. É seguro rodar mais de uma vez (INSERT ... ON
// CONFLICT DO NOTHING) — apenas adiciona o que ainda não existe.
// Requer Node 22.5+ (node:sqlite para ler o arquivo antigo).
// ============================================================
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { pool, hidratar } = require('../db');

const CAMINHO_SQLITE = path.join(__dirname, '..', 'data', 'sempreon.db');

async function principal() {
  if (!fs.existsSync(CAMINHO_SQLITE)) {
    console.log('Nenhum data/sempreon.db encontrado — nada a migrar.');
    process.exit(0);
  }

  const sql = new DatabaseSync(CAMINHO_SQLITE);
  const dados = {
    usuarios: sql.prepare('SELECT * FROM usuarios').all(),
    sessoes: sql.prepare('SELECT * FROM sessoes').all(),
    ordens: sql.prepare('SELECT * FROM ordens').all(),
    orcamentos: sql.prepare('SELECT * FROM orcamentos').all(),
    overrides: sql.prepare('SELECT * FROM servicos_override').all()
  };
  sql.close();

  console.log('SQLite (origem):');
  console.log('  usuarios        : ' + dados.usuarios.length);
  console.log('  sessoes         : ' + dados.sessoes.length);
  console.log('  ordens          : ' + dados.ordens.length);
  console.log('  orcamentos      : ' + dados.orcamentos.length);
  console.log('  servicos_override: ' + dados.overrides.length);
  console.log('');

  console.log('Criando as tabelas no PostgreSQL (Neon)...');
  await hidratar(false);

  let conta = { usuarios: 0, sessoes: 0, ordens: 0, orcamentos: 0, overrides: 0 };

  // 1) Usuários (com o mesmo ID para preservar vínculos nas ordens/sessões)
  for (const u of dados.usuarios) {
    const r = await pool.query(
      `INSERT INTO usuarios (id, nome, email, telefone, senha_salt, senha_hash, tipo, desde)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
      [u.id, u.nome, u.email, u.telefone, u.senha_salt, u.senha_hash, u.tipo, u.desde]);
    conta.usuarios += r.rowCount;
  }
  if (dados.usuarios.length) {
    await pool.query(`SELECT setval('usuarios_id_seq', GREATEST((SELECT MAX(id) FROM usuarios), 1))`);
  }

  // 2) Ordens de serviço
  for (const o of dados.ordens) {
    const r = await pool.query(
      `INSERT INTO ordens (id, numero, cliente_id, aparelho, servico, status, valor, descricao, garantia, data_entrada)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
      [o.id, o.numero, o.cliente_id, o.aparelho, o.servico, o.status, o.valor, o.descricao, o.garantia, o.data_entrada]);
    conta.ordens += r.rowCount;
  }
  if (dados.ordens.length) {
    await pool.query(`SELECT setval('ordens_id_seq', GREATEST((SELECT MAX(id) FROM ordens), 1))`);
  }

  // 3) Sessões (expira era um timestamp em ms no SQLite)
  for (const s of dados.sessoes) {
    const r = await pool.query(
      `INSERT INTO sessoes (token, usuario_id, expira) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [s.token, s.usuario_id, new Date(Number(s.expira))]);
    conta.sessoes += r.rowCount;
  }

  // 4) Orçamentos (criado_em 'YYYY-MM-DD HH:MM:SS' -> timestamptz)
  for (const c of dados.orcamentos) {
    const r = await pool.query(
      `INSERT INTO orcamentos (protocolo, nome, telefone, modelo, servico, descricao, contato, criado_em, fotos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
      [c.protocolo, c.nome, c.telefone, c.modelo, c.servico, c.descricao, c.contato,
        c.criado_em ? c.criado_em : new Date(), c.fotos || '[]']);
    conta.orcamentos += r.rowCount;
  }

  // 5) Overrides de serviços
  for (const s of dados.overrides) {
    const r = await pool.query(
      `INSERT INTO servicos_override (slug, dados) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [s.slug, s.dados]);
    conta.overrides += r.rowCount;
  }

  console.log('Copiado para o PostgreSQL (Neon):');
  console.log('  usuarios         : ' + conta.usuarios);
  console.log('  sessoes          : ' + conta.sessoes);
  console.log('  ordens           : ' + conta.ordens);
  console.log('  orcamentos       : ' + conta.orcamentos);
  console.log('  servicos_override: ' + conta.overrides);

  const total = (await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM usuarios) usuarios,
       (SELECT COUNT(*) FROM sessoes) sessoes,
       (SELECT COUNT(*) FROM ordens) ordens,
       (SELECT COUNT(*) FROM orcamentos) orcamentos,
       (SELECT COUNT(*) FROM servicos_override) servicos_override`)).rows[0];
  console.log('Total no banco agora:', JSON.stringify(total));

  await pool.end();
  console.log('\nMigração concluída!');
}

principal().catch((e) => {
  console.error('\n[erro] ' + (e && e.message ? e.message : e));
  process.exit(1);
});