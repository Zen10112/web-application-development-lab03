import { MOCK_SQUAD_STANDINGS } from '../data/mockArenaData.ts';
import { createMockKillEvent, generateMockKillFeed, MAX_MOCK_MATCH_EVENTS } from '../data/mockMatchData.ts';
import type { PubgKillFeedEvent, PubgVnSquadStanding } from '../domain/pubg-vn-arena-contract';

export const MAX_KILL_FEED_EVENTS = MAX_MOCK_MATCH_EVENTS;
export const DEFAULT_KILL_FEED_HISTORY = 1000;
export interface MockMatchSnapshot {
  readonly squads: readonly PubgVnSquadStanding[];
  readonly events: readonly PubgKillFeedEvent[];
  readonly revision: number;
  readonly isRunning: boolean;
}
interface MatchTimers {
  schedule: (callback: () => void, delayMs: number) => ReturnType<typeof setInterval>;
  cancel: (id: ReturnType<typeof setInterval>) => void;
}

/** Deterministic, bounded coursework simulation, not an official live feed. */
export function createMockMatchSource(timers: MatchTimers = {
  schedule: (callback, delayMs) => setInterval(callback, delayMs), cancel: (id) => clearInterval(id),
}, { initialEventCount = 4, historyLimit = DEFAULT_KILL_FEED_HISTORY }: { initialEventCount?: number; historyLimit?: number } = {}) {
  if (!Number.isInteger(historyLimit) || historyLimit < 4 || historyLimit > MAX_KILL_FEED_EVENTS
    || initialEventCount > historyLimit) throw new RangeError('Mock history must hold the seed and be limited to 4–10000 events.');
  let snapshot: MockMatchSnapshot = Object.freeze({ squads: MOCK_SQUAD_STANDINGS,
    events: generateMockKillFeed(initialEventCount), revision: 0, isRunning: false });
  let timerId: ReturnType<typeof setInterval> | undefined;
  let runGeneration = 0;
  const listeners = new Set<() => void>();
  const notify = () => { for (const listener of listeners) listener(); };
  const getSnapshot = () => snapshot;

  function step() {
    const sequence = initialEventCount + snapshot.revision + 1;
    const squadIndex = (sequence - 1) % snapshot.squads.length;
    const event = createMockKillEvent(sequence);
    snapshot = Object.freeze({ ...snapshot, revision: snapshot.revision + 1,
      squads: Object.freeze(snapshot.squads.map((standing, index) => index === squadIndex
        ? Object.freeze({ ...standing, killPts: standing.killPts + 1 }) : standing)),
      events: Object.freeze([event, ...snapshot.events].slice(0, historyLimit)) });
    notify();
  }
  function pause() {
    runGeneration += 1;
    if (timerId !== undefined) timers.cancel(timerId);
    timerId = undefined;
    if (!snapshot.isRunning) return;
    snapshot = Object.freeze({ ...snapshot, isRunning: false });
    notify();
  }
  function start() {
    if (snapshot.isRunning || listeners.size === 0) return;
    snapshot = Object.freeze({ ...snapshot, isRunning: true });
    const generation = ++runGeneration;
    timerId = timers.schedule(() => {
      if (generation === runGeneration && snapshot.isRunning && listeners.size > 0) step();
    }, 5000);
    notify();
  }
  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); if (listeners.size === 0) pause(); };
  }
  return { getSnapshot, subscribe, step, start, pause };
}

export const mockMatchSource = createMockMatchSource();
export type MockMatchSource = ReturnType<typeof createMockMatchSource>;
