/* presenter-slides · widgets.js
 * Widgets declarativos:  div.widget[data-widget="NOME"] contendo um bloco script application/json com a configuração.
 *   lab      – laboratório paramétrico: sliders → curvas, resultados e frases dinâmicas (calculadora/simulação)
 *   chart    – gráficos de dados (bar, hbar, line, area, pie, donut, scatter) com troca de tipo e legenda interativa
 *   sampler  – simulador estatístico (histograma, Lei dos Grandes Números, Teorema Central do Limite)
 *   quiz     – pergunta de múltipla escolha com feedback
 *   compare  – comparador antes/depois (duas figuras filhas)
 *   tabs     – abas (filhos <section data-tab="Título">)
 */
(function () {
  'use strict';
  const { el, svg, $, $$, clamp } = PS;
  const M = PS.math;

  const headOf = (c, extra) => !(c.title || extra) ? document.createDocumentFragment() : el('div', { class: 'w-head' }, c.title ? el('div', { class: 'w-title' }, c.icon ? PS.icon(c.icon) : null, c.title) : el('span'), extra || null);
  const btn = (icon, label, fn, cls = '') => el('button', { type: 'button', class: 'btn ' + cls, onclick: fn }, icon ? PS.icon(icon) : null, label);

  // =====================================================================
  // LAB
  // =====================================================================
  PS.widgets.lab = function (host, c, ctx) {
    const params = c.params || [];
    const defs = c.defs || {};
    const known = ['x', 't', ...params.map((p) => p.id)];
    const mk = (v, fallback) => {
      if (v === undefined || v === null) return () => fallback;
      if (typeof v === 'number') return () => v;
      if (v === 'auto') return null;
      const f = M.compile(String(v), { defs, known }); return (sc) => f(sc);
    };
    const cx = (src) => M.compile(String(src), { defs, known });
    const fmtOpts = (p) => ({ suffix: p && p.suffix, currency: c.currency });

    // ---- estado
    const state = {}; params.forEach((p) => { state[p.id] = p.value !== undefined ? p.value : (p.options ? (p.options[0].value ?? p.options[0]) : p.min); });
    const initial = Object.assign({}, state);

    // ---- séries compiladas
    const S = (c.series || []).map((s, i) => {
      const o = { id: s.id || 's' + i, label: s.label || s.id || '', color: s.color, kind: s.style || 'line', dash: !!s.dash, width: s.width, visible: s.visible !== false, r: s.r };
      if (s.parametric) { o.xe = cx(s.parametric.x); o.ye = cx(s.parametric.y); o.t0 = mk(s.parametric.t[0]); o.t1 = mk(s.parametric.t[1]); }
      else o.ye = cx(s.expr);
      if (s.discrete) { o.d0 = mk(s.discrete[0]); o.d1 = mk(s.discrete[1]); }
      if (s.domain) { o.dm0 = mk(s.domain[0]); o.dm1 = mk(s.domain[1]); }
      if (s.shade) o.shade = { from: mk(s.shade.from), to: mk(s.shade.to) };
      return o;
    });
    const xmin = mk(c.x && c.x.min, 0), xmax = mk(c.x && c.x.max, 10);
    const ymin = c.y && c.y.min !== undefined ? mk(c.y.min) : null, ymax = c.y && c.y.max !== undefined ? mk(c.y.max) : null;
    const samples = (c.x && c.x.samples) || 260;
    const mark = (c.markers || []).map((m) => ({ x: cx(m.x), y: cx(m.y), label: m.label, color: m.color }));
    const hl = (c.hlines || []).map((h) => ({ y: cx(h.y), label: h.label }));
    const vl = (c.vlines || []).map((v) => ({ x: cx(v.x), label: v.label }));
    const outs = (c.outputs || []).map((o) => ({ label: o.label, f: cx(o.expr), format: o.format, suffix: o.suffix, color: o.color }));

    // ---- DOM
    const hasPlot = S.length > 0;
    const plotHost = el('div', { class: 'plot-host ' + (c.height || '') });
    const legendBox = el('div'); const outBox = el('div', { class: 'outputs' }); const insight = el('div', { class: 'w-insight', 'aria-live': 'polite' });
    const ctlBox = el('div', { class: 'controls' });
    const inputs = {};
    params.forEach((p) => {
      let input, readout;
      const id = PS.uid('p');
      if (p.options) {
        input = el('select', { id }); p.options.forEach((op) => { const v = op.value ?? op; input.appendChild(el('option', { value: v }, op.label ?? op)); }); input.value = state[p.id];
        input.addEventListener('input', () => { state[p.id] = isNaN(+input.value) ? input.value : +input.value; update(); });
        ctlBox.appendChild(el('div', { class: 'ctl' }, el('label', { for: id }, p.label || p.id), input));
      } else {
        input = el('input', { id, type: 'range', min: p.min, max: p.max, step: p.step || 'any', value: state[p.id], 'aria-label': p.label || p.id });
        readout = el('output', { for: id });
        input.addEventListener('input', () => { state[p.id] = +input.value; update(); });
        ctlBox.appendChild(el('div', { class: 'ctl' }, el('label', { for: id }, el('span', {}, p.label || p.id), readout), input, p.hint ? el('span', { class: 'hint' }, p.hint) : null));
        input.__readout = readout;
      }
      inputs[p.id] = input;
    });
    const row = el('div', { class: 'btn-row' });
    let playing = false, raf = 0;
    if (c.play) {
      const pp = params.find((p) => p.id === c.play.param); const pb = btn('play', PS.t('play'), () => toggle(), '');
      const toggle = (force) => { playing = force === undefined ? !playing : force; pb.textContent = ''; pb.append(PS.icon(playing ? 'pause' : 'play'), playing ? PS.t('pause') : PS.t('play')); if (playing) { let last = performance.now(); const tick = (now) => { if (!playing) return; if (!ctx.active()) { toggle(false); return; } const dt = (now - last) / 1000; last = now; let v = state[pp.id] + (pp.max - pp.min) * (c.play.speed || 0.12) * dt; if (v > pp.max) v = pp.min + (v - pp.max); state[pp.id] = v; inputs[pp.id].value = v; update(); raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); } else cancelAnimationFrame(raf); };
      row.appendChild(pb);
    }
    row.appendChild(btn('reset', PS.t('reset'), () => { Object.assign(state, initial); params.forEach((p) => { inputs[p.id].value = initial[p.id]; }); update(); }));
    if (params.length) ctlBox.appendChild(row);

    const gridCls = 'lab-grid' + (hasPlot && params.length ? '' : ' no-controls');
    const left = hasPlot ? el('div', {}, plotHost, legendBox) : null;
    const right = el('div', { class: 'stack' }, ctlBox, outs.length ? outBox : null);
    const body = hasPlot ? el('div', { class: gridCls }, left, right) : el('div', { class: 'lab-grid' }, el('div', { class: 'stack' }, ctlBox), el('div', { class: 'stack' }, outBox, insight));
    host.append(headOf(c), body);
    if (hasPlot && c.insight) host.appendChild(insight);
    if (c.caption) host.appendChild(el('p', { class: 'w-caption' }, c.caption));
    if (!c.insight) insight.remove();

    // ---- cálculo
    let data = null, ov = null;
    function scopeNow() { return Object.assign({}, state); }
    function compute() {
      const sc = scopeNow(); let err = null; const lo = xmin(sc), hi = xmax(sc);
      const series = S.map((s) => {
        const pts = []; const base = Object.create(sc);
        const push = (x, y) => { pts.push([x, y]); };
        try {
          if (s.xe) { const a = s.t0(sc), b = s.t1(sc); for (let i = 0; i <= samples; i++) { base.t = a + ((b - a) * i) / samples; push(s.xe(base), s.ye(base)); } }
          else if (s.d0) { const a = Math.round(s.d0(sc)), b = Math.round(s.d1(sc)); for (let k = a; k <= Math.min(b, a + 2000); k++) { base.x = k; push(k, s.ye(base)); } }
          else { const a = s.dm0 ? s.dm0(sc) : lo, b = s.dm1 ? s.dm1(sc) : hi; for (let i = 0; i <= samples; i++) { const x = a + ((b - a) * i) / samples; base.x = x; let y; try { y = s.ye(base); } catch (e) { err = err || e; y = NaN; } push(x, y); } }
        } catch (e) { err = err || e; }
        const o = { id: s.id, label: s.label, color: s.color, kind: s.kind, dash: s.dash, width: s.width, r: s.r, visible: s.visible, pts };
        if (s.shade) o.shade = { from: s.shade.from(sc), to: s.shade.to(sc) };
        return o;
      });
      const ex = (f) => { try { return f(Object.assign(Object.create(sc), { x: 0, t: 0 })); } catch (e) { return NaN; } };
      ov = {
        lo, hi, series, err,
        markers: mark.map((m) => ({ x: ex(m.x), y: ex(m.y), label: m.label, color: m.color })),
        hlines: hl.map((h) => ({ y: ex(h.y), label: h.label })), vlines: vl.map((v) => ({ x: ex(v.x), label: v.label })),
      };
      const visVals = series.filter((s) => s.visible !== false).flatMap((s) => s.pts.map((p) => p[1]).filter((v) => Math.abs(v) < 1e9));
      const withZero = series.some((s) => s.kind === 'area' || s.kind === 'bars');
      const auto = PS.charts.autoDomain(visVals.concat(ov.markers.map((m) => m.y)), { zero: withZero });
      ov.ydom = [ymin ? ymin(sc) : auto[0], ymax ? ymax(sc) : auto[1]];
      if (ov.ydom[1] <= ov.ydom[0]) ov.ydom[1] = ov.ydom[0] + 1;
    }
    const fmtY = (v) => PS.fmt(v, (c.y && c.y.format) || c.format || 'num', { currency: c.currency, suffix: c.y && c.y.suffix });
    const fmtX = (v) => PS.fmt(v, (c.x && c.x.format) || 'num', { suffix: c.x && c.x.suffix });
    function draw() {
      if (!hasPlot || !ov) return;
      if (ov.err && !ov.series.some((s) => s.pts.some((p) => Number.isFinite(p[1])))) { plotHost.textContent = ''; plotHost.appendChild(el('div', { class: 'w-error' }, 'Erro na expressão: ' + ov.err.message)); return; }
      PS.charts.cartesian(plotHost, { xdom: [ov.lo, ov.hi], ydom: ov.ydom, xlabel: c.x && c.x.label, ylabel: c.y && c.y.label, series: ov.series, hlines: ov.hlines, vlines: ov.vlines, markers: ov.markers, fmtX, fmtY, aria: c.title });
    }
    function update() {
      params.forEach((p) => {
        const inp = inputs[p.id]; if (inp.__readout) { inp.__readout.textContent = PS.fmt(state[p.id], p.format || 'num', fmtOpts(p)); const pc = ((state[p.id] - p.min) / (p.max - p.min)) * 100; inp.style.setProperty('--p', clamp(pc, 0, 100) + '%'); }
      });
      try { compute(); } catch (e) { plotHost.textContent = ''; plotHost.appendChild(el('div', { class: 'w-error' }, 'Erro: ' + e.message)); return; }
      draw();
      const sc = scopeNow();
      outBox.textContent = '';
      outs.forEach((o, i) => { let v; try { v = o.f(sc); } catch (e) { v = NaN; } const kEl = el('span', { class: 'k' }, o.label); PS.decorateTerms(kEl, { force: true }); outBox.appendChild(el('div', { class: 'out hl-' + (o.color || (i % 3) + 1) }, kEl, el('span', { class: 'v' }, PS.fmt(v, o.format || 'num', { suffix: o.suffix, currency: c.currency })))); });
      if (c.insight) insight.innerHTML = M.template(c.insight, sc, defs, { lang: PS.lang, currency: c.currency });
    }
    if (S.length > 1) { const items = S.map((s, i) => ({ label: s.label || s.id, color: s.color, visible: s.visible })); legendBox.appendChild(PS.charts.legend(items, () => { items.forEach((it, i) => { S[i].visible = it.visible !== false; }); compute(); draw(); })); }
    update();
    if (hasPlot) PS.charts.observe(plotHost, draw);
  };

  // =====================================================================
  // CHART (dados fixos)
  // =====================================================================
  PS.widgets.chart = function (host, c) {
    const labels = c.labels || []; const fmtOpt = { suffix: c.unit, currency: c.currency };
    const fmt = (v) => PS.fmt(v, c.format || 'num', fmtOpt);
    let type = c.type || 'bar'; const types = c.switch && c.switch.length ? c.switch : null;
    const series = (c.series || []).map((s, i) => Object.assign({ visible: true }, s, { color: s.color }));
    const items = labels.map((l, i) => ({ label: l, value: (series[0] && series[0].data[i]) || 0, color: (c.colors && c.colors[i]) || undefined, visible: true }));
    const plot = el('div', { class: 'plot-host ' + (c.height || '') }); const legendBox = el('div');
    const seg = types ? el('div', { class: 'seg-inline', role: 'group', 'aria-label': 'tipo de gráfico' }) : null;
    const NAMES = { bar: 'Barras', hbar: 'Barras horiz.', line: 'Linhas', area: 'Área', pie: 'Pizza', donut: 'Rosca', scatter: 'Dispersão', stacked: 'Empilhado' };
    if (seg) types.forEach((tp) => { const b = el('button', { type: 'button', 'aria-pressed': String(tp === type) }, (c.switchLabels && c.switchLabels[tp]) || NAMES[tp] || tp); b.addEventListener('click', () => { type = tp; $$('button', seg).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); legend(); draw(); }); seg.appendChild(b); });
    host.append(headOf(c, seg), plot, legendBox); if (c.caption) host.appendChild(el('p', { class: 'w-caption' }, c.caption));
    const isPie = () => type === 'pie' || type === 'donut';
    function legend() {
      legendBox.textContent = '';
      if (isPie()) legendBox.appendChild(PS.charts.legend(items, draw, (v) => fmt(v)));
      else if (series.length > 1) legendBox.appendChild(PS.charts.legend(series.map((s) => s), draw));
    }
    function draw() {
      if (isPie()) return PS.charts.pie(plot, { items, donut: type === 'donut', fmt, centerLabel: c.centerLabel, aria: c.title });
      if (type === 'bar' || type === 'hbar' || type === 'stacked') return PS.charts.bars(plot, { labels, series, stacked: type === 'stacked' || c.stacked, horizontal: type === 'hbar' || c.horizontal, fmt, xlabel: c.xlabel, ylabel: c.ylabel, showValues: c.showValues, ydom: c.ydom, aria: c.title });
      if (type === 'scatter') return PS.charts.cartesian(plot, { xdom: c.xdom || PS.charts.autoDomain(series.flatMap((s) => s.data.map((p) => p[0]))), ydom: c.ydom || PS.charts.autoDomain(series.flatMap((s) => s.data.map((p) => p[1]))), xlabel: c.xlabel, ylabel: c.ylabel, fmtY: fmt, series: series.map((s) => ({ label: s.label, color: s.color, kind: 'points', visible: s.visible, pts: s.data })), aria: c.title });
      // line / area com eixo categórico
      const vals = series.filter((s) => s.visible !== false).flatMap((s) => s.data);
      return PS.charts.cartesian(plot, { xdom: [-0.4, labels.length - 0.6], ydom: c.ydom || PS.charts.autoDomain(vals, { zero: type === 'area' || c.zero }), xcat: labels, xlabel: c.xlabel, ylabel: c.ylabel, fmtY: fmt, series: series.map((s) => ({ label: s.label, color: s.color, kind: type === 'area' ? 'area' : 'line', visible: s.visible, pts: s.data.map((v, i) => [i, v]) })), aria: c.title });
    }
    legend(); PS.charts.observe(plot, draw);
  };

  // =====================================================================
  // SAMPLER (estatística: LGN / TCL)
  // =====================================================================
  const DISTS = {
    uniform: { mu: 0.5, sd: Math.sqrt(1 / 12), draw: () => Math.random(), name: { pt: 'Uniforme', en: 'Uniform', es: 'Uniforme' } },
    normal: { mu: 0, sd: 1, draw: () => { let u = 0, v = 0; while (!u) u = Math.random(); v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }, name: { pt: 'Normal', en: 'Normal', es: 'Normal' } },
    exponential: { mu: 1, sd: 1, draw: () => -Math.log(1 - Math.random()), name: { pt: 'Exponencial (assimétrica)', en: 'Exponential (skewed)', es: 'Exponencial (asimétrica)' } },
    dice: { mu: 3.5, sd: Math.sqrt(35 / 12), draw: () => 1 + Math.floor(Math.random() * 6), name: { pt: 'Dado de 6 faces', en: 'Six-sided die', es: 'Dado de 6 caras' } },
    bimodal: { mu: 0, sd: Math.sqrt(0.36 + 4), draw: () => { const g = DISTS.normal.draw(); return (Math.random() < 0.5 ? -2 : 2) + 0.6 * g; }, name: { pt: 'Bimodal', en: 'Bimodal', es: 'Bimodal' } },
  };
  PS.widgets.sampler = function (host, c, ctx) {
    const l2 = PS.lang.slice(0, 2); const opts = (c.options || ['uniform', 'normal', 'exponential', 'dice', 'bimodal']).filter((k) => DISTS[k]);
    let dist = c.dist && DISTS[c.dist] ? c.dist : opts[0]; let k = c.average || 1; const bins = c.bins || 32;
    let counts = new Array(bins).fill(0), N = 0, sum = 0, sum2 = 0; let lo = 0, hi = 1;
    const plot = el('div', { class: 'plot-host ' + (c.height || '') });
    const stats = el('div', { class: 'sampler-stats outputs', 'aria-live': 'polite' });
    const sel = el('select', { id: PS.uid('sd'), 'aria-label': 'distribuição' }); opts.forEach((o) => sel.appendChild(el('option', { value: o }, DISTS[o].name[l2] || DISTS[o].name.en))); sel.value = dist;
    const kOut = el('output'); const kIn = el('input', { type: 'range', min: 1, max: c.maxAverage || 50, step: 1, value: k, 'aria-label': c.averageLabel || 'média de k valores' });
    const ctl = el('div', { class: 'controls' },
      el('div', { class: 'ctl' }, el('label', {}, el('span', {}, c.distLabel || (l2 === 'pt' ? 'Distribuição de origem' : 'Source distribution'))), sel),
      el('div', { class: 'ctl' }, el('label', {}, el('span', {}, c.averageLabel || (l2 === 'pt' ? 'Valores por média (k)' : 'Values per average (k)')), kOut), kIn, el('span', { class: 'hint' }, c.hint || (l2 === 'pt' ? 'k = 1 mostra a distribuição original; aumente k e veja a normal surgir (TCL).' : 'k = 1 shows the original distribution; raise k and watch the normal emerge (CLT).'))),
      el('div', { class: 'btn-row' }, btn('plus', `${PS.t('draw')} 10`, () => add(10)), btn('plus', `${PS.t('draw')} 500`, () => add(500), 'primary'), btn('reset', PS.t('reset'), () => reset())));
    host.append(headOf(c), el('div', { class: 'lab-grid' }, el('div', {}, plot), el('div', { class: 'stack' }, ctl, stats)));
    if (c.caption) host.appendChild(el('p', { class: 'w-caption' }, c.caption));
    function dom() { const d = DISTS[dist]; const s = d.sd / Math.sqrt(k); lo = d.mu - 4 * s; hi = d.mu + 4 * s; if (dist === 'exponential') lo = Math.max(lo, 0) - 0.0; }
    function reset() { counts = new Array(bins).fill(0); N = 0; sum = 0; sum2 = 0; dom(); render(); }
    function add(n) {
      const d = DISTS[dist];
      for (let i = 0; i < n; i++) { let v = 0; for (let j = 0; j < k; j++) v += d.draw(); v /= k; sum += v; sum2 += v * v; N++; const b = Math.floor(((v - lo) / (hi - lo)) * bins); if (b >= 0 && b < bins) counts[b]++; }
      render();
    }
    function render() {
      kOut.textContent = k; kIn.style.setProperty('--p', ((k - 1) / ((c.maxAverage || 50) - 1)) * 100 + '%');
      const d = DISTS[dist]; const w = (hi - lo) / bins; const sd = d.sd / Math.sqrt(k);
      const bars = counts.map((n, i) => [lo + (i + 0.5) * w, N ? n / (N * w) : 0]);
      const curve = []; for (let i = 0; i <= 120; i++) { const x = lo + ((hi - lo) * i) / 120; curve.push([x, M.FUNCS.normpdf(x, d.mu, sd)]); }
      const top = Math.max(...bars.map((b) => b[1]), ...curve.map((p) => p[1])) * 1.08;
      PS.charts.cartesian(plot, { xdom: [lo, hi], ydom: [0, top || 1], xlabel: c.xlabel, ylabel: l2 === 'pt' ? 'densidade' : 'density', fmtY: (v) => PS.fmt(v, 'num:2'), series: [{ label: `${N} ${PS.t('samples')}`, color: 'accent', kind: 'bars', pts: bars }, { label: PS.t('theory'), color: 'accent3', kind: 'line', pts: curve, dash: true }] });
      const mean = N ? sum / N : NaN, sdv = N > 1 ? Math.sqrt(Math.max(0, sum2 / N - mean * mean)) : NaN;
      stats.textContent = '';
      [[PS.t('samples'), PS.fmt(N, 'int')], [PS.t('mean'), PS.fmt(mean, 'num:3')], [PS.t('sd'), PS.fmt(sdv, 'num:3')]].forEach(([a, b], i) => stats.appendChild(el('div', { class: 'out hl-' + (i + 1) }, el('span', { class: 'k' }, a), el('span', { class: 'v' }, b))));
    }
    sel.addEventListener('input', () => { dist = sel.value; reset(); add(c.initial ?? 400); });
    kIn.addEventListener('input', () => { k = +kIn.value; reset(); add(c.initial ?? 400); });
    dom(); PS.charts.observe(plot, () => { render(); }); add(c.initial ?? 400);
  };

  // =====================================================================
  // QUIZ
  // =====================================================================
  PS.widgets.quiz = function (host, c) {
    const letters = 'ABCDEFGH'; const why = el('div', { class: 'callout quiz-why', hidden: true, 'aria-live': 'polite' }); const opts = el('div', { class: 'quiz-opts' });
    const buttons = (c.options || []).map((o, i) => {
      const b = el('button', { type: 'button', class: 'quiz-opt' }, el('span', { class: 'k' }, letters[i]), el('span', {}, o.text));
      b.addEventListener('click', () => {
        why.hidden = false; why.className = 'callout quiz-why ' + (o.correct ? 'good' : 'bad'); why.textContent = '';
        why.append(PS.icon(o.correct ? 'check' : 'x'), el('p', {}, el('b', {}, o.correct ? PS.t('correct') : PS.t('incorrect')), ' ', o.why || (o.correct ? c.explain || '' : '')));
        b.classList.add(o.correct ? 'right' : 'wrong');
        if (o.correct) buttons.forEach((x, j) => { x.disabled = true; if (c.options[j].correct) x.classList.add('right'); });
      });
      opts.appendChild(b); return b;
    });
    host.append(headOf(c), el('div', { class: 'quiz-q' }, c.question), opts, why);
  };

  // =====================================================================
  // COMPARE (antes/depois)
  // =====================================================================
  PS.widgets.compare = function (host, c) {
    const kids = Array.from(host.children).filter((n) => n.tagName !== 'SCRIPT'); if (kids.length < 2) throw new Error('compare precisa de 2 filhos (antes e depois)');
    const a = kids[0], b = kids[1]; a.classList.add('cmp-a'); b.classList.add('cmp-b');
    const wrap = el('div', { class: 'compare' }); host.appendChild(wrap); wrap.append(a, b, el('div', { class: 'cmp-bar' }), el('span', { class: 'cmp-tag l' }, c.labelA || PS.t('before')), el('span', { class: 'cmp-tag r' }, c.labelB || PS.t('after')));
    const rng = el('input', { type: 'range', min: 0, max: 100, value: 50, 'aria-label': `${c.labelA || PS.t('before')} / ${c.labelB || PS.t('after')}` });
    rng.addEventListener('input', () => wrap.style.setProperty('--pos', rng.value + '%')); wrap.appendChild(rng);
  };

  // =====================================================================
  // TABS
  // =====================================================================
  PS.widgets.tabs = function (host) {
    const panels = $$(':scope > [data-tab]', host); if (!panels.length) throw new Error('tabs precisa de filhos com data-tab');
    const nav = el('div', { class: 'tabs-nav', role: 'tablist' }); host.insertBefore(nav, panels[0]); const bs = [];
    const sel = (i, focus) => panels.forEach((p, j) => { p.hidden = i !== j; p.classList.add('tab-panel'); bs[j].setAttribute('aria-selected', String(i === j)); bs[j].tabIndex = i === j ? 0 : -1; if (i === j && focus) bs[j].focus(); });
    panels.forEach((p, i) => { const b = el('button', { type: 'button', role: 'tab' }, p.dataset.tabIcon ? PS.icon(p.dataset.tabIcon) : null, p.dataset.tab); b.addEventListener('click', () => sel(i)); b.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.stopPropagation(); e.preventDefault(); sel((i + (e.key === 'ArrowRight' ? 1 : panels.length - 1)) % panels.length, true); } }); bs.push(b); nav.appendChild(b); p.setAttribute('role', 'tabpanel'); });
    sel(0);
  };

  // =====================================================================
  // Boot de widgets
  // =====================================================================
  PS.initWidgets = function (slideEl) {
    $$('.widget[data-widget]', slideEl).forEach((host) => {
      const name = host.dataset.widget; const fn = PS.widgets[name];
      let c = {};
      const cfgNode = $(':scope > script[type="application/json"]', host);
      try {
        if (cfgNode) { c = JSON.parse(cfgNode.textContent); cfgNode.remove(); }
        if (!fn) throw new Error(`Widget desconhecido: "${name}"`);
        fn(host, c, { slide: slideEl, active: () => slideEl.classList.contains('is-active') });
      } catch (e) {
        console.error('[presenter-slides] widget', name, e);
        host.appendChild(el('div', { class: 'w-error', role: 'alert' }, `Widget "${name}": ${e.message}`));
      }
    });
  };
})();
