import assert from 'node:assert/strict';
import test from 'node:test';
import { DROP_PHASES } from '../src/domain/pubg-vn-arena-contract.ts';
import { MOCK_ARENA_DATA, MOCK_CRATE_DROPS, MOCK_SQUAD_STANDINGS } from '../src/data/mockArenaData.ts';
import { formatVnd } from '../src/domain/formatVnd.ts';

test('drop phases match the Lab 3 contract exactly', () => {
  assert.deepEqual(DROP_PHASES, ['WARMUP', 'AIRDROP_LIVE', 'LOOTED_OUT', 'EXPIRED']);
});

test('mock standings contain the four requested squads with unique stable IDs', () => {
  assert.deepEqual(MOCK_SQUAD_STANDINGS.map((squad) => squad.squadName), [
    'The Expendables', 'Cerberus Esports', 'Roy Esports', 'AGG',
  ]);
  assert.equal(new Set(MOCK_SQUAD_STANDINGS.map((squad) => squad.squadId)).size, 4);
  for (const squad of MOCK_SQUAD_STANDINGS) {
    assert.ok(squad.squadId.length > 0);
    for (const points of [squad.wwcdCount, squad.placementPts, squad.killPts]) {
      assert.ok(Number.isSafeInteger(points) && points >= 0);
    }
  }
});

test('ticket and crate fixtures have valid IDs, VND prices, stocks and epoch times', () => {
  assert.equal(MOCK_CRATE_DROPS.length, 2);
  assert.equal(new Set(MOCK_CRATE_DROPS.map((drop) => drop.id)).size, 2);
  assert.match(MOCK_CRATE_DROPS[0].title, /PVS Grand Finals VIP Ticket/);
  assert.match(MOCK_CRATE_DROPS[1].title, /G-Coin.*Crate/);
  for (const drop of MOCK_CRATE_DROPS) {
    assert.ok(drop.id.startsWith('mock-'));
    assert.ok(Number.isSafeInteger(drop.priceVnd) && drop.priceVnd > 0);
    assert.ok(Number.isSafeInteger(drop.remainingStock) && drop.remainingStock >= 0);
    assert.ok(Number.isSafeInteger(drop.dropEpochMs) && drop.dropEpochMs > 0);
  }
  assert.equal(MOCK_CRATE_DROPS[0].dropEpochMs, Date.UTC(2030, 0, 1, 5));
});

test('mock provenance is explicit and shared arrays are reused', () => {
  assert.equal(MOCK_ARENA_DATA.isMock, true);
  assert.match(MOCK_ARENA_DATA.disclaimer, /Mock data.*Not official/);
  assert.equal(MOCK_ARENA_DATA.squads, MOCK_SQUAD_STANDINGS);
  assert.equal(MOCK_ARENA_DATA.drops, MOCK_CRATE_DROPS);
});

test('shared data is immutable at runtime as well as readonly in TypeScript', () => {
  for (const value of [DROP_PHASES, MOCK_ARENA_DATA, MOCK_CRATE_DROPS, MOCK_SQUAD_STANDINGS,
    ...MOCK_CRATE_DROPS, ...MOCK_SQUAD_STANDINGS]) {
    assert.equal(Object.isFrozen(value), true);
  }
  assert.equal(Reflect.set(MOCK_CRATE_DROPS[0], 'remainingStock', 0), false);
  assert.equal(MOCK_CRATE_DROPS[0].remainingStock, 40);
});

test('VND formatting matches vi-VN currency conventions, including zero', () => {
  const expected = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
  for (const amount of [0, ...MOCK_CRATE_DROPS.map((drop) => drop.priceVnd)]) {
    assert.equal(formatVnd(amount), expected.format(amount));
    assert.match(formatVnd(amount), /₫/);
  }
});
