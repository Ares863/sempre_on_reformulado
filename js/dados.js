// ============================================================
// SEMPRE ON CELULARES — Dados de demonstração
// ATENÇÃO: estes registros são EXEMPLOS para visualizar e testar
// a interface. Substitua pela integração real com o backend/banco
// (ver js/api.js). Nenhum dado de cliente real está armazenado aqui.
// ============================================================

var STATUS_OPCOES = [
  { chave: 'recebido', rotulo: 'Aparelho recebido', icone: '📥' },
  { chave: 'diagnostico', rotulo: 'Em diagnóstico', icone: '🔍' },
  { chave: 'aprovacao', rotulo: 'Aguardando aprovação', icone: '💰' },
  { chave: 'reparo', rotulo: 'Em reparo', icone: '🔧' },
  { chave: 'testes', rotulo: 'Em testes', icone: '🧪' },
  { chave: 'pronto', rotulo: 'Pronto para retirada', icone: '✅' },
  { chave: 'entregue', rotulo: 'Entregue', icone: '📦' }
];

function rotuloStatus(chave) {
  for (var i = 0; i < STATUS_OPCOES.length; i++) {
    if (STATUS_OPCOES[i].chave === chave) return STATUS_OPCOES[i].rotulo;
  }
  return 'Não informado';
}
function iconeStatus(chave) {
  for (var i = 0; i < STATUS_OPCOES.length; i++) {
    if (STATUS_OPCOES[i].chave === chave) return STATUS_OPCOES[i].icone;
  }
  return '📋';
}

var CLIENTES_BASE = [
  { id: 'C-001', nome: 'Camila Macedo', email: 'camila@exemplo.com', telefone: '(12) 99911-2233', desde: 'Jan 2026' },
  { id: 'C-002', nome: 'Guilherme Sousa', email: 'guilherme@exemplo.com', telefone: '(12) 98822-3344', desde: 'Fev 2026' },
  { id: 'C-003', nome: 'Ana Paula Lima', email: 'ana@exemplo.com', telefone: '(12) 97733-4455', desde: 'Mar 2026' }
];

var ORDENS_BASE = [
  {
    numero: 'OS-0001', clienteId: 'C-001', clienteNome: 'Camila Macedo',
    aparelho: 'iPhone 13', servico: 'troca-de-vidro',
    status: 'pronto', valor: 'Sob consulta',
    dataEntrada: '05/09/2026', descricao: 'Vidro trincado, display e toque funcionando normalmente.',
    garantia: 'Sim — garantia conforme serviço'
  },
  {
    numero: 'OS-0002', clienteId: 'C-002', clienteNome: 'Guilherme Sousa',
    aparelho: 'Samsung Galaxy S22', servico: 'troca-de-bateria',
    status: 'reparo', valor: 'Sob consulta',
    dataEntrada: '07/09/2026', descricao: 'Bateria com baixa autonomia e desligamentos.',
    garantia: 'Sim — garantia conforme serviço'
  },
  {
    numero: 'OS-0003', clienteId: 'C-003', clienteNome: 'Ana Paula Lima',
    aparelho: 'iPhone 11', servico: 'reparo-de-camera',
    status: 'diagnostico', valor: 'Sob consulta',
    dataEntrada: '09/09/2026', descricao: 'Fotos escuras e com foco falhando.',
    garantia: 'A confirmar após diagnóstico'
  },
  {
    numero: 'OS-0004', clienteId: 'C-002', clienteNome: 'Guilherme Sousa',
    aparelho: 'Motorola Edge 30', servico: 'reparo-de-placa',
    status: 'aprovacao', valor: 'Sob consulta',
    dataEntrada: '10/09/2026', descricao: 'Aparelho não liga após molhado.',
    garantia: 'Sim — garantia conforme serviço'
  }
];

var ANTES_DEPOIS_BASE = [
  {
    tipo: 'Troca de tela', modelo: 'iPhone 13',
    desc: 'Tela trincada com toque falhando — display substituído e devolvido com imagem e toque perfeitos.',
    antes: 'assets/img/placeholder-antes.svg', depois: 'assets/img/placeholder-depois.svg'
  },
  {
    tipo: 'Troca de bateria', modelo: 'Samsung Galaxy S22',
    desc: 'Bateria com inchaço e baixa autonomia — substituída e testada.',
    antes: 'assets/img/placeholder-antes.svg', depois: 'assets/img/placeholder-depois.svg'
  },
  {
    tipo: 'Troca de vidro', modelo: 'iPhone 11',
    desc: 'Vidro quebrado com display íntegro — apenas o vidro foi substituído.',
    antes: 'assets/img/placeholder-antes.svg', depois: 'assets/img/placeholder-depois.svg'
  }
];

// Contas criadas no fluxo de cadastro demo (NUNCA armazenam senha).
function contasLocais() {
  try { return JSON.parse(localStorage.getItem('sempreon_contas')) || []; }
  catch (e) { return []; }
}
function salvarContas(lista) {
  localStorage.setItem('sempreon_contas', JSON.stringify(lista));
}
function contaExiste(email) {
  var e = String(email || '').toLowerCase();
  return CLIENTES_BASE.some(function (c) { return c.email === e; }) || contasLocais().some(function (c) { return c.email === e; });
}
function sessaoCliente() {
  try { return JSON.parse(localStorage.getItem('sempreon_sessao_cliente')); }
  catch (e) { return null; }
}
function definirSessaoCliente(dados) {
  if (dados) localStorage.setItem('sempreon_sessao_cliente', JSON.stringify(dados));
  else localStorage.removeItem('sempreon_sessao_cliente');
}
function sessaoAdmin() {
  try { return JSON.parse(localStorage.getItem('sempreon_sessao_admin')); }
  catch (e) { return null; }
}
function definirSessaoAdmin(dados) {
  if (dados) localStorage.setItem('sempreon_sessao_admin', JSON.stringify(dados));
  else localStorage.removeItem('sempreon_sessao_admin');
}