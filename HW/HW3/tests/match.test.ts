import assert from 'node:assert/strict';
import test from 'node:test';
import { selectKillFeed, selectStandings, totalPoints } from '../src/domain/matchSelectors.ts';
import { MOCK_SQUAD_STANDINGS } from '../src/data/mockArenaData.ts';
import { MOCK_KILL_FEED } from '../src/data/mockMatchData.ts';
import { createMockMatchSource, MAX_KILL_FEED_EVENTS } from '../src/services/mockMatchSource.ts';

const standings = Object.freeze([
  Object.freeze({ squadId: 'a', squadName: 'Alpha', wwcdCount: 1, placementPts: 20, killPts: 10 }),
  Object.freeze({ squadId: 'b', squadName: 'Bravo', wwcdCount: 4, placementPts: 5, killPts: 50 }),
  Object.freeze({ squadId: 'c', squadName: 'Charlie', wwcdCount: 2, placementPts: 40, killPts: 20 }),
]);
const ids = (rows: typeof standings) => rows.map((row) => row.squadId);

test('all four requested squads have derived totals without a stored total field', () => {
  assert.deepEqual(MOCK_SQUAD_STANDINGS.map(totalPoints), [112, 103, 88, 78]);
  assert.deepEqual(MOCK_SQUAD_STANDINGS.map((squad) => squad.squadName), ['The Expendables', 'Cerberus Esports', 'Roy Esports', 'AGG']);
  assert.ok(MOCK_SQUAD_STANDINGS.every((squad) => !Object.hasOwn(squad, 'totalPts')));
});

test('each criterion sorts correctly in descending and ascending order', () => {
  for (const [criterion, expected] of [
    ['wwcdCount', ['b', 'c', 'a']], ['placementPts', ['c', 'a', 'b']],
    ['killPts', ['b', 'c', 'a']], ['totalPts', ['c', 'b', 'a']],
  ] as const) {
    assert.deepEqual(ids(selectStandings(standings, '', criterion)), [...expected]);
    assert.deepEqual(ids(selectStandings(standings, '', criterion, 'ascending')), [...expected].reverse());
  }
});

test('squad name filter is case insensitive, trimmed and handles no matches', () => {
  assert.deepEqual(selectStandings(MOCK_SQUAD_STANDINGS, '  eSpOrTs ', 'totalPts').map((squad) => squad.squadId), ['ces', 'roy']);
  assert.equal(selectStandings(MOCK_SQUAD_STANDINGS, 'not-a-squad', 'totalPts').length, 0);
  assert.equal(selectStandings(MOCK_SQUAD_STANDINGS, '   ', 'totalPts').length, 4);
});

test('score ties use deterministic alphabetical order', () => {
  const tied = [...standings].reverse().map((squad) => ({ ...squad, wwcdCount: 1 }));
  assert.deepEqual(ids(selectStandings(tied, '', 'wwcdCount')), ['a', 'b', 'c']);
});

test('sort/filter return copies and never mutate frozen source data', () => {
  const before = JSON.stringify({ standings, events: MOCK_KILL_FEED });
  selectStandings(standings, 'a', 'killPts', 'ascending');
  selectKillFeed(MOCK_KILL_FEED, 'te');
  assert.equal(JSON.stringify({ standings, events: MOCK_KILL_FEED }), before);
  assert.notEqual(selectKillFeed(MOCK_KILL_FEED, ''), MOCK_KILL_FEED);
});

test('kill events have unique IDs, valid timestamps, known squads and optional weapons', () => {
  const squadIds = new Set(MOCK_SQUAD_STANDINGS.map((squad) => squad.squadId));
  assert.equal(new Set(MOCK_KILL_FEED.map((event) => event.eventId)).size, MOCK_KILL_FEED.length);
  for (const event of MOCK_KILL_FEED) {
    assert.ok(Number.isSafeInteger(event.timestamp) && event.timestamp > 0);
    assert.ok(squadIds.has(event.squadId));
    assert.ok(event.killer && event.victim);
    assert.ok(Object.isFrozen(event));
  }
  assert.ok(MOCK_KILL_FEED.some((event) => event.weapon === undefined));
});

test('kill feed filters by killer squad and sorts newest first without changing original order', () => {
  for (const squad of MOCK_SQUAD_STANDINGS) {
    const result = selectKillFeed(MOCK_KILL_FEED, squad.squadId);
    assert.equal(result.length, 1);
    assert.ok(result.every((event) => event.squadId === squad.squadId));
  }
  const result = selectKillFeed([...MOCK_KILL_FEED].reverse(), '');
  assert.deepEqual(result.map((event) => event.eventId), ['mock-kill-4', 'mock-kill-3', 'mock-kill-2', 'mock-kill-1']);
  assert.deepEqual(selectKillFeed(MOCK_KILL_FEED, 'unknown'), []);
});

function fakeSource() {
  let nextId = 0;
  const timers = new Map<number, () => void>();
  const source = createMockMatchSource({ schedule(callback, delay) { assert.equal(delay, 5000); timers.set(++nextId, callback); return nextId; }, cancel(id) { timers.delete(id); } });
  return { source, timers };
}

test('new mock update creates immutable snapshots and a consistent kill-point increment', () => {
  const { source } = fakeSource(); const before = source.getSnapshot(); let notifications = 0;
  const stop = source.subscribe(() => { notifications++; }); source.step();
  const after = source.getSnapshot();
  assert.equal(after.revision, 1);
  assert.equal(after.squads[0].killPts, before.squads[0].killPts + 1);
  assert.equal(after.events[0].squadId, after.squads[0].squadId);
  assert.equal(after.events.length, before.events.length + 1);
  assert.equal(before.squads, MOCK_SQUAD_STANDINGS);
  assert.equal(before.events.length, 4);
  assert.equal(notifications, 1);
  assert.ok(Object.isFrozen(after) && Object.isFrozen(after.squads) && Object.isFrozen(after.events));
  stop();
});

test('repeated updates bound history at 50 and preserve unique event IDs', () => {
  const { source } = fakeSource();
  for (let i = 0; i < 200; i++) source.step();
  const { events } = source.getSnapshot();
  assert.equal(events.length, MAX_KILL_FEED_EVENTS);
  assert.equal(new Set(events.map((event) => event.eventId)).size, events.length);
  assert.ok(events.every((event, index) => index === 0 || events[index - 1].timestamp > event.timestamp));
});

test('start is idempotent, subscriptions share one timer, final unsubscribe cleans up queued work', () => {
  const { source, timers } = fakeSource(); let notifications = 0;
  const stopA = source.subscribe(() => { notifications++; });
  const stopB = source.subscribe(() => {});
  source.start(); source.start();
  assert.equal(timers.size, 1);
  const stale = [...timers.values()][0]; stale();
  assert.equal(source.getSnapshot().revision, 1);
  stopA(); assert.equal(timers.size, 1);
  const before = notifications;
  stopB(); stopB();
  assert.equal(timers.size, 0);
  assert.equal(source.getSnapshot().isRunning, false);
  stale(); assert.equal(source.getSnapshot().revision, 1);
  assert.equal(notifications, before);
  const stopC = source.subscribe(() => {}); source.start();
  assert.equal(timers.size, 1);
  stopC(); assert.equal(timers.size, 0);
});

test('pause prevents stale ticks and no subscriber means no background loop', () => {
  const { source, timers } = fakeSource();
  source.start(); assert.equal(timers.size, 0);
  const stop = source.subscribe(() => {}); source.start();
  const stale = [...timers.values()][0]; source.pause(); source.pause(); stale();
  assert.equal(source.getSnapshot().revision, 0);
  assert.equal(timers.size, 0);
  stop();
});
