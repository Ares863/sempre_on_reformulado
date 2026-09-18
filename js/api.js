// ============================================================
// SEMPRE ON CELULARES — Camada de dados (API)
//
// Quando o site roda pelo servidor (node server.js), estas
// funções falam com o backend real (REST + SQLite).
// Quando o site é aberto como arquivo (sem servidor), caem no
// "modo demonstração" usando os dados de js/dados.js.
//
// O frontend NUNCA muda: as páginas só chamam API.xxx().
// ============================================================

var API_ESTADO = { on: false, testado: false };

function apiURL(caminho) {
  return window.location.origin + caminho;
}
function apiReq(metodo, caminho, corpo) {
  return fetch(apiURL(caminho), {
    method: metodo,
    credentials: 'same-origin',
    headers: corpo ? { 'Content-Type': 'application/json' } : {},
    body: corpo ? JSON.stringify(corpo) : undefined
  }).then(function (res) {
    return res.json().catch(function () { return { sucesso: false, erro: 'Resposta inválida do servidor.' }; });
  }).catch(function () {
    return { semConexao: true };
  });
}
function apiDisponivel() {
  if (API_ESTADO.testado) return Promise.resolve(API_ESTADO.on);
  return apiReq('GET', '/api/health').then(function (r) {
    API_ESTADO.testado = true;
    API_ESTADO.on = !r.semConexao;
    if (!API_ESTADO.on) {
      // avisa uma única vez que está em modo demonstração
      setTimeout(function () { toast('Servidor não encontrado — modo demonstração.', 'info'); }, 600);
    }
    return API_ESTADO.on;
  });
}

// ---------- feedback padrão ----------
function _ok(dado) { return { sucesso: true, dado: dado }; }
function _err(msg) { return { sucesso: false, erro: msg }; }
function _delay() { return new Promise(function (r) { setTimeout(r, 250); }); }

var API = {

  // ---------- Autenticação ----------
  login: function (email, senha) {
    return apiDisponivel().then(function (on) {
      if (on) return apiReq('POST', '/api/auth/login', { email: email, senha: senha }).then(mapR);
      return _delay().then(function () {
        var lista = CLIENTES_BASE.concat(contasLocais());
        for (var i = 0; i < lista.length; i++) {
          if (lista[i].email === email) {
            definirSessaoCliente({ nome: lista[i].nome, email: lista[i].email, tipo: 'cliente' });
            return _ok({ nome: lista[i].nome, email: lista[i].email, tipo: 'cliente' });
          }
        }
        if (/admin/.test(String(email || '').toLowerCase())) {
          definirSessaoAdmin({ nome: 'Administrador', email: email, tipo: 'admin' });
          return _ok({ nome: 'Administrador', email: email, tipo: 'admin' });
        }
        return _err('Conta não encontrada. Cadastre-se para continuar.');
      });
    });
  },

  cadastrar: function (form) {
    return apiDisponivel().then(function (on) {
      if (on) return apiReq('POST', '/api/auth/cadastro', form).then(mapR);
      return _delay().then(function () {
        var contas = contasLocais();
        for (var i = 0; i < contas.length; i++) {
          if (contas[i].email === form.email) return _err('Este e-mail já está cadastrado.');
        }
        if (form.senha !== form.confirmacao) return _err('A confirmação de senha não confere.');
        if (form.senha.length < 6) return _err('A senha precisa ter pelo menos 6 caracteres.');
        var conta = { id: 'C-' + String(Date.now()).slice(-4), nome: form.nome, email: form.email, telefone: form.telefone, desde: 'Nova conta' };
        contas.push(conta);
        salvarContas(contas);
        definirSessaoCliente({ nome: form.nome, email: form.email, tipo: 'cliente' });
        return _ok({ nome: form.nome, email: form.email, tipo: 'cliente' });
      });
    });
  },

  recuperarSenha: function (email) {
    return apiDisponivel().then(function (on) {
      if (on) return apiReq('POST', '/api/auth/recuperar', { email: email }).then(mapR);
      return _delay().then(function () {
        if (!email) return _err('Informe seu e-mail.');
        return _ok({ email: email });
      });
    });
  },

  sair: function () {
    return apiDisponivel().then(function (on) {
      definirSessaoCliente(null);
      definirSessaoAdmin(null);
      if (on) return apiReq('POST', '/api/auth/sair').then(function () { return _ok(true); });
      return _ok(true);
    });
  },

  // Usuário atualmente logado (via cookie no modo API)
  me: function () {
    return apiDisponivel().then(function (on) {
      if (on) return apiReq('GET', '/api/auth/me').then(mapR);
      var s = sessaoAdmin() || sessaoCliente();
      if (s) return _ok(s);
      return _err('Sessão não encontrada.');
    });
  },

  // ---------- Conta (trocar e-mail / senha) ----------
  alterarEmail: function (dados) {
    return apiDisponivel().then(function (on) {
      if (on) return apiReq('POST', '/api/conta/alterar-email', dados).then(mapR);
      return _delay().then(function () {
        var s = sessaoCliente() || sessaoAdmin();
        if (!s) return _err('Faça login para continuar.');
        var contas = contasLocais();
        for (var i = 0; i < contas.length; i++) {
          if (contas[i].email === s.email) { contas[i].email = dados.novoEmail; salvarContas(contas); }
        }
        if (s.tipo === 'cliente') definirSessaoCliente({ nome: s.nome, email: dados.novoEmail, tipo: 'cliente' });
        return _ok({ email: dados.novoEmail });
      });
    });
  },

  alterarSenha: function (dados) {
    return apiDisponivel().then(function (on) {
      if (on) return apiReq('POST', '/api/conta/alterar-senha', dados).then(mapR);
      // offline (demo): não armazenamos senha no navegador — apenas valida confirmação
      return _delay().then(function () {
        if (!dados.novaSenha || dados.novaSenha.length < 6) return _err('A nova senha precisa ter pelo menos 6 caracteres.');
        if (dados.novaSenha !== dados.confirmacao) return _err('A confirmação de senha não confere.');
        return _ok({ alterado: true });
      });
    });
  },

  criarOrdem: function (dados) {
    return apiDisponivel().then(function (on) {
      if (on) return apiReq('POST', '/api/ordens', dados).then(mapR);
      return _delay().then(function () {
        var maior = 0;
        ORDENS_BASE.forEach(function (o) {
          var n = parseInt(String(o.numero).replace('OS-', ''), 10);
          if (n > maior) maior = n;
        });
        var numero = 'OS-' + String(maior + 1).padStart(4, '0');
        ORDENS_BASE.unshift({
          numero: numero, clienteId: 'C-NOVO', clienteNome: dados.nome || 'Cliente novo', aparelho: dados.aparelho,
          servico: dados.servico, status: dados.status || 'recebido', valor: dados.valor || 'Sob consulta',
          descricao: dados.descricao || '', garantia: dados.garantia || 'Garantia conforme serviço',
          dataEntrada: new Date().toLocaleDateString('pt-BR')
        });
        return _ok({ numero: numero, clienteCriado: false, senhaPadrao: null });
      });
    });
  },

  redefinirSenha: function (dados) {
    return apiDisponivel().then(function (on) {
      if (on) return apiReq('POST', '/api/conta/redefinir-senha', dados).then(mapR);
      return _delay().then(function () {
        if (!dados.novaSenha || dados.novaSenha.length < 6) return _err('A nova senha precisa ter pelo menos 6 caracteres.');
        if (dados.novaSenha !== dados.confirmacao) return _err('A confirmação de senha não confere.');
        if (!contaExiste(dados.email)) return _err('E-mail ou senha atual incorretos.');
        return _ok({ nome: 'você', alterado: true });
      });
    });
  },

  redefinirEmail: function (dados) {
    return apiDisponivel().then(function (on) {
      if (on) return apiReq('POST', '/api/conta/redefinir-email', dados).then(mapR);
      return _delay().then(function () {
        if (!/^\S+@\S+\.\S+$/.test(dados.novoEmail)) return _err('Informe um e-mail válido.');
        if (!contaExiste(dados.email)) return _err('E-mail ou senha atuais incorretos.');
        var contas = contasLocais();
        for (var i = 0; i < contas.length; i++) {
          if (contas[i].email === dados.email) { contas[i].email = dados.novoEmail; salvarContas(contas); }
        }
        return _ok({ nome: 'você', email: dados.novoEmail });
      });
    });
  },

  // ---------- Serviços ----------
  listarServicos: function () {
    return apiDisponivel().then(function (on) {
      aplicarOverridesServicos();
      var base = SERVICOS.slice();
      if (!on) return _ok(base);
      return apiReq('GET', '/api/servicos').then(function (r) {
        if (!r.sucesso) return _ok(base);
        aplicarOverridesServicos(true); // recarrega do localStorage
        r.dado.forEach(function (ov) {
          var local = localStorage.getItem('sempreon_servicos_overrides');
          var over = {}; try { over = JSON.parse(local); } catch (e) { over = {}; }
          over[ov.slug] = ov; // servidor tem prioridade
          localStorage.setItem('sempreon_servicos_overrides', JSON.stringify(over));
        });
        aplicarOverridesServicos();
        return _ok(SERVICOS.slice());
      });
    });
  },

  salvarServico: function (slug, dados) {
    return apiDisponivel().then(function (on) {
      if (on) return apiReq('PUT', '/api/servicos/' + slug, { dados: dados }).then(function (r) {
        if (r.sucesso) persistirServico(slug, dados);
        return mapR(r, 'Alterações salvas.');
      });
      return _delay().then(function () { persistirServico(slug, dados); return _ok({ slug: slug }); });
    });
  },

  // ---------- Clientes e ordens ----------
  listarClientes: function () {
    return apiDisponivel().then(function (on) {
      if (on) return apiReq('GET', '/api/clientes').then(mapR);
      return _delay().then(function () { return _ok(CLIENTES_BASE.slice()); });
    });
  },

  listarOrdens: function () {
    return apiDisponivel().then(function (on) {
      if (on) return apiReq('GET', '/api/ordens').then(mapR);
      return _delay().then(function () { return _ok(ORDENS_BASE.slice()); });
    });
  },

  buscarOrdem: function (numero) {
    return apiDisponivel().then(function (on) {
      if (on) return apiReq('GET', '/api/ordens/' + encodeURIComponent(numero)).then(mapR);
      return _delay().then(function () {
        for (var i = 0; i < ORDENS_BASE.length; i++) {
          if (ORDENS_BASE[i].numero === numero) return _ok(ORDENS_BASE[i]);
        }
        return _err('Ordem de serviço não encontrada.');
      });
    });
  },

  atualizarStatusOrdem: function (numero, novoStatus) {
    return apiDisponivel().then(function (on) {
      if (on) return apiReq('PATCH', '/api/ordens/' + encodeURIComponent(numero), { status: novoStatus }).then(mapR);
      return _delay().then(function () {
        for (var i = 0; i < ORDENS_BASE.length; i++) {
          if (ORDENS_BASE[i].numero === numero) { ORDENS_BASE[i].status = novoStatus; return _ok(ORDENS_BASE[i]); }
        }
        return _err('Ordem de serviço não encontrada.');
      });
    });
  },

  ordensDoCliente: function (email) {
    return apiDisponivel().then(function (on) {
      if (on) return apiReq('GET', '/api/ordens?me=1').then(mapR);
      return _delay().then(function () {
        var contas = contasLocais();
        var match = null;
        for (var i = 0; i < CLIENTES_BASE.length; i++) { if (CLIENTES_BASE[i].email === email) match = CLIENTES_BASE[i]; }
        for (var j = 0; j < contas.length; j++) { if (contas[j].email === email) match = contas[j]; }
        if (!match) return _err('Nenhuma ordem encontrada para este e-mail.');
        var ordens = ORDENS_BASE.filter(function (o) { return o.clienteId === match.id; });
        return _ok(ordens);
      });
    });
  },

  // ---------- Antes e depois ----------
  listarAntesDepois: function () {
    return apiDisponivel().then(function () {
      return _ok(ANTES_DEPOIS_BASE.slice());
    });
  },

  // ---------- Orçamento ----------
  enviarOrcamento: function (formulario) {
    return apiDisponivel().then(function (on) {
      if (on) return apiReq('POST', '/api/orcamentos', formulario).then(function (r) { return mapR(r, 'Orçamento registrado no sistema.'); });
      return _delay().then(function () {
        if (!formulario.nome || !formulario.telefone || !formulario.modelo) {
          return _err('Preencha nome, telefone e modelo do aparelho.');
        }
        return _ok({ protocolo: 'ORC-' + String(Date.now()).slice(-5), fotos: 0 });
      });
    });
  },

  // ---------- Indicadores (admin) ----------
  indicadores: function () {
    return apiDisponivel().then(function (on) {
      if (on) return apiReq('GET', '/api/admin/indicadores').then(mapR);
      return _delay().then(function () {
        var pronto = 0, reparo = 0, aprovacao = 0, testes = 0, diagnosticos = 0, recebidos = 0;
        ORDENS_BASE.forEach(function (o) {
          if (o.status === 'pronto' || o.status === 'entregue') pronto++;
          else if (o.status === 'reparo') reparo++;
          else if (o.status === 'aprovacao') aprovacao++;
          else if (o.status === 'testes') testes++;
          else if (o.status === 'diagnostico') diagnosticos++;
          else if (o.status === 'recebido') recebidos++;
        });
        return _ok({
          clientes: CLIENTES_BASE.length + contasLocais().length, emReparo: reparo, orcamentosPendentes: aprovacao,
          emAndamento: recebidos + diagnosticos + reparo + testes, prontos: pronto, totalOrdens: ORDENS_BASE.length
        });
      });
    });
  }
};

// ---------- mapeia resposta do servidor para {sucesso, dado/erro} ----------
function mapR(r, msgPadrao) {
  if (r && r.semConexao) return _err('Servidor indisponível.');
  if (r && r.sucesso) return _ok(r.dado);
  return _err((r && r.erro) || msgPadrao || 'Algo deu errado.');
}