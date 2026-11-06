import type { PubgKillFeedEvent } from '../domain/pubg-vn-arena-contract';

export const MOCK_MATCH_EPOCH_MS = Date.parse('2030-01-01T11:00:00+07:00');
/** Fictional player aliases/events, unrelated to actual PUBG telemetry or players. */
export const MOCK_KILL_FEED: readonly PubgKillFeedEvent[] = Object.freeze([
  Object.freeze({ eventId: 'mock-kill-4', timestamp: MOCK_MATCH_EPOCH_MS + 20000, killer: 'AGG_Demo', victim: 'TE_Demo', squadId: 'agg', weapon: 'Mini14' }),
  Object.freeze({ eventId: 'mock-kill-3', timestamp: MOCK_MATCH_EPOCH_MS + 15000, killer: 'ROY_Demo', victim: 'AGG_Demo', squadId: 'roy' }),
  Object.freeze({ eventId: 'mock-kill-2', timestamp: MOCK_MATCH_EPOCH_MS + 10000, killer: 'CES_Demo', victim: 'ROY_Demo', squadId: 'ces', weapon: 'Beryl M762' }),
  Object.freeze({ eventId: 'mock-kill-1', timestamp: MOCK_MATCH_EPOCH_MS + 5000, killer: 'TE_Demo', victim: 'CES_Demo', squadId: 'te', weapon: 'M416' }),
]);

export const MAX_MOCK_MATCH_EVENTS = 10000;

export function createMockKillEvent(sequence: number): PubgKillFeedEvent {
  const template = MOCK_KILL_FEED[3 - (sequence - 1) % 4];
  return Object.freeze({ ...template, eventId: `mock-kill-${sequence}`, timestamp: MOCK_MATCH_EPOCH_MS + sequence * 5000 });
}

/** Deterministic large fixtures for virtual-scroller verification; never real telemetry. */
export function generateMockKillFeed(count: number): readonly PubgKillFeedEvent[] {
  if (!Number.isInteger(count) || count < 0 || count > MAX_MOCK_MATCH_EVENTS) throw new RangeError('Mock event count must be 0–10000.');
  if (count === 4) return MOCK_KILL_FEED;
  return Object.freeze(Array.from({ length: count }, (_, index) => createMockKillEvent(count - index)));
}
