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
    // Replace only the network boundary; all invitation, UI and entry code runs unchanged.
    await page.route('**/assets/jogo.js', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: await response.text() + `
        window.__openRoom=()=>{Nt='host';Ei='host';pt={codigo:'A64QQ',jogadores:[{id:'host',piloto:1,carro:1,v:vkVersao}],avisarSala(){}};ns(pt.codigo,pt.jogadores);};
        _c.conectar=async code=>{window.__joined=code;return {pistaHost:vkPistaAtual,sala:[{id:'host',piloto:1,carro:1}],meuId:'',fechar(){}};};
      ` });
    });
    for (const track of ['gravatai', 'cidreira']) {
      await page.goto(`${base}/?debug&auto&voltas=1&pista=${track}#menu`);
      await page.waitForFunction(() => window.__openRoom);
      await page.evaluate(() => {
        window.__copied = null;
        Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copied = text; } } });
        __openRoom();
      });
      await page.click('#compartilhar-sala');
      await page.waitForFunction(() => window.__copied);
      const copied = await page.evaluate(() => __copied);
      assert.match(copied, /Sala A64QQ/);
      const link = copied.split('\n')[1], url = new URL(link);
      assert.equal(url.searchParams.get('sala'), 'A64QQ');
      assert.equal(url.searchParams.get('pista'), track === 'cidreira' ? 'cidreira' : null);
      assert.equal(url.searchParams.has('debug'), false);
      assert.equal(url.searchParams.has('auto'), false);
      assert.equal(url.hash, '');
      assert.match(await page.locator('#compartilhar-status').textContent(), /copiado/);
      await page.evaluate(() => {
        window.__copied = null;
        Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
        Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.__shared = data; } });
      });
      await page.click('#compartilhar-sala');
      assert.equal(await page.evaluate(() => __shared.url), link);
      assert.match(await page.evaluate(() => __shared.text), /A64QQ/);
      assert.equal(await page.evaluate(() => __copied), null);
      await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('Canceled', 'AbortError'); } }));
      await page.click('#compartilhar-sala');
      assert.equal(await page.evaluate(() => __copied), null);
      assert.equal(await page.locator('#compartilhar-status').textContent(), '');
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('Denied', 'NotAllowedError'); } });
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Denied'); } } });
      });
      await page.click('#compartilhar-sala');
      assert.equal(await page.locator('#convite-manual').isVisible(), true);
      assert.equal(await page.locator('#convite-texto').inputValue(), copied);
      assert.equal(await page.locator('#convite-texto').evaluate(e => e.selectionEnd - e.selectionStart), copied.length);
      await page.setViewportSize({ width: 390, height: 844 });
      const bounds = await page.locator('#compartilhar-sala').boundingBox();
      assert.ok(bounds.width >= 44 && bounds.height >= 44 && bounds.x >= 0 && bounds.x + bounds.width <= 390);
      assert.ok(await page.evaluate(() => document.getElementById('sala').scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(__dirname, '../.codex/verification/convite-' + track + '-mobile.png') });
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(link.toLowerCase());
      await page.waitForFunction(() => window.__joined === 'A64QQ');
      assert.equal(await page.locator('#modo').isVisible(), false);
      assert.match(await page.locator('#menu-aviso').textContent(), /Achei a sala/);
      assert.equal(new URL(page.url()).searchParams.has('sala'), false);
      console.log('PASS invitation sharing and entry:', track);
    }
    await page.goto(base + '/?sala=%3Cbad%3E');
    await page.waitForFunction(() => window.__openRoom);
    assert.match(await page.locator('#modo-erro').textContent(), /Convite inválido/);
    assert.equal(await page.evaluate(() => window.__joined), undefined);
    assert.deepEqual(errors, []);
    console.log('Native share, clipboard, cancel, denied access, mobile, clean links and invalid invites passed.');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
