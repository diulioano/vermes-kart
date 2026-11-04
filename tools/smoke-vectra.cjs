const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');

(async () => {
  const server = spawn(process.execPath, [path.join(__dirname, 'serve.mjs'), '--port', '0'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let browser;
  try {
    const base = await new Promise((resolve, reject) => {
      server.stdout.on('data', data => { const match = String(data).match(/http:\/\/127\.0\.0\.1:\d+/); if (match) resolve(match[0]); });
      server.on('error', reject);
    });
    browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) errors.push(response.url()); });
    const output = path.resolve(__dirname, '../.codex/verification');
    fs.mkdirSync(output, { recursive: true });
    await page.goto(base + '/?debug');
    await page.waitForFunction(() => window.vermes);
    for (const victories of [0, 2]) {
      await page.evaluate(n => localStorage.setItem('vk-vitorias', String(n)), victories);
      await page.reload();
      await page.waitForFunction(() => window.vermes);
      await page.click('#solo');
      const pilot = page.locator('#lista .card').filter({ hasText: 'Pai do Guz' });
      assert.equal(await pilot.getAttribute('data-trancado'), '');
      await pilot.click();
      assert.match(await page.locator('#pv-info').textContent(), /Dono do Vectra 2010/);
      await page.click('#avancar');
      assert.equal(await page.locator('#menu').getAttribute('data-passo'), 'piloto');
      await page.locator('#lista .card').filter({ has: page.locator('b', { hasText: /^Diuli$/ }) }).click();
      await page.click('#avancar');
      const car = page.locator('.card.carro').filter({ hasText: 'Vectra 2010' });
      assert.equal(await car.count(), 1);
      assert.equal(await car.getAttribute('data-trancado'), '');
      assert.match(await car.textContent(), new RegExp(`${victories}/3`));
      await car.click();
      await page.click('#avancar');
      assert.equal(await page.evaluate(() => vermes.estado().fase), 'menu');
      assert.match(await page.locator('#pv-info').textContent(), /Chevrolet Vectra Elegan\. 2\.0 MPFI 8V Flexpower MEC 2010/);
    }
    // Earn the third victory through the real results flow, then select without reloading.
    await page.locator('.card.carro').filter({ hasText: 'HB20' }).click();
    await page.click('#avancar');
    await page.waitForFunction(() => vermes.estado().fase === 'corrida');
    await page.evaluate(() => { for (const k of vermes.karts()) k.chegada = k.humano ? 1 : 10; });
    await page.waitForFunction(() => vermes.estado().fase === 'fim');
    assert.equal(await page.evaluate(() => localStorage.getItem('vk-vitorias')), '3');
    assert.match(await page.locator('#vk-vitorias').textContent(), /Liberou.*Vectra/);
    await page.click('#trocar');
    await page.locator('#lista .card').filter({ hasText: 'Pai do Guz' }).click();
    await page.click('#avancar');
    for (const track of ['gravatai', 'cidreira']) {
      if (track === 'cidreira') {
        await page.goto(base + '/?pista=cidreira&debug');
        await page.waitForFunction(() => window.vermes);
        await page.evaluate(() => vermes.pronto());
        await page.click('#solo');
        const pilot = page.locator('#lista .card').filter({ hasText: 'Pai do Guz' });
        assert.equal(await pilot.getAttribute('data-trancado'), null);
        await pilot.click();
        await page.click('#avancar');
      }
      const car = page.locator('.card.carro').filter({ hasText: 'Vectra 2010' });
      assert.equal(await car.getAttribute('data-trancado'), null);
      assert.match(await car.textContent(), /do Pai do Guz/);
      assert.equal(await car.getAttribute('aria-pressed'), 'true', 'Owner defaults to Vectra');
      await page.waitForFunction(() => [...document.images].filter(i => i.src.includes('vectra')).every(i => i.complete && i.naturalWidth));
      await page.screenshot({ path: path.join(output, `vectra-${track}-menu.png`) });
      await page.click('#avancar');
      await page.waitForFunction(() => vermes.karts().some(k => k.humano && k.carro.id === 'vectra'));
      const loaded = await page.evaluate(() => {
        const k = vermes.karts().find(k => k.humano);
        return { pilot: k.piloto.id, frames: k.spr.texturas.map(frame => frame.length), width: k.spr.texturas[0][0].image.width, physics: k.fis };
      });
      assert.equal(loaded.pilot, 'pai_do_guz');
      assert.deepEqual(loaded.frames, [8, 8, 8]);
      assert.equal(loaded.width, 128);
      assert.ok(loaded.physics.velMax > 0);
      await page.waitForFunction(() => vermes.estado().fase === 'corrida');
      await page.keyboard.down('ArrowUp');
      await page.waitForFunction(() => vermes.karts().find(k => k.humano).fwd > 20);
      await page.keyboard.up('ArrowUp');
      await page.screenshot({ path: path.join(output, `vectra-${track}-corrida.png`) });
      console.log('Vectra verified:', track, loaded);
    }
    assert.deepEqual(errors, []);
    console.log('Unlock at 0/2/3 victories, third-win result, all sprites, and driving on both tracks passed.');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
