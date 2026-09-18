// ============================================================
// SEMPRE ON CELULARES — Configurações gerais
// Informações reais da empresa. Altere aqui em um único lugar.
// ============================================================
const CONFIG = {
  empresa: 'Sempre On Celulares',
  cidade: 'Taubaté - SP',
  whatsapp: '5512992373354',
  telefones: ['(12) 99237-3354', '(12) 3424-8454'],
  endereco: 'R. Dr. Pedro Costa, 311 — Centro, Taubaté-SP',
  instagram: '@sempreoncelulares',
  instagramUrl: 'https://www.instagram.com/sempreoncelulares',
  ultimaAtualizacao: '2026-09-11'
};

// Monta um link do WhatsApp com mensagem pré-preenchida
function waLink(mensagem) {
  const base = 'https://wa.me/' + CONFIG.whatsapp;
  return mensagem ? base + '?text=' + encodeURIComponent(mensagem) : base;
}

// Mensagens de contexto (cada botão usa uma mensagem diferente)
const MSGS = {
  orcamento: function () { return 'Olá! Gostaria de solicitar um orçamento.'; },
  servico: function (servico) { return 'Olá! Gostaria de solicitar um orçamento para ' + servico + '.'; },
  duvida: 'Olá! Tenho uma dúvida sobre o serviço de vocês.'
};

// Detecta o caminho base (páginas em /pages/ usam ../ para assets)
const BASE = (function () {
  var p = window.location.pathname;
  return /\/pages\//.test(p) ? '../' : '';
}());
function asset(path) { return BASE + path; }

// Verifica/detecta qual página está ativa para destacar no menu
function paginaAtiva() {
  var n = window.location.pathname.split('/').pop() || 'index.html';
  if (n === 'index.html') return 'inicio';
  return n.replace('.html', '');
}