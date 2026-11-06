import { memo, useId, useLayoutEffect, useRef, useState } from 'react';
import type { PubgKillFeedEvent, PubgVnSquadStanding } from '../domain/pubg-vn-arena-contract';
import { anchoredFeedTop, FEED_ROW_HEIGHT, FEED_VIEWPORT_HEIGHT, virtualFeedRange } from '../domain/virtualFeed';

const timeFormat = new Intl.DateTimeFormat('en-GB', { timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' });
const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' });

const KillFeedRow = memo(function KillFeedRow({ event, squadName, index, count }: {
  readonly event: PubgKillFeedEvent; readonly squadName: string; readonly index: number; readonly count: number;
}) {
  return <li data-event-id={event.eventId} aria-posinset={index + 1} aria-setsize={count} style={{ height: FEED_ROW_HEIGHT }}>
    <time dateTime={new Date(event.timestamp).toISOString()} aria-label={`${dateFormat.format(event.timestamp)} UTC+7`}>{timeFormat.format(event.timestamp)} UTC+7</time>
    <p><strong>{event.killer}</strong><span> eliminated </span><strong>{event.victim}</strong></p>
    <small>{squadName} · {event.weapon ?? 'Weapon unknown'}</small>
  </li>;
});

interface VirtualKillFeedProps {
  readonly events: readonly PubgKillFeedEvent[];
  readonly squads: readonly PubgVnSquadStanding[];
  readonly filterKey: string;
}

export function VirtualKillFeed({ events, squads, filterKey }: VirtualKillFeedProps) {
  const helpId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const topRef = useRef(0);
  const previous = useRef({ events, filterKey });
  const [view, setView] = useState({ top: 0, height: FEED_VIEWPORT_HEIGHT });
  const range = virtualFeedRange(events.length, view.top, view.height);

  useLayoutEffect(() => {
    const element = viewportRef.current!;
    let frame: number | null = null;
    let mounted = true;
    const measure = () => {
      if (!mounted) return;
      const top = element.scrollTop;
      const height = element.clientHeight;
      topRef.current = top;
      setView((old) => old.top === top && old.height === height ? old : { top, height });
    };
    const onScroll = () => {
      topRef.current = element.scrollTop;
      if (frame === null) frame = requestAnimationFrame(() => { frame = null; measure(); });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      mounted = false;
      element.removeEventListener('scroll', onScroll);
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  useLayoutEffect(() => {
    const element = viewportRef.current!;
    const top = anchoredFeedTop(previous.current.events, events, topRef.current,
      element.clientHeight, previous.current.filterKey !== filterKey);
    previous.current = { events, filterKey };
    element.scrollTop = top;
    topRef.current = top;
    setView((old) => old.top === top && old.height === element.clientHeight ? old : { top, height: element.clientHeight });
  }, [events, filterKey]);

  function move(top: number) {
    const element = viewportRef.current!;
    element.scrollTop = Math.max(0, Math.min(top, element.scrollHeight - element.clientHeight));
    topRef.current = element.scrollTop;
    setView({ top: element.scrollTop, height: element.clientHeight });
  }

  return <>
    <p className="feed-help" id={helpId}>Use Arrow keys or Page Up/Down in the feed, or the history buttons. New events keep your place while you read older history.</p>
    <div className="feed-history-controls" aria-label="Kill-feed history navigation">
      <button type="button" disabled={view.top <= 1} onClick={() => move(0)}>Newest events</button>
      <button type="button" disabled={view.top <= 1} onClick={() => move(view.top - view.height)}>Newer</button>
      <button type="button" disabled={view.top + view.height >= events.length * FEED_ROW_HEIGHT} onClick={() => move(view.top + view.height)}>Older</button>
    </div>
    <p className="feed-window-info" aria-live="off">History {events.length ? range.start + 1 : 0}–{range.end} of {events.length}</p>
    <div ref={viewportRef} className="kill-feed-scroll" role="region" aria-label="Scrollable simulated kill-feed" aria-describedby={helpId} tabIndex={0}>
      <ol className="kill-feed-list" aria-label="Eliminations, newest first" style={{ paddingTop: range.start * FEED_ROW_HEIGHT, paddingBottom: (events.length - range.end) * FEED_ROW_HEIGHT }}>
        {events.slice(range.start, range.end).map((event, index) => <KillFeedRow key={event.eventId} event={event}
          index={range.start + index} count={events.length} squadName={squads.find((squad) => squad.squadId === event.squadId)?.squadName ?? event.squadId} />)}
      </ol>
      {events.length === 0 && <p className="feed-empty">No eliminations for this squad.</p>}
    </div>
  </>;
}
