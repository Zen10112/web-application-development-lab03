import { memo, useId, useMemo, useState } from 'react';
import type { PubgKillFeedEvent, PubgVnSquadStanding } from '../domain/pubg-vn-arena-contract';
import { selectKillFeed } from '../domain/matchSelectors';
import { VirtualKillFeed } from './VirtualKillFeed';
interface KillFeedProps {
  readonly events: readonly PubgKillFeedEvent[];
  readonly squads: readonly PubgVnSquadStanding[];
}
export const KillFeed = memo(function KillFeed({ events, squads }: KillFeedProps) {
  const prefix = useId();
  const [squadId, setSquadId] = useState('');
  const visible = useMemo(() => selectKillFeed(events, squadId), [events, squadId]);
  return (
    <section id="kill-feed" aria-labelledby={`${prefix}-title`}>
      <header className="section-heading"><h2 id={`${prefix}-title`}><span>03 /</span> KILL-FEED</h2><span>MOCK MATCH CLOCK</span></header>
      <form className="match-filters" aria-label="Kill-feed filters" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor={`${prefix}-squad`}>Killer’s squad<select id={`${prefix}-squad`} value={squadId} onChange={(event) => setSquadId(event.target.value)}><option value="">All squads</option>{squads.map((squad) => <option key={squad.squadId} value={squad.squadId}>{squad.squadName}</option>)}</select></label>
      </form>
      <p className="match-result-count" role="status">{visible.length} of {events.length} recent eliminations</p>
      <VirtualKillFeed events={visible} squads={squads} filterKey={squadId} />
    </section>
  );
});
