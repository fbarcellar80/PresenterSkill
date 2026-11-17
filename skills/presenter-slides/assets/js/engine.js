/* presenter-slides · engine.js
 * Navegação (teclado, clicker, toque, hash), passos, tema/paleta, visão geral, notas,
 * painel de detalhes (ícones "saiba mais"), referências cruzadas entre slides, acessibilidade.
 */
(function () {
  'use strict';
  const { $, $$, el, clamp } = PS;
  const cfg = PS.cfg;
  const root = document.documentElement;
  const mqDark = window.matchMedia('(prefers-color-scheme: dark)');

  const deck = $('.deck');
  const slides = $$('.slide', deck);
  const N = slides.length;
  let cur = -1;
  const stack = []; // pilha de retorno das referências cruzadas
  let lastFocus = null;

  // ====================================================================
  // Preparação dos slides
  // ====================================================================
  const textOf = (n) => (n ? n.textContent.replace(/\s+/g, ' ').trim() : '');
  let carrySection = '';
  slides.forEach((s, i) => {
    if (!s.id) s.id = 's' + (i + 1);
    s.dataset.index = i;
    s.dataset.title = s.dataset.title || textOf($('h1, h2, h3', s)) || 'Slide ' + (i + 1);
    if (s.dataset.section) carrySection = s.dataset.section; else s.dataset.sectionResolved = carrySection;
    if (!s.dataset.sectionResolved) s.dataset.sectionResolved = s.dataset.section || '';
    s.setAttribute('role', 'region'); s.setAttribute('aria-roledescription', 'slide'); s.setAttribute('aria-label', `${i + 1} / ${N}: ${s.dataset.title}`); s.tabIndex = -1;
    // corpo: embrulha o conteúdo se o autor não declarou .slide-body
    if (!$(':scope > .slide-body', s)) {
      const body = el('div', { class: 'slide-body' });
      Array.from(s.childNodes).forEach((n) => { if (!(n.nodeType === 1 && (n.matches('.notes, template, .bg-image, .bg-scrim')))) body.appendChild(n); });
      s.insertBefore(body, s.firstChild);
    }
    // ícones declarativos
    $$('[data-icon]', s).forEach((n) => { if (!$('svg', n)) n.prepend(PS.icon(n.dataset.icon)); });
    $$('.info-btn:empty, .goto-btn:empty', s).forEach((n) => n.appendChild(PS.icon(n.classList.contains('info-btn') ? 'info' : 'arrow-right')));
    $$('.info-btn, .goto-btn', s).forEach((n) => {
      if (!n.getAttribute('aria-label')) { const d = n.dataset.detail ? document.getElementById(n.dataset.detail) : null; n.setAttribute('aria-label', n.classList.contains('info-btn') ? `${PS.t('moreinfo')}${d && d.dataset.title ? ': ' + d.dataset.title : ''}` : `${PS.t('goto')} ${n.dataset.goto}`); }
      if (n.tagName !== 'BUTTON') { n.setAttribute('role', 'button'); n.tabIndex = 0; }
    });
    // animações automáticas de entrada em grades
    $$('.cards, .stats, .steps, .timeline, .stagger', s).forEach((g) => Array.from(g.children).forEach((c, k) => { if (!c.hasAttribute('data-anim')) c.setAttribute('data-anim', 'up'); c.style.setProperty('--i', k); }));
    $$('[data-anim]:not(.cards > *):not(.stats > *):not(.steps > *):not(.timeline > *):not(.stagger > *)', s).forEach((c, k) => { if (!c.style.getPropertyValue('--i')) c.style.setProperty('--i', k); });
    // elementos interativos em SVG ou não-botões precisam de teclado
    $$('[data-detail]:not(button), [data-popup]:not(button), [data-goto]:not(button):not(a), [data-tip]:not(button):not(a):not(input)', s).forEach((n) => { if (!n.hasAttribute('tabindex')) n.setAttribute('tabindex', '0'); if (!n.getAttribute('role')) n.setAttribute('role', 'button'); });
    PS.decorateTerms(s);
    PS.initWidgets(s);
    // passos (fragmentos)
    const sts = $$('[data-step]', s);
    const groups = new Map();
    sts.forEach((n, k) => { const v = parseFloat(n.dataset.step); const key = Number.isFinite(v) ? v : k + 1; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(n); });
    s.__groups = Array.from(groups.keys()).sort((a, b) => a - b).map((k) => groups.get(k)); s.__r = 0;
    // contadores animados
    $$('.counter[data-to]', s).forEach((n) => { n.__final = n.textContent; });
  });

  // ====================================================================
  // Chrome da interface
  // ====================================================================
  const tbtn = (icon, label, attrs = {}) => el('button', Object.assign({ type: 'button', class: 'tbtn', 'aria-label': label, title: label }, attrs), PS.icon(icon));
  const bOverview = tbtn('grid', PS.t('overview')); const bNotes = tbtn('notes', PS.t('notes'), { 'aria-pressed': 'false', class: 'tbtn hide-sm' });
  const bTheme = tbtn('moon', PS.t('theme')); const bSettings = tbtn('settings', PS.t('settings'), { 'aria-expanded': 'false' });
  const bFull = tbtn('maximize', PS.t('fullscreen'), { class: 'tbtn hide-sm' }); const bHelp = tbtn('keyboard', PS.t('help'), { class: 'tbtn hide-sm', 'aria-expanded': 'false' });
  const brandTitle = el('b', {}, cfg.title || document.title); const sectionLabel = el('span', { class: 'section-label' });
  const counter = el('span', { class: 'counter-pill', 'aria-hidden': 'true' });
  const bPrev = tbtn('chevron-left', PS.t('prev')); const bNext = tbtn('chevron-right', PS.t('next'));
  const progress = el('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 1, 'aria-valuemax': N }, el('i'));
  const live = el('div', { class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });
  document.body.append(
    el('div', { class: 'chrome-top' }, el('div', { class: 'brand' }, ...(cfg.logo ? [el('img', { class: 'brand-logo logo-light', src: cfg.logo.light, alt: cfg.logo.alt }), el('img', { class: 'brand-logo logo-dark', src: cfg.logo.dark, alt: '' })] : [el('span', { class: 'dot' })]), brandTitle, el('span', { class: 'sep', 'aria-hidden': 'true' }, '·'), sectionLabel), el('div', { class: 'toolbar', role: 'toolbar', 'aria-label': 'Controles' }, bOverview, bNotes, bTheme, bSettings, bFull, bHelp)),
    el('div', { class: 'chrome-bottom' }, el('span'), el('div', { class: 'nav-btns toolbar' }, bPrev, counter, bNext)),
    progress, live);

  // ====================================================================
  // Tema, paleta, escala, movimento
  // ====================================================================
  const prefs = { mode: PS.storage.get('mode') || cfg.mode || 'auto', palette: PS.storage.get('palette') || cfg.palette || 'aurora', scale: parseFloat(PS.storage.get('scale')) || 1, motion: PS.storage.get('motion') || 'on' };
  const effective = () => (prefs.mode === 'auto' ? (mqDark.matches ? 'dark' : 'light') : prefs.mode);
  function applyPrefs() {
    if (prefs.mode === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', prefs.mode);
    root.setAttribute('data-palette', prefs.palette);
    root.style.setProperty('--ps-scale', prefs.scale);
    root.setAttribute('data-motion', prefs.motion);
    bTheme.textContent = ''; bTheme.appendChild(PS.icon(effective() === 'dark' ? 'sun' : 'moon'));
    bTheme.title = bTheme.ariaLabel = `${PS.t('theme')}: ${PS.t(effective())}`;
    PS.storage.set('mode', prefs.mode); PS.storage.set('palette', prefs.palette); PS.storage.set('scale', prefs.scale); PS.storage.set('motion', prefs.motion);
    if (settingsPanel) syncSettings();
    window.dispatchEvent(new Event('resize')); // gráficos re-medem
  }
  mqDark.addEventListener && mqDark.addEventListener('change', () => { if (prefs.mode === 'auto') applyPrefs(); });
  const toggleTheme = () => { prefs.mode = effective() === 'dark' ? 'light' : 'dark'; applyPrefs(); };
  const palettes = cfg.palettes || [];
  const cyclePalette = () => { if (!palettes.length) return; const i = palettes.findIndex((p) => p.id === prefs.palette); prefs.palette = palettes[(i + 1) % palettes.length].id; applyPrefs(); announce(palettes.find((p) => p.id === prefs.palette).name); };

  // ---- painel de ajustes
  let settingsPanel = null;
  function buildSettings() {
    const seg = el('div', { class: 'seg', role: 'group', 'aria-label': PS.t('mode') });
    [['auto', 'monitor'], ['light', 'sun'], ['dark', 'moon']].forEach(([m, ic]) => { const b = el('button', { type: 'button', 'data-mode': m }, PS.icon(ic), PS.t(m)); b.addEventListener('click', () => { prefs.mode = m; applyPrefs(); }); seg.appendChild(b); });
    const sw = el('div', { class: 'swatches' });
    palettes.forEach((p) => { const b = el('button', { type: 'button', class: 'swatch', 'data-pal': p.id, title: p.mood || p.name }, el('span', { class: 'sw' }, ...p.colors.map((c) => el('i', { style: { background: c } }))), p.name); b.addEventListener('click', () => { prefs.palette = p.id; applyPrefs(); }); sw.appendChild(b); });
    const mkSz = (txt, d) => { const b = el('button', { type: 'button', class: 'btn' }, txt); b.addEventListener('click', () => { prefs.scale = clamp(+(prefs.scale + d).toFixed(2), 0.75, 1.5); applyPrefs(); }); return b; };
    const motion = el('button', { type: 'button', class: 'switch', role: 'switch', 'aria-label': PS.t('motion') }); motion.addEventListener('click', () => { prefs.motion = prefs.motion === 'on' ? 'off' : 'on'; applyPrefs(); });
    settingsPanel = el('div', { class: 'popover', role: 'dialog', 'aria-label': PS.t('settings'), hidden: true },
      el('section', {}, el('h4', {}, PS.t('mode')), seg),
      palettes.length ? el('section', {}, el('h4', {}, PS.t('palette')), sw) : null,
      el('section', {}, el('h4', {}, PS.t('textsize')), el('div', { class: 'btn-row' }, mkSz('A−', -0.1), mkSz('A+', 0.1), el('button', { type: 'button', class: 'btn', onclick: () => { prefs.scale = 1; applyPrefs(); } }, PS.icon('reset'), PS.t('reset')))),
      el('section', {}, el('div', { class: 'row' }, el('h4', { style: { margin: 0 } }, PS.t('motion')), motion)));
    document.body.appendChild(settingsPanel);
  }
  function syncSettings() {
    $$('[data-mode]', settingsPanel).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === prefs.mode)));
    $$('[data-pal]', settingsPanel).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pal === prefs.palette)));
    const sw = $('.switch', settingsPanel); if (sw) sw.setAttribute('aria-checked', String(prefs.motion === 'on'));
  }
  buildSettings();

  // ---- painel de ajuda (atalhos)
  const K = PS.dict.keys;
  const helpPanel = el('div', { class: 'popover', role: 'dialog', 'aria-label': PS.t('help'), hidden: true }, el('h4', {}, PS.t('help')),
    el('dl', { class: 'shortcuts' },
      el('dt', {}, el('kbd', {}, '→'), ' ', el('kbd', {}, '↓'), ' ', el('kbd', {}, 'PgDn')), el('dd', {}, K.next),
      el('dt', {}, el('kbd', {}, '←'), ' ', el('kbd', {}, '↑'), ' ', el('kbd', {}, 'PgUp')), el('dd', {}, K.prev),
      el('dt', {}, el('kbd', {}, 'Home'), ' ', el('kbd', {}, 'End')), el('dd', {}, K.homeend),
      el('dt', {}, el('kbd', {}, '1…9'), el('kbd', {}, '↵')), el('dd', {}, K.jump),
      el('dt', {}, el('kbd', {}, 'O')), el('dd', {}, K.o), el('dt', {}, el('kbd', {}, 'T')), el('dd', {}, K.t), el('dt', {}, el('kbd', {}, 'P')), el('dd', {}, K.p),
      el('dt', {}, el('kbd', {}, 'F')), el('dd', {}, K.f), el('dt', {}, el('kbd', {}, 'N')), el('dd', {}, K.n), el('dt', {}, el('kbd', {}, 'B'), ' ', el('kbd', {}, '.')), el('dd', {}, K.b), el('dt', {}, el('kbd', {}, 'Esc')), el('dd', {}, K.esc)));
  document.body.appendChild(helpPanel);

  function togglePopover(panel, btn, force) {
    const show = force === undefined ? panel.hidden : force;
    [settingsPanel, helpPanel].forEach((p) => { if (p !== panel) p.hidden = true; }); bSettings.setAttribute('aria-expanded', 'false'); bHelp.setAttribute('aria-expanded', 'false');
    panel.hidden = !show; btn.setAttribute('aria-expanded', String(show)); if (show && panel === settingsPanel) syncSettings();
  }
  bSettings.addEventListener('click', () => togglePopover(settingsPanel, bSettings));
  bHelp.addEventListener('click', () => togglePopover(helpPanel, bHelp));
  bTheme.addEventListener('click', toggleTheme);
  bFull.addEventListener('click', toggleFullscreen);
  function toggleFullscreen() { if (document.fullscreenElement) document.exitFullscreen(); else if (root.requestFullscreen) root.requestFullscreen().catch(() => {}); }
  document.addEventListener('fullscreenchange', () => { bFull.textContent = ''; bFull.appendChild(PS.icon(document.fullscreenElement ? 'minimize' : 'maximize')); });

  // ====================================================================
  // Navegação
  // ====================================================================
  const announce = (msg) => { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 30); };

  function applySteps(s) { s.__groups.forEach((g, gi) => g.forEach((n) => n.classList.toggle('step-on', gi < s.__r))); }
  function animateCounters(s) {
    $$('.counter[data-to]', s).forEach((n) => {
      const to = parseFloat(n.dataset.to), from = parseFloat(n.dataset.from || 0), dur = +(n.dataset.duration || 1300); const fmt = n.dataset.format || 'num:0';
      const show = (v) => { n.textContent = (n.dataset.prefix || '') + PS.fmt(v, fmt, { suffix: n.dataset.suffix || '' }); };
      if (prefs.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches) { show(to); return; }
      const t0 = performance.now(); cancelAnimationFrame(n.__raf);
      const tick = (t) => { const p = clamp((t - t0) / dur, 0, 1); show(from + (to - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) n.__raf = requestAnimationFrame(tick); };
      n.__raf = requestAnimationFrame(tick);
    });
  }

  function go(i, opt = {}) {
    i = clamp(i, 0, N - 1); if (i === cur) return;
    const prev = cur; cur = i;
    slides.forEach((s, j) => {
      s.classList.toggle('is-active', j === i); s.classList.toggle('is-before', j < i);
      if (j === i) { s.removeAttribute('aria-hidden'); s.removeAttribute('inert'); } else { s.setAttribute('aria-hidden', 'true'); s.setAttribute('inert', ''); }
    });
    const s = slides[i];
    s.__r = opt.stepsOff ? 0 : s.__groups.length; applySteps(s); s.scrollTop = 0;
    animateCounters(s);
    counter.textContent = `${i + 1} / ${N}`;
    progress.firstChild.style.width = N > 1 ? (i / (N - 1)) * 100 + '%' : '100%'; progress.setAttribute('aria-valuenow', i + 1);
    sectionLabel.textContent = s.dataset.sectionResolved || ''; sectionLabel.previousSibling && (sectionLabel.previousSibling.hidden = !s.dataset.sectionResolved);
    bPrev.disabled = i === 0; bNext.disabled = i === N - 1; bPrev.style.opacity = i === 0 ? 0.35 : 1; bNext.style.opacity = i === N - 1 ? 0.35 : 1;
    document.title = `${s.dataset.title} · ${cfg.title || ''}`.replace(/ · $/, '');
    announce(PS.t('slideof', { n: i + 1, total: N }) + ': ' + s.dataset.title);
    if (opt.focus !== false && prev !== -1) s.focus({ preventScroll: true });
    if (!opt.noHash) { try { history.replaceState(null, '', '#/' + (i + 1)); } catch (e) { /* file:// restrito */ } }
    if (notesPanel && !notesPanel.hidden) renderNotes();
    updateBack();
    $$('#overview [aria-current]').forEach((b) => b.removeAttribute('aria-current'));
    window.dispatchEvent(new CustomEvent('ps:slide', { detail: { index: i, slide: s } }));
  }
  function next() {
    const s = slides[cur];
    if (s.__r < s.__groups.length) { s.__r++; applySteps(s); return; }
    if (cur < N - 1) { go(cur + 1, { stepsOff: true }); const top = stack[stack.length - 1]; if (top === cur) { stack.pop(); updateBack(); } }
  }
  function prev() {
    const s = slides[cur];
    if (s.__r > 0 && s.__groups.length) { s.__r--; applySteps(s); return; }
    if (cur > 0) { go(cur - 1); const top = stack[stack.length - 1]; if (top === cur) { stack.pop(); updateBack(); } }
  }
  bNext.addEventListener('click', next); bPrev.addEventListener('click', prev);

  function resolveTarget(t) {
    if (t === undefined || t === null || t === '') return -1;
    if (/^\d+$/.test(String(t))) return clamp(parseInt(t, 10) - 1, 0, N - 1);
    const j = slides.findIndex((s) => s.id === String(t).replace(/^#\/?/, '')); return j;
  }
  // referência cruzada: salta e permite voltar
  const backChip = el('button', { type: 'button', class: 'back-chip', hidden: true }); document.body.appendChild(backChip);
  function updateBack() {
    if (!stack.length) { backChip.hidden = true; return; }
    const j = stack[stack.length - 1]; backChip.hidden = false; backChip.textContent = ''; backChip.append(PS.icon('arrow-left'), `${PS.t('back')} ${j + 1}: ${slides[j].dataset.title}`);
  }
  backChip.addEventListener('click', () => { const j = stack.pop(); go(j, { stepsOff: false }); updateBack(); });
  function xref(target) {
    const j = resolveTarget(target); if (j < 0) { console.warn('[presenter-slides] data-goto inválido:', target); return; }
    if (j === cur) return; stack.push(cur); go(j); updateBack();
  }

  // ====================================================================
  // Visão geral, notas, detalhes, tooltip, tela preta
  // ====================================================================
  let overview = null;
  function toggleOverview(force) {
    const open = force === undefined ? !overview : force;
    if (!open) { if (overview) { overview.remove(); overview = null; slides[cur].focus({ preventScroll: true }); } return; }
    const grid = el('div', { class: 'ov-grid' });
    slides.forEach((s, i) => {
      const b = el('button', { type: 'button', class: 'ov-card', 'aria-current': i === cur ? 'true' : null }, el('span', { class: 'n' }, el('span', {}, String(i + 1).padStart(2, '0')), s.dataset.icon ? PS.icon(s.dataset.icon) : null), s.dataset.sectionResolved ? el('span', { class: 's' }, s.dataset.sectionResolved) : null, el('span', { class: 't' }, s.dataset.title));
      b.addEventListener('click', () => { toggleOverview(false); go(i); }); grid.appendChild(b);
    });
    overview = el('div', { class: 'overview', id: 'overview', role: 'dialog', 'aria-label': PS.t('overview') }, el('div', { class: 'toolbar', style: { position: 'fixed', top: '.6rem', right: '.9rem' } }, el('button', { type: 'button', class: 'tbtn', 'aria-label': PS.t('close'), onclick: () => toggleOverview(false) }, PS.icon('x'))), el('h2', {}, PS.t('slides')), grid);
    document.body.appendChild(overview); const c = $('[aria-current]', overview); if (c) c.focus();
  }
  bOverview.addEventListener('click', () => toggleOverview());

  let notesPanel = null;
  function renderNotes() { const n = $('.notes', slides[cur]); notesPanel.innerHTML = ''; notesPanel.append(el('h4', {}, PS.t('notes'))); if (n) { const d = el('div'); d.innerHTML = n.innerHTML; notesPanel.appendChild(d); } else notesPanel.appendChild(el('p', { class: 'muted' }, PS.t('nonotes'))); }
  function toggleNotes() { if (!notesPanel) { notesPanel = el('div', { class: 'notes-panel', role: 'complementary', hidden: true }); document.body.appendChild(notesPanel); } notesPanel.hidden = !notesPanel.hidden; bNotes.setAttribute('aria-pressed', String(!notesPanel.hidden)); if (!notesPanel.hidden) renderNotes(); }
  bNotes.addEventListener('click', toggleNotes);

  // painel de detalhes
  let drawer = null, scrim = null;
  function openDetail(id, trigger) {
    const src = document.getElementById(id); if (!src) { console.warn('[presenter-slides] data-detail sem alvo:', id); return; }
    closeDetail(true); lastFocus = trigger || document.activeElement;
    const content = el('div', { class: 'drawer-content' }); if (src.tagName === 'TEMPLATE') content.appendChild(src.content.cloneNode(true)); else content.innerHTML = src.innerHTML;
    enhance(content); PS.decorateTerms(content);
    const title = $('h1,h2,h3,h4', content); const tid = PS.uid('dt'); if (title) title.id = tid;
    const close = el('button', { type: 'button', class: 'tbtn close', 'aria-label': PS.t('close') }, PS.icon('x')); close.addEventListener('click', () => closeDetail());
    drawer = el('aside', { class: 'drawer', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': title ? tid : null, 'aria-label': title ? null : PS.t('moreinfo') }, close, content);
    scrim = el('div', { class: 'drawer-scrim' }); scrim.addEventListener('click', () => closeDetail());
    document.body.append(scrim, drawer);
    $$('[data-detail],[data-goto]', content).forEach((n) => { if (!n.hasAttribute('tabindex') && n.tagName !== 'BUTTON' && n.tagName !== 'A') n.tabIndex = 0; });
    requestAnimationFrame(() => { drawer.classList.add('open'); scrim.classList.add('open'); close.focus(); });
  }
  function closeDetail(instant) {
    if (!drawer) return; const d = drawer, s = scrim; drawer = scrim = null; d.classList.remove('open'); s.classList.remove('open');
    const kill = () => { d.remove(); s.remove(); }; if (instant) kill(); else setTimeout(kill, 380);
    if (!instant && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  // ícones declarativos e botões vazios em conteúdo inserido depois (painel, pop-up)
  function enhance(root) {
    $$('[data-icon]', root).forEach((n) => { if (!$('svg', n)) n.prepend(PS.icon(n.dataset.icon)); });
    $$('.info-btn:empty, .goto-btn:empty', root).forEach((n) => n.appendChild(PS.icon(n.classList.contains('info-btn') ? 'info' : 'arrow-right')));
  }

  // pop-up: janela modal sobre o slide atual (mesmo slide ao fechar); aceita widgets
  let popup = null;
  function openPopup(id, trigger) {
    const src = document.getElementById(id); if (!src) { console.warn('[presenter-slides] data-popup sem alvo:', id); return; }
    closeDetail(true); closePopup(true);
    const content = el('div', { class: 'popup-body is-active' });
    if (src.tagName === 'TEMPLATE') content.appendChild(src.content.cloneNode(true)); else content.innerHTML = src.innerHTML;
    enhance(content); PS.decorateTerms(content);
    const tid = PS.uid('pp');
    const close = el('button', { type: 'button', class: 'tbtn close', 'aria-label': PS.t('close'), title: PS.t('close') + ' (Esc)' }, PS.icon('x'));
    const box = el('div', { class: 'popup', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': tid, 'data-size': src.dataset.size || '' },
      el('div', { class: 'popup-head' }, el('h3', { id: tid }, src.dataset.title || ''), close), content);
    const sc = el('div', { class: 'popup-scrim' });
    close.addEventListener('click', () => closePopup()); sc.addEventListener('click', () => closePopup());
    document.body.append(sc, box);
    PS.initWidgets(content);
    popup = { box, sc, close, trigger: trigger || document.activeElement };
    requestAnimationFrame(() => { box.classList.add('open'); sc.classList.add('open'); close.focus({ preventScroll: true }); window.dispatchEvent(new Event('resize')); });
  }
  function closePopup(instant) {
    if (!popup) return; const p = popup; popup = null; p.box.classList.remove('open'); p.sc.classList.remove('open');
    const kill = () => { p.box.remove(); p.sc.remove(); }; if (instant) kill(); else setTimeout(kill, 320);
    if (!instant && p.trigger && p.trigger.focus) p.trigger.focus({ preventScroll: true });
  }
  document.addEventListener('keydown', (e) => { // foco preso dentro do pop-up (o painel "saiba mais" fica por cima)
    if (e.key !== 'Tab' || !popup || drawer) return;
    const f = $$('button, a[href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])', popup.box).filter((n) => !n.disabled && n.offsetParent !== null);
    if (!f.length) return; const first = f[0], last = f[f.length - 1];
    if (!popup.box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // tooltip simples
  const tipEl = el('div', { class: 'tip', role: 'tooltip' }); document.body.appendChild(tipEl);
  function showTipFor(n) { tipEl.textContent = n.dataset.tip; tipEl.classList.add('on'); const r = n.getBoundingClientRect(); const w = tipEl.offsetWidth, h = tipEl.offsetHeight; tipEl.style.left = clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8) + 'px'; tipEl.style.top = (r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8) + 'px'; }
  const hideTipEl = () => { tipEl.classList.remove('on'); };
  document.addEventListener('mouseover', (e) => { const n = e.target.closest && e.target.closest('[data-tip]'); if (n) showTipFor(n); });
  document.addEventListener('mouseout', (e) => { if (e.target.closest && e.target.closest('[data-tip]')) hideTipEl(); });
  document.addEventListener('focusin', (e) => { const n = e.target.closest && e.target.closest('[data-tip]'); if (n) showTipFor(n); });
  document.addEventListener('focusout', hideTipEl);

  // tela preta (modo palco)
  let blackout = null;
  function toggleBlackout() { if (blackout) { blackout.remove(); blackout = null; return; } blackout = el('div', { style: { position: 'fixed', inset: 0, background: '#000', zIndex: 100 } }); document.body.appendChild(blackout); }

  // delegação de cliques: detalhes e referências
  document.addEventListener('click', (e) => {
    const pp = e.target.closest && e.target.closest('[data-popup]'); if (pp) { e.preventDefault(); openPopup(pp.dataset.popup, pp); return; }
    const d = e.target.closest && e.target.closest('[data-detail]'); if (d) { e.preventDefault(); openDetail(d.dataset.detail, d); return; }
    const g = e.target.closest && e.target.closest('[data-goto]'); if (g) { e.preventDefault(); if (drawer) closeDetail(true); if (popup) closePopup(true); xref(g.dataset.goto); return; }
    const t = e.target.closest && e.target.closest('[data-tip]'); if (t && matchMedia('(hover: none)').matches) { showTipFor(t); setTimeout(hideTipEl, 2600); }
    if (!e.target.closest('.popover, .toolbar')) { settingsPanel.hidden = true; helpPanel.hidden = true; bSettings.setAttribute('aria-expanded', 'false'); bHelp.setAttribute('aria-expanded', 'false'); }
  });
  document.addEventListener('keydown', (e) => { // Enter/Espaço em elementos role=button que não são <button>
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role="button"][data-detail], [role="button"][data-popup], [role="button"][data-goto], [role="button"][data-tip]')) { e.preventDefault(); e.target.click(); e.stopPropagation(); }
  }, true);

  // ====================================================================
  // Teclado (inclui controles remotos/clickers: PageUp/PageDown, setas, "." e "b")
  // ====================================================================
  let numBuf = '', numTimer = 0;
  const isEditable = (t) => t && (t.matches && t.matches('input:not([type="range"]), select, textarea, [contenteditable="true"]'));
  const isInteractive = (t) => t && t.matches && t.matches('button, a[href], summary, select, input, textarea, [role="tab"], [role="button"], [role="switch"], [data-no-nav]');
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const k = e.key; const t = e.target;
    if (k === 'Escape') { if (drawer) closeDetail(); else if (popup) closePopup(); else if (overview) toggleOverview(false); else if (!settingsPanel.hidden || !helpPanel.hidden) { togglePopover(settingsPanel, bSettings, false); togglePopover(helpPanel, bHelp, false); } else if (blackout) toggleBlackout(); else if (t && t.blur && isInteractive(t)) t.blur(); return; }
    if (drawer || popup || overview) return;
    if (isEditable(t)) { if (k !== 'PageDown' && k !== 'PageUp') return; }
    const onRange = t && t.matches && t.matches('input[type="range"]');
    const slide = slides[cur]; const scrollable = slide.scrollHeight > slide.clientHeight + 4;
    const nextKeys = ['ArrowRight', 'PageDown', 'MediaTrackNext']; const prevKeys = ['ArrowLeft', 'PageUp', 'MediaTrackPrevious'];
    let handled = true;
    if (nextKeys.includes(k) && !(onRange && k === 'ArrowRight')) next();
    else if (prevKeys.includes(k) && !(onRange && k === 'ArrowLeft')) prev();
    else if ((k === 'ArrowDown' || k === 'ArrowUp') && !onRange && !scrollable && !isInteractive(t)) { k === 'ArrowDown' ? next() : prev(); }
    else if ((k === ' ' || k === 'Enter') && !isInteractive(t)) { if (k === 'Enter' && numBuf) { go(parseInt(numBuf, 10) - 1); numBuf = ''; } else if (e.shiftKey) prev(); else next(); }
    else if (k === 'Backspace' && !isInteractive(t)) prev();
    else if (k === 'Home' && !onRange) go(0); else if (k === 'End' && !onRange) go(N - 1);
    else if (/^[0-9]$/.test(k) && !isInteractive(t)) { numBuf += k; clearTimeout(numTimer); numTimer = setTimeout(() => { numBuf = ''; }, 1500); announce(numBuf); }
    else if (!isInteractive(t) || k === 'o' || k === 'O') {
      switch (k.toLowerCase()) {
        case 'o': case 'g': toggleOverview(true); break;
        case 't': toggleTheme(); break; case 'p': cyclePalette(); break; case 'f': toggleFullscreen(); break;
        case 'n': toggleNotes(); break; case 's': togglePopover(settingsPanel, bSettings); break;
        case '?': togglePopover(helpPanel, bHelp); break;
        case 'b': case '.': toggleBlackout(); break;
        default: handled = false;
      }
    } else handled = false;
    if (handled) e.preventDefault();
  });

  // toque: deslizar horizontalmente (fora de widgets e controles)
  let tx = 0, ty = 0, tt = 0, tOK = false;
  document.addEventListener('touchstart', (e) => { const t = e.target; tOK = !(t.closest && t.closest('.widget, input, select, textarea, pre, .drawer, .popup, .popover, .overview, .notes-panel, .toolbar')); if (!tOK) return; const p = e.changedTouches[0]; tx = p.clientX; ty = p.clientY; tt = Date.now(); }, { passive: true });
  document.addEventListener('touchend', (e) => { if (!tOK || drawer || popup || overview) return; const p = e.changedTouches[0]; const dx = p.clientX - tx, dy = p.clientY - ty; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6 && Date.now() - tt < 900) dx < 0 ? next() : prev(); }, { passive: true });

  // esconder interface quando o mouse fica parado (modo palco)
  let idleT = 0; const wake = () => { document.body.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => { if (settingsPanel.hidden && helpPanel.hidden && !drawer && !popup && !overview) document.body.classList.add('idle'); }, 3500); };
  ['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach((ev) => document.addEventListener(ev, wake, { passive: true })); wake();

  window.addEventListener('hashchange', () => { const j = resolveTarget((location.hash || '').replace(/^#\/?/, '')); if (j >= 0 && j !== cur) go(j, { noHash: true }); });

  // ====================================================================
  // Início
  // ====================================================================
  applyPrefs();
  root.setAttribute('data-transition', cfg.transition || 'slide');
  const start = resolveTarget((location.hash || '').replace(/^#\/?/, '')); go(start >= 0 ? start : 0, { noHash: true, focus: false });
  document.body.classList.add('ps-ready');
  // fórmulas (KaTeX opcional via CDN)
  window.addEventListener('load', () => { if (window.renderMathInElement) { try { window.renderMathInElement(deck, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false }); } catch (e) { /* mantém texto */ } } });

  PS.deck = { go: (i) => go(i), next, prev, get index() { return cur; }, count: N, slides, setMode: (m) => { prefs.mode = m; applyPrefs(); }, setPalette: (p) => { prefs.palette = p; applyPrefs(); }, openOverview: toggleOverview, xref, openPopup: (id) => openPopup(id), closePopup: () => closePopup(true), get popupOpen() { return !!popup; } };
})();
