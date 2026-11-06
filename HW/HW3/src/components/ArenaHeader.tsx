export function ArenaHeader() {
  return (
    <header className="arena-header">
      <a className="brand" href="#arena"><span className="brand-mark">PVS</span><span>VIETNAM SERIES<small>CHAMPIONSHIP ARENA</small></span></a>
      <nav aria-label="Arena navigation">
        <a href="#drops">Airdrops</a><a href="#leaderboard">Standings</a><a href="#kill-feed">Kill-feed</a>
      </nav>
      <span className="environment-badge">MOCK ENVIRONMENT</span>
    </header>
  );
}
