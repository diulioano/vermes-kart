const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const server = spawn(process.execPath, [path.join(__dirname, 'serve.mjs'), '--port', '0'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let browser;
  try {
    const base = await new Promise((resolve, reject) => {
      server.stdout.on('data', data => { const m = String(data).match(/http:\/\/127\.0\.0\.1:\d+/); if (m) resolve(m[0]); });
      server.on('error', reject);
    });
    browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) errors.push(r.url()); });
    await page.route('**/assets/jogo.js', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: await response.text() + '\nwindow.__bandeiraTest={roll:I0,icons:ks};' });
    });
    for (const track of ['gravatai', 'cidreira']) {
      await page.goto(base + '/?debug&pista=' + track);
      await page.waitForFunction(() => window.__bandeiraTest);
      await page.evaluate(() => vermes.pronto());
      const rates = await page.evaluate(() => {
        const original = Math.random, results = [];
        try {
          for (const position of [1, 4, 8]) {
            let seed = 42, hits = 0;
            Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
            for (let n = 0; n < 20000; n++) if (__bandeiraTest.roll(position, 8) === 'bandeira') hits++;
            results.push(hits / 20000);
          }
        } finally { Math.random = original; }
        return results;
      });
      assert.ok(rates.every(rate => rate > .017 && rate < .023));
      await page.evaluate(() => vermes.iniciar());
      await page.waitForFunction(() => vermes.estado().fase === 'corrida');
      await page.evaluate(() => { const k = vermes.karts().find(k => k.humano); k.item = 'bandeira'; k.roleta = 0; });
      await page.waitForFunction(() => document.getElementById('item-nome').textContent === 'Bandeira do Brasil');
      assert.ok(await page.locator('#item-img').evaluate(img => img.complete && img.naturalWidth > 0));
      await page.screenshot({ path: path.join(__dirname, '../.codex/verification/bandeira-' + track + '-item.png') });
      const effect = await page.evaluate(() => {
        const racers = vermes.karts(), user = racers.find(k => k.humano), items = vermes.itens;
        const reset = () => { items.reiniciar(); for (const k of racers) { k.girando = 0; k.chegada = null; k.item = null; k.roleta = 0; } };
        reset(); user.item = 'bandeira';
        const encoded = user.estado()[16]; user.item = null; const state = user.estado(); state[16] = encoded; user.aplicar(state, false);
        const decoded = user.item;
        items.usar(user, racers);
        const humanUse = { user: user.girando, others: racers.filter(k => k !== user).every(k => k.girando > 0), consumed: user.item === null, flags: items.bandeiras.length };
        const wire = JSON.parse(JSON.stringify(items.estado(racers)));
        items.aplicar(wire, racers, 0);
        const remoteFlags = items.bandeiras.length;
        const effectSprites = [...items.bandeiras.map(f => f.s)];
        items.reiniciar();
        const cleaned = items.bandeiras.length === 0 && effectSprites.every(s => !s.parent);
        reset();
        const bot = racers.find(k => !k.humano);
        bot.item = 'bandeira'; items.usarBot.set(bot, .01);
        items.atualizar(.02, racers, racers, false);
        const botUse = { user: bot.girando, hitHuman: user.girando > 0, others: racers.filter(k => k !== bot).every(k => k.girando > 0), consumed: bot.item === null };
        return { encoded, decoded, humanUse, remoteFlags, cleaned, botUse };
      });
      assert.equal(effect.encoded, 4); assert.equal(effect.decoded, 'bandeira');
      assert.deepEqual(effect.humanUse, { user: 0, others: true, consumed: true, flags: 7 });
      assert.equal(effect.remoteFlags, 7); assert.equal(effect.cleaned, true);
      assert.deepEqual(effect.botUse, { user: 0, hitHuman: true, others: true, consumed: true });
      await page.screenshot({ path: path.join(__dirname, '../.codex/verification/bandeira-' + track + '-efeito.png') });
      console.log('PASS', track, { rates, effect });
    }
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
