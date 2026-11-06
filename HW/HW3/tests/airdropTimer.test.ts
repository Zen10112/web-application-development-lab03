import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateRemainingMs, formatCountdown, subscribeAirdropTimer } from '../src/timers/airdropTimer.ts';

function clock() {
  let now = 1000;
  let visible = true;
  let nextId = 0;
  const pending = new Map<number, { callback: () => void; delay: number }>();
  const listeners = new Set<() => void>();
  const environment = {
    now: () => now,
    schedule(callback: () => void, delay: number) { pending.set(++nextId, { callback, delay }); return nextId; },
    cancel: (id: number) => { pending.delete(id); },
    isVisible: () => visible,
    onVisibilityChange(callback: () => void) { listeners.add(callback); return () => { listeners.delete(callback); }; },
  };
  return { environment, pending, listeners,
    setNow(value: number) { now = value; },
    fire() { const next = pending.entries().next().value; assert.ok(next); pending.delete(next[0]); next[1].callback(); },
    setVisible(value: boolean) { visible = value; for (const listener of listeners) listener(); },
  };
}

test('remaining time uses target epoch and signed server offset, clamped at zero', () => {
  assert.equal(calculateRemainingMs(6000, 0, 1000), 5000);
  assert.equal(calculateRemainingMs(6000, 2000, 1000), 3000);
  assert.equal(calculateRemainingMs(6000, -2000, 1000), 7000);
  assert.equal(calculateRemainingMs(6000, 0, 9000), 0);
});

test('normal countdown aligns to display boundaries with one pending timeout', () => {
  const fake = clock(); const values: number[] = [];
  const stop = subscribeAirdropTimer(6500, 0, (value) => values.push(value), fake.environment);
  assert.deepEqual(values, [5500]);
  assert.equal([...fake.pending.values()][0].delay, 500);
  fake.setNow(1500); fake.fire();
  fake.setNow(2500); fake.fire();
  assert.deepEqual(values, [5500, 5000, 4000]);
  assert.equal(fake.pending.size, 1);
  stop();
});

test('completion emits exactly zero and stops scheduling', () => {
  const fake = clock(); const values: number[] = [];
  const stop = subscribeAirdropTimer(1250, 0, (value) => values.push(value), fake.environment);
  assert.equal([...fake.pending.values()][0].delay, 250);
  fake.setNow(1250); fake.fire();
  assert.deepEqual(values, [250, 0]);
  assert.equal(fake.pending.size, 0);
  stop();
});

test('late callbacks recalculate actual remaining time instead of subtracting ticks', () => {
  const fake = clock(); const values: number[] = [];
  const stop = subscribeAirdropTimer(11000, 0, (value) => values.push(value), fake.environment);
  fake.setNow(8500); fake.fire();
  assert.equal(values.at(-1), 2500);
  fake.setNow(25000); fake.fire();
  assert.equal(values.at(-1), 0);
  assert.equal(fake.pending.size, 0);
  stop();
});

test('background pauses work, foreground immediately resynchronizes and never duplicates timers', () => {
  const fake = clock(); const values: number[] = [];
  const stop = subscribeAirdropTimer(11000, 0, (value) => values.push(value), fake.environment);
  fake.setVisible(false);
  assert.equal(fake.pending.size, 0);
  fake.setNow(8000); fake.setVisible(true);
  assert.equal(values.at(-1), 3000);
  fake.setVisible(true); fake.setVisible(true);
  assert.equal(fake.pending.size, 1);
  fake.setVisible(false); fake.setNow(22000); fake.setVisible(true);
  assert.equal(values.at(-1), 0);
  assert.equal(fake.pending.size, 0);
  stop();
});

test('target and offset subscription replacements cancel old work and use fresh values', () => {
  const fake = clock(); const values: number[] = [];
  let stop = subscribeAirdropTimer(6000, 0, (value) => values.push(value), fake.environment);
  stop(); stop = subscribeAirdropTimer(10000, 0, (value) => values.push(value), fake.environment);
  assert.equal(values.at(-1), 9000);
  stop(); stop = subscribeAirdropTimer(10000, 2000, (value) => values.push(value), fake.environment);
  assert.equal(values.at(-1), 7000);
  assert.equal(fake.pending.size, 1);
  assert.equal(fake.listeners.size, 1);
  stop();
});

test('cleanup is idempotent and queued stale callbacks cannot update after disposal', () => {
  const fake = clock(); const values: number[] = [];
  const stop = subscribeAirdropTimer(6000, 0, (value) => values.push(value), fake.environment);
  const stale = [...fake.pending.values()][0].callback;
  stop(); stop(); stale(); fake.setVisible(true);
  assert.deepEqual(values, [5000]);
  assert.equal(fake.pending.size, 0);
  assert.equal(fake.listeners.size, 0);
});

test('display is readable across day boundaries and never rounds a positive time down to zero', () => {
  assert.equal(formatCountdown(1), '00:00:01');
  assert.equal(formatCountdown(3661000), '01:01:01');
  assert.equal(formatCountdown(90061000), '1d 01:01:01');
  assert.equal(formatCountdown(-100), '00:00:00');
});
