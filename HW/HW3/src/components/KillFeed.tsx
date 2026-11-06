import { useId, useState } from 'react';
import type { PubgKillFeedEvent, PubgVnSquadStanding } from '../domain/pubg-vn-arena-contract';
import { selectKillFeed } from '../domain/matchSelectors';

const timeFormat = new Intl.DateTimeFormat('en-GB', { timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' });
const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' });
interface KillFeedProps {
  readonly events: readonly PubgKillFeedEvent[];
  readonly squads: readonly PubgVnSquadStanding[];
}
export function KillFeed({ events, squads }: KillFeedProps) {
  const prefix = useId();
  const [squadId, setSquadId] = useState('');
  const visible = selectKillFeed(events, squadId);
  return (
    <section id="kill-feed" aria-labelledby={`${prefix}-title`}>
      <header className="section-heading"><h2 id={`${prefix}-title`}><span>03 /</span> KILL-FEED</h2><span>MOCK MATCH CLOCK</span></header>
      <form className="match-filters" aria-label="Kill-feed filters" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor={`${prefix}-squad`}>Killer’s squad<select id={`${prefix}-squad`} value={squadId} onChange={(event) => setSquadId(event.target.value)}><option value="">All squads</option>{squads.map((squad) => <option key={squad.squadId} value={squad.squadId}>{squad.squadName}</option>)}</select></label>
      </form>
      <p className="match-result-count" role="status">{visible.length} of {events.length} recent eliminations</p>
      <div className="kill-feed-scroll" role="region" aria-label="Scrollable simulated kill-feed" tabIndex={0}>
        <ol className="kill-feed-list" aria-label="Eliminations, newest first">{visible.map((event) => <li key={event.eventId}>
          <time dateTime={new Date(event.timestamp).toISOString()} aria-label={`${dateFormat.format(event.timestamp)} UTC+7`}>{timeFormat.format(event.timestamp)} UTC+7</time>
          <p><strong>{event.killer}</strong><span> eliminated </span><strong>{event.victim}</strong></p>
          <small>{squads.find((squad) => squad.squadId === event.squadId)?.squadName ?? event.squadId} · {event.weapon ?? 'Weapon unknown'}</small>
        </li>)}</ol>
        {visible.length === 0 && <p className="feed-empty">No eliminations for this squad.</p>}
      </div>
    </section>
  );
}
