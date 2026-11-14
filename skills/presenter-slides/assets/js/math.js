/* presenter-slides · math.js
 * Avaliador de expressões matemáticas SEGURO (sem eval / new Function).
 * Usado pelos widgets "lab" (curvas, calculadoras, simulações).
 *
 * Sintaxe:  + - * / % ^   comparações < > <= >= == !=   parênteses
 *   multiplicação implícita após número ou ")":  2x, 3(x+1), 2pi
 *   constantes: pi e tau inf
 *   funções: sin cos tan asin acos atan atan2 sinh cosh tanh exp ln log(x[,base]) log2 log10
 *            sqrt cbrt abs sign floor ceil round trunc min max pow mod clamp lerp
 *            fact comb perm normpdf(x,mu,sigma) normcdf(x,mu,sigma) pmt(taxa,n,vp) if(cond,a,b)
 *   especiais: sum(expr, k, a, b)  prod(expr, k, a, b)  deriv(f, x0)  integ(f, a, b)
 *              (f é o nome de uma função definida em "defs")
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.PS = root.PS || {}; root.PS.math = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // dicionários sem protótipo: 'constructor', '__proto__', 'toString'… nunca resolvem como constantes/funções
  const dict = (o) => Object.assign(Object.create(null), o);
  const CONST = dict({ pi: Math.PI, e: Math.E, tau: 2 * Math.PI, inf: Infinity });
  const fact = (n) => { n = Math.round(n); if (n < 0) return NaN; if (n > 170) return Infinity; let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
  const comb = (n, k) => { n = Math.round(n); k = Math.round(k); if (k < 0 || k > n) return 0; k = Math.min(k, n - k); let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); };
  const erf = (x) => { // Abramowitz-Stegun 7.1.26 (erro < 1.5e-7)
    const s = Math.sign(x); x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  };
  const FUNCS = dict({
    sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, atan2: Math.atan2,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, exp: Math.exp, ln: Math.log, log2: Math.log2, log10: Math.log10,
    log: (x, b) => (b === undefined ? Math.log10(x) : Math.log(x) / Math.log(b)),
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, sign: Math.sign, floor: Math.floor, ceil: Math.ceil, round: Math.round, trunc: Math.trunc,
    min: Math.min, max: Math.max, pow: Math.pow, mod: (a, b) => ((a % b) + b) % b,
    clamp: (x, a, b) => Math.min(Math.max(x, a), b), lerp: (a, b, t) => a + (b - a) * t,
    fact, comb, perm: (n, k) => fact(n) / fact(n - k),
    normpdf: (x, mu = 0, s = 1) => Math.exp(-0.5 * ((x - mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI)),
    normcdf: (x, mu = 0, s = 1) => 0.5 * (1 + erf((x - mu) / (s * Math.SQRT2))),
    pmt: (r, n, pv) => (r === 0 ? pv / n : pv * r / (1 - Math.pow(1 + r, -n))),
    if: (c, a, b) => (c ? a : b),
  });
  const SPECIAL = new Set(['sum', 'prod', 'deriv', 'integ']);

  // ---------- tokenizador ----------
  function tokenize(src) {
    const t = []; let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      let m;
      if ((m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i)))) {
        // "2e" seguido de letra não deve virar notação científica: 2e → 2*e (tratado abaixo)
        let txt = m[0];
        if (m[2] && /[a-z_(]/i.test(src[i + txt.length] || '') ) txt = m[1];
        t.push({ k: 'num', v: parseFloat(txt), pos: i }); i += txt.length; continue;
      }
      if ((m = /^[A-Za-z_][A-Za-z_0-9]*/.exec(src.slice(i)))) { t.push({ k: 'id', v: m[0], pos: i }); i += m[0].length; continue; }
      if ((m = /^(<=|>=|==|!=)/.exec(src.slice(i)))) { t.push({ k: 'op', v: m[0], pos: i }); i += 2; continue; }
      if ('+-*/%^<>(),'.includes(c)) { t.push({ k: c === '(' || c === ')' || c === ',' ? c : 'op', v: c, pos: i }); i++; continue; }
      throw new Error(`Caractere inesperado "${c}" na posição ${i} de "${src}"`);
    }
    t.push({ k: 'end', pos: src.length });
    return t;
  }

  // ---------- parser (descida recursiva → AST) ----------
  function parse(src) {
    const tk = tokenize(String(src)); let p = 0;
    const peek = () => tk[p]; const next = () => tk[p++];
    const isOp = (v) => peek().k === 'op' && peek().v === v;
    const fail = (msg) => { throw new Error(`${msg} em "${src}"`); };

    function compare() {
      let l = add();
      while (peek().k === 'op' && ['<', '>', '<=', '>=', '==', '!='].includes(peek().v)) { const op = next().v; l = { t: 'bin', op, l, r: add() }; }
      return l;
    }
    function add() {
      let l = mul();
      while (isOp('+') || isOp('-')) { const op = next().v; l = { t: 'bin', op, l, r: mul() }; }
      return l;
    }
    function mul() {
      let l = unary();
      for (;;) {
        if (isOp('*') || isOp('/') || isOp('%')) { const op = next().v; l = { t: 'bin', op, l, r: unary() }; continue; }
        // multiplicação implícita: só depois de número literal ou ")" (evita ambiguidade com chamadas)
        const prevTok = tk[p - 1];
        const afterNum = prevTok && (prevTok.k === 'num' || prevTok.k === ')');
        if (afterNum && (peek().k === 'id' || peek().k === '(' || peek().k === 'num' && prevTok.k === ')')) { l = { t: 'bin', op: '*', l, r: unary() }; continue; }
        return l;
      }
    }
    function unary() {
      if (isOp('-')) { next(); return { t: 'neg', a: unary() }; }
      if (isOp('+')) { next(); return unary(); }
      return pow();
    }
    function pow() {
      const base = primary();
      if (isOp('^')) { next(); return { t: 'bin', op: '^', l: base, r: unary() }; } // associativa à direita
      return base;
    }
    function primary() {
      const tok = next();
      if (tok.k === 'num') return { t: 'num', v: tok.v };
      if (tok.k === '(') { const e = compare(); if (next().k !== ')') fail('Faltou ")"'); return e; }
      if (tok.k === 'id') {
        if (peek().k === '(') {
          next(); const args = [];
          if (peek().k !== ')') { do { args.push(compare()); } while (peek().k === ',' && next()); }
          if (next().k !== ')') fail('Faltou ")" ao fechar chamada de ' + tok.v);
          return { t: 'call', name: tok.v, args };
        }
        return { t: 'id', name: tok.v };
      }
      fail(`Token inesperado "${tok.v ?? tok.k}"`);
    }
    const ast = compare();
    if (peek().k !== 'end') fail(`Sobrou texto "${src.slice(peek().pos)}"`);
    return ast;
  }

  // ---------- análise estática (identificadores livres) ----------
  function freeIds(ast, bound = new Set(), out = new Set()) {
    switch (ast.t) {
      case 'id': if (!bound.has(ast.name) && !(ast.name in CONST)) out.add(ast.name); break;
      case 'bin': freeIds(ast.l, bound, out); freeIds(ast.r, bound, out); break;
      case 'neg': freeIds(ast.a, bound, out); break;
      case 'call':
        if (ast.name === 'sum' || ast.name === 'prod') {
          const k = ast.args[1] && ast.args[1].name; const b2 = new Set(bound); if (k) b2.add(k);
          freeIds(ast.args[0], b2, out); ast.args.slice(2).forEach((a) => freeIds(a, bound, out));
        } else if (ast.name === 'deriv' || ast.name === 'integ') {
          ast.args.slice(1).forEach((a) => freeIds(a, bound, out));
        } else ast.args.forEach((a) => freeIds(a, bound, out));
        break;
      default: break;
    }
    return out;
  }

  // ---------- compilação AST → função(escopo) ----------
  /**
   * compile(src, { defs, known })
   *  defs:  { "f": "a*x^2+b", "g(x,y)": "x*y" }  funções de usuário (argumento padrão: x)
   *  known: Set/Array com nomes de variáveis permitidos; se informado, nomes desconhecidos lançam erro.
   */
  function compile(src, opts = {}) {
    const ast = typeof src === 'object' ? src : parse(src);
    const defs = buildDefs(opts.defs || {});
    if (opts.known) {
      const known = new Set(opts.known);
      for (const id of freeIds(ast)) {
        if (!known.has(id) && !(id in defs) && !(id in FUNCS)) throw new Error(`Variável desconhecida "${id}" em "${src}"`);
      }
    }
    return build(ast, defs);
  }

  function buildDefs(raw) {
    const defs = Object.create(null);
    for (const key of Object.keys(raw)) {
      const m = /^([A-Za-z_]\w*)\s*(?:\(([^)]*)\))?$/.exec(key.trim());
      if (!m) throw new Error(`Nome de função inválido: "${key}"`);
      defs[m[1]] = { params: m[2] ? m[2].split(',').map((s) => s.trim()) : ['x'], ast: parse(raw[key]), fn: null };
    }
    for (const name of Object.keys(defs)) {
      const d = defs[name];
      d.fn = build(d.ast, defs);
    }
    return defs;
  }

  function callDef(def, args, scope, depth) {
    if (depth > 60) throw new Error('Recursão profunda demais');
    const s = Object.create(scope);
    def.params.forEach((n, i) => { s[n] = args[i]; });
    s.__d = (scope.__d || 0) + 1;
    if (s.__d > 60) throw new Error('Recursão profunda demais');
    return def.fn(s);
  }

  function build(ast, defs) {
    switch (ast.t) {
      case 'num': { const v = ast.v; return () => v; }
      case 'id': {
        const n = ast.name;
        if (n in CONST) { const v = CONST[n]; return () => v; }
        return (s) => {
          const v = s[n];
          if (typeof v === 'number') return v;
          if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(+v)) return +v; // <select> com valores numéricos
          throw new Error(`Variável "${n}" sem valor numérico`); // também barra __proto__, constructor, etc.
        };
      }
      case 'neg': { const a = build(ast.a, defs); return (s) => -a(s); }
      case 'bin': {
        const l = build(ast.l, defs), r = build(ast.r, defs);
        switch (ast.op) {
          case '+': return (s) => l(s) + r(s);
          case '-': return (s) => l(s) - r(s);
          case '*': return (s) => l(s) * r(s);
          case '/': return (s) => l(s) / r(s);
          case '%': return (s) => { const b = r(s); return ((l(s) % b) + b) % b; };
          case '^': return (s) => Math.pow(l(s), r(s));
          case '<': return (s) => (l(s) < r(s) ? 1 : 0);
          case '>': return (s) => (l(s) > r(s) ? 1 : 0);
          case '<=': return (s) => (l(s) <= r(s) ? 1 : 0);
          case '>=': return (s) => (l(s) >= r(s) ? 1 : 0);
          case '==': return (s) => (l(s) === r(s) ? 1 : 0);
          default: return (s) => (l(s) !== r(s) ? 1 : 0);
        }
      }
      case 'call': return buildCall(ast, defs);
      default: throw new Error('Nó desconhecido');
    }
  }

  function buildCall(ast, defs) {
    const { name, args } = ast;
    if (SPECIAL.has(name)) {
      if (name === 'sum' || name === 'prod') {
        if (args.length !== 4 || args[1].t !== 'id') throw new Error(`${name}(expr, k, a, b) exige 4 argumentos e k como nome de variável`);
        const body = build(args[0], defs), k = args[1].name, a = build(args[2], defs), b = build(args[3], defs);
        return (s) => {
          const lo = Math.round(a(s)), hi = Math.round(b(s)); if (hi - lo > 100000) throw new Error('sum/prod com intervalo grande demais');
          const sc = Object.create(s); let acc = name === 'sum' ? 0 : 1;
          for (let i = lo; i <= hi; i++) { sc[k] = i; acc = name === 'sum' ? acc + body(sc) : acc * body(sc); }
          return acc;
        };
      }
      const fnName = args[0] && args[0].t === 'id' ? args[0].name : null;
      if (!fnName || !defs[fnName]) throw new Error(`${name}(f, ...) exige o nome de uma função declarada em "defs"`);
      const def = defs[fnName];
      if (name === 'deriv') {
        const x0 = build(args[1], defs);
        return (s) => { const x = x0(s), h = 1e-5 * Math.max(1, Math.abs(x)); return (callDef(def, [x + h], s, 0) - callDef(def, [x - h], s, 0)) / (2 * h); };
      }
      const a = build(args[1], defs), b = build(args[2], defs); // integ: Simpson, n par
      return (s) => {
        const lo = a(s), hi = b(s), n = 400, h = (hi - lo) / n; let acc = callDef(def, [lo], s, 0) + callDef(def, [hi], s, 0);
        for (let i = 1; i < n; i++) acc += (i % 2 ? 4 : 2) * callDef(def, [lo + i * h], s, 0);
        return acc * h / 3;
      };
    }
    const cargs = args.map((a) => build(a, defs));
    if (defs[name]) { const def = defs[name]; return (s) => callDef(def, cargs.map((c) => c(s)), s, 0); }
    const fn = FUNCS[name];
    if (!fn) throw new Error(`Função desconhecida "${name}"`);
    return (s) => fn(...cargs.map((c) => c(s)));
  }

  // ---------- formatação ----------
  /** format(valor, "currency|percent|int|compact|sci|num:2|raw", {lang, currency, suffix}) */
  function format(v, fmt, o = {}) {
    if (typeof v !== 'number' || Number.isNaN(v)) return '—';
    if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞';
    const lang = o.lang || 'pt-BR';
    const [kind, arg] = String(fmt || 'num').split(':');
    let out;
    try {
      switch (kind) {
        case 'currency': out = new Intl.NumberFormat(lang, { style: 'currency', currency: o.currency || (lang.startsWith('pt') ? 'BRL' : 'USD'), maximumFractionDigits: arg ? +arg : 2 }).format(v); break;
        case 'percent': out = new Intl.NumberFormat(lang, { style: 'percent', maximumFractionDigits: arg ? +arg : 1 }).format(v); break;
        case 'int': out = new Intl.NumberFormat(lang, { maximumFractionDigits: 0 }).format(v); break;
        case 'compact': out = new Intl.NumberFormat(lang, { notation: 'compact', maximumFractionDigits: arg ? +arg : 1 }).format(v); break;
        case 'sci': out = v.toExponential(arg ? +arg : 2).replace('e+', '×10^').replace('e', '×10^'); break;
        case 'raw': out = String(v); break;
        default: out = new Intl.NumberFormat(lang, { maximumFractionDigits: arg !== undefined ? +arg : (Math.abs(v) >= 100 ? 1 : Math.abs(v) >= 1 ? 2 : 3), minimumFractionDigits: arg !== undefined ? +arg : 0 }).format(v);
      }
    } catch (e) { out = String(v); }
    return out + (o.suffix || '');
  }

  /** Substitui {expr|fmt} em um texto, avaliando expr com o escopo dado. */
  function template(str, scope, defs, o) {
    return String(str).replace(/\{([^{}|]+)(?:\|([^{}]+))?\}/g, (_, expr, fmt) => {
      try { return `<b>${format(compile(expr, { defs })(scope), fmt, o)}</b>`; } catch (e) { return `<b>?</b>`; }
    });
  }

  return { parse, compile, freeIds, format, template, FUNCS, CONST, fact, comb };
});
