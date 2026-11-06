import { useId, useState } from 'react';
import type { PubgVnSquadStanding } from '../domain/pubg-vn-arena-contract';
import { selectStandings, totalPoints, type SortDirection, type StandingSort } from '../domain/matchSelectors';

const criteria: readonly { value: StandingSort; label: string }[] = [
  { value: 'wwcdCount', label: 'WWCD Count' }, { value: 'placementPts', label: 'Placement Points' },
  { value: 'killPts', label: 'Kill Points' }, { value: 'totalPts', label: 'Total Points' },
];

export function PubgLeaderboard({ standings }: { readonly standings: readonly PubgVnSquadStanding[] }) {
  const prefix = useId();
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<StandingSort>('totalPts');
  const [direction, setDirection] = useState<SortDirection>('descending');
  // Four squads: direct derivation is cheaper and clearer than maintaining a memo cache/state.
  const visible = selectStandings(standings, query, sortBy, direction);
  return (
    <section id="leaderboard" aria-labelledby={`${prefix}-title`}>
      <header className="section-heading"><h2 id={`${prefix}-title`}><span>02 /</span> SQUAD STANDINGS</h2><span>SIMULATED DATA</span></header>
      <form className="match-filters" onSubmit={(event) => event.preventDefault()} aria-label="Leaderboard filters">
        <label htmlFor={`${prefix}-search`}>Find a squad<input id={`${prefix}-search`} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search squad name" /></label>
        <label htmlFor={`${prefix}-sort`}>Sort by<select id={`${prefix}-sort`} value={sortBy} onChange={(event) => setSortBy(event.target.value as StandingSort)}>{criteria.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label htmlFor={`${prefix}-direction`}>Order<select id={`${prefix}-direction`} value={direction} onChange={(event) => setDirection(event.target.value as SortDirection)}><option value="descending">Highest first</option><option value="ascending">Lowest first</option></select></label>
      </form>
      <p className="match-result-count" role="status">{visible.length} of {standings.length} squads</p>
      <div className="table-scroll" role="region" aria-label="Scrollable simulated squad leaderboard" tabIndex={0}>
        <table className="leaderboard-table"><caption>Mock PVS standings · Total Points = Placement Points + Kill Points</caption>
          <thead><tr><th scope="col">Squad Name</th>{criteria.map((item) => <th key={item.value} scope="col" aria-sort={sortBy === item.value ? direction : undefined}>{item.label}</th>)}</tr></thead>
          <tbody>{visible.map((squad) => <tr key={squad.squadId}><th scope="row">{squad.squadName}</th><td>{squad.wwcdCount}</td><td>{squad.placementPts}</td><td>{squad.killPts}</td><td className="total-points">{totalPoints(squad)}</td></tr>)}
            {visible.length === 0 && <tr><td colSpan={5}>No squads match your search.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
