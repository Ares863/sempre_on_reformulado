// ============================================================
// SEMPRE ON CELULARES — Conexão com PostgreSQL (Neon)
//
// Lê a variável DATABASE_URL (do ambiente ou do arquivo .env),
// cria o pool de conexões e garante o esquema (migrações).
// ============================================================
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

// ---------- Carrega .env (somente se a variável ainda não existir) ----------
try {
  const arq = path.join(__dirname, '.env');
  if (fs.existsSync(arq)) {
    fs.readFileSync(arq, 'utf8').split(/\r?\n/).forEach(function (linha) {
      const m = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    });
  }
} catch (e) { /* sem .env, segue */ }

const URL_ORIGINAL = process.env.DATABASE_URL || '';
// Removemos parâmetros que atrapalham o pg e deixamos o SSL explícito no Pool
// (sslmode/channel_binding eram lidos do texto; aqui controlamos via config).
const DATABASE_URL = URL_ORIGINAL
  .replace(/\?channel_binding=require/, '')
  .replace(/&channel_binding=require/, '')
  .replace(/[?&]sslmode=[a-z-]+/g, '');

if (!DATABASE_URL) {
  console.error('  [erro] Defina DATABASE_URL no ambiente ou em um arquivo .env');
  console.error('         Ex.: DATABASE_URL=postgresql://usuario:senha@host/banco?sslmode=require');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  ssl: { rejectUnauthorized: false } // exigido pela Neon
});

const DIAS7 = 7 * 24 * 60 * 60 * 1000;

// ---------- Esquema (fonte única: schema.sql — executado na subida e na migração) ----------
const MIGRACOES = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

// Aplica as migrações; com dados iniciais caso comSeed=true.
async function hidratar(comDados) {
  await pool.query(MIGRACOES);
  if (!comDados) return;
  const u = await pool.query('SELECT COUNT(*) c FROM usuarios');
  if (u.rows[0].c === 0) {
    const admin = hashSenha('Admin@123');
    const camila = hashSenha('demo123');
    const gui = hashSenha('demo123');
    await pool.query(`INSERT INTO usuarios (nome, email, telefone, senha_salt, senha_hash, tipo, desde) VALUES
      ('Administrador', 'admin@sempreon.com.br', '(12) 90000-0000', $1, $2, 'admin', '2026'),
      ('Camila Macedo', 'camila@exemplo.com', '(12) 99911-2233', $3, $4, 'cliente', 'Jan 2026'),
      ('Guilherme Sousa', 'guilherme@exemplo.com', '(12) 98822-3344', $5, $6, 'cliente', 'Fev 2026')`,
      [admin.salt, admin.hash, camila.salt, camila.hash, gui.salt, gui.hash]);
  }
  const o = await pool.query('SELECT COUNT(*) c FROM ordens');
  if (o.rows[0].c === 0) {
    const users = (await pool.query('SELECT id, email FROM usuarios')).rows;
    const idDe = (email) => { const a = users.find(x => x.email === email); return a ? a.id : null; };
    const cad = async (numero, email, aparelho, servico, status, valor, descricao, garantia, data) => {
      await pool.query(`INSERT INTO ordens (numero, cliente_id, aparelho, servico, status, valor, descricao, garantia, data_entrada)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (numero) DO NOTHING`,
        [numero, idDe(email), aparelho, servico, status, valor, descricao, garantia, data]);
    };
    await cad('OS-0001', 'camila@exemplo.com', 'iPhone 13', 'troca-de-vidro', 'pronto', 'Sob consulta', 'Vidro trincado, display e toque funcionando normalmente.', 'Garantia conforme serviço', '05/09/2026');
    await cad('OS-0002', 'guilherme@exemplo.com', 'Samsung Galaxy S22', 'troca-de-bateria', 'reparo', 'Sob consulta', 'Bateria com baixa autonomia e desligamentos.', 'Garantia conforme serviço', '07/09/2026');
    await cad('OS-0003', 'camila@exemplo.com', 'iPhone 11', 'reparo-de-camera', 'diagnostico', 'Sob consulta', 'Fotos escuras e com foco falhando.', 'A confirmar após diagnóstico', '09/09/2026');
    await cad('OS-0004', 'guilherme@exemplo.com', 'Motorola Edge 30', 'reparo-de-placa', 'aprovacao', 'Sob consulta', 'Aparelho não liga após molhado.', 'Garantia conforme serviço', '10/09/2026');
  }
}

// ---------- Senhas (scrypt — nunca guardamos a senha, só hash + salt) ----------
function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(senha), salt, 64).toString('hex');
  return { salt, hash };
}
function confereSenha(senha, salt, hash) {
  const calc = crypto.scryptSync(String(senha), salt, 64);
  const esperado = Buffer.from(hash, 'hex');
  return calc.length === esperado.length && crypto.timingSafeEqual(calc, esperado);
}

// ---------- Sessões ----------
async function criarSessao(usuarioId) {
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query('INSERT INTO sessoes (token, usuario_id, expira) VALUES ($1, $2, $3)',
    [token, usuarioId, new Date(Date.now() + DIAS7)]);
  return token;
}
async function limparSessoesVencidas() {
  await pool.query('DELETE FROM sessoes WHERE expira < NOW()');
}
async function usuarioDaRequisicao(req) {
  await limparSessoesVencidas();
  const m = (req.headers.cookie || '').match(/sempreon_sessao=([a-f0-9]+)/);
  if (!m) return null;
  const r = await pool.query('SELECT u.* FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token = $1', [m[1]]);
  return r.rowCount ? r.rows[0] : null;
}

// ---------- Fim de vida (encerra o pool ao parar) ----------
process.on('SIGINT', () => { pool.end(); process.exit(0); });
process.on('SIGTERM', () => { pool.end(); process.exit(0); });

module.exports = { pool, hidratar, hashSenha, confereSenha, criarSessao, limparSessoesVencidas, usuarioDaRequisicao, DATABASE_URL };