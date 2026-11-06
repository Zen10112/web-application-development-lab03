import assert from 'node:assert/strict';
import test from 'node:test';
import { anchoredFeedTop, FEED_ROW_HEIGHT, virtualFeedRange } from '../src/domain/virtualFeed.ts';
import { createMockKillEvent, generateMockKillFeed } from '../src/data/mockMatchData.ts';
import { createMockMatchSource, MAX_KILL_FEED_EVENTS } from '../src/services/mockMatchSource.ts';

for (const count of [100, 1000, 10000]) {
  test(`${count} events: bounded windows across repeated scrolling and stable IDs`, () => {
    const events = generateMockKillFeed(count);
    assert.equal(new Set(events.map((event) => event.eventId)).size, count);
    for (let top = 0; top < count * FEED_ROW_HEIGHT; top += 137) {
      const range = virtualFeedRange(count, top, 358);
      assert.ok(range.end - range.start <= 10);
      assert.ok(range.start >= 0 && range.end <= count && range.end > range.start);
    }
    assert.ok(Object.isFrozen(events) && Object.isFrozen(events[0]));
  });
}

test('range clamps extreme positions and empty lists', () => {
  assert.deepEqual(virtualFeedRange(0, 1000, 358), { start: 0, end: 0 });
  assert.equal(virtualFeedRange(100, -100, 358).start, 0);
  assert.equal(virtualFeedRange(100, 1e9, 358).end, 100);
});

test('a prepend preserves historical eventId and pixel offset while top readers follow newest', () => {
  const previous = generateMockKillFeed(100);
  const next = [createMockKillEvent(101), ...previous];
  assert.equal(anchoredFeedTop(previous, next, 0, 358), 0);
  const top = 20 * FEED_ROW_HEIGHT + 31;
  const updated = anchoredFeedTop(previous, next, top, 358);
  assert.equal(updated, top + FEED_ROW_HEIGHT);
  assert.equal(next[Math.floor(updated / FEED_ROW_HEIGHT)].eventId, previous[20].eventId);
  assert.equal(updated % FEED_ROW_HEIGHT, 31);
});

test('retention preserves surviving anchors and clamps removed oldest history without jumping to newest', () => {
  const previous = generateMockKillFeed(100);
  const next = [createMockKillEvent(101), ...previous].slice(0, 100);
  assert.equal(anchoredFeedTop(previous, next, 10 * FEED_ROW_HEIGHT, 358), 11 * FEED_ROW_HEIGHT);
  const trimmed = previous.slice(0, 50);
  assert.equal(anchoredFeedTop(previous, trimmed, 80 * FEED_ROW_HEIGHT, 358), 50 * FEED_ROW_HEIGHT - 358);
});

test('changing filters resets the window and empty matches reset safely', () => {
  const events = generateMockKillFeed(1000);
  const filtered = events.filter((event) => event.squadId === 'te');
  assert.equal(anchoredFeedTop(events, filtered, 50000, 358, true), 0);
  assert.equal(anchoredFeedTop(events, [], 50000, 358), 0);
});

test('large source accepts 10000 seed events and caps subsequent updates without recycling IDs', () => {
  const source = createMockMatchSource(undefined, { initialEventCount: 10000, historyLimit: 10000 });
  const before = source.getSnapshot(); source.step(); source.step();
  const after = source.getSnapshot();
  assert.equal(after.events.length, MAX_KILL_FEED_EVENTS);
  assert.equal(after.events[0].eventId, 'mock-kill-10002');
  assert.equal(new Set(after.events.map((event) => event.eventId)).size, MAX_KILL_FEED_EVENTS);
  assert.equal(before.events[0].eventId, 'mock-kill-10000');
});

test('invalid/unbounded mock histories are rejected', () => {
  for (const count of [-1, 1.5, 10001, NaN]) assert.throws(() => generateMockKillFeed(count), RangeError);
  assert.throws(() => createMockMatchSource(undefined, { historyLimit: 10001 }), RangeError);
  assert.throws(() => createMockMatchSource(undefined, { initialEventCount: 1000, historyLimit: 50 }), RangeError);
});

test('queued ticks from an older run cannot update a restarted simulation', () => {
  const callbacks: (() => void)[] = [];
  const source = createMockMatchSource({ schedule(callback) { callbacks.push(callback); return callbacks.length; }, cancel() {} });
  const stop = source.subscribe(() => {});
  source.start(); source.pause(); source.start();
  callbacks[0](); assert.equal(source.getSnapshot().revision, 0);
  callbacks[1](); assert.equal(source.getSnapshot().revision, 1);
  stop();
});
