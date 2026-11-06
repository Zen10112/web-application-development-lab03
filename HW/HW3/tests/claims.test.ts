import assert from 'node:assert/strict';
import test from 'node:test';
import { createMockClaimApi } from '../src/services/claims/mockClaimApi.ts';
import { createClaimClient } from '../src/services/claims/claimClient.ts';
import type { ClaimApi, ClaimResponse, InventorySnapshot } from '../src/services/claims/claimContracts.ts';

const drop = { id: 'ticket', title: 'Mock VIP ticket', priceVnd: 100000, remainingStock: 3, dropEpochMs: 1000 };
const makeApi = (stock = 3) => createMockClaimApi([{ ...drop, remainingStock: stock }], { now: () => 2000, latencyMs: 0 });
const request = (claimId: string, expectedRevision = 0) => ({ id: drop.id, claimId, expectedRevision });
const signal = () => new AbortController().signal;
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('server confirms a successful claim and increments authoritative revision', async () => {
  const api = makeApi();
  const response = await api.claim(request('success'), signal());
  assert.equal(response.status, 200);
  assert.equal(api.read(drop.id).remainingStock, 2);
  assert.equal(response.inventory.revision, 1);
  assert.equal(Object.isFrozen(response.inventory), true);
});

test('zero stock returns HTTP-style 409 without allocating', async () => {
  const api = makeApi(0);
  const response = await api.claim(request('empty'), signal());
  assert.equal(response.status, 409);
  assert.equal(response.inventory.remainingStock, 0);
  assert.equal(api.read(drop.id).revision, 0);
});

test('two concurrent requests cannot both win the final item', async () => {
  const api = makeApi(1);
  const results = await Promise.all([api.claim(request('first'), signal()), api.claim(request('second'), signal())]);
  assert.deepEqual(results.map((result) => result.status), [200, 409]);
  assert.equal(api.read(drop.id).remainingStock, 0);
  assert.equal(api.read(drop.id).revision, 1);
});

test('claimId deduplicates both in-flight and completed requests', async () => {
  const api = makeApi();
  const first = api.claim(request('same'), signal());
  assert.equal(first, api.claim(request('same'), signal()));
  const result = await first;
  assert.equal(await api.claim(request('same'), signal()), result);
  assert.equal(api.read(drop.id).remainingStock, 2);
});

test('server denies warmup, expired and looted-out scenarios', async () => {
  const api = makeApi();
  for (const phase of ['WARMUP', 'EXPIRED', 'LOOTED_OUT'] as const) {
    api.setPhaseOverride(phase);
    const response = await api.claim(request(phase, api.read(drop.id).revision), signal());
    assert.equal(response.status, phase === 'LOOTED_OUT' ? 409 : 403);
  }
  api.setPhaseOverride('AIRDROP_LIVE');
  assert.equal(api.read(drop.id).remainingStock, 3);
});

test('stale revision produces a conflict even when some stock remains', async () => {
  const api = makeApi();
  await api.claim(request('winner'), signal());
  const conflict = await api.claim(request('stale'), signal());
  assert.equal(conflict.status, 409);
  assert.equal(conflict.inventory.remainingStock, 2);
});

test('client deducts optimistically and synchronously blocks repeated clicks', async () => {
  const api = makeApi(); let requests = 0;
  const client = createClaimClient({ read: api.read, claim: (...args) => { requests++; return api.claim(...args); } }, [drop.id], () => {});
  const first = client.claim(drop.id);
  assert.equal(client.getState(drop.id).displayedStock, 2);
  assert.equal(client.getState(drop.id).isPending, true);
  assert.equal(await client.claim(drop.id), false);
  assert.equal(requests, 1);
  assert.equal(await first, true);
  assert.equal(client.getState(drop.id).displayedStock, 2);
  assert.equal(client.getState(drop.id).isPending, false);
  client.dispose();
});

test('independent clients race for the final item; loser rolls back and synchronizes 409', async () => {
  const api = makeApi(1);
  const first = createClaimClient(api, [drop.id], () => {});
  const second = createClaimClient(api, [drop.id], () => {});
  const a = first.claim(drop.id); const b = second.claim(drop.id);
  assert.equal(first.getState(drop.id).displayedStock, 0);
  assert.equal(second.getState(drop.id).displayedStock, 0);
  assert.deepEqual(await Promise.all([a, b]), [true, false]);
  assert.match(second.getState(drop.id).message, /409 Conflict/);
  assert.equal(second.getState(drop.id).displayedStock, 0);
  assert.equal(second.getState(drop.id).inventory.revision, 1);
  assert.equal(await first.claim(drop.id), false);
  first.dispose(); second.dispose();
});

test('network failure rolls optimistic stock back to authority and releases lock', async () => {
  const api = makeApi();
  const client = createClaimClient({ read: api.read, claim: async () => { throw new TypeError('Offline'); } }, [drop.id], () => {});
  const pending = client.claim(drop.id);
  assert.equal(client.getState(drop.id).displayedStock, 2);
  assert.equal(await pending, false);
  assert.equal(client.getState(drop.id).displayedStock, 3);
  assert.equal(client.getState(drop.id).isPending, false);
  assert.match(client.getState(drop.id).message, /Network/);
  client.dispose();
});

test('409 releases the item lock and a retry uses the new authoritative revision', async () => {
  const api = makeApi();
  const first = createClaimClient(api, [drop.id], () => {});
  const second = createClaimClient(api, [drop.id], () => {});
  assert.deepEqual(await Promise.all([first.claim(drop.id), second.claim(drop.id)]), [true, false]);
  assert.equal(second.getState(drop.id).displayedStock, 2);
  assert.equal(second.getState(drop.id).isPending, false);
  assert.equal(await second.claim(drop.id), true);
  assert.equal(second.getState(drop.id).displayedStock, 1);
  first.dispose(); second.dispose();
});

test('delivery failure after server commit reconciles instead of restoring old stock', async () => {
  const api = makeApi();
  const client = createClaimClient({ read: api.read, claim: async (...args) => {
    await api.claim(...args); throw new TypeError('Response lost');
  } }, [drop.id], () => {});
  assert.equal(await client.claim(drop.id), false);
  assert.equal(client.getState(drop.id).displayedStock, 2);
  assert.equal(api.read(drop.id).remainingStock, 2);
  client.dispose();
});

test('out-of-order success response never overwrites a newer authoritative snapshot', async () => {
  const api = makeApi();
  const delivery = deferred<ClaimResponse>(); const committed = deferred<void>();
  const client = createClaimClient({ read: api.read, claim: async (...args) => {
    const old = await api.claim(...args); committed.resolve(); await delivery.promise; return old;
  } }, [drop.id], () => {});
  const pending = client.claim(drop.id);
  await committed.promise;
  await api.claim(request('other-client', 1), signal());
  client.refresh();
  delivery.resolve({ status: 200, claimId: '', inventory: api.read(drop.id) });
  assert.equal(await pending, true);
  assert.equal(client.getState(drop.id).displayedStock, 1);
  assert.equal(client.getState(drop.id).inventory.revision, 2);
  client.dispose();
});

test('old 409 response is ignored when client already knows a newer revision', async () => {
  let snapshot: InventorySnapshot = { id: drop.id, phase: 'AIRDROP_LIVE', remainingStock: 3, revision: 0 };
  const delivery = deferred<void>();
  const api: ClaimApi = { read: () => snapshot, claim: async (req) => {
    await delivery.promise;
    return { status: 409, claimId: req.claimId, inventory: { ...snapshot, remainingStock: 2, revision: 1 } };
  } };
  const client = createClaimClient(api, [drop.id], () => {});
  const pending = client.claim(drop.id);
  snapshot = { ...snapshot, remainingStock: 1, revision: 3 }; client.refresh();
  delivery.resolve(); await pending;
  assert.equal(client.getState(drop.id).displayedStock, 1);
  assert.equal(client.getState(drop.id).inventory.revision, 3);
  client.dispose();
});

test('timeout releases lock even if transport ignores cancellation; late response is inert', async () => {
  const api = makeApi(); const delivery = deferred<ClaimResponse>(); let updates = 0;
  const client = createClaimClient({ read: api.read, claim: () => delivery.promise }, [drop.id], () => { updates++; }, { timeoutMs: 5 });
  assert.equal(await client.claim(drop.id), false);
  assert.match(client.getState(drop.id).message, /timed out/);
  assert.equal(client.getState(drop.id).displayedStock, 3);
  const before = updates;
  delivery.resolve({ status: 200, claimId: 'late', inventory: { ...api.read(drop.id), remainingStock: 2 } });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(updates, before);
  client.dispose();
});

test('explicit cancellation aborts mock request before allocation and restores stock', async () => {
  const api = createMockClaimApi([drop], { now: () => 2000, latencyMs: 100 });
  const client = createClaimClient(api, [drop.id], () => {});
  const pending = client.claim(drop.id); client.cancel(drop.id);
  assert.equal(await pending, false);
  assert.equal(api.read(drop.id).remainingStock, 3);
  assert.equal(client.getState(drop.id).isPending, false);
  assert.match(client.getState(drop.id).message, /cancelled/);
  client.dispose();
});

test('unmount/dispose cancels pending requests and suppresses all later notifications', async () => {
  const api = createMockClaimApi([drop], { now: () => 2000, latencyMs: 100 }); let updates = 0;
  const client = createClaimClient(api, [drop.id], () => { updates++; });
  const pending = client.claim(drop.id); const before = updates;
  client.dispose(); client.dispose();
  assert.equal(await pending, false);
  client.refresh();
  assert.equal(updates, before);
  assert.equal(api.read(drop.id).remainingStock, 3);
});

test('client rejects non-live and zero-stock attempts without calling transport', async () => {
  const api = makeApi(); let requests = 0;
  const client = createClaimClient({ read: api.read, claim: (...args) => { requests++; return api.claim(...args); } }, [drop.id], () => {});
  for (const phase of ['WARMUP', 'EXPIRED', 'LOOTED_OUT'] as const) {
    api.setPhaseOverride(phase); client.refresh();
    assert.equal(await client.claim(drop.id), false);
  }
  assert.equal(requests, 0);
  assert.ok(client.getState(drop.id).displayedStock >= 0);
  client.dispose();
});

test('stock exhausted by another client is published to UI even when local request is rejected before transport', async () => {
  const api = makeApi(1); let requests = 0; let publishedStock = 1;
  const client = createClaimClient({ read: api.read, claim: (...args) => { requests++; return api.claim(...args); } },
    [drop.id], () => { publishedStock = client.getState(drop.id).displayedStock; });
  await api.claim(request('external-winner'), signal());
  assert.equal(await client.claim(drop.id), false);
  assert.equal(requests, 0);
  assert.equal(publishedStock, 0);
  client.dispose();
});
