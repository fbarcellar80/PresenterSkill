// Teste de ponta a ponta com Playwright (Chromium headless).
//   node tests/e2e.cjs          (requer: npm i playwright && npx playwright install chromium; ou PS_CHROMIUM=/caminho)
// Compila os exemplos em um diretório temporário e exercita navegação, passos, sliders, painel "saiba mais",
// saltos com "Voltar", tema/paleta, visão geral, notas, hash e impressão (PDF = 1 página por slide).
const { execFileSync } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path'); const assert = require('assert/strict');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('playwright não instalado — e2e ignorado'); process.exit(process.env.CI ? 1 : 0); }

const root = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-e2e-'));
const build = (name, dir = path.join(root, 'examples', name)) => { const out = path.join(tmp, name + '.html'); execFileSync('python3', [path.join(root, 'skills/presenter-slides/scripts/build_deck.py'), dir, '-o', out, '--no-fonts'], { stdio: 'pipe' }); return 'file://' + out; };

let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; console.log('  ✔', msg); };
const eq = (a, b, msg) => { assert.deepEqual(a, b, `${msg} (obtido: ${JSON.stringify(a)}, esperado: ${JSON.stringify(b)})`); passed++; console.log('  ✔', msg); };

(async () => {
  const launch = { args: ['--no-sandbox'] }; if (process.env.PS_CHROMIUM) launch.executablePath = process.env.PS_CHROMIUM;
  const browser = await chromium.launch(launch);
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const idx = () => page.evaluate(() => PS.deck.index);
  const open = async (url) => { await page.goto(url); await page.waitForSelector('body.ps-ready'); await page.evaluate(() => localStorage.clear()); };

  console.log('juros-compostos');
  await open(build('juros-compostos'));
  eq(await idx(), 0, 'abre no slide 1');
  await page.keyboard.press('ArrowRight'); eq(await idx(), 1, '→ avança');
  await page.keyboard.press('ArrowRight'); eq(await idx(), 1, '→ revela o passo oculto antes de avançar');
  eq(await page.locator('.slide.is-active .step-on').count(), 1, 'um passo visível');
  await page.keyboard.press('ArrowLeft'); eq(await page.locator('.slide.is-active .step-on').count(), 0, '← oculta o passo');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('PageDown'); eq(await idx(), 3, 'PageDown avança');
  await page.keyboard.press('PageUp'); eq(await idx(), 2, 'PageUp retorna');
  await page.keyboard.press('End'); eq(await idx(), 9, 'End vai ao último'); await page.keyboard.press('Home'); eq(await idx(), 0, 'Home vai ao primeiro');
  await page.keyboard.press('4'); await page.keyboard.press('Enter'); eq(await idx(), 3, 'digitar 4 + Enter pula para o slide 4');
  ok((await page.evaluate(() => location.hash)) === '#/4', 'hash reflete o slide');

  // slider: setas ajustam o valor, PageDown muda de slide, Esc devolve a navegação
  await page.evaluate(() => PS.deck.go(2));
  const range = page.locator('.slide.is-active input[type=range]').first();
  const v0 = await range.inputValue(); await range.focus(); await page.keyboard.press('ArrowRight');
  ok((await range.inputValue()) !== v0, 'seta ajusta o slider'); eq(await idx(), 2, 'seta no slider não troca de slide');
  const out0 = await page.locator('.slide.is-active .out .v').first().textContent();
  await range.fill(String(await range.getAttribute('max'))); ok((await page.locator('.slide.is-active .out .v').first().textContent()) !== out0, 'mover slider atualiza resultados');
  await page.keyboard.press('Escape'); await page.keyboard.press('ArrowRight'); eq(await idx(), 3, 'Esc libera as setas para navegar');
  ok(await page.locator('.slide.is-active .plot-host svg').count() > 0 || await page.locator('.slide.is-active .w-head').count() > 0, 'widget renderizado');

  // painel saiba mais
  await page.evaluate(() => PS.deck.go(2));
  await page.locator('.slide.is-active .info-btn').first().click();
  await page.waitForSelector('.drawer.open'); ok(await page.locator('.drawer.open').count() === 1, 'info-btn abre o painel'); await page.keyboard.press('Escape'); await page.waitForTimeout(450);
  eq(await page.locator('.drawer').count(), 0, 'Esc fecha o painel');
  eq(await page.evaluate(() => document.activeElement.className.includes('info-btn')), true, 'foco retorna ao botão');

  // salto + voltar
  await page.evaluate(() => PS.deck.go(1));
  await page.locator('.slide.is-active .xref').first().click(); eq(await idx(), 2, 'xref salta');
  ok(await page.locator('.back-chip').isVisible(), 'botão Voltar aparece'); await page.locator('.back-chip').click(); eq(await idx(), 1, 'Voltar retorna ao slide de origem');

  // tema, paleta, visão geral, notas, tela preta
  await page.keyboard.press('t'); const th = await page.evaluate(() => document.documentElement.dataset.theme); ok(th === 'dark' || th === 'light', 'T alterna o tema (' + th + ')');
  const pal0 = await page.evaluate(() => document.documentElement.dataset.palette); await page.keyboard.press('p'); ok((await page.evaluate(() => document.documentElement.dataset.palette)) !== pal0, 'P troca a paleta');
  await page.reload(); await page.waitForSelector('body.ps-ready'); eq(await page.evaluate(() => document.documentElement.dataset.theme), th, 'tema persiste após recarregar');
  await page.keyboard.press('o'); ok(await page.locator('.overview .ov-card').count() === 10, 'O abre visão geral com 10 cartões');
  await page.locator('.ov-card').nth(5).click(); eq(await idx(), 5, 'clicar no cartão navega');
  await page.keyboard.press('n'); ok(await page.locator('.notes-panel').isVisible(), 'N mostra notas'); await page.keyboard.press('n');
  await page.keyboard.press('b'); ok(await page.evaluate(() => Array.from(document.body.children).some((n) => n.style.zIndex === '100')), 'B escurece a tela'); await page.keyboard.press('b');

  // quiz
  await page.evaluate(() => PS.deck.go(8));
  await page.locator('.slide.is-active .quiz-opt').nth(0).click(); ok(await page.locator('.slide.is-active .quiz-opt.wrong').count() === 1, 'quiz marca erro');
  await page.locator('.slide.is-active .quiz-opt').nth(1).click(); ok(await page.locator('.slide.is-active .quiz-opt.right').count() >= 1, 'quiz marca acerto');

  // hash inicial
  await page.goto(build('juros-compostos') + '#/5'); await page.waitForSelector('body.ps-ready'); eq(await idx(), 4, 'abre direto no slide do hash');

  // impressão: 1 página por slide
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length; eq(pages, 10, 'PDF tem 1 página por slide');
  await page.emulateMedia({ media: 'screen' });

  console.log('normal-distribution');
  await open(build('normal-distribution'));
  await page.evaluate(() => PS.deck.go(2)); await page.locator('.slide.is-active .hotspot').first().click(); await page.waitForSelector('.drawer.open'); ok(await page.locator('.drawer.open').count() === 1, 'hotspot abre o painel'); await page.keyboard.press('Escape'); await page.waitForTimeout(450);
  await page.evaluate(() => PS.deck.go(4)); await page.waitForTimeout(100);
  const n0 = await page.locator('.slide.is-active .sampler-stats .v').first().textContent(); await page.locator('.slide.is-active button', { hasText: '500' }).click();
  ok((await page.locator('.slide.is-active .sampler-stats .v').first().textContent()) !== n0, 'sampler sorteia amostras');
  await page.evaluate(() => PS.deck.go(3)); const vl = page.locator('.slide.is-active .out .v').first(); const before = await vl.textContent();
  await page.locator('.slide.is-active input[type=range]').nth(2).fill('3'); ok((await vl.textContent()) !== before, 'faixa ±kσ altera a probabilidade');
  await page.locator('.slide.is-active .plot-host rect').last().hover({ position: { x: 200, y: 50 } }); ok(await page.locator('.slide.is-active .plot-tip.on').count() === 1, 'hover mostra tooltip');

  console.log('popup e termos em fórmulas');
  await open(build('popup-terms', path.join(root, 'tests/fixtures/popup-terms')));
  const fterm = page.locator('.slide.is-active .formula .term', { hasText: 'LV' }).first(); await fterm.hover(); await page.waitForSelector('.tip.on');
  ok((await page.locator('.tip.on').textContent()).includes('Largura da vala'), 'termo da fórmula mostra o significado (glossário do deck)');
  await page.locator('.slide.is-active .formula .term', { hasText: 'SL' }).first().hover(); ok((await page.locator('.tip.on').textContent()).includes('Sobrelargura'), 'data-terms local complementa o glossário');
  ok(await page.locator('.slide.is-active .fx .term').count() >= 2, 'fórmula em linha (.fx) também recebe os termos');
  await page.mouse.move(5, 5); await page.waitForTimeout(300); eq(await page.locator('.tip.on').count(), 0, 'tooltip some ao sair do termo');
  await page.locator('.slide.is-active [data-popup]').first().click(); await page.waitForSelector('.popup.open');
  ok(await page.locator('.popup.open .plot-host svg, .popup.open .out .v').count() > 0, 'pop-up renderiza o widget');
  ok(await page.locator('.popup.open .out .k .term').count() > 0, 'rótulos de saída do lab recebem termos');
  await page.keyboard.press('ArrowRight'); eq(await idx(), 0, 'setas não trocam de slide com o pop-up aberto');
  await page.keyboard.press('Escape'); await page.waitForTimeout(450); eq(await page.locator('.popup').count(), 0, 'Esc fecha o pop-up');
  eq(await idx(), 0, 'continua no mesmo slide ao fechar');
  eq(await page.evaluate(() => document.activeElement.hasAttribute('data-popup')), true, 'foco retorna ao botão');
  await page.locator('.slide.is-active [data-popup]').first().click(); await page.waitForSelector('.popup.open');
  await page.locator('.popup-scrim').click({ position: { x: 5, y: 5 } }); await page.waitForTimeout(450); eq(await page.locator('.popup').count(), 0, 'clique fora fecha o pop-up');
  await page.locator('.slide.is-active [data-popup]').first().click(); await page.waitForSelector('.popup.open'); await page.locator('.popup .close').click(); await page.waitForTimeout(450); eq(await page.locator('.popup').count(), 0, 'botão ✕ fecha o pop-up');

  console.log('mobile');
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' }); const mp = await m.newPage();
  await mp.goto(build('juros-compostos')); await mp.waitForSelector('body.ps-ready');
  const overflow = await mp.evaluate(() => { const s = PS.deck.slides[0]; return s.scrollWidth > s.clientWidth + 2; }); eq(overflow, false, 'sem rolagem horizontal no celular');
  await mp.evaluate(() => PS.deck.next()); eq(await mp.evaluate(() => PS.deck.index), 1, 'navegação por botão funciona no celular');

  eq(errors, [], 'nenhum erro de console/JS');
  await browser.close(); fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\n✔ e2e: ${passed} verificações`);
})().catch((e) => { console.error('\n✖ e2e falhou:', e.message); process.exit(1); });
