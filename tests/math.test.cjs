// Testes do avaliador de expressões (assets/js/math.js) — rode: node --test tests/math.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const M = require(path.join(__dirname, '..', 'skills', 'presenter-slides', 'assets', 'js', 'math.js'));
const ev = (s, sc = {}, o = {}) => M.compile(s, o)(sc);
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('precedência e associatividade', () => {
  assert.equal(ev('2+3*4'), 14);
  assert.equal(ev('(2+3)*4'), 20);
  assert.equal(ev('2^3^2'), 512);
  assert.equal(ev('-x^2', { x: 3 }), -9);
  assert.equal(ev('2^-1'), 0.5);
  assert.equal(ev('10-3-2'), 5);
  assert.equal(ev('7%3'), 1);
  assert.equal(ev('-7%3'), 2); // módulo matemático
});
test('multiplicação implícita só após número ou ")"', () => {
  assert.equal(ev('2x+1', { x: 4 }), 9);
  assert.equal(ev('3(x+1)', { x: 1 }), 6);
  close(ev('2pi'), 2 * Math.PI);
  assert.throws(() => ev('x y', { x: 1, y: 2 }));
});
test('comparações e if', () => {
  assert.equal(ev('if(x>0,1,-1)', { x: -3 }), -1);
  assert.equal(ev('(2<3)+(3<=3)+(4!=4)'), 2);
  assert.equal(ev('if(x>=2 , x^2, 0)', { x: 3 }), 9);
});
test('funções e constantes', () => {
  close(ev('sin(pi/2)'), 1); close(ev('ln(e)'), 1); assert.equal(ev('log(1000)'), 3); close(ev('log(8,2)'), 3);
  assert.equal(ev('comb(10,3)'), 120); assert.equal(ev('fact(5)'), 120); assert.equal(ev('max(1,5,3)'), 5); assert.equal(ev('clamp(9,0,5)'), 5);
  close(ev('normcdf(1.96)'), 0.975, 1e-4); close(ev('normpdf(0)'), 0.3989423, 1e-6); close(ev('pmt(0.01,12,1000)'), 88.8488, 1e-3);
});
test('sum, prod, deriv, integ', () => {
  close(ev('sum(1/k^2,k,1,1000)'), 1.6439345, 1e-5); assert.equal(ev('prod(k,k,1,5)'), 120);
  const defs = { f: 'a*x^2' };
  close(ev('deriv(f,3)', { a: 1 }, { defs }), 6, 1e-4); close(ev('integ(f,0,3)', { a: 1 }, { defs }), 9, 1e-6);
});
test('funções do usuário (defs) com vários argumentos e aninhadas', () => {
  const defs = { f: 'a*x^2+b', 'g(x,y)': 'x*y', h: 'f(x)+1' };
  assert.equal(ev('f(3)', { a: 2, b: 1 }, { defs }), 19);
  assert.equal(ev('g(3,4)', {}, { defs }), 12);
  assert.equal(ev('h(2)', { a: 1, b: 0 }, { defs }), 5);
});
test('modo estrito detecta variáveis desconhecidas', () => {
  assert.throws(() => M.compile('y+1', { known: ['x'] }), /Variável desconhecida "y"/);
  assert.doesNotThrow(() => M.compile('f(x)+pi', { known: ['x'], defs: { f: 'x' } }));
  assert.throws(() => M.compile('sum(k,k,1,n)', { known: [] }), /"n"/);
  assert.doesNotThrow(() => M.compile('sum(k,k,1,n)', { known: ['n'] }));
});
test('erros de sintaxe e segurança', () => {
  assert.throws(() => ev('1+'), /inesperado/); assert.throws(() => ev('(1+2'), /Faltou/); assert.throws(() => ev('1 $ 2'), /inesperado/);
  assert.throws(() => ev('foo(1)'), /desconhecida/);
  assert.throws(() => ev('constructor("return 1")()'), /desconhecida|inesperado|Sobrou/);
  assert.throws(() => ev('__proto__', {}), /sem valor/);
  assert.throws(() => ev('x', {}), /sem valor/);
});
test('recursão infinita é interrompida', () => {
  assert.throws(() => ev('f(1)', {}, { defs: { f: 'f(x)' } }), /Recursão/);
});
test('formatação', () => {
  assert.equal(M.format(1234.5, 'currency', { lang: 'pt-BR' }).replace(/\s/g, ' '), 'R$ 1.234,50');
  assert.equal(M.format(0.153, 'percent', { lang: 'pt-BR' }), '15,3%');
  assert.equal(M.format(3.14159, 'num:2', { lang: 'en' }), '3.14');
  assert.equal(M.format(NaN, 'num'), '—'); assert.equal(M.format(Infinity, 'num'), '∞');
  assert.equal(M.format(5, 'int', { suffix: ' kg', lang: 'en' }), '5 kg');
});
test('template substitui {expr|fmt}', () => {
  assert.equal(M.template('{n} e {n*2|int}', { n: 3 }, {}, { lang: 'en' }), '<b>3</b> e <b>6</b>');
  assert.equal(M.template('{zz}', {}, {}, {}), '<b>?</b>');
});
