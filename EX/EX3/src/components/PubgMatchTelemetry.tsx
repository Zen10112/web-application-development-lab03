import { useEffect, useId, useState } from 'react';
import { fetchPubgTelemetry } from '../api/pubgTelemetry';
import { PUBG_VN_SQUADS } from '../data/pubgSquads';
import type { PubgSquad, SquadId, ViewState } from '../types/pubg';
import { TelemetrySkeleton } from './TelemetrySkeleton';
import styles from './PubgMatchTelemetry.module.css';

export function PubgMatchTelemetry() {
  const headingId = useId();
  const groupId = useId();
  const [selectedSquadId, setSelectedSquadId] = useState<SquadId>('te');
  const [view, setView] = useState<ViewState<PubgSquad>>({ status: 'IDLE' });
  const selectedSquad = PUBG_VN_SQUADS.find((squad) => squad.id === selectedSquadId);

  useEffect(() => {
    const controller = new AbortController();
    setView({ status: 'LOADING' });

    fetchPubgTelemetry(selectedSquadId, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setView({ status: 'SUCCESS', data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) return;
        setView({
          status: 'ERROR',
          error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.',
        });
      });

    return () => controller.abort();
  }, [selectedSquadId]);

  return (
    <section className={styles.widget} aria-labelledby={headingId}>
      <h2 id={headingId}>Đội tuyển PVS</h2>
      <fieldset className={styles.selector}>
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
      <p className={styles.selected}>Đội đang chọn: {selectedSquad?.name}</p>
      {view.status === 'IDLE' && <p className={styles.panel} role="status">Sẵn sàng tải telemetry.</p>}
      {view.status === 'LOADING' && <TelemetrySkeleton />}
      {view.status === 'ERROR' && <p className={styles.panel} role="alert">{view.error}</p>}
      {view.status === 'SUCCESS' && (
        <article className={styles.panel} aria-label={`Telemetry ${view.data.name}`}>
          <h3>{view.data.name}</h3>
          <dl>
            <dt>Map</dt><dd>{view.data.map}</dd>
            <dt>Phase</dt><dd>{view.data.phase}</dd>
            <dt>Alive</dt><dd>{view.data.alive}</dd>
            <dt>Kills</dt><dd>{view.data.kills}</dd>
            <dt>WWCD</dt><dd>{view.data.wwcdProb}</dd>
            <dt>Trạng thái đội</dt><dd>{view.data.status}</dd>
          </dl>
        </article>
      )}
    </section>
  );
}
