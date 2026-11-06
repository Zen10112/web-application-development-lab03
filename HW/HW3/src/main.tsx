import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MOCK_ARENA_DATA } from './data/mockArenaData';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <h1>PVS Arena — Domain Foundation</h1>
    <p>{MOCK_ARENA_DATA.disclaimer}</p>
    <p>{MOCK_ARENA_DATA.squads.length} squads and {MOCK_ARENA_DATA.drops.length} drops available as mock data.</p>
  </StrictMode>,
);
