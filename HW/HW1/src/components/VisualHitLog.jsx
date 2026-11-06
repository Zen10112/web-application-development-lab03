import { useId } from 'react';

export function VisualHitLog({ hits, announcement }) {
  const headingId = useId();
  return (
    <section className="feedback-panel" aria-labelledby={headingId}>
      <header className="feedback-heading">
        <h2 id={headingId}>Hit history</h2>
        <span>Latest 12 hits</span>
      </header>
      {hits.length > 0 && (
        <ol className="hit-log" aria-label="Newest hits first" aria-live="off">
          {hits.map((hit) => (
            <li key={hit.sequence}>
              <span className="hit-order">#{hit.sequence}</span>
              <span>{hit.label}</span><kbd>{hit.key}</kbd>
            </li>
          ))}
        </ol>
      )}
      <output className="hit-summary" aria-live="polite" aria-atomic="true">{announcement}</output>
    </section>
  );
}
