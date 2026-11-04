const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const server = spawn(process.execPath, [path.join(__dirname, 'serve.mjs'), '--port', '0'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let browser;
  try {
    const local = await new Promise((resolve, reject) => {
      server.stdout.on('data', data => { const m = String(data).match(/http:\/\/127\.0\.0\.1:\d+/); if (m) resolve(m[0]); });
      server.on('error', reject);
    });
    const base = process.env.TEST_BASE_URL || local;
    browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl'] });
    const errors = [];
    const host = await browser.newPage(), guest = await browser.newPage();
    for (const page of [host, guest]) page.on('pageerror', e => errors.push(e.message));
    await host.goto(base + '/?debug');
    await host.waitForFunction(() => window.vermes);
    await host.click('#criar'); await host.click('#avancar'); await host.click('#avancar');
    await host.waitForFunction(() => !document.getElementById('sala').hidden, { timeout: 30000 });
    const code = await host.locator('#sala-codigo').textContent();
    await guest.goto(`${base}/?sala=${code}&debug`);
    await guest.waitForFunction(() => window.vermes && document.getElementById('modo').hidden, { timeout: 30000 });
    await guest.click('#avancar'); await guest.click('#avancar');
    await guest.waitForFunction(() => !document.getElementById('sala').hidden, { timeout: 30000 });
    await guest.click('#pronto'); await host.waitForFunction(() => !document.getElementById('largar').disabled);
    await host.click('#largar');
    for (const page of [host, guest]) await page.waitForFunction(() => vermes.estado().fase === 'corrida');
    // Award to the remote player on the authoritative host, then use through
    // the real client input packet. No share, peer or item code is mocked.
    await host.evaluate(() => {
      const racers = vermes.karts();
      vermes.itens.reiniciar();
      for (const k of racers) { k.girando = 0; k.item = null; k.roleta = 0; k.chegada = null; }
      racers.find(k => k.pessoa && !k.humano).item = 'bandeira';
    });
    await guest.waitForFunction(() => vermes.karts().find(k => k.humano)?.item === 'bandeira');
    assert.equal(await guest.locator('#item-nome').textContent(), 'Bandeira do Brasil');
    await guest.keyboard.press('Space');
    await host.waitForFunction(() => vermes.itens.bandeiras.length === 7);
    const result = await host.evaluate(() => {
      const user = vermes.karts().find(k => k.pessoa && !k.humano);
      return { user: user.girando, consumed: user.item === null, others: vermes.karts().filter(k => k !== user).every(k => k.girando > 0), flags: vermes.itens.bandeiras.length };
    });
    assert.deepEqual(result, { user: 0, consumed: true, others: true, flags: 7 });
    await guest.waitForFunction(() => vermes.itens.bandeiras.length === 7 && document.getElementById('faixa').textContent === 'BANDEIRA DO BRASIL!');
    assert.equal(await guest.evaluate(() => vermes.karts().find(k => k.humano).girando), 0);
    await guest.screenshot({ path: path.join(__dirname, '../.codex/verification/bandeira-online-cliente.png') });
    assert.deepEqual(errors, []);
    console.log('ONLINE PASS: remote item, Space input, host authority, seven opponents, user immunity, client flags and announcement.');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
