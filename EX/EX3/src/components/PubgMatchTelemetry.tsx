import { useId, useState } from 'react';
import { PUBG_VN_SQUADS } from '../data/pubgSquads';
import type { SquadId } from '../types/pubg';

export function PubgMatchTelemetry() {
  const headingId = useId();
  const groupId = useId();
  const [selectedSquadId, setSelectedSquadId] = useState<SquadId>('te');
  const selectedSquad = PUBG_VN_SQUADS.find((squad) => squad.id === selectedSquadId);

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId}>Đội tuyển PVS</h2>
      <fieldset>
        <legend>Chọn đội tuyển</legend>
        <ul>
          {PUBG_VN_SQUADS.map((squad) => (
            <li key={squad.id}>
              <input
                id={`${groupId}-${squad.id}`}
                name={groupId}
                type="radio"
                value={squad.id}
                checked={selectedSquadId === squad.id}
                onChange={() => setSelectedSquadId(squad.id)}
              />
              <label htmlFor={`${groupId}-${squad.id}`}>{squad.name}</label>
            </li>
          ))}
        </ul>
      </fieldset>
      <p>Đội đang chọn: {selectedSquad?.name}</p>
    </section>
  );
}
