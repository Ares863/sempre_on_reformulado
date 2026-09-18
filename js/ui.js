// ============================================================
// SEMPRE ON CELULARES — Utilitários de interface (compartilhados)
// ============================================================
var UI = {};

// ---------- Menu mobile ----------
function initMenu() {
  var b = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (!b || !links) return;
  function fechar() {
    links.classList.remove('open');
    b.setAttribute('aria-expanded', 'false');
  }
  b.addEventListener('click', function (e) {
    e.stopPropagation();
    var aberto = links.classList.toggle('open');
    b.setAttribute('aria-expanded', aberto);
  });
  // fecha ao tocar num link (útil nos atalhos #âncora) e ao tocar fora
  links.addEventListener('click', function (e) { if (e.target.closest('a')) fechar(); });
  document.addEventListener('click', function (e) {
    if (links.classList.contains('open') && !links.contains(e.target) && !b.contains(e.target)) fechar();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechar(); });
}

// ---------- Link ativo no menu ----------
function destacaLinkAtivo() {
  var atual = paginaAtiva();
  var links = document.querySelectorAll('#navLinks a[data-page]');
  for (var i = 0; i < links.length; i++) {
    if (links[i].getAttribute('data-page') === atual) links[i].classList.add('active');
  }
}

// ---------- Ano atual no rodapé ----------
function anoAtual() {
  var el = document.getElementById('ano');
  if (el) el.textContent = new Date().getFullYear();
}

// ---------- Modal ----------
function abrirModal(id) {
  var m = document.getElementById(id);
  if (!m) return;
  m.classList.add('open');
  document.body.style.overflow = 'hidden';
  var f = m.querySelector('input,select,textarea');
  if (f && m.getAttribute('data-autofocus') !== 'no') setTimeout(function () { f.focus(); }, 60);
}
function fecharModal(id) {
  var m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('open');
  document.body.style.overflow = '';
  var midia = m.querySelector('iframe,video');
  if (midia) {
    if (midia.pause) midia.pause();
    if (midia.tagName === 'IFRAME') midia.setAttribute('src', '');
    else midia.removeAttribute('src');
  }
}
function iniModal() {
  document.addEventListener('click', function (e) {
    if (e.target.classList && e.target.classList.contains('modal') && e.target.getAttribute('data-bg-close') !== 'no') {
      fecharModal(e.target.id);
    }
    if (e.target.classList && e.target.classList.contains('modal-close')) fecharModal(e.target.closest('.modal').id);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var abertos = document.querySelectorAll('.modal.open');
      for (var i = 0; i < abertos.length; i++) fecharModal(abertos[i].id);
    }
  });
}

// ---------- Modal de vídeo ----------
function abrirVideoModal(servico) {
  var titulo = document.getElementById('modalVideoTitulo');
  var corp = document.getElementById('modalVideoCorpo');
  if (!corp) return;
  titulo.textContent = servico.video.titulo || 'Vídeo demonstrativo';

  if (servico.video.youtubeId) {
    corp.innerHTML = '<div class="play-frame"><iframe src="https://www.youtube-nocookie.com/embed/' +
      servico.video.youtubeId + '?rel=0" title="' + servico.nome +
      '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>';
  } else if (servico.video.arquivo) {
    corp.innerHTML = '<div class="play-frame"><video controls preload="none" src="' + servico.video.arquivo + '"></video></div>';
  } else {
    corp.innerHTML =
      '<div class="video-placeholder">' +
      '<div style="font-size:40px">🎬</div>' +
      '<div><strong>' + servico.video.titulo + '</strong></div>' +
      '<div style="max-width:420px">Este vídeo ainda está em produção. Assim que publicado, ele aparecerá aqui.<br><span class="small">Para adicionar um vídeo real, o administrador preenche o link do YouTube ou o arquivo no painel (aba Serviços/Vídeos).</span></div>' +
      '</div>';
  }
  abrirModal('modalVideo');
}

// ---------- Toast ----------
function toast(texto, tipo) {
  var box = document.getElementById('toasts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toasts';
    box.className = 'toasts';
    document.body.appendChild(box);
  }
  var t = document.createElement('div');
  t.className = 'toast ' + (tipo || 'info');
  t.textContent = texto;
  box.appendChild(t);
  setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; }, 3200);
  setTimeout(function () { t.remove(); }, 3800);
}

// ---------- Reveal on scroll ----------
function initReveal(scope) {
  var alvo = scope || document;
  var itens = alvo.querySelectorAll('.reveal:not(.in)');
  if (!('IntersectionObserver' in window)) {
    for (var i = 0; i < itens.length; i++) itens[i].classList.add('in');
    return;
  }
  var obs = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); obs.unobserve(en.target); }
    });
  }, { threshold: 0.12 });
  itens.forEach(function (el) { obs.observe(el); });
}

// ---------- Comparador antes / depois ----------
function initComparadores(scope) {
  var alvo = scope || document;
  var bares = alvo.querySelectorAll('.ba:not([data-init])');
  bares.forEach(function (el) {
    el.setAttribute('data-init', '1');
    var input = el.querySelector('input[type=range]');
    var depois = el.querySelector('.ba-depois');
    var handle = el.querySelector('.ba-handle');
    function mover(v) {
      depois.style.clipPath = 'inset(0 0 0 ' + v + '%)';
      handle.style.left = v + '%';
    }
    if (!input || !depois || !handle) return;
    input.addEventListener('input', function () { mover(input.value); });
    mover(50);
  });
}

// ---------- Select de status ----------
function selectStatus(chave) {
  var opcoes = '';
  for (var i = 0; i < STATUS_OPCOES.length; i++) {
    var s = STATUS_OPCOES[i];
    opcoes += '<option value="' + s.chave + '"' + (s.chave === chave ? ' selected' : '') + '>' + s.icone + ' ' + s.rotulo + '</option>';
  }
  return '<select class="mini" data-status-select>' + opcoes + '</select>';
}

function pillStatus(chave) {
  var rot = rotuloStatus(chave);
  return '<span class="status ' + chave + '">' + rot + '</span>';
}

// ---------- Estado de carregamento em botões ----------
function botaoLoading(btn, carregando, textoNormal) {
  if (carregando) {
    btn.setAttribute('data-normal', btn.innerHTML);
    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> Enviando...';
  } else {
    btn.classList.remove('loading');
    if (btn.getAttribute('data-normal')) btn.innerHTML = btn.getAttribute('data-normal');
  }
}

// ---------- Máscara de telefone ----------
function maskTelefone(input) {
  input.addEventListener('input', function () {
    var v = input.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 6) v = '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7);
    else if (v.length > 2) v = '(' + v.slice(0, 2) + ') ' + v.slice(2);
    input.value = v;
  });
}

// ---------- Render de serviços (cards reutilizáveis) ----------
function renderCardsServicos(lista, container) {
  container.innerHTML = lista.map(function (s) {
    return '<div class="card clickable reveal" data-servico="' + s.slug + '" tabindex="0" role="link" aria-label="Ver detalhes de ' + s.nome + '">' +
      '<div class="icon">' + s.icone + '</div><h3>' + s.nome + '</h3><p>' + s.resumo + '</p>' +
      '<span class="link-more">Ver detalhes →</span></div>';
  }).join('');
}

function bindCardsServicos(cardsDir) {
  var body = document;
  body.addEventListener('click', function (e) {
    var card = e.target.closest('[data-servico]');
    if (card) {
      var slug = card.getAttribute('data-servico');
      var dir = (typeof cardsDir !== 'undefined' && cardsDir) ? cardsDir : '';
      window.location.href = dir + 'servico.html?s=' + slug;
    }
  });
  body.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var card = e.target.closest('[data-servico]');
    if (card) card.click();
  });
}

// ---------- Boot geral ----------
document.addEventListener('DOMContentLoaded', function () {
  initMenu();
  destacaLinkAtivo();
  anoAtual();
  iniModal();
  initReveal();
  initComparadores();
  var tel = document.querySelectorAll('input[type=tel]');
  tel.forEach(function (t) { maskTelefone(t); });
});