import test from 'node:test';
import assert from 'node:assert/strict';
import { registerFence, blockFences } from '../assets/cercas.js';

const kart = (x, y, vx, vy, dt) => ({ x: x + vx * dt, y: y + vy * dt, vx, vy, h: Math.atan2(vy, vx), boost: 1, pulo: 0 });
const track = () => { const t = {}; registerFence(t, 0, 0, 0, 1, 100, 20); return t; };

test('swept collision stops a boosted car even if it crosses the entire fence in one step', () => {
  for (const side of [-1, 1]) {
    const k = kart(0, 30 * side, 0, -1000 * side, .1);
    assert.equal(blockFences(k, track(), .1), true);
    assert.ok(k.y * side >= 11);
    assert.equal(k.vy, 0);
    assert.equal(k.boost, 0);
  }
});

test('oblique impacts slide along the fence rather than freezing the car', () => {
  const k = kart(0, 20, 80, -100, .2);
  blockFences(k, track(), .2);
  assert.ok(Math.abs(k.x - 16) < .01);
  assert.ok(k.y >= 11);
  assert.equal(k.vx, 80);
  assert.equal(k.vy, 0);
});

test('rounded fence ends block the car radius, while clear gaps remain open', () => {
  const near = kart(55, 25, 0, -300, .2);
  assert.equal(blockFences(near, track(), .2), true);
  const clear = kart(70, 25, 0, -300, .2);
  assert.equal(blockFences(clear, track(), .2), false);
  assert.equal(clear.y, -35);
});

test('a car moving away from a fence remains free and small overlaps are recovered', () => {
  const k = kart(0, 8, 0, 30, .1);
  blockFences(k, track(), .1);
  assert.ok(k.y >= 14);
  assert.equal(k.vy, 30);
});

test('an airborne car clears a low fence only while above its visible height', () => {
  const k = kart(0, 30, 0, -300, .2); k.pulo = 30;
  assert.equal(blockFences(k, track(), .2), false);
  assert.equal(k.y, -30);
});
