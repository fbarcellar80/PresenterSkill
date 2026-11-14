/* presenter-slides · core.js — utilitários, i18n e helpers de DOM/SVG */
(function () {
  'use strict';
  const PS = (window.PS = window.PS || {});
  const SVGNS = 'http://www.w3.org/2000/svg';

  PS.$ = (sel, root = document) => root.querySelector(sel);
  PS.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function setAttrs(node, attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') node.setAttribute('class', v);
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') { for (const p in v) { if (p.startsWith('--')) node.style.setProperty(p, v[p]); else node.style[p] = v[p]; } }
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    }
  }
  function append(node, kids) {
    for (const c of kids.flat()) {
      if (c === null || c === undefined || c === false) continue;
      node.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
    }
    return node;
  }
  /** el('div', {class:'x', onclick: fn}, filhos...) */
  PS.el = (tag, attrs = {}, ...kids) => { const n = document.createElement(tag); setAttrs(n, attrs); return append(n, kids); };
  PS.svg = (tag, attrs = {}, ...kids) => { const n = document.createElementNS(SVGNS, tag); setAttrs(n, attrs); return append(n, kids); };

  PS.icon = (name, cls = '') => {
    const s = PS.svg('svg', { class: ('icon ' + cls).trim(), 'aria-hidden': 'true', focusable: 'false' });
    s.appendChild(PS.svg('use', { href: '#i-' + name }));
    return s;
  };
  PS.clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  let _uid = 0; PS.uid = (p = 'ps') => `${p}-${++_uid}`;

  // ---------- configuração injetada pelo build ----------
  let cfg = {};
  try { cfg = JSON.parse((document.getElementById('ps-config') || {}).textContent || '{}'); } catch (e) { cfg = {}; }
  PS.cfg = cfg;
  PS.lang = cfg.lang || document.documentElement.lang || 'pt-BR';

  // ---------- i18n da interface ----------
  const I18N = {
    pt: { prev: 'Slide anterior', next: 'Próximo slide', overview: 'Visão geral', theme: 'Tema', settings: 'Ajustes', fullscreen: 'Tela cheia', help: 'Atalhos', notes: 'Notas do apresentador', close: 'Fechar', back: 'Voltar para o slide', auto: 'Auto', light: 'Claro', dark: 'Escuro', palette: 'Paleta de cores', textsize: 'Tamanho do texto', motion: 'Animações', mode: 'Modo', slideof: 'Slide {n} de {total}', moreinfo: 'Saiba mais', goto: 'Ir para o slide', reset: 'Restaurar', play: 'Animar', pause: 'Pausar', draw: 'Sortear', add: 'Adicionar', sampleSize: 'Tamanho da amostra', check: 'Verificar', correct: 'Correto!', incorrect: 'Não é essa.', before: 'Antes', after: 'Depois', slides: 'Slides', nonotes: 'Sem notas para este slide.', total: 'Total', samples: 'amostras', mean: 'Média', sd: 'Desvio-padrão', theory: 'Normal com mesma média e σ', keys: { next: 'Próximo (também Espaço, Enter, PageDown)', prev: 'Anterior (também Backspace, PageUp)', homeend: 'Primeiro / último slide', jump: 'Digite o número e Enter para ir a um slide', o: 'Visão geral dos slides', t: 'Alternar tema claro/escuro', p: 'Trocar paleta de cores', f: 'Tela cheia', n: 'Notas do apresentador', b: 'Tela preta (apresentação)', esc: 'Fechar painéis' } },
    en: { prev: 'Previous slide', next: 'Next slide', overview: 'Overview', theme: 'Theme', settings: 'Settings', fullscreen: 'Fullscreen', help: 'Shortcuts', notes: 'Speaker notes', close: 'Close', back: 'Back to slide', auto: 'Auto', light: 'Light', dark: 'Dark', palette: 'Color palette', textsize: 'Text size', motion: 'Animations', mode: 'Mode', slideof: 'Slide {n} of {total}', moreinfo: 'Learn more', goto: 'Go to slide', reset: 'Reset', play: 'Animate', pause: 'Pause', draw: 'Draw', add: 'Add', sampleSize: 'Sample size', check: 'Check', correct: 'Correct!', incorrect: 'Not quite.', before: 'Before', after: 'After', slides: 'Slides', nonotes: 'No notes for this slide.', total: 'Total', samples: 'samples', mean: 'Mean', sd: 'Std. dev.', theory: 'Normal with same mean & σ', keys: { next: 'Next (also Space, Enter, PageDown)', prev: 'Previous (also Backspace, PageUp)', homeend: 'First / last slide', jump: 'Type a number and Enter to jump to a slide', o: 'Slide overview', t: 'Toggle light/dark theme', p: 'Cycle color palette', f: 'Fullscreen', n: 'Speaker notes', b: 'Black screen (presenting)', esc: 'Close panels' } },
    es: { prev: 'Diapositiva anterior', next: 'Siguiente diapositiva', overview: 'Vista general', theme: 'Tema', settings: 'Ajustes', fullscreen: 'Pantalla completa', help: 'Atajos', notes: 'Notas del presentador', close: 'Cerrar', back: 'Volver a la diapositiva', auto: 'Auto', light: 'Claro', dark: 'Oscuro', palette: 'Paleta de colores', textsize: 'Tamaño del texto', motion: 'Animaciones', mode: 'Modo', slideof: 'Diapositiva {n} de {total}', moreinfo: 'Saber más', goto: 'Ir a la diapositiva', reset: 'Restablecer', play: 'Animar', pause: 'Pausar', draw: 'Sortear', add: 'Añadir', sampleSize: 'Tamaño de muestra', check: 'Comprobar', correct: '¡Correcto!', incorrect: 'No es esa.', before: 'Antes', after: 'Después', slides: 'Diapositivas', nonotes: 'Sin notas para esta diapositiva.', total: 'Total', samples: 'muestras', mean: 'Media', sd: 'Desv. típica', theory: 'Normal con misma media y σ', keys: { next: 'Siguiente (también Espacio, Enter, PageDown)', prev: 'Anterior (también Retroceso, PageUp)', homeend: 'Primera / última', jump: 'Escribe el número y Enter para saltar', o: 'Vista general', t: 'Alternar tema claro/oscuro', p: 'Cambiar paleta', f: 'Pantalla completa', n: 'Notas del presentador', b: 'Pantalla negra', esc: 'Cerrar paneles' } },
  };
  PS.dict = I18N[(PS.lang || 'pt').slice(0, 2)] || I18N.en;
  PS.t = (k, vars) => {
    let s = PS.dict[k] ?? I18N.en[k] ?? k;
    if (vars) for (const v in vars) s = s.replace('{' + v + '}', vars[v]);
    return s;
  };

  // ---------- cores de séries ----------
  const NAMED = { accent: '--accent', accent2: '--accent2', accent3: '--accent3', c1: '--c1', c2: '--c2', c3: '--c3', c4: '--c4', c5: '--c5', c6: '--c6', x4: '--x4', x5: '--x5', x6: '--x6', good: '--good', warn: '--warn', bad: '--bad', muted: '--muted', text: '--text' };
  PS.color = (c, i = 0) => (!c ? `var(--c${(i % 6) + 1})` : NAMED[c] ? `var(${NAMED[c]})` : c);

  PS.fmt = (v, f, o = {}) => PS.math.format(v, f, Object.assign({ lang: PS.lang }, o));
  PS.storage = {
    get(k) { try { return localStorage.getItem('ps:' + (cfg.id || 'deck') + ':' + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('ps:' + (cfg.id || 'deck') + ':' + k, v); } catch (e) { /* ignora */ } },
  };
  PS.widgets = {}; // registro: PS.widgets.lab = (host, config, ctx) => {...}
})();
