import { MOCK_SQUAD_STANDINGS } from '../data/mockArenaData.ts';
import { MOCK_KILL_FEED, MOCK_MATCH_EPOCH_MS } from '../data/mockMatchData.ts';
import type { PubgKillFeedEvent, PubgVnSquadStanding } from '../domain/pubg-vn-arena-contract';

export const MAX_KILL_FEED_EVENTS = 50;
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
}) {
  let snapshot: MockMatchSnapshot = Object.freeze({ squads: MOCK_SQUAD_STANDINGS, events: MOCK_KILL_FEED, revision: 0, isRunning: false });
  let timerId: ReturnType<typeof setInterval> | undefined;
  const listeners = new Set<() => void>();
  const notify = () => { for (const listener of listeners) listener(); };
  const getSnapshot = () => snapshot;

  function step() {
    const sequence = MOCK_KILL_FEED.length + snapshot.revision + 1;
    const squadIndex = (sequence - 1) % snapshot.squads.length;
    const squad = snapshot.squads[squadIndex];
    const victim = snapshot.squads[(squadIndex + 1) % snapshot.squads.length];
    const event: PubgKillFeedEvent = Object.freeze({ eventId: `mock-kill-${sequence}`,
      timestamp: MOCK_MATCH_EPOCH_MS + sequence * 5000, killer: `${squad.squadId.toUpperCase()}_Demo`,
      victim: `${victim.squadId.toUpperCase()}_Demo`, squadId: squad.squadId,
      weapon: ['M416', 'Beryl M762', 'Mini14', 'AKM'][squadIndex] });
    snapshot = Object.freeze({ ...snapshot, revision: snapshot.revision + 1,
      squads: Object.freeze(snapshot.squads.map((standing, index) => index === squadIndex
        ? Object.freeze({ ...standing, killPts: standing.killPts + 1 }) : standing)),
      events: Object.freeze([event, ...snapshot.events].slice(0, MAX_KILL_FEED_EVENTS)) });
    notify();
  }
  function pause() {
    if (timerId !== undefined) timers.cancel(timerId);
    timerId = undefined;
    if (!snapshot.isRunning) return;
    snapshot = Object.freeze({ ...snapshot, isRunning: false });
    notify();
  }
  function start() {
    if (snapshot.isRunning || listeners.size === 0) return;
    snapshot = Object.freeze({ ...snapshot, isRunning: true });
    timerId = timers.schedule(() => { if (snapshot.isRunning && listeners.size > 0) step(); }, 5000);
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
