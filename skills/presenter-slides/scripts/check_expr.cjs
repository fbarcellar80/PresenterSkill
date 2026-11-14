#!/usr/bin/env node
/* Verifica expressões matemáticas dos widgets usando o MESMO parser do runtime (assets/js/math.js).
 * Entrada (stdin): JSON [{where, expr, known:[...], defs:{...}}]  ·  Saída: JSON [{where, expr, error}]
 */
const path = require('path');
const M = require(path.join(__dirname, '..', 'assets', 'js', 'math.js'));
let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  const items = JSON.parse(raw || '[]'); const errors = [];
  for (const it of items) {
    try {
      const defsParams = {};
      for (const key of Object.keys(it.defs || {})) {
        const m = /^([A-Za-z_]\w*)\s*(?:\(([^)]*)\))?$/.exec(key.trim());
        // corpo de cada função: variáveis conhecidas + parâmetros da própria função
        M.compile(it.defs[key], { defs: it.defs, known: [...it.known, ...(m && m[2] ? m[2].split(',').map((s) => s.trim()) : ['x'])] });
      }
      M.compile(it.expr, { defs: it.defs || {}, known: it.known });
    } catch (e) { errors.push({ where: it.where, expr: it.expr, error: e.message }); }
  }
  process.stdout.write(JSON.stringify(errors));
});
