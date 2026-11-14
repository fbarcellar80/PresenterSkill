/* presenter-slides · charts.js
 * Renderizadores SVG sem dependências: cartesian (linhas/áreas/pontos/barras discretas),
 * bars (agrupadas/empilhadas/horizontais) e pie (pizza/rosca). Todos com hover/tooltip.
 */
(function () {
  'use strict';
  const { el, svg, clamp, uid } = PS;
  const charts = (PS.charts = {});

  // ---------- escalas e ticks ----------
  function niceStep(range, n) {
    const raw = range / Math.max(1, n); const mag = Math.pow(10, Math.floor(Math.log10(raw))); const norm = raw / mag;
    return (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  }
  function makeTicks(min, max, n = 6) {
    if (!(max > min)) max = min + 1;
    const step = niceStep(max - min, n); const out = [];
    for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + step * 1e-9; v += step) out.push(+v.toPrecision(12));
    return { ticks: out, step };
  }
  function tickFmt(step) {
    const dec = clamp(Math.ceil(-Math.log10(step) + 1e-9), 0, 8);
    return (v) => (Math.abs(v) >= 1e6 ? PS.fmt(v, 'compact') : new Intl.NumberFormat(PS.lang, { maximumFractionDigits: dec, minimumFractionDigits: 0 }).format(v));
  }
  const num = (v) => PS.fmt(v, 'num');
  function extent(vals) {
    let lo = Infinity, hi = -Infinity;
    for (const v of vals) if (Number.isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; }
    return lo === Infinity ? [0, 1] : [lo, hi];
  }
  charts.autoDomain = (vals, { zero = false, pad = 0.08 } = {}) => {
    let [lo, hi] = extent(vals);
    if (zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
    if (hi === lo) { hi = lo + 1; lo = lo - (zero ? 0 : 1); }
    const p = (hi - lo) * pad;
    return [zero && lo === 0 ? 0 : lo - p, hi + p];
  };

  function makeTip(host) { return host.appendChild(el('div', { class: 'plot-tip', role: 'status' })); }
  function showTip(tip, host, x, y, header, rows) {
    tip.textContent = '';
    if (header !== null && header !== undefined) tip.appendChild(el('div', {}, el('b', {}, header)));
    for (const r of rows) tip.appendChild(el('div', {}, el('span', { class: 'sw', style: { background: r.color } }), r.label ? r.label + ': ' : '', el('b', {}, r.value)));
    tip.classList.add('on');
    const hw = host.clientWidth; tip.style.left = clamp(x, 60, Math.max(60, hw - 60)) + 'px'; tip.style.top = Math.max(y, 36) + 'px';
  }
  const hideTip = (tip) => tip.classList.remove('on');

  function segments(pts, sx, sy) { // quebra o caminho em NaN/Infinito/valores absurdos
    const segs = []; let cur = [];
    for (const [x, y] of pts) {
      if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(y) > 1e9) { if (cur.length) segs.push(cur); cur = []; continue; }
      cur.push([sx(x), sy(y)]);
    }
    if (cur.length) segs.push(cur);
    return segs;
  }
  const pathOf = (seg) => 'M' + seg.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L');

  // =====================================================================
  // cartesian — eixos contínuos ou categóricos
  // o = { xdom, ydom, xlabel, ylabel, xcat, series:[{id,label,color,kind,pts,dash,visible,shade,width}],
  //       hlines:[{y,label}], vlines:[{x,label}], markers:[{x,y,label,color}], fmtX, fmtY, aria }
  // kind: line | area | points | bars | step
  // =====================================================================
  charts.cartesian = function (host, o) {
    host.textContent = '';
    const W = host.clientWidth, H = host.clientHeight;
    if (W < 40 || H < 40) return;
    const pad = { t: 14, r: 18, b: o.xlabel ? 48 : 30, l: o.ylabel ? 66 : 54 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const [x0, x1] = o.xdom, [y0, y1] = o.ydom;
    const sx = (v) => pad.l + ((v - x0) / (x1 - x0)) * iw;
    const sy = (v) => pad.t + ih - ((v - y0) / (y1 - y0)) * ih;
    const fmtX = o.fmtX || num, fmtY = o.fmtY || num;
    const cid = uid('clip');
    const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': o.aria || o.ylabel || 'gráfico' });
    root.appendChild(svg('defs', {}, svg('clipPath', { id: cid }, svg('rect', { x: pad.l, y: pad.t - 4, width: iw, height: ih + 8 }))));

    // grade + ticks
    const gx = o.xcat ? { ticks: o.xcat.map((_, i) => i), step: 1 } : makeTicks(x0, x1, Math.max(3, Math.floor(iw / 90)));
    const gy = makeTicks(y0, y1, Math.max(3, Math.floor(ih / 52)));
    const fx = o.xcat ? (i) => o.xcat[i] : tickFmt(gx.step), fy = tickFmt(gy.step);
    const grid = svg('g', { class: 'ps-grid' }), tk = svg('g', { class: 'ps-tick' });
    for (const v of gy.ticks) { grid.appendChild(svg('line', { x1: pad.l, x2: pad.l + iw, y1: sy(v), y2: sy(v) })); tk.appendChild(svg('text', { x: pad.l - 8, y: sy(v) + 4, 'text-anchor': 'end' }, fy(v))); }
    if (!o.xcat) for (const v of gx.ticks) { grid.appendChild(svg('line', { x1: sx(v), x2: sx(v), y1: pad.t, y2: pad.t + ih })); }
    const maxLabels = Math.max(2, Math.floor(iw / 70)); const skip = o.xcat ? Math.ceil(gx.ticks.length / maxLabels) : 1;
    gx.ticks.forEach((v, i) => { if (i % skip === 0) tk.appendChild(svg('text', { x: sx(v), y: pad.t + ih + 18, 'text-anchor': 'middle' }, String(fx(v)))); });
    root.append(grid, tk);

    // eixos principais (linha do zero e borda esquerda/inferior)
    const axis = svg('g', { class: 'ps-axis' });
    axis.appendChild(svg('line', { x1: pad.l, x2: pad.l + iw, y1: pad.t + ih, y2: pad.t + ih }));
    axis.appendChild(svg('line', { x1: pad.l, x2: pad.l, y1: pad.t, y2: pad.t + ih }));
    if (y0 < 0 && y1 > 0) axis.appendChild(svg('line', { x1: pad.l, x2: pad.l + iw, y1: sy(0), y2: sy(0), style: 'stroke-width:2' }));
    if (!o.xcat && x0 < 0 && x1 > 0) axis.appendChild(svg('line', { x1: sx(0), x2: sx(0), y1: pad.t, y2: pad.t + ih, style: 'stroke-width:2' }));
    root.appendChild(axis);
    if (o.xlabel) root.appendChild(svg('text', { class: 'ps-axlabel', x: pad.l + iw / 2, y: H - 8, 'text-anchor': 'middle' }, o.xlabel));
    if (o.ylabel) root.appendChild(svg('text', { class: 'ps-axlabel', transform: `translate(14 ${pad.t + ih / 2}) rotate(-90)`, 'text-anchor': 'middle' }, o.ylabel));

    // conteúdo recortado
    const plot = svg('g', { 'clip-path': `url(#${cid})` });
    const base = sy(clamp(0, y0, y1));
    const vis = o.series.filter((s) => s.visible !== false && s.pts && s.pts.length);
    vis.forEach((s) => {
      const color = PS.color(s.color, o.series.indexOf(s));
      if (s.shade) { // região sombreada sob a curva entre from..to
        const pts = s.pts.filter(([x, y]) => x >= s.shade.from && x <= s.shade.to && Number.isFinite(y));
        if (pts.length > 1) plot.appendChild(svg('path', { class: 'ps-shade', fill: color, d: 'M' + sx(pts[0][0]) + ' ' + base + 'L' + pts.map(([x, y]) => sx(x) + ' ' + sy(y)).join('L') + 'L' + sx(pts[pts.length - 1][0]) + ' ' + base + 'Z' }));
      }
      if (s.kind === 'bars') {
        const step = s.pts.length > 1 ? Math.abs(s.pts[1][0] - s.pts[0][0]) : 1; const bw = Math.max(2, (step / (x1 - x0)) * iw * 0.78);
        for (const [x, y] of s.pts) if (Number.isFinite(y)) plot.appendChild(svg('rect', { class: 'ps-bar', fill: color, x: sx(x) - bw / 2, width: bw, y: Math.min(sy(y), base), height: Math.abs(base - sy(y)), rx: Math.min(4, bw / 3) }));
        return;
      }
      if (s.kind === 'points') {
        for (const [x, y] of s.pts) if (Number.isFinite(y)) plot.appendChild(svg('circle', { class: 'ps-dot', cx: sx(x), cy: sy(y), r: s.r || 5, fill: color, opacity: 0.9 }));
        return;
      }
      const segs = segments(s.kind === 'step' ? stepPts(s.pts) : s.pts, sx, sy);
      for (const seg of segs) {
        if (s.kind === 'area' && seg.length > 1) plot.appendChild(svg('path', { class: 'ps-area', fill: color, d: pathOf(seg) + `L${seg[seg.length - 1][0]} ${base}L${seg[0][0]} ${base}Z` }));
        plot.appendChild(svg('path', { class: 'ps-line' + (s.dash ? '' : ' ps-draw'), pathLength: s.dash ? null : 1, stroke: color, 'stroke-width': s.width || null, 'stroke-dasharray': s.dash ? '8 7' : null, d: pathOf(seg) }));
      }
    });
    for (const h of o.hlines || []) if (Number.isFinite(h.y)) { plot.appendChild(svg('line', { class: 'ps-ref', x1: pad.l, x2: pad.l + iw, y1: sy(h.y), y2: sy(h.y) })); if (h.label) plot.appendChild(svg('text', { class: 'ps-ref-label', x: pad.l + iw - 4, y: sy(h.y) - 6, 'text-anchor': 'end' }, h.label)); }
    for (const v of o.vlines || []) if (Number.isFinite(v.x)) { plot.appendChild(svg('line', { class: 'ps-ref', x1: sx(v.x), x2: sx(v.x), y1: pad.t, y2: pad.t + ih })); if (v.label) plot.appendChild(svg('text', { class: 'ps-ref-label', x: sx(v.x) + 5, y: pad.t + 12 }, v.label)); }
    const markerLayer = svg('g', {});
    for (const m of o.markers || []) if (Number.isFinite(m.x) && Number.isFinite(m.y)) {
      markerLayer.appendChild(svg('circle', { class: 'ps-dot', cx: sx(m.x), cy: sy(m.y), r: 6.5, fill: PS.color(m.color || 'accent3') }));
      if (m.label) { const flip = sx(m.x) > W - 110; markerLayer.appendChild(svg('text', { class: 'ps-ref-label', x: sx(m.x) + (flip ? -10 : 10), y: sy(m.y) - 9, 'text-anchor': flip ? 'end' : 'start', style: 'fill:var(--text);font-weight:700' }, m.label)); }
    }
    root.appendChild(plot); root.appendChild(markerLayer);

    // hover
    const tip = makeTip(host); const cross = svg('line', { class: 'ps-cross', y1: pad.t, y2: pad.t + ih, style: 'display:none' }); const dots = svg('g', {});
    root.append(cross, dots);
    const overlay = svg('rect', { x: pad.l, y: pad.t, width: iw, height: ih, fill: 'transparent' });
    root.appendChild(overlay);
    const hoverable = vis;
    const move = (ev) => {
      const r = root.getBoundingClientRect(); const px = ((ev.clientX - r.left) / r.width) * W;
      const xv = x0 + ((px - pad.l) / iw) * (x1 - x0); if (!hoverable.length) return;
      let ref = null, best = Infinity;
      for (const [x] of hoverable[0].pts) { const d = Math.abs(x - xv); if (d < best) { best = d; ref = x; } }
      if (ref === null) return;
      dots.textContent = ''; const rows = []; let topY = Infinity;
      hoverable.forEach((s) => {
        let near = null, bd = Infinity; for (const p of s.pts) { const d = Math.abs(p[0] - ref); if (d < bd) { bd = d; near = p; } }
        if (!near || !Number.isFinite(near[1]) || Math.abs(near[1]) > 1e9) return;
        const c = PS.color(s.color, o.series.indexOf(s)); dots.appendChild(svg('circle', { class: 'ps-dot', cx: sx(near[0]), cy: sy(near[1]), r: 5.5, fill: c }));
        rows.push({ color: c, label: s.label, value: fmtY(near[1]) }); topY = Math.min(topY, sy(near[1]));
      });
      cross.setAttribute('x1', sx(ref)); cross.setAttribute('x2', sx(ref)); cross.style.display = '';
      showTip(tip, host, sx(ref), topY - 6, o.xcat ? o.xcat[Math.round(ref)] : (o.xlabel ? o.xlabel + ' = ' : 'x = ') + fmtX(ref), rows);
    };
    const leave = () => { hideTip(tip); cross.style.display = 'none'; dots.textContent = ''; };
    overlay.addEventListener('pointermove', move); overlay.addEventListener('pointerdown', move); overlay.addEventListener('pointerleave', leave);
    host.insertBefore(root, tip);
  };
  function stepPts(pts) { const out = []; pts.forEach((p, i) => { if (i) out.push([p[0], pts[i - 1][1]]); out.push(p); }); return out; }

  // =====================================================================
  // bars — categorias × séries (agrupadas ou empilhadas, vertical ou horizontal)
  // o = { labels, series:[{label,color,data,visible}], stacked, horizontal, ydom, xlabel, ylabel, fmt, showValues }
  // =====================================================================
  charts.bars = function (host, o) {
    host.textContent = '';
    const W = host.clientWidth, H = host.clientHeight; if (W < 40 || H < 40) return;
    const vis = o.series.filter((s) => s.visible !== false); const n = o.labels.length; const k = Math.max(1, vis.length);
    const fmt = o.fmt || num; const horiz = !!o.horizontal;
    const sums = o.labels.map((_, i) => vis.reduce((a, s) => a + (s.data[i] || 0), 0));
    const allVals = o.stacked ? sums.concat(0) : vis.flatMap((s) => s.data).concat(0);
    const negs = o.stacked ? o.labels.map((_, i) => vis.reduce((a, s) => a + Math.min(0, s.data[i] || 0), 0)) : [];
    const dom = o.ydom || charts.autoDomain(allVals.concat(negs), { zero: true, pad: 0.1 });
    const [v0, v1] = dom;
    const longest = Math.max(...o.labels.map((l) => String(l).length));
    const pad = horiz ? { t: 10, r: 24, b: o.ylabel ? 46 : 30, l: clamp(longest * 7.2 + 18, 60, 170) } : { t: 16, r: 14, b: o.xlabel ? 52 : 32, l: o.ylabel ? 66 : 54 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const sv = horiz ? (v) => pad.l + ((v - v0) / (v1 - v0)) * iw : (v) => pad.t + ih - ((v - v0) / (v1 - v0)) * ih;
    const band = (horiz ? ih : iw) / n; const inner = band * 0.72; const bw = o.stacked ? inner : inner / k;
    const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': o.aria || 'gráfico de barras' });
    const gt = makeTicks(v0, v1, Math.max(3, Math.floor((horiz ? iw / 90 : ih / 52)))); const ft = tickFmt(gt.step);
    const grid = svg('g', { class: 'ps-grid' }), tk = svg('g', { class: 'ps-tick' });
    for (const v of gt.ticks) {
      if (horiz) { grid.appendChild(svg('line', { x1: sv(v), x2: sv(v), y1: pad.t, y2: pad.t + ih })); tk.appendChild(svg('text', { x: sv(v), y: pad.t + ih + 18, 'text-anchor': 'middle' }, ft(v))); }
      else { grid.appendChild(svg('line', { x1: pad.l, x2: pad.l + iw, y1: sv(v), y2: sv(v) })); tk.appendChild(svg('text', { x: pad.l - 8, y: sv(v) + 4, 'text-anchor': 'end' }, ft(v))); }
    }
    const skip = horiz ? 1 : Math.ceil(n / Math.max(2, Math.floor(iw / 64)));
    o.labels.forEach((l, i) => {
      if (i % skip) return; const c = band * i + band / 2;
      tk.appendChild(horiz ? svg('text', { x: pad.l - 10, y: pad.t + c + 4, 'text-anchor': 'end' }, String(l)) : svg('text', { x: pad.l + c, y: pad.t + ih + 18, 'text-anchor': 'middle' }, String(l)));
    });
    root.append(grid, tk);
    const zero = sv(clamp(0, v0, v1)); const axis = svg('g', { class: 'ps-axis' });
    axis.appendChild(horiz ? svg('line', { x1: zero, x2: zero, y1: pad.t, y2: pad.t + ih }) : svg('line', { x1: pad.l, x2: pad.l + iw, y1: zero, y2: zero }));
    root.appendChild(axis);
    if (o.xlabel && !horiz) root.appendChild(svg('text', { class: 'ps-axlabel', x: pad.l + iw / 2, y: H - 8, 'text-anchor': 'middle' }, o.xlabel));
    if (o.ylabel && !horiz) root.appendChild(svg('text', { class: 'ps-axlabel', transform: `translate(14 ${pad.t + ih / 2}) rotate(-90)`, 'text-anchor': 'middle' }, o.ylabel));
    if (o.ylabel && horiz) root.appendChild(svg('text', { class: 'ps-axlabel', x: pad.l + iw / 2, y: H - 8, 'text-anchor': 'middle' }, o.ylabel));

    const tip = makeTip(host); const bars = svg('g', {});
    o.labels.forEach((_, i) => {
      let posAcc = 0, negAcc = 0;
      vis.forEach((s, j) => {
        const v = s.data[i] || 0; const color = PS.color(s.color, o.series.indexOf(s)); let a, b; // a..b em valor
        if (o.stacked) { if (v >= 0) { a = posAcc; b = posAcc + v; posAcc = b; } else { b = negAcc; a = negAcc + v; negAcc = a; } } else { a = Math.min(0, v); b = Math.max(0, v); }
        const off = band * i + (band - inner) / 2 + (o.stacked ? 0 : bw * j);
        const rect = horiz
          ? { x: sv(a), y: pad.t + off, width: Math.max(0, sv(b) - sv(a)), height: bw - (o.stacked ? 0 : 2) }
          : { x: pad.l + off, y: sv(b), width: bw - (o.stacked ? 0 : 2), height: Math.max(0, sv(a) - sv(b)) };
        bars.appendChild(svg('rect', Object.assign({ class: 'ps-bar' + (horiz ? ' h' : ''), fill: color, rx: Math.min(5, bw / 3), style: `transition-delay:${(i * 40 + j * 20)}ms` }, rect)));
        if (o.showValues && n * k <= 14 && (!o.stacked)) bars.appendChild(svg('text', { class: 'ps-ref-label', style: 'fill:var(--text);font-weight:700', 'text-anchor': horiz ? 'start' : 'middle', x: horiz ? rect.x + rect.width + 6 : rect.x + rect.width / 2, y: horiz ? rect.y + rect.height / 2 + 4 : rect.y - 6 }, fmt(v)));
      });
      const hit = svg('rect', Object.assign({ fill: 'transparent', style: 'cursor:pointer' }, horiz ? { x: pad.l, y: pad.t + band * i, width: iw, height: band } : { x: pad.l + band * i, y: pad.t, width: band, height: ih }));
      const show = () => { const rows = vis.map((s) => ({ color: PS.color(s.color, o.series.indexOf(s)), label: s.label, value: fmt(s.data[i] || 0) })); if (o.stacked && vis.length > 1) rows.push({ color: 'transparent', label: PS.t('total'), value: fmt(sums[i]) }); showTip(tip, host, horiz ? pad.l + iw / 2 : pad.l + band * i + band / 2, horiz ? pad.t + band * i : sv(Math.max(sums[i], ...vis.map((s) => s.data[i] || 0))) - 4, o.labels[i], rows); };
      hit.addEventListener('pointerenter', show); hit.addEventListener('pointermove', show); hit.addEventListener('pointerdown', show); hit.addEventListener('pointerleave', () => hideTip(tip));
      bars.appendChild(hit);
    });
    root.appendChild(bars); host.insertBefore(root, tip);
  };

  // =====================================================================
  // pie — pizza / rosca. o = { items:[{label,value,color,visible}], donut, fmt, centerLabel }
  // =====================================================================
  charts.pie = function (host, o) {
    host.textContent = '';
    const W = host.clientWidth, H = host.clientHeight; if (W < 40 || H < 40) return;
    const size = Math.min(W, H); const cx = W / 2, cy = H / 2, R = size / 2 - 10, r = o.donut ? R * 0.58 : 0;
    const vis = o.items.filter((s) => s.visible !== false && s.value > 0); const total = vis.reduce((a, s) => a + s.value, 0) || 1;
    const fmt = o.fmt || num; const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': o.aria || 'gráfico de pizza' });
    const tip = makeTip(host);
    const cfs = Math.max(11, Math.min(26, r * 0.34)); const cv = o.donut ? svg('text', { class: 'ps-center-val', x: cx, y: cy + 2, style: `font-size:${cfs}px` }, fmt(total)) : null;
    const cs = o.donut ? svg('text', { class: 'ps-center-sub', x: cx, y: cy + cfs * 0.9 + 2 }, o.centerLabel || PS.t('total')) : null;
    let ang = -Math.PI / 2;
    const pt = (a, rad) => [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
    vis.forEach((s) => {
      const frac = s.value / total; const a0 = ang, a1 = ang + frac * Math.PI * 2; ang = a1; const color = PS.color(s.color, o.items.indexOf(s)); let d;
      if (frac > 0.9999) { d = `M${cx - R} ${cy}A${R} ${R} 0 1 1 ${cx + R} ${cy}A${R} ${R} 0 1 1 ${cx - R} ${cy}` + (r ? `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}` : '') + 'Z'; }
      else { const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R), [x2, y2] = pt(a1, r), [x3, y3] = pt(a0, r); const big = frac > 0.5 ? 1 : 0; d = `M${x0} ${y0}A${R} ${R} 0 ${big} 1 ${x1} ${y1}` + (r ? `L${x2} ${y2}A${r} ${r} 0 ${big} 0 ${x3} ${y3}Z` : `L${cx} ${cy}Z`); }
      const mid = (a0 + a1) / 2; const path = svg('path', { class: 'ps-slice', d, fill: color, 'fill-rule': 'evenodd' });
      const on = () => { path.style.transform = `translate(${Math.cos(mid) * 7}px,${Math.sin(mid) * 7}px)`; if (o.donut) { cv.textContent = fmt(s.value); cs.textContent = s.label + ' · ' + PS.fmt(frac, 'percent'); } else showTip(tip, host, cx + Math.cos(mid) * R * 0.7, cy + Math.sin(mid) * R * 0.7, s.label, [{ color, value: fmt(s.value) + ' · ' + PS.fmt(frac, 'percent') }]); };
      const off = () => { path.style.transform = ''; hideTip(tip); if (o.donut) { cv.textContent = fmt(total); cs.textContent = o.centerLabel || PS.t('total'); } };
      path.addEventListener('pointerenter', on); path.addEventListener('pointerleave', off); path.addEventListener('pointerdown', on);
      root.appendChild(path);
    });
    if (o.donut) root.append(cv, cs);
    host.insertBefore(root, tip);
  };

  // ---------- legenda com liga/desliga ----------
  charts.legend = function (items, onToggle, fmtValue) {
    const box = el('div', { class: 'legend', role: 'group', 'aria-label': 'legenda' });
    items.forEach((it, i) => {
      const b = el('button', { type: 'button', 'aria-pressed': it.visible === false ? 'false' : 'true', style: { '--c': PS.color(it.color, i) } }, el('i'), it.label, fmtValue && it.value !== undefined ? el('span', { class: 'v' }, fmtValue(it.value)) : null);
      b.addEventListener('click', () => { it.visible = it.visible === false; b.setAttribute('aria-pressed', it.visible ? 'true' : 'false'); onToggle(); });
      box.appendChild(b);
    });
    return box;
  };

  /** Re-renderiza quando o container muda de tamanho */
  charts.observe = function (host, render) {
    let t = null; const run = () => { cancelAnimationFrame(t); t = requestAnimationFrame(render); };
    if (window.ResizeObserver) new ResizeObserver(run).observe(host); else window.addEventListener('resize', run);
    run();
  };
})();
