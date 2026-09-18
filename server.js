// ============================================================
// SEMPRE ON CELULARES — Servidor + Backend (PostgreSQL/Neon)
//
// Roda o site estático E a API REST com banco PostgreSQL.
// Requer Node.js 18+ (dependência: pg).
//
//   npm install          -> instala as dependências
//   node server.js       -> http://localhost:8080
//   node server.js 9000  -> porta personalizada
//
// Banco: configuração em DATABASE_URL (ambiente ou .env).
// ============================================================
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pool, hidratar, hashSenha, confereSenha, criarSessao, usuarioDaRequisicao } = require('./db');

const PORTA = parseInt(process.argv[2], 10) || parseInt(process.env.PORT, 10) || 8080;
const RAIZ = __dirname;
const DIR_DADOS = path.join(RAIZ, 'data');
fs.mkdirSync(DIR_DADOS, { recursive: true });
const DIR_UPLOADS = path.join(DIR_DADOS, 'uploads');
fs.mkdirSync(DIR_UPLOADS, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf'
};

const STATUS_VALIDOS = ['recebido', 'diagnostico', 'aprovacao', 'reparo', 'testes', 'pronto', 'entregue'];

// ============================================================
// Helpers HTTP
// ============================================================
function json(res, codigo, obj) {
  const corpo = JSON.stringify(obj);
  res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(corpo);
  return true;
}
function ok(res, dado) { return json(res, 200, { sucesso: true, dado }); }
function err(res, codigo, msg) { return json(res, codigo, { sucesso: false, erro: msg }); }
function lerCorpo(req) {
  return new Promise((resolve) => {
    let dados = '';
    req.on('data', (c) => { dados += c; if (dados.length > 25e6) req.destroy(); });
    req.on('end', () => {
      if (!dados) return resolve({});
      try { resolve(JSON.parse(dados)); } catch (e) { resolve({}); }
    });
  });
}
async function precisaAdmin(req, res) {
  const u = await usuarioDaRequisicao(req);
  if (!u) return null;
  if (u.tipo !== 'admin') { err(res, 403, 'Acesso restrito a administradores.'); return null; }
  return u;
}
function gravaCookie(res, token) {
  res.setHeader('Set-Cookie', 'sempreon_sessao=' + token + '; Path=/; HttpOnly; SameSite=Lax');
}

async function toOS(o) {
  let nome = '—';
  if (o.cliente_id) {
    const r = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [o.cliente_id]);
    if (r.rowCount) nome = r.rows[0].nome;
  }
  return {
    numero: o.numero, clienteId: o.cliente_id, clienteNome: nome,
    aparelho: o.aparelho, servico: o.servico, status: o.status, valor: o.valor,
    descricao: o.descricao, garantia: o.garantia, dataEntrada: o.data_entrada
  };
}

// ============================================================
// Rotas da API
// ============================================================
async function apiRota(req, res, url) {
  const metodo = req.method;
  const partes = url.pathname.split('/').filter(Boolean);
  if (partes[0] !== 'api') return false;

  const corpo = metodo === 'POST' || metodo === 'PUT' || metodo === 'PATCH' ? await lerCorpo(req) : {};

  // ----- /api/health
  if (url.pathname === '/api/health') { ok(res, { api: true }); return true; }

  // ----- Autenticação
  if (url.pathname === '/api/auth/cadastro' && metodo === 'POST') {
    if (!corpo.nome || !corpo.email || !corpo.telefone || !corpo.senha) return err(res, 400, 'Preencha nome, e-mail, telefone e senha.');
    if (String(corpo.senha).length < 6) return err(res, 400, 'A senha precisa ter pelo menos 6 caracteres.');
    const email = String(corpo.email).toLowerCase();
    const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existe.rowCount) return err(res, 409, 'Este e-mail já está cadastrado.');
    const h = hashSenha(corpo.senha);
    const ins = await pool.query('INSERT INTO usuarios (nome, email, telefone, senha_salt, senha_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [String(corpo.nome), email, String(corpo.telefone), h.salt, h.hash]);
    const token = await criarSessao(ins.rows[0].id);
    gravaCookie(res, token);
    return ok(res, { id: ins.rows[0].id, nome: String(corpo.nome), email, tipo: 'cliente' });
  }

  if (url.pathname === '/api/auth/login' && metodo === 'POST') {
    const u = (await pool.query('SELECT * FROM usuarios WHERE email = $1', [String(corpo.email || '').toLowerCase()])).rows[0];
    if (!u || !confereSenha(corpo.senha || '', u.senha_salt, u.senha_hash)) return err(res, 401, 'E-mail ou senha incorretos.');
    const token = await criarSessao(u.id);
    gravaCookie(res, token);
    return ok(res, { id: u.id, nome: u.nome, email: u.email, tipo: u.tipo });
  }

  if (url.pathname === '/api/auth/recuperar' && metodo === 'POST') {
    if (!corpo.email) return err(res, 400, 'Informe seu e-mail.');
    return ok(res, { email: corpo.email });
  }

  if (url.pathname === '/api/auth/me' && metodo === 'GET') {
    const u = await usuarioDaRequisicao(req);
    if (!u) return err(res, 401, 'Sessão não encontrada.');
    return ok(res, { id: u.id, nome: u.nome, email: u.email, telefone: u.telefone, tipo: u.tipo });
  }

  if (url.pathname === '/api/auth/sair' && metodo === 'POST') {
    const m = (req.headers.cookie || '').match(/sempreon_sessao=([a-f0-9]+)/);
    if (m) await pool.query('DELETE FROM sessoes WHERE token = $1', [m[1]]);
    res.setHeader('Set-Cookie', 'sempreon_sessao=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax');
    return ok(res, true);
  }

  // ----- Conta sem sessão (pela tela de login — vale para cliente e admin)
  if (url.pathname === '/api/conta/redefinir-senha' && metodo === 'POST') {
    const u = (await pool.query('SELECT * FROM usuarios WHERE email = $1', [String(corpo.email || '').toLowerCase()])).rows[0];
    if (!u || !confereSenha(corpo.senhaAtual || '', u.senha_salt, u.senha_hash)) return err(res, 401, 'E-mail ou senha atual incorretos.');
    const nova = String(corpo.novaSenha || '');
    if (nova.length < 6) return err(res, 400, 'A nova senha precisa ter pelo menos 6 caracteres.');
    if (nova !== String(corpo.confirmacao || '')) return err(res, 400, 'A confirmação de senha não confere.');
    const h = hashSenha(nova);
    await pool.query('UPDATE usuarios SET senha_salt = $1, senha_hash = $2 WHERE id = $3', [h.salt, h.hash, u.id]);
    return ok(res, { nome: u.nome, alterado: true });
  }

  if (url.pathname === '/api/conta/redefinir-email' && metodo === 'POST') {
    const u = (await pool.query('SELECT * FROM usuarios WHERE email = $1', [String(corpo.email || '').toLowerCase()])).rows[0];
    if (!u || !confereSenha(corpo.senhaAtual || '', u.senha_salt, u.senha_hash)) return err(res, 401, 'E-mail ou senha atuais incorretos.');
    const novo = String(corpo.novoEmail || '').toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(novo)) return err(res, 400, 'Informe um e-mail válido.');
    const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1 AND id != $2', [novo, u.id]);
    if (existe.rowCount) return err(res, 409, 'Este e-mail já está em uso por outra conta.');
    await pool.query('UPDATE usuarios SET email = $1 WHERE id = $2', [novo, u.id]);
    return ok(res, { nome: u.nome, email: novo });
  }

  // ----- Conta do usuário logado (trocar e-mail / senha)
  if (url.pathname === '/api/conta/alterar-email' && metodo === 'POST') {
    const u = await usuarioDaRequisicao(req);
    if (!u) return err(res, 401, 'Faça login para continuar.');
    if (!confereSenha(corpo.senhaAtual || '', u.senha_salt, u.senha_hash)) return err(res, 401, 'Senha atual incorreta.');
    const novo = String(corpo.novoEmail || '').toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(novo)) return err(res, 400, 'Informe um e-mail válido.');
    const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1 AND id != $2', [novo, u.id]);
    if (existe.rowCount) return err(res, 409, 'Este e-mail já está em uso por outra conta.');
    await pool.query('UPDATE usuarios SET email = $1 WHERE id = $2', [novo, u.id]);
    return ok(res, { email: novo });
  }

  if (url.pathname === '/api/conta/alterar-senha' && metodo === 'POST') {
    const u = await usuarioDaRequisicao(req);
    if (!u) return err(res, 401, 'Faça login para continuar.');
    if (!confereSenha(corpo.senhaAtual || '', u.senha_salt, u.senha_hash)) return err(res, 401, 'Senha atual incorreta.');
    const nova = String(corpo.novaSenha || '');
    if (nova.length < 6) return err(res, 400, 'A nova senha precisa ter pelo menos 6 caracteres.');
    const h = hashSenha(nova);
    await pool.query('UPDATE usuarios SET senha_salt = $1, senha_hash = $2 WHERE id = $3', [h.salt, h.hash, u.id]);
    return ok(res, { alterado: true });
  }

  // ----- Perfil do usuário logado (cliente ou admin): nome, telefone e e-mail
  if (url.pathname === '/api/conta/atualizar-perfil' && metodo === 'POST') {
    const u = await usuarioDaRequisicao(req);
    if (!u) return err(res, 401, 'Faça login para continuar.');
    if (!confereSenha(corpo.senhaAtual || '', u.senha_salt, u.senha_hash)) return err(res, 401, 'Senha atual incorreta.');
    const nome = String(corpo.nome || '').trim();
    const telefone = String(corpo.telefone || '').trim();
    const novoEmail = String(corpo.email || '').toLowerCase().trim();
    if (!nome) return err(res, 400, 'Informe seu nome.');
    if (!/^\S+@\S+\.\S+$/.test(novoEmail)) return err(res, 400, 'Informe um e-mail válido.');
    const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1 AND id != $2', [novoEmail, u.id]);
    if (existe.rowCount) return err(res, 409, 'Este e-mail já está em uso por outra conta.');
    await pool.query('UPDATE usuarios SET nome = $1, telefone = $2, email = $3 WHERE id = $4', [nome, telefone, novoEmail, u.id]);
    return ok(res, { id: u.id, nome, telefone, email: novoEmail, tipo: u.tipo });
  }

  // ----- Orçamento (público) com upload de fotos (base64 -> arquivo)
  if (url.pathname === '/api/orcamentos' && metodo === 'POST') {
    if (!corpo.nome || !corpo.telefone || !corpo.modelo) return err(res, 400, 'Preencha nome, telefone e modelo do aparelho.');
    const protocolo = 'ORC-' + String(Date.now()).slice(-6);
    const fotosSalvas = [];
    if (Array.isArray(corpo.fotos)) {
      for (let i = 0; i < Math.min(corpo.fotos.length, 4); i++) {
        const f = corpo.fotos[i];
        if (!f || !f.dados || typeof f.dados !== 'string') continue;
        const m = f.dados.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (!m) continue;
        const buf = Buffer.from(m[2], 'base64');
        if (buf.length > 2.5e6) continue; // limite de ~2,5 MB por foto
        const ext = m[1] === 'image/png' ? 'png' : 'jpg';
        const nome = protocolo + '-' + (fotosSalvas.length + 1) + '.' + ext;
        fs.writeFileSync(path.join(DIR_UPLOADS, nome), buf);
        fotosSalvas.push({ nome, url: 'uploads/' + nome });
      }
    }
    await pool.query(`INSERT INTO orcamentos (protocolo, nome, telefone, modelo, servico, descricao, contato, criado_em, fotos)
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8)`,
      [protocolo, String(corpo.nome), String(corpo.telefone), String(corpo.modelo), String(corpo.servico || ''), String(corpo.descricao || ''), String(corpo.contato || ''), JSON.stringify(fotosSalvas)]);
    return ok(res, { protocolo, fotos: fotosSalvas.length });
  }

  // ----- Serviços (override do painel)
  if (url.pathname === '/api/servicos' && metodo === 'GET') {
    const rows = (await pool.query('SELECT * FROM servicos_override')).rows;
    return ok(res, rows.map((r) => Object.assign({ slug: r.slug }, JSON.parse(r.dados))));
  }
  if (url.pathname.startsWith('/api/servicos/') && metodo === 'PUT') {
    const admin = await precisaAdmin(req, res); if (!admin) return true;
    const slug = partes[2];
    await pool.query(`INSERT INTO servicos_override (slug, dados) VALUES ($1, $2)
      ON CONFLICT (slug) DO UPDATE SET dados = EXCLUDED.dados`, [slug, JSON.stringify(corpo.dados || {})]);
    return ok(res, { slug });
  }

  // ----- Clientes (admin)
  if (url.pathname === '/api/clientes' && metodo === 'GET') {
    const admin = await precisaAdmin(req, res); if (!admin) return true;
    const rows = (await pool.query('SELECT id, nome, email, telefone, desde FROM usuarios ORDER BY id')).rows;
    return ok(res, rows);
  }

  // ----- Indicadores (admin)
  if (url.pathname === '/api/admin/indicadores' && metodo === 'GET') {
    const admin = await precisaAdmin(req, res); if (!admin) return true;
    const r = (await pool.query(`SELECT
      (SELECT COUNT(*) FROM usuarios WHERE tipo = 'cliente') AS "clientes",
      (SELECT COUNT(*) FROM ordens WHERE status = 'reparo') AS "emReparo",
      (SELECT COUNT(*) FROM ordens WHERE status = 'aprovacao') AS "orcamentosPendentes",
      (SELECT COUNT(*) FROM ordens WHERE status IN ('recebido','diagnostico','reparo','testes')) AS "emAndamento",
      (SELECT COUNT(*) FROM ordens WHERE status IN ('pronto','entregue')) AS "prontos",
      (SELECT COUNT(*) FROM ordens) AS "totalOrdens"`)).rows[0];
    return ok(res, r);
  }

  // ----- Ordens
  if (url.pathname === '/api/ordens' && metodo === 'GET') {
    const u = await usuarioDaRequisicao(req);
    if (!u) return err(res, 401, 'Faça login para acessar.');
    if (url.searchParams.get('me') === '1') {
      const rows = (await pool.query('SELECT * FROM ordens WHERE cliente_id = $1 ORDER BY id DESC', [u.id])).rows;
      return ok(res, await Promise.all(rows.map(toOS)));
    }
    if (u.tipo === 'admin') {
      const rows = (await pool.query('SELECT * FROM ordens ORDER BY id DESC')).rows;
      return ok(res, await Promise.all(rows.map(toOS)));
    }
    const rows = (await pool.query('SELECT * FROM ordens WHERE cliente_id = $1 ORDER BY id DESC', [u.id])).rows;
    return ok(res, await Promise.all(rows.map(toOS)));
  }

  if (url.pathname.startsWith('/api/ordens/') && metodo === 'GET') {
    const u = await usuarioDaRequisicao(req);
    if (!u) return err(res, 401, 'Faça login para acessar.');
    const numero = partes[2];
    const o = (await pool.query('SELECT * FROM ordens WHERE numero = $1', [numero])).rows[0];
    if (!o) return err(res, 404, 'Ordem de serviço não encontrada.');
    if (u.tipo !== 'admin' && o.cliente_id !== u.id) return err(res, 403, 'Esta ordem não pertence à sua conta.');
    return ok(res, await toOS(o));
  }

  if (url.pathname.startsWith('/api/ordens/') && metodo === 'PATCH') {
    const admin = await precisaAdmin(req, res); if (!admin) return true;
    const numero = partes[2];
    if (!STATUS_VALIDOS.includes(corpo.status)) return err(res, 400, 'Status inválido.');
    const r = await pool.query('UPDATE ordens SET status = $1 WHERE numero = $2 RETURNING *', [corpo.status, numero]);
    if (!r.rowCount) return err(res, 404, 'Ordem de serviço não encontrada.');
    return ok(res, await toOS(r.rows[0]));
  }

  // ----- Criação de ordem de serviço (admin)
  if (url.pathname === '/api/ordens' && metodo === 'POST') {
    const admin = await precisaAdmin(req, res); if (!admin) return true;
    if (!corpo.aparelho || !corpo.servico) return err(res, 400, 'Preencha aparelho e serviço.');
    let clienteId = null;
    let criado = false;
    const email = String(corpo.clienteEmail || '').toLowerCase();
    if (email) {
      const existente = (await pool.query('SELECT id FROM usuarios WHERE email = $1', [email])).rows[0];
      if (existente) clienteId = existente.id;
      else if (corpo.nome) {
        const h = hashSenha('cliente123'); // senha padrão para o cliente entrar depois
        const ins = await pool.query('INSERT INTO usuarios (nome, email, telefone, senha_salt, senha_hash, tipo) VALUES ($1,$2,$3,$4,$5,\'cliente\') RETURNING id',
          [String(corpo.nome), email, String(corpo.telefone || ''), h.salt, h.hash]);
        clienteId = ins.rows[0].id;
        criado = true;
      }
    }
    const m = (await pool.query(`SELECT COALESCE(MAX(CAST(substr(numero, 4) AS INTEGER)), 0) m FROM ordens`)).rows[0].m;
    const numero = 'OS-' + String(Number(m) + 1).padStart(4, '0');
    const data = new Date().toLocaleDateString('pt-BR');
    await pool.query(`INSERT INTO ordens (numero, cliente_id, aparelho, servico, status, valor, descricao, garantia, data_entrada)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [numero, clienteId, String(corpo.aparelho), String(corpo.servico), corpo.status || 'recebido',
        String(corpo.valor || 'Sob consulta'), String(corpo.descricao || ''), String(corpo.garantia || 'Garantia conforme serviço'), data]);
    return ok(res, { numero, clienteCriado: criado, senhaPadrao: criado ? 'cliente123' : null });
  }

  return false;
}

// ============================================================
// Servidor
// ============================================================
async function iniciar() {
  try {
    await hidratar(true);
    const server = http.createServer(async (req, res) => {
      let url;
      try { url = new URL(req.url, 'http://x'); } catch (e) { return json(res, 400, { erro: 'URL inválida' }); }

      if (url.pathname.startsWith('/api/')) {
        try {
          const tratou = await apiRota(req, res, url);
          if (!tratou) err(res, 404, 'Endpoint não encontrado.');
        } catch (e) {
          err(res, 500, 'Erro interno do servidor: ' + (e && e.message ? e.message : 'desconhecido'));
        }
        return;
      }

      if (url.pathname.startsWith('/uploads/')) {
        const arq = path.normalize(path.join(DIR_UPLOADS, path.basename(url.pathname)));
        if (!arq.startsWith(DIR_UPLOADS)) { res.writeHead(403); return res.end('Proibido'); }
        return fs.stat(arq, (erro, stat) => {
          if (erro || !stat.isFile()) { res.writeHead(404); return res.end('Não encontrado'); }
          const ext = path.extname(arq).toLowerCase();
          res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' });
          fs.createReadStream(arq).pipe(res);
        });
      }

      let caminhoUrl = decodeURIComponent(url.pathname);
      if (caminhoUrl === '/') caminhoUrl = '/index.html';
      const caminho = path.normalize(path.join(RAIZ, caminhoUrl));
      if (!caminho.startsWith(RAIZ)) { res.writeHead(403); return res.end('Proibido'); }

      fs.stat(caminho, (erro, stat) => {
        if (erro || !stat.isFile()) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Página não encontrada: ' + caminhoUrl);
        }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(caminho).toLowerCase()] || 'application/octet-stream' });
        fs.createReadStream(caminho).pipe(res);
      });
    });

    server.listen(PORTA, '0.0.0.0', () => {
      console.log('');
      console.log('  Sempre On Celulares — servidor + API (PostgreSQL/Neon)');
      console.log('  -------------------------------------------------------');
      console.log('  PC:        http://localhost:' + PORTA);
      console.log('  API:       http://localhost:' + PORTA + '/api/health');
      Object.values(os.networkInterfaces()).flat().forEach((r) => {
        if (r.family === 'IPv4' && !r.internal) console.log('  Celular:   http://' + r.address + ':' + PORTA);
      });
      console.log('  -------------------------------------------------------');
      console.log('  Contas demo -> admin@sempreon.com.br / Admin@123');
      console.log('              -> camila@exemplo.com / demo123');
      console.log('  Para encerrar: Ctrl + C');
      console.log('');
    });
  } catch (e) {
    console.error('  [erro] Não foi possível conectar ao banco: ' + (e && e.message ? e.message : e));
    process.exit(1);
  }
}

iniciar();