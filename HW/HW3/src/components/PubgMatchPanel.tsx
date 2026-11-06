import { useId, useSyncExternalStore } from 'react';
import { mockMatchSource, type MockMatchSource } from '../services/mockMatchSource';
import { PubgLeaderboard } from './PubgLeaderboard';
import { KillFeed } from './KillFeed';

export function PubgMatchPanel({ source = mockMatchSource }: { readonly source?: MockMatchSource } = {}) {
  const titleId = useId();
  const match = useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot);
  return (
    <section className="match-panel" aria-labelledby={titleId}>
      <header className="match-controls">
        <h2 id={titleId}>MATCH INTELLIGENCE <small>SIMULATION ONLY</small></h2>
        <p>Fictional scores and player aliases. Auto simulation updates every 5 seconds; no official live API is connected.</p>
        <button type="button" onClick={match.isRunning ? source.pause : source.start}>{match.isRunning ? 'Pause simulation' : 'Start simulation'}</button>
        <button type="button" disabled={match.isRunning} onClick={source.step}>Next mock update</button>
        <output aria-live="polite">{match.isRunning ? 'Simulation running' : 'Simulation paused'} · Update {match.revision}</output>
      </header>
      <section className="arena-intel" aria-label="Squad intelligence">
        <PubgLeaderboard standings={match.squads} />
        <KillFeed events={match.events} squads={match.squads} />
      </section>
    </section>
  );
}
