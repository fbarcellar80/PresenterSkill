#!/usr/bin/env node
/* QA visual/funcional de um deck compilado, usando Playwright (headless Chromium).
 *
 * Uso:
 *   node qa_check.cjs dist/index.html [--out qa/] [--viewports 1920x1080,1366x768,390x844]
 *                     [--themes light,dark] [--palette ocean] [--no-shots] [--animated]
 *
 * Verifica, para cada slide × viewport × tema:
 *   ✖ erros de console / exceções JS            ✖ widgets com erro (.w-error)
 *   ✖ rolagem horizontal / elementos fora da tela   ✖ imagens quebradas
 *   ⚠ conteúdo mais alto que a tela em desktop (o slide rolaria — reduza o texto)
 * Salva screenshots em --out. Sai com código 1 se houver ✖.
 * Requer:  npm i -D playwright  &&  npx playwright install chromium
 */
const path = require('path');
const fs = require('fs');

function parseArgs(argv) {
  const a = { file: null, out: 'qa', viewports: '1920x1080,1366x768,390x844', themes: 'light,dark', palette: null, shots: true, animated: false };
  for (let i = 2; i < argv.length; i++) {
    const v = argv[i];
    if (v === '--out') a.out = argv[++i]; else if (v === '--viewports') a.viewports = argv[++i]; else if (v === '--themes') a.themes = argv[++i];
    else if (v === '--palette') a.palette = argv[++i]; else if (v === '--no-shots') a.shots = false; else if (v === '--animated') a.animated = true;
    else if (!v.startsWith('--')) a.file = v;
  }
  return a;
}

(async () => {
  const args = parseArgs(process.argv);
  if (!args.file) { console.error('uso: node qa_check.cjs dist/index.html [--out dir] [--viewports WxH,..] [--themes light,dark]'); process.exit(2); }
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright não encontrado. Instale com: npm i -D playwright && npx playwright install chromium'); process.exit(2); }
  const url = 'file://' + path.resolve(args.file);
  fs.mkdirSync(args.out, { recursive: true });
  const launch = { args: ['--no-sandbox'] };
  if (process.env.PS_CHROMIUM) launch.executablePath = process.env.PS_CHROMIUM;
  const browser = await chromium.launch(launch);
  const problems = []; const warnings = []; let checked = 0;

  for (const vp of args.viewports.split(',')) {
    const [w, h] = vp.split('x').map(Number);
    for (const theme of args.themes.split(',')) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: theme, reducedMotion: args.animated ? 'no-preference' : 'reduce' });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', (e) => errs.push('exceção: ' + e.message));
      page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|cdnjs\.cloudflare|net::ERR_/i.test(m.text())) errs.push('console: ' + m.text()); });
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForSelector('body.ps-ready', { timeout: 8000 });
      if (args.palette) await page.evaluate((p) => PS.deck.setPalette(p), args.palette);
      const total = await page.evaluate(() => PS.deck.count);
      for (let i = 0; i < total; i++) {
        await page.evaluate((n) => PS.deck.go(n), i);
        await page.waitForTimeout(args.animated ? 1500 : 250);
        const tag = `${vp}/${theme}/slide ${i + 1}`;
        const r = await page.evaluate(() => {
          const s = PS.deck.slides[PS.deck.index]; const out = { title: s.dataset.title, widgetErrors: [], offscreen: 0, broken: [] };
          out.hOverflow = s.scrollWidth > s.clientWidth + 2; out.vOverflow = s.scrollHeight - s.clientHeight;
          s.querySelectorAll('.w-error').forEach((n) => out.widgetErrors.push(n.textContent.trim().slice(0, 160)));
          s.querySelectorAll('img').forEach((im) => { if (im.complete && im.naturalWidth === 0) out.broken.push((im.getAttribute('src') || '').slice(0, 60)); });
          const vw = window.innerWidth; const sr = s.getBoundingClientRect();
          s.querySelectorAll('.slide-body *').forEach((n) => { if (n.closest('.notes, template, .sr-only, [hidden], svg *') ) return; const b = n.getBoundingClientRect(); if (b.width && b.height && (b.right > vw + 2 || b.left < -2) && getComputedStyle(n).visibility !== 'hidden' && !n.closest('.tabs-nav')) out.offscreen++; });
          return out;
        });
        checked++;
        if (r.widgetErrors.length) problems.push(`${tag} «${r.title}»: widget com erro → ${r.widgetErrors.join(' | ')}`);
        if (r.hOverflow || r.offscreen) problems.push(`${tag} «${r.title}»: conteúdo estoura a largura (${r.offscreen} elemento(s) fora da tela)`);
        if (r.broken.length) problems.push(`${tag} «${r.title}»: imagem(ns) quebrada(s): ${r.broken.join(', ')}`);
        if (r.vOverflow > 4 && w >= 1024) warnings.push(`${tag} «${r.title}»: conteúdo ${r.vOverflow}px mais alto que a tela (vai rolar) — enxugue texto ou divida o slide`);
        if (args.shots) await page.screenshot({ path: path.join(args.out, `${vp}-${theme}-${String(i + 1).padStart(2, '0')}.png`) });
      }
      for (const e of [...new Set(errs)]) problems.push(`${vp}/${theme}: ${e}`);
      await ctx.close();
    }
  }
  await browser.close();
  console.log(`QA: ${checked} slides×viewports×temas verificados.`);
  warnings.forEach((m) => console.log('⚠ ' + m));
  problems.forEach((m) => console.log('✖ ' + m));
  console.log(problems.length ? `\n${problems.length} problema(s).` : '\n✔ sem problemas bloqueantes.');
  if (args.shots) console.log(`Screenshots em ${args.out}/`);
  process.exit(problems.length ? 1 : 0);
})();
