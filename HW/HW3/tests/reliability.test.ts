import assert from 'node:assert/strict';
import test from 'node:test';
import { createClaimClient } from '../src/services/claims/claimClient.ts';
import { createMockClaimApi } from '../src/services/claims/mockClaimApi.ts';

const drop = { id: 'ticket', title: 'Mock VIP ticket', priceVnd: 100000, remainingStock: 3, dropEpochMs: 1000 };

test('inventory read outage before claim is handled without an unhandled rejection', async () => {
  const authority = createMockClaimApi([drop], { now: () => 2000, latencyMs: 0 });
  let offline = false; let requests = 0;
  const client = createClaimClient({ read: (id) => { if (offline) throw new Error('Inventory unavailable'); return authority.read(id); },
    claim: (...args) => { requests++; return authority.claim(...args); } }, [drop.id], () => {});
  offline = true;
  try {
    assert.equal(await client.claim(drop.id), false);
    assert.equal(client.getState(drop.id).isPending, false);
    assert.equal(client.getState(drop.id).isError, true);
    assert.equal(requests, 0);
  } finally { client.dispose(); }
});

test('inventory read outage after success cannot leave the Claim button stuck pending', async () => {
  const authority = createMockClaimApi([drop], { now: () => 2000, latencyMs: 0 });
  let offline = false;
  const client = createClaimClient({ read: (id) => { if (offline) throw new Error('Inventory unavailable'); return authority.read(id); },
    claim: async (...args) => { const response = await authority.claim(...args); offline = true; return response; } }, [drop.id], () => {});
  try {
    const result = await client.claim(drop.id);
    assert.equal(client.getState(drop.id).isPending, false);
    assert.equal(result, true);
    assert.equal(client.getState(drop.id).displayedStock, 2);
    assert.equal(client.getState(drop.id).isError, true); // Confirmed allocation, but latest refresh failed.
  } finally { client.dispose(); }
});

test('failed request plus failed reconciliation releases the lock and reports uncertain inventory', async () => {
  const authority = createMockClaimApi([drop], { now: () => 2000, latencyMs: 0 });
  let offline = false;
  const client = createClaimClient({ read: (id) => { if (offline) throw new Error('Inventory unavailable'); return authority.read(id); },
    claim: async () => { offline = true; throw new Error('Network unavailable'); } }, [drop.id], () => {});
  try {
    assert.equal(await client.claim(drop.id), false);
    assert.equal(client.getState(drop.id).isPending, false);
    assert.match(client.getState(drop.id).message, /could not refresh|unavailable/i);
    assert.doesNotThrow(() => client.refresh());
    offline = false;
    client.refresh();
    assert.equal(client.getState(drop.id).displayedStock, 3);
  } finally { client.dispose(); }
});

test('fifty concurrent requests allocate the final mock item exactly once', async () => {
  const authority = createMockClaimApi([{ ...drop, remainingStock: 1 }], { now: () => 2000, latencyMs: 0 });
  const results = await Promise.all(Array.from({ length: 50 }, (_, index) => authority.claim({
    id: drop.id, claimId: `concurrent-${index}`, expectedRevision: 0,
  }, new AbortController().signal)));
  assert.equal(results.filter((result) => result.status === 200).length, 1);
  assert.equal(results.filter((result) => result.status === 409).length, 49);
  assert.equal(authority.read(drop.id).remainingStock, 0);
});
