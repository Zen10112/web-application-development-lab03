import { useCallback, useEffect, useRef, useState } from 'react';

export const MAX_HITS = 12;
export const ANNOUNCE_INTERVAL_MS = 2000;

export function useHitFeedback() {
  const [hits, setHits] = useState([]);
  const [flashingIds, setFlashingIds] = useState(() => new Set());
  const [announcement, setAnnouncement] = useState('Tóm tắt lượt đánh cập nhật tối đa mỗi 2 giây.');
  const sequence = useRef(0);
  const flashTimers = useRef(new Map());
  const announceTimer = useRef(null);
  const pending = useRef({ count: 0, last: null });

  const recordHit = useCallback((pad) => {
    const hit = { sequence: ++sequence.current, padId: pad.id,
      label: pad.label, key: pad.physicalCode.slice(3) };
    setHits((previous) => [hit, ...previous].slice(0, MAX_HITS));
    setFlashingIds((previous) => new Set(previous).add(pad.id));
    clearTimeout(flashTimers.current.get(pad.id));
    flashTimers.current.set(pad.id, setTimeout(() => {
      flashTimers.current.delete(pad.id);
      setFlashingIds((previous) => {
        const next = new Set(previous);
        next.delete(pad.id);
        return next;
      });
    }, 180));

    pending.current.count++;
    pending.current.last = hit;
    // A fixed batching window, not a debounce: continuous playing still gets summaries.
    if (announceTimer.current === null) {
      announceTimer.current = setTimeout(() => {
        const { count, last } = pending.current;
        setAnnouncement(`${count} lượt đánh mới. Gần nhất: ${last.label}, phím ${last.key}, lượt ${last.sequence}.`);
        pending.current = { count: 0, last: null };
        announceTimer.current = null;
      }, ANNOUNCE_INTERVAL_MS);
    }
  }, []);

  useEffect(() => () => {
    for (const timer of flashTimers.current.values()) clearTimeout(timer);
    flashTimers.current.clear();
    clearTimeout(announceTimer.current);
    announceTimer.current = null;
    pending.current = { count: 0, last: null };
  }, []);

  return { hits, flashingIds, announcement, recordHit };
}
