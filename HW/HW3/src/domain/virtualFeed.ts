import type { PubgKillFeedEvent } from './pubg-vn-arena-contract';

export const FEED_ROW_HEIGHT = 144;
export const FEED_OVERSCAN = 3;
export const FEED_VIEWPORT_HEIGHT = 360;

export function virtualFeedRange(count: number, scrollTop: number, height: number) {
  const top = Math.max(0, Math.min(scrollTop, Math.max(0, count * FEED_ROW_HEIGHT - height)));
  return {
    start: Math.max(0, Math.floor(top / FEED_ROW_HEIGHT) - FEED_OVERSCAN),
    end: Math.min(count, Math.ceil((top + height) / FEED_ROW_HEIGHT) + FEED_OVERSCAN),
  };
}

/** Preserve the first visible event and its pixel offset across prepends/trimming. */
export function anchoredFeedTop(previous: readonly PubgKillFeedEvent[], next: readonly PubgKillFeedEvent[],
  scrollTop: number, height: number, filterChanged = false): number {
  if (filterChanged || scrollTop <= 1 || next.length === 0) return 0;
  const index = Math.min(previous.length - 1, Math.floor(scrollTop / FEED_ROW_HEIGHT));
  const anchorId = previous[index]?.eventId;
  const nextIndex = next.findIndex((event) => event.eventId === anchorId);
  // If retention removed the anchor, stay at the oldest retained history, not the newest.
  const target = nextIndex < 0 ? next.length * FEED_ROW_HEIGHT
    : nextIndex * FEED_ROW_HEIGHT + scrollTop % FEED_ROW_HEIGHT;
  return Math.max(0, Math.min(target, next.length * FEED_ROW_HEIGHT - height));
}
