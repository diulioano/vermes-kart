const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
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
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '/?debug');
    await page.waitForFunction(() => window.vermes);
    await page.waitForFunction(() => {
      let count = 0;
      vermes.cena.traverse(o => { if (o.material?.map?.image?.src?.includes('cerca_')) count++; });
      return count > 10;
    });
    await page.evaluate(() => vermes.iniciar());
    const result = await page.evaluate(() => {
      const fences = [];
      vermes.cena.traverse(o => {
        if (o.material?.map?.image?.src?.includes('cerca_')) fences.push({
          x: o.position.x, y: o.position.z, nx: Math.sin(o.rotation.y), ny: Math.cos(o.rotation.y),
          width: o.geometry.parameters.width, type: o.material.map.image.src.includes('madeira') ? 'madeira' : 'arame',
        });
      });
      const k = vermes.karts().find(k => k.humano), track = vermes.pista, results = [];
      for (const type of ['madeira', 'arame']) {
        const f = fences.find(f => f.type === type);
        for (const sign of [1, -1]) for (const dt of [1 / 60, .05]) {
          const h = Math.atan2(-f.ny * sign, -f.nx * sign);
          k.colocar(f.x + f.nx * 28 * sign, f.y + f.ny * 28 * sign, h, 0);
          k.vx = -f.nx * 350 * sign; k.vy = -f.ny * 350 * sign; k.fwd = 350; k.boost = 1;
          for (let n = 0; n < Math.ceil(.25 / dt); n++) k.atualizar(dt, { acel: true, freio: false, dir: 0, drift: false }, track);
          results.push({ type, sign, dt, distance: ((k.x - f.x) * f.nx + (k.y - f.y) * f.ny) * sign });
        }
      }
      return { count: fences.length, colliders: track.fences?.length || 0, results };
    });
    console.log(JSON.stringify(result));
    assert.equal(result.colliders, result.count, 'Every visible fence has a matching collider');
    for (const r of result.results) assert.ok(r.distance >= 10.9, `Car crossed ${r.type} fence, side ${r.sign}, dt ${r.dt}: distance ${r.distance}`);
    assert.deepEqual(errors, []);
    console.log('Wood and wire fences stop boosted cars from both sides at 60/20 Hz.');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
