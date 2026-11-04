import test from 'node:test';
import assert from 'node:assert/strict';
import { BRAZIL_FLAG_CHANCE, rollBrazilFlag, useBrazilFlag } from '../assets/bandeira.js';

test('rare roll uses a fixed 2% chance, including exact boundaries', () => {
  assert.equal(BRAZIL_FLAG_CHANCE, .02);
  assert.equal(rollBrazilFlag(() => 0), true);
  assert.equal(rollBrazilFlag(() => .019999), true);
  assert.equal(rollBrazilFlag(() => .02), false);
  assert.equal(rollBrazilFlag(() => .999), false);
});

test('every active opponent is hit, including bots and remote or airborne racers', () => {
  const calls = [];
  const make = (id, extra = {}) => ({ id, chegada: null, rodar: (...args) => calls.push([id, ...args]), ...extra });
  const user = make('user');
  const racers = [user, make('bot'), make('remote', { x: 5000, y: 5000 }), make('air', { altura: 150 }), make('finished', { chegada: 80 })];
  assert.deepEqual(useBrazilFlag(user, racers).map(k => k.id), ['bot', 'remote', 'air']);
  assert.deepEqual(calls, [['bot', 1.5, .2], ['remote', 1.5, .2], ['air', 1.5, .2]]);
});
