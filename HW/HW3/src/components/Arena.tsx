import { useId } from 'react';
import { MOCK_ARENA_DATA } from '../data/mockArenaData';
import { DROP_PHASES, type DropPhase } from '../domain/pubg-vn-arena-contract';
import { ArenaHeader } from './ArenaHeader';
import { DropList } from './DropList';
import { useDropClaims } from '../hooks/useDropClaims';

export function Arena() {
  const phaseId = useId();
  const claims = useDropClaims();
  const phase = claims.scenario ?? 'AUTO';
  const drops = MOCK_ARENA_DATA.drops.map((drop) => ({ ...drop, remainingStock: claims.states[drop.id].displayedStock }));

  return (
    <>
      <a className="skip-link" href="#arena">Skip to arena</a>
      <ArenaHeader />
      <main id="arena">
        <section className="arena-hero" aria-labelledby="arena-title">
          <p className="eyebrow"><span className="status-dot" aria-hidden="true" /> KRAFTON × PUBG VIETNAM / COURSEWORK EDITION</p>
          <h1 id="arena-title">PVS GRAND FINALS<span>THE NEXT DROP IS YOURS.</span></h1>
          <p className="hero-description">The arena beyond the battleground. Explore finals passes, discover supply drops and follow Vietnam’s squads.</p>
          <p className="mock-disclaimer">{MOCK_ARENA_DATA.disclaimer}</p>
          <dl className="hero-stats"><div><dt>Featured squads</dt><dd>{String(MOCK_ARENA_DATA.squads.length).padStart(2, '0')}<span>VIETNAM</span></dd></div><div><dt>Featured drops</dt><dd>{String(MOCK_ARENA_DATA.drops.length).padStart(2, '0')}<span>EXCLUSIVES</span></dd></div><div><dt>Arena mode</dt><dd>DEMO<span>NO REAL CLAIMS</span></dd></div></dl>
          <span className="hero-coordinate" aria-hidden="true">VN / 16° N<br />PVS — ARENA 01</span>
        </section>
        <section id="drops" aria-labelledby="drops-title">
          <header className="section-heading"><h2 id="drops-title"><span>01 /</span> THE DROP ZONE</h2><span>VIP ACCESS & G-COIN</span></header>
          <section className="preview-toolbar" aria-label="Drop state preview">
            <p><strong>Mock inventory / server scenario</strong><span>Automatic follows the schedule. Other options simulate server phases; claims affect mock stock only.</span></p>
            <label htmlFor={phaseId}>Mock scenario</label>
            <select id={phaseId} value={phase} disabled={claims.isPending} onChange={(event) => {
              const value = event.target.value as DropPhase | 'AUTO';
              claims.setScenario(value === 'AUTO' ? undefined : value);
            }}>
              <option value="AUTO">AUTOMATIC</option>
              {DROP_PHASES.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
            </select>
          </section>
          <DropList drops={drops} previewPhase={phase === 'AUTO' ? undefined : phase} onClaim={claims.claim} claimStates={claims.states} />
          <p className="claim-notice">Shared in-memory mock inventory · resets on page reload · no real purchase or currency transfer.</p>
        </section>
        <section className="arena-intel" aria-label="Squad intelligence">
          <section id="leaderboard" aria-labelledby="standings-title">
            <header className="section-heading"><h2 id="standings-title"><span>02 /</span> SQUAD STANDINGS</h2><span>MOCK SNAPSHOT</span></header>
            <div className="table-scroll" role="region" aria-label="Scrollable mock squad standings" tabIndex={0}>
              <table><caption>Fictional PVS scores · fixture order, not live rankings</caption><thead><tr><th scope="col">Squad</th><th scope="col">WWCD</th><th scope="col">Place pts</th><th scope="col">Kill pts</th></tr></thead>
                <tbody>{MOCK_ARENA_DATA.squads.map((squad) => <tr key={squad.squadId}><th scope="row">{squad.squadName}</th><td>{squad.wwcdCount}</td><td>{squad.placementPts}</td><td>{squad.killPts}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
          <section id="kill-feed" aria-labelledby="feed-title">
            <header className="section-heading"><h2 id="feed-title"><span>03 /</span> KILL-FEED</h2><span>OFFLINE</span></header>
            <p className="feed-empty"><span aria-hidden="true">⌖</span><strong>Awaiting match telemetry</strong>No events connected. Match updates and filters will appear here in a later step.</p>
          </section>
        </section>
      </main>
      <footer className="arena-footer"><strong>PVS / ARENA</strong><p>Independent coursework prototype. Not affiliated with KRAFTON or PUBG.</p><a href="#arena">Back to top ↑</a></footer>
    </>
  );
}
