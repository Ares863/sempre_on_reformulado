// ============================================================
// SEMPRE ON CELULARES — Catálogo de serviços
// Cada serviço vira um card na home e uma página detalhada.
// Vídeos ficam como estrutura vazia (veja "video"): para publicar
// um vídeo real, basta preencher youtubeId ou apontar um arquivo.
// ============================================================

// Caminho base para imagens (funciona dentro e fora de /pages/)
var ASSET = (typeof asset === 'function') ? asset : function (p) { return p; };

var SERVICOS_BASE = [
  {
    slug: 'troca-de-vidro',
    nome: 'Troca de vidro',
    icone: '▣',
    resumo: 'Quando o display está funcionando, substituímos apenas o vidro e preservamos o conjunto original.',
    problemas: [
      'Vidro rachado ou trincado',
      'Vidro quebrado com circuito ainda funcionando normalmente',
      'Toque e imagem funcionando, somente o vidro danificado'
    ],
    processo: [
      'Avaliação e diagnóstico do aparelho',
      'Remoção controlada do vidro quebrado',
      'Limpeza e preparação da superfície',
      'Aplicação e cura do vidro de reposição',
      'Testes finais de toque, imagem e vedação'
    ],
    prazo: 'Definido após o diagnóstico (consulte no orçamento)',
    garantia: 'Garantia conforme o serviço — confirmada no orçamento',
    preco: 'Sob consulta',
    foto: 'assets/img/placeholder-servico.svg',
    video: {
      titulo: 'Como é feita a troca de vidro',
      tag: 'Vídeo em produção',
      youtubeId: null,
      arquivo: null
    }
  },
  {
    slug: 'reparo-de-placa',
    nome: 'Reparo de placa',
    icone: '⌁',
    resumo: 'Diagnóstico e reparo avançado para falhas na placa lógica, evitando condenar o aparelho sem necessidade.',
    problemas: [
      'Aparelho não liga',
      'Curtos, aquecimento ou consumo anormal de bateria',
      'Falhas de rede, Wi-Fi, Bluetooth ou som',
      'Queda na água com oxidação na placa'
    ],
    processo: [
      'Avaliação detalhada da placa em bancada',
      'Identificação do componente ou trilha com defeito',
      'Reparo ou substituição do componente',
      'Limpeza e proteção (quando aplicável)',
      'Testes completos de funcionamento'
    ],
    prazo: 'Conforme a complexidade — definido após o diagnóstico',
    garantia: 'Garantia conforme o serviço — confirmada no orçamento',
    preco: 'Sob consulta',
    foto: 'assets/img/placeholder-servico.svg',
    video: {
      titulo: 'Como é feito o reparo de placa',
      tag: 'Vídeo em produção',
      youtubeId: null,
      arquivo: null
    }
  },
  {
    slug: 'troca-de-bateria',
    nome: 'Troca de bateria',
    icone: '▰',
    resumo: 'Substituição de bateria para recuperar autonomia e desempenho, com garantia conforme o serviço.',
    problemas: [
      'Bateria descarregando rápido demais',
      'Aparelho desligando com carga ainda disponível',
      'Bateria com inchaço ou aquecimento',
      'Desempenho reduzido após anos de uso'
    ],
    processo: [
      'Diagnóstico da capacidade da bateria',
      'Desmontagem cuidadosa do aparelho',
      'Substituição da bateria',
      'Calibração e teste de autonomia'
    ],
    prazo: 'Definido após o diagnóstico (consulte no orçamento)',
    garantia: 'Garantia conforme o serviço — confirmada no orçamento',
    preco: 'Sob consulta',
    foto: 'assets/img/placeholder-servico.svg',
    video: {
      titulo: 'Como é feita a troca de bateria',
      tag: 'Vídeo em produção',
      youtubeId: null,
      arquivo: null
    }
  },
  {
    slug: 'troca-de-tela',
    nome: 'Troca de tela',
    icone: '▧',
    resumo: 'Troca de telas de qualidade, com restauração de imagem, toque e acabamento.',
    problemas: [
      'Tela quebrada, trincada ou com pontos pretos',
      'Toque sem resposta ou com falhas',
      'Manchas, linhas ou perda de imagem',
      'Tela esverdeada ou injetada'
    ],
    processo: [
      'Diagnóstico e conferência do modelo',
      'Desmontagem com ferramentas adequadas',
      'Instalação da nova tela',
      'Alinhamento, selagem e acabamento',
      'Testes de imagem, toque, cores e sensores'
    ],
    prazo: 'Definido após o diagnóstico (consulte no orçamento)',
    garantia: 'Garantia conforme o serviço — confirmada no orçamento',
    preco: 'Sob consulta',
    foto: 'assets/img/placeholder-servico.svg',
    video: {
      titulo: 'Como é feita a troca de tela',
      tag: 'Vídeo em produção',
      youtubeId: null,
      arquivo: null
    }
  },
  {
    slug: 'reparo-de-camera',
    nome: 'Reparo de câmera',
    icone: '◉',
    resumo: 'Reparo ou substituição de componentes para voltar a registrar fotos e vídeos normalmente.',
    problemas: [
      'Câmera desfocada ou sem foco',
      'Foto escura, com manchas ou ruído',
      'Câmera não abre ou trava',
      'Lente trincada ou riscada'
    ],
    processo: [
      'Diagnóstico do módulo de câmera e das lentes',
      'Limpeza ou substituição dos componentes',
      'Montagem e calibração',
      'Testes de fotos, vídeos e foco'
    ],
    prazo: 'Definido após o diagnóstico (consulte no orçamento)',
    garantia: 'Garantia conforme o serviço — confirmada no orçamento',
    preco: 'Sob consulta',
    foto: 'assets/img/placeholder-servico.svg',
    video: {
      titulo: 'Como é feito o reparo de câmera',
      tag: 'Vídeo em produção',
      youtubeId: null,
      arquivo: null
    }
  },
  {
    slug: 'servicos-gerais',
    nome: 'Serviços gerais',
    icone: '✦',
    resumo: 'Limpeza, componentes internos, conectores, software e outros reparos conforme diagnóstico.',
    problemas: [
      'Mau contato em conectores e botões',
      'Falhas de áudio, som ou motor de vibração',
      'Aparelho reiniciando ou com travamentos',
      'Limpeza após exposição a líquido ou poeira'
    ],
    processo: [
      'Diagnóstico completo do aparelho',
      'Definição da melhor solução',
      'Reparo, limpeza ou substituição de componentes',
      'Testes finais de funcionamento'
    ],
    prazo: 'Definido após o diagnóstico',
    garantia: 'Garantia conforme o serviço — confirmada no orçamento',
    preco: 'Sob consulta',
    foto: 'assets/img/placeholder-servico.svg',
    video: {
      titulo: 'Como trabalhamos em serviços gerais',
      tag: 'Vídeo em produção',
      youtubeId: null,
      arquivo: null
    }
  }
];

// ============================================================
// Camada de override salva pelo painel admin (localStorage).
// Os vídeos reais entram pelo painel -> aba Vídeos.
// ============================================================
var SERVICOS = SERVICOS_BASE.map(function (s) { return Object.assign({}, s); });

function aplicarOverridesServicos() {
  try {
    var over = JSON.parse(localStorage.getItem('sempreon_servicos_overrides')) || {};
    SERVICOS = SERVICOS_BASE.map(function (s) {
      var merged = Object.assign({}, s, over[s.slug] || {});
      merged.video = Object.assign({}, s.video, (over[s.slug] && over[s.slug].video) || {});
      return merged;
    });
  } catch (e) {
    SERVICOS = SERVICOS_BASE.map(function (s) { return Object.assign({}, s); });
  }
}

function buscarServico(slug) {
  aplicarOverridesServicos();
  for (var i = 0; i < SERVICOS.length; i++) {
    if (SERVICOS[i].slug === slug) return SERVICOS[i];
  }
  return null;
}

function persistirServico(slug, parcial) {
  aplicarOverridesServicos();
  var over = JSON.parse(localStorage.getItem('sempreon_servicos_overrides') || '{}');
  over[slug] = Object.assign({}, over[slug] || {}, parcial);
  localStorage.setItem('sempreon_servicos_overrides', JSON.stringify(over));
  aplicarOverridesServicos();
}